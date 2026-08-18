import {and,eq,inArray,or} from "drizzle-orm";
import {getDb} from ".";
import {queueObjectDeletionWrite,reconcileQueuedObjectDeletionResult,retryPendingObjectDeletions} from "./object-deletion-queue";
import {deleteObjectKeysWithRetry} from "./object-storage";
import {agendaItems,masterDataExceptions,personalExpenses,travelBookings,uploadedDocuments} from "./schema";

type DeleteOrderGraphInput={tripId:string;ownerEmail:string;bookingId?:string;documentId?:string|null};

export async function hardDeleteOrderGraph(input:DeleteOrderGraphInput){
 const db=await getDb();
 const priorCleanup=await retryPendingObjectDeletions({ownerEmail:input.ownerEmail,tripId:input.tripId}).catch(()=>({attempted:0,deleted:0,remaining:0}));
 let seed=null as typeof travelBookings.$inferSelect|null;
 if(input.bookingId){
  const [found]=await db.select().from(travelBookings).where(and(eq(travelBookings.id,input.bookingId),eq(travelBookings.tripId,input.tripId),eq(travelBookings.ownerEmail,input.ownerEmail))).limit(1);
  seed=found??null;
  if(!seed)return {found:false,bookingIds:[] as string[],documentId:null,documentIds:[] as string[],duplicateDocumentsDeleted:0,objectDeleted:false,objectDeleteFailed:false,objectsDeleted:0,objectDeleteFailures:0,failedObjectKeys:[] as string[],objectDeleteAttempts:0,objectDeleteQueued:0,priorCleanupRemaining:priorCleanup.remaining};
 }
 const requestedDocumentId=input.documentId??seed?.documentId??null;
 const [primaryDocument]=requestedDocumentId?await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.id,requestedDocumentId),eq(uploadedDocuments.ownerEmail,input.ownerEmail),eq(uploadedDocuments.tripId,input.tripId))).limit(1):[];
 // contentHash is used only as a legacy cleanup expansion: byte-identical stale copies are deleted together.
 // Fresh uploads remain distinct documents and are never reused as the active order source.
 const documents=primaryDocument?.contentHash
  ?await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.ownerEmail,input.ownerEmail),eq(uploadedDocuments.tripId,input.tripId),eq(uploadedDocuments.contentHash,primaryDocument.contentHash)))
  :primaryDocument?[primaryDocument]:[];
 const documentIds=documents.map(document=>document.id);
 const documentId=requestedDocumentId;
 const bookings=documentIds.length
  ?await db.select().from(travelBookings).where(and(inArray(travelBookings.documentId,documentIds),eq(travelBookings.tripId,input.tripId),eq(travelBookings.ownerEmail,input.ownerEmail)))
  :seed
   ?await db.select().from(travelBookings).where(and(eq(travelBookings.tripId,input.tripId),eq(travelBookings.ownerEmail,input.ownerEmail),eq(travelBookings.kind,seed.kind),eq(travelBookings.bookedAt,seed.bookedAt)))
   :[];
 const bookingIds=bookings.map(item=>item.id);
 const expenseRelation=documentIds.length&&bookingIds.length?or(inArray(personalExpenses.sourceDocumentId,documentIds),inArray(personalExpenses.sourceBookingId,bookingIds)):documentIds.length?inArray(personalExpenses.sourceDocumentId,documentIds):bookingIds.length?inArray(personalExpenses.sourceBookingId,bookingIds):null;
 const expenseRows=expenseRelation?await db.select({id:personalExpenses.id}).from(personalExpenses).where(and(eq(personalExpenses.ownerEmail,input.ownerEmail),eq(personalExpenses.tripId,input.tripId),expenseRelation)):[];
 const expenseIds=expenseRows.map(item=>item.id);
 const writes=[];
 const now=new Date().toISOString();
 // Tombstones are committed in the same D1 batch as formal graph deletion. If R2 is temporarily unavailable,
 // the object is invisible to users but its storage key is still tracked and retryable instead of becoming orphaned.
 for(const document of documents)writes.push(queueObjectDeletionWrite(db,{ownerEmail:input.ownerEmail,tripId:input.tripId,objectKey:document.objectKey,sourceType:"uploaded_document",sourceId:document.id,now}));
 if(expenseIds.length)writes.push(db.update(uploadedDocuments).set({linkedExpenseId:null,updatedAt:now}).where(and(eq(uploadedDocuments.ownerEmail,input.ownerEmail),inArray(uploadedDocuments.linkedExpenseId,expenseIds))));
 if(bookingIds.length){
  writes.push(db.delete(agendaItems).where(and(eq(agendaItems.tripId,input.tripId),inArray(agendaItems.notes,bookingIds.map(id=>`booking:${id}`)))));
  writes.push(db.delete(personalExpenses).where(and(eq(personalExpenses.ownerEmail,input.ownerEmail),inArray(personalExpenses.sourceBookingId,bookingIds))));
  writes.push(db.delete(travelBookings).where(and(eq(travelBookings.tripId,input.tripId),eq(travelBookings.ownerEmail,input.ownerEmail),inArray(travelBookings.id,bookingIds))));
 }
 if(documentIds.length){
  writes.push(db.delete(personalExpenses).where(and(eq(personalExpenses.ownerEmail,input.ownerEmail),inArray(personalExpenses.sourceDocumentId,documentIds))));
  writes.push(db.delete(masterDataExceptions).where(and(eq(masterDataExceptions.ownerEmail,input.ownerEmail),eq(masterDataExceptions.sourceType,"uploaded_document"),inArray(masterDataExceptions.sourceId,documentIds))));
  writes.push(db.delete(uploadedDocuments).where(and(eq(uploadedDocuments.ownerEmail,input.ownerEmail),eq(uploadedDocuments.tripId,input.tripId),inArray(uploadedDocuments.id,documentIds))));
 }
 if(writes.length)await db.batch(writes);
 const objectKeys=documents.map(document=>document.objectKey),objectCleanup=await deleteObjectKeysWithRetry(documents.map(document=>document.objectKey)),queueState=await reconcileQueuedObjectDeletionResult(objectKeys,objectCleanup);
 return {found:Boolean(seed||primaryDocument),bookingIds,documentId,documentIds,duplicateDocumentsDeleted:Math.max(0,documentIds.length-1),objectDeleted:objectCleanup.objectsDeleted>0,objectDeleteFailed:objectCleanup.objectDeleteFailures>0,objectsDeleted:objectCleanup.objectsDeleted,objectDeleteFailures:objectCleanup.objectDeleteFailures,failedObjectKeys:objectCleanup.failedObjectKeys,objectDeleteAttempts:objectCleanup.attemptsUsed,objectDeleteQueued:queueState.queued,priorCleanupRemaining:priorCleanup.remaining};
}
