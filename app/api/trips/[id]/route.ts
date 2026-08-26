import {NextRequest,NextResponse} from "next/server";
import {and,eq} from "drizzle-orm";
import {getChatGPTUser} from "../../../chatgpt-auth";
import {getDb} from "../../../../db";
import {recordAudit,requireTripMember} from "../../../../db/access";
import {MASTER_DATA_VERSION,validateDestinationMaster} from "../../../../db/company-master";
import {tripDestinations,trips} from "../../../../db/schema";
type Context={params:Promise<{id:string}>};

export async function PATCH(request:NextRequest,{params}:Context){
 const user=await getChatGPTUser(),{id}=await params;if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const input=await request.json() as {name?:string;purpose?:string;startsOn?:string;endsOn?:string;destinations?:Array<{countryCode:string;countryName:string;cityName:string}>};if(!input.name?.trim()||!input.startsOn||!input.endsOn)return NextResponse.json({error:"invalid_input"},{status:400});
 const resolved=await Promise.all((input.destinations??[]).map(x=>validateDestinationMaster(x)));if(!resolved.length||resolved.some(x=>!x.destination))return NextResponse.json({error:"invalid_destination_master_data"},{status:400});
 const masterDataVersion=resolved[0].masterDataVersion;if(masterDataVersion!==MASTER_DATA_VERSION)return NextResponse.json({error:"master_data_version_mismatch"},{status:409});
 const db=await getDb(),[before]=await db.select().from(trips).where(eq(trips.id,id)).limit(1);if(!before)return NextResponse.json({error:"not_found"},{status:404});
 const now=new Date().toISOString();await db.batch([db.update(trips).set({name:input.name.trim(),purpose:input.purpose?.trim(),startsOn:input.startsOn,endsOn:input.endsOn,masterDataVersion,updatedAt:now}).where(eq(trips.id,id)),db.delete(tripDestinations).where(eq(tripDestinations.tripId,id)),...resolved.map((x,i)=>db.insert(tripDestinations).values({id:crypto.randomUUID(),tripId:id,countryCode:x.destination!.countryCode,countryName:x.destination!.countryName,cityCode:x.destination!.cityCode,cityName:x.destination!.cityName,sequence:i}))]);await recordAudit({tripId:id,actorEmail:user.email,entityType:"trip",entityId:id,action:"update",before,after:{...input,masterDataVersion,destinations:resolved.map(x=>x.destination)}});return NextResponse.json({saved:true,masterDataVersion});
}

export async function DELETE(_:NextRequest,{params}:Context){
 const user=await getChatGPTUser(),{id}=await params;if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const member=await requireTripMember(id,user.email,{write:true});if(!member)return NextResponse.json({error:"forbidden"},{status:403});
 const db=await getDb(),[trip]=await db.select().from(trips).where(and(eq(trips.id,id),eq(trips.createdByEmail,user.email))).limit(1);if(!trip)return NextResponse.json({error:"creator_only"},{status:403});
 await db.update(trips).set({status:"archived",updatedAt:new Date().toISOString()}).where(eq(trips.id,id));await recordAudit({tripId:id,actorEmail:user.email,entityType:"trip",entityId:id,action:"archive",before:trip});return NextResponse.json({deleted:true,recoverable:true});
}
