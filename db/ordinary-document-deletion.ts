import {and,eq} from "drizzle-orm";
import {getDb} from ".";
import {recordAudit} from "./access";
import {personalExpenses,uploadedDocuments} from "./schema";

type OrdinaryDocument={
 id:string;
 tripId:string;
 ownerEmail:string;
 originalName:string;
 documentType:string;
 status:string;
 deletedAt?:string|null;
};

export async function softDeleteOrdinaryDocument(document:OrdinaryDocument,actorEmail:string){
 if(document.deletedAt)return {deleted:true,recoverable:true,travel:false,undo:{kind:"document" as const,id:document.id}};
 const db=await getDb(),now=new Date().toISOString();
 await db.batch([
  db.update(uploadedDocuments).set({deletedAt:now,updatedAt:now}).where(and(eq(uploadedDocuments.id,document.id),eq(uploadedDocuments.ownerEmail,actorEmail),eq(uploadedDocuments.tripId,document.tripId))),
  db.update(personalExpenses).set({deletedAt:now,updatedAt:now}).where(and(eq(personalExpenses.sourceDocumentId,document.id),eq(personalExpenses.ownerEmail,actorEmail),eq(personalExpenses.tripId,document.tripId))),
 ]);
 await recordAudit({tripId:document.tripId,actorEmail,entityType:"uploaded_document",entityId:document.id,action:"soft_delete_graph",before:{originalName:document.originalName,documentType:document.documentType,status:document.status},after:{deletedAt:now,recoverable:true}});
 return {deleted:true,recoverable:true,travel:false,undo:{kind:"document" as const,id:document.id}};
}
