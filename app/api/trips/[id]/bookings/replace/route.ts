import {NextRequest,NextResponse} from "next/server";
import {and,eq,isNull} from "drizzle-orm";
import {getChatGPTUser} from "../../../../../chatgpt-auth";
import {getDb} from "../../../../../../db";
import {recordAudit,requireTripMember} from "../../../../../../db/access";
import {hardDeleteOrderGraph} from "../../../../../../db/order-graph";
import {agendaItems,personalExpenses,travelBookings} from "../../../../../../db/schema";
import {decideReportingCurrency,managedClaimTypeCode,MASTER_DATA_VERSION} from "../../../../../managed-config";

type Leg={title?:string;startAt?:string;endAt?:string;timezone?:string;origin?:string;destination?:string};
type Input={kind?:"flight"|"stay";legs?:Leg[];amountMinor?:number;currency?:string;documentId?:string;bookedAt?:string};

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser(),{id}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const input=await request.json() as Input,legs=input.legs??[];
 if(!input.kind||!legs.length||!Number.isInteger(input.amountMinor)||!input.currency?.trim())return NextResponse.json({error:"invalid_input"},{status:400});
 if(legs.some(leg=>!leg.title?.trim()||!leg.startAt||!leg.endAt||!leg.origin?.trim()||!leg.destination?.trim()))return NextResponse.json({error:"invalid_leg"},{status:400});
 const db=await getDb();
 const old=await db.select().from(travelBookings).where(and(eq(travelBookings.tripId,id),eq(travelBookings.ownerEmail,user.email),eq(travelBookings.kind,input.kind),isNull(travelBookings.deletedAt)));
 const seen=new Set<string>(),deletedOrders=[] as Array<{bookingIds:string[];documentId:string|null}>;
 for(const booking of old){
  const group=booking.documentId?`document:${booking.documentId}`:`manual:${booking.bookedAt}`;
  if(seen.has(group))continue;seen.add(group);
  const deleted=await hardDeleteOrderGraph({tripId:id,ownerEmail:user.email,bookingId:booking.id});
  deletedOrders.push({bookingIds:deleted.bookingIds,documentId:deleted.documentId});
 }
 const now=new Date().toISOString(),bookedAt=input.bookedAt??now,originalCurrency=input.currency.trim().toUpperCase(),decision=decideReportingCurrency(originalCurrency),category=input.kind==="flight"?"機票(自行刷卡)":"住宿";
 const bookingIds:string[]=[],agendaIds:string[]=[];
 const writes=[];
 for(let index=0;index<legs.length;index++){
  const leg=legs[index],bookingId=crypto.randomUUID(),agendaId=crypto.randomUUID();bookingIds.push(bookingId);agendaIds.push(agendaId);
  writes.push(db.insert(travelBookings).values({id:bookingId,tripId:id,ownerEmail:user.email,kind:input.kind,title:leg.title!.trim(),startAt:leg.startAt!,endAt:leg.endAt!,timezone:leg.timezone,origin:leg.origin!.trim(),destination:leg.destination!.trim(),amountMinor:index===0?input.amountMinor!:0,currency:originalCurrency,bookedAt,documentId:input.documentId,version:1,createdAt:now,updatedAt:now}));
  writes.push(db.insert(agendaItems).values({id:agendaId,tripId:id,type:input.kind==="flight"?"交通/車程":"住宿",title:leg.title!.trim(),startsAt:leg.startAt!,endsAt:leg.endAt!,timezone:leg.timezone,place:[leg.origin,leg.destination].filter(Boolean).join(" → "),notes:`booking:${bookingId}`,createdByEmail:user.email,updatedByEmail:user.email,version:1,createdAt:now,updatedAt:now}));
 }
 const expenseId=crypto.randomUUID(),first=legs[0];
 writes.push(db.insert(personalExpenses).values({id:expenseId,ownerEmail:user.email,tripId:id,sourceDocumentId:input.documentId,sourceBookingId:bookingIds[0],category,categoryCode:managedClaimTypeCode(category),merchant:first.title!.trim(),expenseDate:first.startAt!.slice(0,10),originalAmountMinor:input.amountMinor!,originalCurrency,reportingAmountMinor:decision.requiresTwd?null:input.amountMinor!,reportingCurrency:decision.reportingCurrency,currencyDecisionReason:decision.reason,amountMinor:decision.requiresTwd?0:input.amountMinor!,currency:decision.reportingCurrency,status:"review",masterDataVersion:MASTER_DATA_VERSION,createdAt:now,updatedAt:now}));
 await db.batch(writes);
 await recordAudit({tripId:id,actorEmail:user.email,entityType:"travel_order",entityId:input.documentId??bookingIds[0],action:"replace_order_graph",before:{deletedOrders},after:{kind:input.kind,bookingIds,agendaIds,expenseId,documentId:input.documentId,bookedAt}});
 return NextResponse.json({saved:true,replacedOrders:deletedOrders.length,bookingsCreated:bookingIds.length,bookingIds,agendaIds,expenseId,documentId:input.documentId},{status:201});
}
