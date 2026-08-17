import {NextRequest,NextResponse} from "next/server";
import {and,eq,inArray} from "drizzle-orm";
import {getChatGPTUser} from "../../../../../chatgpt-auth";
import {getDb} from "../../../../../../db";
import {recordAudit,requireTripMember} from "../../../../../../db/access";
import {agendaItems,masterDataExceptions,personalExpenses,travelBookings,uploadedDocuments} from "../../../../../../db/schema";
import {decideReportingCurrency,managedClaimTypeCode,MASTER_DATA_VERSION} from "../../../../../managed-config";

type Leg={title?:string;startAt?:string;endAt?:string;timezone?:string;origin?:string;destination?:string};
type Input={kind?:"flight"|"stay";legs?:Leg[];amountMinor?:number;currency?:string;documentId?:string;bookedAt?:string};
const isTravelDocument=(documentType:string,kind:"flight"|"stay")=>kind==="flight"?(documentType==="flight"||documentType.includes("機票")):(documentType==="stay"||documentType.includes("住宿"));

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser(),{id}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const input=await request.json() as Input,legs=input.legs??[];
 if(!input.kind||!legs.length||!Number.isInteger(input.amountMinor)||!input.currency?.trim())return NextResponse.json({error:"invalid_input"},{status:400});
 if(legs.some(leg=>!leg.title?.trim()||!leg.startAt||!leg.endAt||!leg.origin?.trim()||!leg.destination?.trim()))return NextResponse.json({error:"invalid_leg"},{status:400});
 const db=await getDb();
 const [oldBookings,allDocuments,allExpenses]=await Promise.all([
  db.select().from(travelBookings).where(and(eq(travelBookings.tripId,id),eq(travelBookings.ownerEmail,user.email),eq(travelBookings.kind,input.kind))),
  db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.tripId,id),eq(uploadedDocuments.ownerEmail,user.email))),
  db.select().from(personalExpenses).where(and(eq(personalExpenses.tripId,id),eq(personalExpenses.ownerEmail,user.email))),
 ]);
 const oldBookingIds=oldBookings.map(item=>item.id),oldBookingIdSet=new Set(oldBookingIds);
 const oldDocumentIdSet=new Set(oldBookings.map(item=>item.documentId).filter((value):value is string=>Boolean(value&&value!==input.documentId)));
 for(const doc of allDocuments)if(doc.id!==input.documentId&&isTravelDocument(doc.documentType,input.kind))oldDocumentIdSet.add(doc.id);
 const oldDocumentIds=[...oldDocumentIdSet],oldDocumentIdLookup=new Set(oldDocumentIds),oldDocuments=allDocuments.filter(doc=>oldDocumentIdLookup.has(doc.id));
 const oldExpenses=allExpenses.filter(expense=>(expense.sourceBookingId&&oldBookingIdSet.has(expense.sourceBookingId))||(expense.sourceDocumentId&&oldDocumentIdLookup.has(expense.sourceDocumentId))),oldExpenseIds=oldExpenses.map(item=>item.id);
 const replacedGroups=new Set([...oldBookings.map(item=>item.documentId?`document:${item.documentId}`:`manual:${item.bookedAt}`),...oldDocuments.map(item=>`document:${item.id}`)]);
 const now=new Date().toISOString(),bookedAt=input.bookedAt??now,originalCurrency=input.currency.trim().toUpperCase(),decision=decideReportingCurrency(originalCurrency),category=input.kind==="flight"?"機票(自行刷卡)":"住宿";
 const bookingIds:string[]=[],agendaIds:string[]=[],writes=[];
 if(oldExpenseIds.length)writes.push(db.update(uploadedDocuments).set({linkedExpenseId:null,updatedAt:now}).where(and(eq(uploadedDocuments.ownerEmail,user.email),inArray(uploadedDocuments.linkedExpenseId,oldExpenseIds))));
 if(oldBookingIds.length)writes.push(db.delete(agendaItems).where(and(eq(agendaItems.tripId,id),inArray(agendaItems.notes,oldBookingIds.map(bookingId=>`booking:${bookingId}`)))));
 if(oldExpenseIds.length)writes.push(db.delete(personalExpenses).where(and(eq(personalExpenses.ownerEmail,user.email),inArray(personalExpenses.id,oldExpenseIds))));
 if(oldBookingIds.length)writes.push(db.delete(travelBookings).where(and(eq(travelBookings.tripId,id),eq(travelBookings.ownerEmail,user.email),inArray(travelBookings.id,oldBookingIds))));
 if(oldDocumentIds.length){
  writes.push(db.delete(masterDataExceptions).where(and(eq(masterDataExceptions.ownerEmail,user.email),eq(masterDataExceptions.sourceType,"uploaded_document"),inArray(masterDataExceptions.sourceId,oldDocumentIds))));
  writes.push(db.delete(uploadedDocuments).where(and(eq(uploadedDocuments.tripId,id),eq(uploadedDocuments.ownerEmail,user.email),inArray(uploadedDocuments.id,oldDocumentIds))));
 }
 for(let index=0;index<legs.length;index++){
  const leg=legs[index],bookingId=crypto.randomUUID(),agendaId=crypto.randomUUID();bookingIds.push(bookingId);agendaIds.push(agendaId);
  writes.push(db.insert(travelBookings).values({id:bookingId,tripId:id,ownerEmail:user.email,kind:input.kind,title:leg.title!.trim(),startAt:leg.startAt!,endAt:leg.endAt!,timezone:leg.timezone,origin:leg.origin!.trim(),destination:leg.destination!.trim(),amountMinor:index===0?input.amountMinor!:0,currency:originalCurrency,bookedAt,documentId:input.documentId,version:1,createdAt:now,updatedAt:now}));
  writes.push(db.insert(agendaItems).values({id:agendaId,tripId:id,type:input.kind==="flight"?"交通/車程":"住宿",title:leg.title!.trim(),startsAt:leg.startAt!,endsAt:leg.endAt!,timezone:leg.timezone,place:[leg.origin,leg.destination].filter(Boolean).join(" → "),notes:`booking:${bookingId}`,createdByEmail:user.email,updatedByEmail:user.email,version:1,createdAt:now,updatedAt:now}));
 }
 const expenseId=crypto.randomUUID(),first=legs[0];
 writes.push(db.insert(personalExpenses).values({id:expenseId,ownerEmail:user.email,tripId:id,sourceDocumentId:input.documentId,sourceBookingId:bookingIds[0],category,categoryCode:managedClaimTypeCode(category),merchant:first.title!.trim(),expenseDate:first.startAt!.slice(0,10),originalAmountMinor:input.amountMinor!,originalCurrency,reportingAmountMinor:decision.requiresTwd?null:input.amountMinor!,reportingCurrency:decision.reportingCurrency,currencyDecisionReason:decision.reason,amountMinor:decision.requiresTwd?0:input.amountMinor!,currency:decision.reportingCurrency,status:"review",masterDataVersion:MASTER_DATA_VERSION,createdAt:now,updatedAt:now}));
 await db.batch(writes);
 let objectDeleteFailures=0;
 if(oldDocuments.length){const {env}=await import("cloudflare:workers");const results=await Promise.allSettled(oldDocuments.map(doc=>env.BUCKET.delete(doc.objectKey)));objectDeleteFailures=results.filter(result=>result.status==="rejected").length;}
 await recordAudit({tripId:id,actorEmail:user.email,entityType:"travel_order",entityId:input.documentId??bookingIds[0],action:"replace_order_graph",before:{replacedGroups:[...replacedGroups],oldBookingIds,oldDocumentIds,oldExpenseIds},after:{kind:input.kind,bookingIds,agendaIds,expenseId,documentId:input.documentId,bookedAt,objectDeleteFailures}});
 return NextResponse.json({saved:true,replacedOrders:replacedGroups.size,bookingsCreated:bookingIds.length,bookingIds,agendaIds,expenseId,documentId:input.documentId,objectDeleteFailures},{status:201});
}
