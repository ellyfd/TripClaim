import {and,eq,inArray} from "drizzle-orm";
import {getDb} from ".";
import {agendaItems,masterDataExceptions,personalExpenses,travelBookings,uploadedDocuments} from "./schema";

type DeleteOrderGraphInput={tripId:string;ownerEmail:string;bookingId?:string;documentId?:string|null};

export async function hardDeleteOrderGraph(input:DeleteOrderGraphInput){
 const db=await getDb();
 let seed=null as typeof travelBookings.$inferSelect|null;
 if(input.bookingId){
  const [found]=await db.select().from(travelBookings).where(and(eq(travelBookings.id,input.bookingId),eq(travelBookings.tripId,input.tripId),eq(travelBookings.ownerEmail,input.ownerEmail))).limit(1);
  seed=found??null;
  if(!seed)return {found:false,bookingIds:[] as string[],documentId:null,objectDeleted:false};
 }
 const documentId=input.documentId??seed?.documentId??null;
 const bookings=documentId
  ?await db.select().from(travelBookings).where(and(eq(travelBookings.documentId,documentId),eq(travelBookings.tripId,input.tripId),eq(travelBookings.ownerEmail,input.ownerEmail)))
  :seed
   ?await db.select().from(travelBookings).where(and(eq(travelBookings.tripId,input.tripId),eq(travelBookings.ownerEmail,input.ownerEmail),eq(travelBookings.kind,seed.kind),eq(travelBookings.bookedAt,seed.bookedAt)))
   :[];
 const bookingIds=bookings.map(item=>item.id);
 const expenseRows=bookingIds.length||documentId
  ?await db.select({id:personalExpenses.id}).from(personalExpenses).where(and(eq(personalExpenses.ownerEmail,input.ownerEmail),eq(personalExpenses.tripId,input.tripId),documentId?eq(personalExpenses.sourceDocumentId,documentId):inArray(personalExpenses.sourceBookingId,bookingIds)))
  :[];
 const expenseIds=expenseRows.map(item=>item.id);
 const [document]=documentId?await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.id,documentId),eq(uploadedDocuments.ownerEmail,input.ownerEmail),eq(uploadedDocuments.tripId,input.tripId))).limit(1):[];
 const writes=[];
 if(expenseIds.length)writes.push(db.update(uploadedDocuments).set({linkedExpenseId:null,updatedAt:new Date().toISOString()}).where(and(eq(uploadedDocuments.ownerEmail,input.ownerEmail),inArray(uploadedDocuments.linkedExpenseId,expenseIds))));
 if(bookingIds.length){
  writes.push(db.delete(agendaItems).where(and(eq(agendaItems.tripId,input.tripId),inArray(agendaItems.notes,bookingIds.map(id=>`booking:${id}`)))));
  writes.push(db.delete(personalExpenses).where(and(eq(personalExpenses.ownerEmail,input.ownerEmail),inArray(personalExpenses.sourceBookingId,bookingIds))));
  writes.push(db.delete(travelBookings).where(and(eq(travelBookings.tripId,input.tripId),eq(travelBookings.ownerEmail,input.ownerEmail),inArray(travelBookings.id,bookingIds))));
 }
 if(documentId){
  writes.push(db.delete(personalExpenses).where(and(eq(personalExpenses.ownerEmail,input.ownerEmail),eq(personalExpenses.sourceDocumentId,documentId))));
  writes.push(db.delete(masterDataExceptions).where(and(eq(masterDataExceptions.ownerEmail,input.ownerEmail),eq(masterDataExceptions.sourceType,"uploaded_document"),eq(masterDataExceptions.sourceId,documentId))));
  writes.push(db.delete(uploadedDocuments).where(and(eq(uploadedDocuments.id,documentId),eq(uploadedDocuments.ownerEmail,input.ownerEmail),eq(uploadedDocuments.tripId,input.tripId))));
 }
 if(writes.length)await db.batch(writes);
 let objectDeleted=false;
 if(document?.objectKey){
  const {env}=await import("cloudflare:workers");
  await env.BUCKET.delete(document.objectKey);
  objectDeleted=true;
 }
 return {found:Boolean(seed||documentId),bookingIds,documentId,objectDeleted};
}
