import {NextRequest,NextResponse} from "next/server";
import {and,eq} from "drizzle-orm";
import {getChatGPTUser} from "../../../../../chatgpt-auth";
import {getDb} from "../../../../../../db";
import {recordAudit,requireTripMember} from "../../../../../../db/access";
import {hardDeleteOrderGraph} from "../../../../../../db/order-graph";
import {travelBookings} from "../../../../../../db/schema";
type P={params:Promise<{id:string;bookingId:string}>};

export async function PATCH(_request:NextRequest,{params}:P){
 const user=await getChatGPTUser(),{id}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 return NextResponse.json({error:"replace_required",message:"機票／住宿必須以整張訂單 replace 更新，不能單獨修改一個航段",endpoint:`/api/trips/${id}/bookings/replace`},{status:409});
}

export async function DELETE(_request:NextRequest,{params}:P){
 const user=await getChatGPTUser(),{id,bookingId}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const db=await getDb();
 const [before]=await db.select().from(travelBookings).where(and(eq(travelBookings.id,bookingId),eq(travelBookings.tripId,id),eq(travelBookings.ownerEmail,user.email))).limit(1);
 if(!before)return NextResponse.json({error:"not_found"},{status:404});
 const deleted=await hardDeleteOrderGraph({tripId:id,ownerEmail:user.email,bookingId});
 await recordAudit({tripId:id,actorEmail:user.email,entityType:"travel_booking",entityId:bookingId,action:"hard_delete_order_graph",before,after:{bookingIds:deleted.bookingIds,documentId:deleted.documentId,documentIds:deleted.documentIds,duplicateDocumentsDeleted:deleted.duplicateDocumentsDeleted,objectDeleted:deleted.objectDeleted,objectDeleteFailures:deleted.objectDeleteFailures}});
 return NextResponse.json({deleted:true,permanent:true,bookingsDeleted:deleted.bookingIds.length,documentDeleted:Boolean(deleted.documentId),documentsDeleted:deleted.documentIds.length,duplicateDocumentsDeleted:deleted.duplicateDocumentsDeleted,objectDeleted:deleted.objectDeleted,objectDeleteFailures:deleted.objectDeleteFailures});
}
