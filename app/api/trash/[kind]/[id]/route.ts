import {NextResponse} from "next/server";
import {and,eq} from "drizzle-orm";
import {getChatGPTUser} from "../../../../chatgpt-auth";
import {getDb} from "../../../../../db";
import {recordAudit,requireTripMember} from "../../../../../db/access";
import {personalExpenses,travelBookings,uploadedDocuments} from "../../../../../db/schema";

const isTravelDocument=(documentType?:string|null)=>Boolean(documentType&&(documentType==="flight"||documentType==="stay"||documentType.includes("機票")||documentType.includes("住宿")));

export async function POST(_request:Request,{params}:{params:Promise<{kind:string;id:string}>}){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const {kind,id}=await params,db=await getDb(),now=new Date().toISOString();
 if(!["document","expense","booking"].includes(kind))return NextResponse.json({error:"invalid_kind"},{status:400});
 // Travel deletion is permanently destructive now. Never let old soft-deleted booking rows revive through the legacy trash API.
 if(kind==="booking")return NextResponse.json({error:"travel_restore_disabled",message:"機票／住宿訂單已改為永久刪除，不能從垃圾桶復原"},{status:410});
 let tripId="",documentId:string|null=null,expenseId:string|null=null;
 if(kind==="document"){
  const [item]=await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.id,id),eq(uploadedDocuments.ownerEmail,user.email))).limit(1);
  if(!item)return NextResponse.json({error:"not_found"},{status:404});
  tripId=item.tripId;documentId=item.id;
  const [linkedBooking]=await db.select({id:travelBookings.id}).from(travelBookings).where(and(eq(travelBookings.documentId,id),eq(travelBookings.ownerEmail,user.email),eq(travelBookings.tripId,tripId))).limit(1);
  if(isTravelDocument(item.documentType)||linkedBooking)return NextResponse.json({error:"travel_restore_disabled",message:"機票／住宿文件屬於永久刪除流程，不能從垃圾桶復原"},{status:410});
 }
 if(kind==="expense"){
  const [item]=await db.select().from(personalExpenses).where(and(eq(personalExpenses.id,id),eq(personalExpenses.ownerEmail,user.email))).limit(1);
  if(!item)return NextResponse.json({error:"not_found"},{status:404});
  tripId=item.tripId;expenseId=item.id;documentId=item.sourceDocumentId;
  if(item.sourceBookingId)return NextResponse.json({error:"travel_restore_disabled",message:"這筆費用來自機票／住宿訂單，不能從垃圾桶復原"},{status:410});
  if(documentId){
   const [document]=await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.id,documentId),eq(uploadedDocuments.ownerEmail,user.email),eq(uploadedDocuments.tripId,tripId))).limit(1);
   const [linkedBooking]=await db.select({id:travelBookings.id}).from(travelBookings).where(and(eq(travelBookings.documentId,documentId),eq(travelBookings.ownerEmail,user.email),eq(travelBookings.tripId,tripId))).limit(1);
   if(isTravelDocument(document?.documentType)||linkedBooking)return NextResponse.json({error:"travel_restore_disabled",message:"這筆費用連結機票／住宿來源，不能從垃圾桶復原"},{status:410});
  }
 }
 if(!await requireTripMember(tripId,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const writes=[];
 if(documentId){
  writes.push(db.update(uploadedDocuments).set({deletedAt:null,updatedAt:now}).where(and(eq(uploadedDocuments.id,documentId),eq(uploadedDocuments.ownerEmail,user.email))));
  writes.push(db.update(personalExpenses).set({deletedAt:null,updatedAt:now}).where(and(eq(personalExpenses.sourceDocumentId,documentId),eq(personalExpenses.ownerEmail,user.email))));
 }else if(expenseId)writes.push(db.update(personalExpenses).set({deletedAt:null,updatedAt:now}).where(and(eq(personalExpenses.id,expenseId),eq(personalExpenses.ownerEmail,user.email))));
 if(writes.length)await db.batch(writes);
 await recordAudit({tripId,actorEmail:user.email,entityType:kind,entityId:id,action:"restore_graph",after:{documentId,expenseId,restoredAt:now}});
 return NextResponse.json({restored:true});
}
