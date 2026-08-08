import {NextRequest,NextResponse} from "next/server";
import {and,asc,eq,isNull} from "drizzle-orm";
import {getChatGPTUser} from "../../../../chatgpt-auth";
import {getDb} from "../../../../../db";
import {recordAudit,requireTripMember} from "../../../../../db/access";
import {agendaItems,personalExpenses,travelBookings} from "../../../../../db/schema";
import {decideReportingCurrency,MASTER_DATA_VERSION} from "../../../../managed-config";

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser(),{id}=await params;if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email))return NextResponse.json({error:"forbidden"},{status:403});
 const db=await getDb(),bookings=await db.select().from(travelBookings).where(and(eq(travelBookings.tripId,id),isNull(travelBookings.deletedAt))).orderBy(asc(travelBookings.startAt));
 return NextResponse.json({bookings:bookings.map(x=>({...x,canEdit:x.ownerEmail===user.email,attachmentUrl:x.documentId?`/api/trips/${id}/bookings/${x.id}/attachment`:null}))});
}

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser(),{id}=await params;if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const input=await request.json() as {kind?:"flight"|"stay";title?:string;startAt?:string;endAt?:string;timezone?:string;origin?:string;destination?:string;amountMinor?:number;currency?:string;bookedAt?:string;documentId?:string;createExpense?:boolean};
 if(!input.kind||!input.title?.trim()||!input.startAt||!input.endAt||!Number.isInteger(input.amountMinor)||!input.currency||!input.bookedAt)return NextResponse.json({error:"invalid_input"},{status:400});
 const db=await getDb(),now=new Date().toISOString(),bookingId=crypto.randomUUID(),expenseId=crypto.randomUUID(),agendaId=crypto.randomUUID(),originalCurrency=input.currency.trim().toUpperCase(),decision=decideReportingCurrency(originalCurrency);
 const booking={id:bookingId,tripId:id,ownerEmail:user.email,kind:input.kind,title:input.title.trim(),startAt:input.startAt,endAt:input.endAt,timezone:input.timezone,origin:input.origin,destination:input.destination,amountMinor:input.amountMinor!,currency:originalCurrency,bookedAt:input.bookedAt,documentId:input.documentId,version:1,createdAt:now,updatedAt:now};
 const writes=[
  db.insert(travelBookings).values(booking),
  db.insert(agendaItems).values({id:agendaId,tripId:id,type:input.kind==="flight"?"交通/車程":"住宿",title:booking.title,startsAt:booking.startAt,endsAt:booking.endAt,timezone:booking.timezone,place:[booking.origin,booking.destination].filter(Boolean).join(" → "),notes:`booking:${bookingId}`,createdByEmail:user.email,updatedByEmail:user.email,version:1,createdAt:now,updatedAt:now})
 ];
 const createExpense=input.createExpense!==false;
 if(createExpense)writes.push(db.insert(personalExpenses).values({id:expenseId,ownerEmail:user.email,tripId:id,sourceDocumentId:input.documentId,sourceBookingId:bookingId,category:input.kind==="flight"?"機票(自行刷卡)":"住宿",merchant:booking.title,expenseDate:input.startAt.slice(0,10),originalAmountMinor:booking.amountMinor,originalCurrency,reportingAmountMinor:decision.requiresTwd?null:booking.amountMinor,reportingCurrency:decision.reportingCurrency,currencyDecisionReason:decision.reason,amountMinor:decision.requiresTwd?0:booking.amountMinor,currency:decision.reportingCurrency,status:"review",masterDataVersion:MASTER_DATA_VERSION,createdAt:now,updatedAt:now}));
 await db.batch(writes);
 await recordAudit({tripId:id,actorEmail:user.email,entityType:"travel_booking",entityId:bookingId,action:"create",after:{...booking,expenseId:createExpense?expenseId:null,agendaId}});
 return NextResponse.json({id:bookingId,expenseId:createExpense?expenseId:null,agendaId,version:1,saved:true},{status:201});
}
