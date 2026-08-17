import {NextRequest,NextResponse} from "next/server";
import {and,eq} from "drizzle-orm";
import {getChatGPTUser} from "../../../../../chatgpt-auth";
import {getDb} from "../../../../../../db";
import {recordAudit,requireTripMember} from "../../../../../../db/access";
import {hardDeleteOrderGraph} from "../../../../../../db/order-graph";
import {agendaItems,travelBookings} from "../../../../../../db/schema";

type P={params:Promise<{id:string;itemId:string}>};
const bookingIdFromNotes=(notes?:string|null)=>notes?.match(/^booking:(.+)$/)?.[1]??null;

export async function PATCH(request:NextRequest,{params}:P){
 const user=await getChatGPTUser(),{id,itemId}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const input=await request.json() as {version?:number;type?:string;title?:string;startsAt?:string;endsAt?:string;timezone?:string;place?:string;address?:string;referenceUrl?:string;notes?:string};
 if(!input.version)return NextResponse.json({error:"version_required"},{status:400});
 const db=await getDb();
 const [before]=await db.select().from(agendaItems).where(and(eq(agendaItems.id,itemId),eq(agendaItems.tripId,id))).limit(1);
 if(!before||before.deletedAt)return NextResponse.json({error:"not_found"},{status:404});
 if(bookingIdFromNotes(before.notes))return NextResponse.json({error:"managed_travel_item",message:"機票與住宿行程由原始訂單同步管理，請從訂單資料修改"},{status:409});
 if(before.version!==input.version)return NextResponse.json({error:"edit_conflict",current:before},{status:409});
 const next={type:input.type??before.type,title:input.title?.trim()??before.title,startsAt:input.startsAt??before.startsAt,endsAt:input.endsAt??before.endsAt,timezone:input.timezone??before.timezone,place:input.place??before.place,address:input.address??before.address,referenceUrl:input.referenceUrl??before.referenceUrl,notes:input.notes??before.notes,updatedByEmail:user.email,version:before.version+1,updatedAt:new Date().toISOString()};
 await db.update(agendaItems).set(next).where(and(eq(agendaItems.id,itemId),eq(agendaItems.version,before.version)));
 await recordAudit({tripId:id,actorEmail:user.email,entityType:"agenda_item",entityId:itemId,action:"update",before,after:next});
 return NextResponse.json({saved:true,version:next.version});
}

export async function DELETE(_:NextRequest,{params}:P){
 const user=await getChatGPTUser(),{id,itemId}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const db=await getDb();
 const [before]=await db.select().from(agendaItems).where(and(eq(agendaItems.id,itemId),eq(agendaItems.tripId,id))).limit(1);
 if(!before||before.deletedAt)return NextResponse.json({error:"not_found"},{status:404});
 const bookingId=bookingIdFromNotes(before.notes);
 if(bookingId){
  const [booking]=await db.select().from(travelBookings).where(and(eq(travelBookings.id,bookingId),eq(travelBookings.tripId,id))).limit(1);
  if(!booking)return NextResponse.json({error:"travel_booking_not_found"},{status:404});
  if(booking.ownerEmail!==user.email)return NextResponse.json({error:"travel_booking_owner_only",message:"只有訂單本人可以刪除這筆機票或住宿"},{status:403});
  const deleted=await hardDeleteOrderGraph({tripId:id,ownerEmail:user.email,bookingId});
  await recordAudit({tripId:id,actorEmail:user.email,entityType:"agenda_item",entityId:itemId,action:"hard_delete_travel_order",before,after:{bookingIds:deleted.bookingIds,documentId:deleted.documentId,objectDeleted:deleted.objectDeleted,objectDeleteFailed:deleted.objectDeleteFailed}});
  return NextResponse.json({deleted:true,permanent:true,travelOrder:true,bookingsDeleted:deleted.bookingIds.length,documentDeleted:Boolean(deleted.documentId),objectDeleted:deleted.objectDeleted,objectDeleteFailed:deleted.objectDeleteFailed});
 }
 const now=new Date().toISOString();
 await db.update(agendaItems).set({deletedAt:now,updatedAt:now,updatedByEmail:user.email,version:before.version+1}).where(eq(agendaItems.id,itemId));
 await recordAudit({tripId:id,actorEmail:user.email,entityType:"agenda_item",entityId:itemId,action:"soft_delete",before});
 return NextResponse.json({deleted:true,recoverable:true,travelOrder:false});
}
