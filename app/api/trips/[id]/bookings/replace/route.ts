import {NextRequest,NextResponse} from "next/server";
import {and,eq,inArray,isNull} from "drizzle-orm";
import {getChatGPTUser} from "../../../../../chatgpt-auth";
import {getDb} from "../../../../../../db";
import {recordAudit,requireTripMember} from "../../../../../../db/access";
import {queueObjectDeletionWrite,reconcileQueuedObjectDeletionResult,retryPendingObjectDeletions} from "../../../../../../db/object-deletion-queue";
import {deleteObjectKeysWithRetry} from "../../../../../../db/object-storage";
import {agendaItems,masterDataExceptions,personalExpenses,travelBookings,uploadedDocuments} from "../../../../../../db/schema";
import {decideReportingCurrency,managedClaimTypeCode,MASTER_DATA_VERSION} from "../../../../../managed-config";
import {resolveAirportTimezone} from "../../../../../travel-timezone";
import {flightTiming,isValidIanaTimezone} from "../../../../../timezone-utils";

type Leg={title?:string;startAt?:string;endAt?:string;timezone?:string;departureTimezone?:string;arrivalTimezone?:string;origin?:string;destination?:string};
type Input={kind?:"flight"|"stay";legs?:Leg[];amountMinor?:number;currency?:string;documentId?:string;bookedAt?:string};
const isTravelDocument=(documentType:string,kind:"flight"|"stay")=>kind==="flight"?(documentType==="flight"||documentType.includes("機票")):(documentType==="stay"||documentType.includes("住宿"));

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser(),{id}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const input=await request.json() as Input,legs=input.legs??[];
 if(!input.kind||!legs.length||!Number.isInteger(input.amountMinor)||input.amountMinor!<0||!input.currency?.trim()||!/^[A-Za-z]{3}$/.test(input.currency.trim()))return NextResponse.json({error:"invalid_input"},{status:400});
 const invalidLeg=input.kind==="flight"?legs.some(leg=>!leg.title?.trim()||!leg.startAt||!leg.endAt||!leg.origin?.trim()||!leg.destination?.trim()):legs.some(leg=>!leg.title?.trim()||!leg.startAt||!leg.endAt);
 if(invalidLeg)return NextResponse.json({error:"invalid_leg"},{status:400});
 const normalizedLegs=legs.map((leg,index)=>{
  const origin=leg.origin?.trim().toUpperCase()||null,destination=leg.destination?.trim().toUpperCase()||null;
  if(input.kind!=="flight")return {...leg,origin,destination,departureTimezone:null,arrivalTimezone:null,departureUtcAt:null,arrivalUtcAt:null};
  const departureTimezone=leg.departureTimezone?.trim()||resolveAirportTimezone(origin).timezone,arrivalTimezone=leg.arrivalTimezone?.trim()||resolveAirportTimezone(destination).timezone;
  if(!departureTimezone||!arrivalTimezone)return {error:"timezone_required",index,origin,destination,departureTimezone,arrivalTimezone};
  if(!isValidIanaTimezone(departureTimezone)||!isValidIanaTimezone(arrivalTimezone))return {error:"invalid_timezone",index,origin,destination,departureTimezone,arrivalTimezone};
  const timing=flightTiming({departureLocalAt:leg.startAt!,departureTimezone,arrivalLocalAt:leg.endAt!,arrivalTimezone});
  if(!timing)return {error:"invalid_zoned_time",index,origin,destination,departureTimezone,arrivalTimezone};
  return {...leg,origin,destination,departureTimezone,arrivalTimezone,departureUtcAt:timing.departureUtcAt,arrivalUtcAt:timing.arrivalUtcAt,durationMinutes:timing.durationMinutes,timezoneDifferenceMinutes:timing.timezoneDifferenceMinutes};
 });
 const timezoneError=normalizedLegs.find((leg:any)=>leg.error) as any;
 if(timezoneError)return NextResponse.json({error:timezoneError.error,legIndex:timezoneError.index,origin:timezoneError.origin,destination:timezoneError.destination,message:timezoneError.error==="timezone_required"?"無法從機場主檔確定出發／抵達時區，請確認兩端 IANA 時區後再同步":timezoneError.error==="invalid_timezone"?"時區格式無效，請使用例如 Asia/Taipei、Europe/Amsterdam 的 IANA 時區":"當地時間與時區無法轉成有效的絕對時間，請確認日期、時間與夏令時間"},{status:400});
 const db=await getDb();
 const priorCleanup=await retryPendingObjectDeletions({ownerEmail:user.email,tripId:id}).catch(()=>({attempted:0,deleted:0,remaining:0}));

 // Any supplied document is a formal source record. Validate it before reading/deleting the old order graph.
 let validatedDocument:null|typeof uploadedDocuments.$inferSelect=null;
 if(input.documentId){
  const [document]=await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.id,input.documentId),eq(uploadedDocuments.tripId,id),eq(uploadedDocuments.ownerEmail,user.email),isNull(uploadedDocuments.deletedAt))).limit(1);
  if(!document)return NextResponse.json({error:"invalid_document",message:"找不到這份本人且屬於目前出差的有效文件，請重新上傳"},{status:400});
  if(!isTravelDocument(document.documentType,input.kind))return NextResponse.json({error:"document_kind_mismatch",message:input.kind==="flight"?"此文件不是機票，不能用來建立班機訂單":"此文件不是住宿文件，不能用來建立住宿訂單"},{status:400});
  if(!["review","ready"].includes(document.status))return NextResponse.json({error:"document_not_ready",message:"文件尚未完成辨識，請重新上傳或完成辨識後再同步"},{status:409});
  const [linkedBookings,linkedExpenses]=await Promise.all([
   db.select({id:travelBookings.id,kind:travelBookings.kind}).from(travelBookings).where(and(eq(travelBookings.documentId,input.documentId),eq(travelBookings.tripId,id),eq(travelBookings.ownerEmail,user.email),isNull(travelBookings.deletedAt))),
   db.select({id:personalExpenses.id}).from(personalExpenses).where(and(eq(personalExpenses.sourceDocumentId,input.documentId),eq(personalExpenses.tripId,id),eq(personalExpenses.ownerEmail,user.email),isNull(personalExpenses.deletedAt))),
  ]);
  if(linkedBookings.some(booking=>booking.kind!==input.kind))return NextResponse.json({error:"document_in_use_other_kind",message:"這份文件已被另一種 travel order 使用，請重新上傳正確文件"},{status:409});
  const sameKindRetry=linkedBookings.some(booking=>booking.kind===input.kind);
  if((document.confirmedAt||linkedExpenses.length>0)&&!sameKindRetry)return NextResponse.json({error:"document_already_used",message:"這份文件已被正式資料使用，不能重新綁定為新的 travel order"},{status:409});
  validatedDocument=document;
 }

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
 // Persist deletion tombstones in the same atomic D1 replace batch, then clear them only after R2 confirms deletion.
 for(const document of oldDocuments)writes.push(queueObjectDeletionWrite(db,{ownerEmail:user.email,tripId:id,objectKey:document.objectKey,sourceType:"uploaded_document",sourceId:document.id,now}));
 if(oldExpenseIds.length)writes.push(db.update(uploadedDocuments).set({linkedExpenseId:null,updatedAt:now}).where(and(eq(uploadedDocuments.ownerEmail,user.email),inArray(uploadedDocuments.linkedExpenseId,oldExpenseIds))));
 if(oldBookingIds.length)writes.push(db.delete(agendaItems).where(and(eq(agendaItems.tripId,id),inArray(agendaItems.notes,oldBookingIds.map(bookingId=>`booking:${bookingId}`)))));
 if(oldExpenseIds.length)writes.push(db.delete(personalExpenses).where(and(eq(personalExpenses.ownerEmail,user.email),inArray(personalExpenses.id,oldExpenseIds))));
 if(oldBookingIds.length)writes.push(db.delete(travelBookings).where(and(eq(travelBookings.tripId,id),eq(travelBookings.ownerEmail,user.email),inArray(travelBookings.id,oldBookingIds))));
 if(oldDocumentIds.length){
  writes.push(db.delete(masterDataExceptions).where(and(eq(masterDataExceptions.ownerEmail,user.email),eq(masterDataExceptions.sourceType,"uploaded_document"),inArray(masterDataExceptions.sourceId,oldDocumentIds))));
  writes.push(db.delete(uploadedDocuments).where(and(eq(uploadedDocuments.tripId,id),eq(uploadedDocuments.ownerEmail,user.email),inArray(uploadedDocuments.id,oldDocumentIds))));
 }
 for(let index=0;index<normalizedLegs.length;index++){
  const leg=normalizedLegs[index] as any,bookingId=crypto.randomUUID(),agendaId=crypto.randomUUID(),origin=leg.origin||null,destination=leg.destination||null,place=input.kind==="stay"?(destination||origin||leg.title!.trim()):[origin,destination].filter(Boolean).join(" → ");bookingIds.push(bookingId);agendaIds.push(agendaId);
  writes.push(db.insert(travelBookings).values({id:bookingId,tripId:id,ownerEmail:user.email,kind:input.kind,title:leg.title!.trim(),startAt:leg.startAt!,endAt:leg.endAt!,timezone:input.kind==="flight"?leg.departureTimezone:leg.timezone,departureTimezone:input.kind==="flight"?leg.departureTimezone:null,departureUtcAt:input.kind==="flight"?leg.departureUtcAt:null,arrivalTimezone:input.kind==="flight"?leg.arrivalTimezone:null,arrivalUtcAt:input.kind==="flight"?leg.arrivalUtcAt:null,origin,destination,amountMinor:index===0?input.amountMinor!:0,currency:originalCurrency,bookedAt,documentId:validatedDocument?.id,version:1,createdAt:now,updatedAt:now}));
  writes.push(db.insert(agendaItems).values({id:agendaId,tripId:id,type:input.kind==="flight"?"交通/車程":"住宿",title:leg.title!.trim(),startsAt:leg.startAt!,endsAt:leg.endAt!,timezone:input.kind==="flight"?leg.departureTimezone:leg.timezone,place,notes:`booking:${bookingId}`,createdByEmail:user.email,updatedByEmail:user.email,version:1,createdAt:now,updatedAt:now}));
 }
 const expenseId=crypto.randomUUID(),first=normalizedLegs[0] as any;
 writes.push(db.insert(personalExpenses).values({id:expenseId,ownerEmail:user.email,tripId:id,sourceDocumentId:validatedDocument?.id,sourceBookingId:bookingIds[0],category,categoryCode:managedClaimTypeCode(category),merchant:first.title!.trim(),expenseDate:first.startAt!.slice(0,10),originalAmountMinor:input.amountMinor!,originalCurrency,reportingAmountMinor:decision.requiresTwd?null:input.amountMinor!,reportingCurrency:decision.reportingCurrency,currencyDecisionReason:decision.reason,amountMinor:decision.requiresTwd?0:input.amountMinor!,currency:decision.reportingCurrency,status:"review",masterDataVersion:MASTER_DATA_VERSION,createdAt:now,updatedAt:now}));
 await db.batch(writes);
 const oldObjectKeys=oldDocuments.map(doc=>doc.objectKey),objectCleanup=await deleteObjectKeysWithRetry(oldObjectKeys),queueState=await reconcileQueuedObjectDeletionResult(oldObjectKeys,objectCleanup);
 const timezoneAudit=input.kind==="flight"?normalizedLegs.map((leg:any)=>({origin:leg.origin,destination:leg.destination,departureTimezone:leg.departureTimezone,departureUtcAt:leg.departureUtcAt,arrivalTimezone:leg.arrivalTimezone,arrivalUtcAt:leg.arrivalUtcAt,durationMinutes:leg.durationMinutes})):undefined;
 await recordAudit({tripId:id,actorEmail:user.email,entityType:"travel_order",entityId:validatedDocument?.id??bookingIds[0],action:"replace_order_graph",before:{replacedGroups:[...replacedGroups],oldBookingIds,oldDocumentIds,oldExpenseIds},after:{kind:input.kind,bookingIds,agendaIds,expenseId,documentId:validatedDocument?.id,bookedAt,timezoneAudit,objectDeleteFailures:objectCleanup.objectDeleteFailures,objectDeleteAttempts:objectCleanup.attemptsUsed,failedObjectKeys:objectCleanup.failedObjectKeys,objectDeleteQueued:queueState.queued,priorCleanupRemaining:priorCleanup.remaining}});
 return NextResponse.json({saved:true,replacedOrders:replacedGroups.size,bookingsCreated:bookingIds.length,bookingIds,agendaIds,expenseId,documentId:validatedDocument?.id,timezoneAudit,objectDeleteFailures:objectCleanup.objectDeleteFailures,objectDeleteAttempts:objectCleanup.attemptsUsed,cleanupPending:queueState.queued>0,cleanupQueued:queueState.queued,priorCleanupRemaining:priorCleanup.remaining},{status:201});
}
