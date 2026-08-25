import {NextRequest,NextResponse} from "next/server";
import {and,eq} from "drizzle-orm";
import {getChatGPTUser} from "../../../../chatgpt-auth";
import {getDb} from "../../../../../db";
import {recordAudit,requireTripMember} from "../../../../../db/access";
import {tripCompLeaveOverrides} from "../../../../../db/schema";

async function findOwn(tripId:string,userEmail:string){
 const db=await getDb();
 const [row]=await db.select().from(tripCompLeaveOverrides).where(and(eq(tripCompLeaveOverrides.tripId,tripId),eq(tripCompLeaveOverrides.userEmail,userEmail))).limit(1);
 return {db,row:row??null};
}

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser(),{id}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email))return NextResponse.json({error:"forbidden"},{status:403});
 const {row}=await findOwn(id,user.email);
 return NextResponse.json({overrideHalfUnits:row?.halfUnits??null});
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser(),{id}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const input=await request.json().catch(()=>null) as {halfUnits?:unknown}|null;
 const halfUnits=input?.halfUnits;
 if(typeof halfUnits!=="number"||!Number.isInteger(halfUnits)||halfUnits<0||halfUnits>730)return NextResponse.json({error:"invalid_half_units",message:"補休必須以 0.5 天為單位，且不得小於 0 天或超過 365 天"},{status:400});
 const {db,row}=await findOwn(id,user.email),now=new Date().toISOString();
 let entityId=row?.id;
 if(row)await db.update(tripCompLeaveOverrides).set({halfUnits,updatedAt:now}).where(eq(tripCompLeaveOverrides.id,row.id));
 else{entityId=crypto.randomUUID();await db.insert(tripCompLeaveOverrides).values({id:entityId,tripId:id,userEmail:user.email,halfUnits,updatedAt:now})}
 await recordAudit({tripId:id,actorEmail:user.email,entityType:"comp_leave_override",entityId:entityId!,action:row?"update":"create",before:row?{halfUnits:row.halfUnits}:undefined,after:{halfUnits}});
 return NextResponse.json({saved:true,overrideHalfUnits:halfUnits});
}

export async function DELETE(_:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser(),{id}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const {db,row}=await findOwn(id,user.email);
 if(row){
  await db.delete(tripCompLeaveOverrides).where(eq(tripCompLeaveOverrides.id,row.id));
  await recordAudit({tripId:id,actorEmail:user.email,entityType:"comp_leave_override",entityId:row.id,action:"reset",before:{halfUnits:row.halfUnits},after:{halfUnits:null}});
 }
 return NextResponse.json({saved:true,overrideHalfUnits:null});
}
