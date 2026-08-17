import {NextRequest,NextResponse} from "next/server";
import {and,asc,eq,isNull} from "drizzle-orm";
import {getChatGPTUser} from "../../../../chatgpt-auth";
import {getDb} from "../../../../../db";
import {requireTripMember} from "../../../../../db/access";
import {travelBookings} from "../../../../../db/schema";

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser(),{id}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email))return NextResponse.json({error:"forbidden"},{status:403});
 const db=await getDb(),bookings=await db.select().from(travelBookings).where(and(eq(travelBookings.tripId,id),isNull(travelBookings.deletedAt))).orderBy(asc(travelBookings.startAt));
 return NextResponse.json({bookings:bookings.map(x=>({...x,canEdit:x.ownerEmail===user.email,attachmentUrl:x.documentId?`/api/trips/${id}/bookings/${x.id}/attachment`:null}))});
}

export async function POST(_:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser(),{id}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 return NextResponse.json({error:"replace_required",message:"新增或更新機票／住宿必須使用整單 replace 流程，避免重複訂單與殘留行程",endpoint:`/api/trips/${id}/bookings/replace`},{status:409});
}
