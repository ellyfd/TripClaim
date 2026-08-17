import {NextRequest,NextResponse} from "next/server";
import {and,eq} from "drizzle-orm";
import {getChatGPTUser} from "../../../../../chatgpt-auth";
import {getDb} from "../../../../../../db";
import {recordAudit,requireTripMember} from "../../../../../../db/access";
import {hardDeleteOrderGraph} from "../../../../../../db/order-graph";
import {agendaItems,personalExpenses,travelBookings} from "../../../../../../db/schema";
type P={params:Promise<{id:string;bookingId:string}>};

export async function PATCH(request:NextRequest,{params}:P){
 const user=await getChatGPTUser(),{id,bookingId}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const input=await request.json() as {version?:number;title?:string;startAt?:string;endAt?:string;timezone?:string;origin?:string;destination?:string;amountMinor?:number;currency?:string;bookedAt?:string;documentId?:string};
 const db=await getDb();
 const [before]=await db.select().from(travelBookings).where(and(eq(travelBookings.id,bookingId),eq(travelBookings.tripId,id),eq(travelBookings.ownerEmail,user.email))).limit(1);
 if(!before||before.deletedAt)return NextResponse.json({error:"not_found"},{status:404});
 if(before.version!==input.version)return NextResponse.json({error:"edit_conflict",current:before},{status:409});
 const next={title:input.title?.trim()??before.title,startAt:input.startAt??before.startAt,endAt:input.endAt??before.endAt,timezone:input.timezone??before.timezone,origin:input.origin??before.origin,destination:input.destination??before.destination,amountMinor:input.amountMinor??before.amountMinor,currency:input.currency?.toUpperCase()??before.currency,bookedAt:input.bookedAt??before.bookedAt,documentId:input.documentId??before.documentId,version:before.version+1,updatedAt:new Date().toISOString()};
 await db.batch([
  db.update(travelBookings).set(next).where(eq(travelBookings.id,bookingId)),
  db.update(personalExpenses).set({merchant:next.title,expenseDate:next.startAt.slice(0,10),amountMinor:next.amountMinor,currency:next.currency,sourceDocumentId:next.documentId,updatedAt:next.updatedAt}).where(and(eq(personalExpenses.sourceBookingId,bookingId),eq(personalExpenses.ownerEmail,user.email))),
  db.update(agendaItems).set({title:next.title,startsAt:next.startAt,endsAt:next.endAt,timezone:next.timezone,place:[next.origin,next.destination].filter(Boolean).join(" → "),updatedByEmail:user.email,updatedAt:next.updatedAt}).where(and(eq(agendaItems.tripId,id),eq(agendaItems.notes,`booking:${bookingId}`)))
 ]);
 await recordAudit({tripId:id,actorEmail:user.email,entityType:"travel_booking",entityId:bookingId,action:"update",before,after:next});
 return NextResponse.json({saved:true,version:next.version});
}

export async function DELETE(_request:NextRequest,{params}:P){
 const user=await getChatGPTUser(),{id,bookingId}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const db=await getDb();
 const [before]=await db.select().from(travelBookings).where(and(eq(travelBookings.id,bookingId),eq(travelBookings.tripId,id),eq(travelBookings.ownerEmail,user.email))).limit(1);
 if(!before)return NextResponse.json({error:"not_found"},{status:404});
 const deleted=await hardDeleteOrderGraph({tripId:id,ownerEmail:user.email,bookingId});
 await recordAudit({tripId:id,actorEmail:user.email,entityType:"travel_booking",entityId:bookingId,action:"hard_delete_order_graph",before,after:{bookingIds:deleted.bookingIds,documentId:deleted.documentId,objectDeleted:deleted.objectDeleted}});
 return NextResponse.json({deleted:true,permanent:true,bookingsDeleted:deleted.bookingIds.length,documentDeleted:Boolean(deleted.documentId),objectDeleted:deleted.objectDeleted});
}
