import {NextRequest,NextResponse} from "next/server";
import {and,eq} from "drizzle-orm";
import {getChatGPTUser} from "../../../chatgpt-auth";
import {getDb} from "../../../../db";
import {recordAudit,requireTripMember} from "../../../../db/access";
import {tripDestinations,trips} from "../../../../db/schema";
import {isManagedDestination} from "../../../managed-config";
type Context={params:Promise<{id:string}>};

export async function PATCH(request:NextRequest,{params}:Context){
 const user=await getChatGPTUser(),{id}=await params;if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const input=await request.json() as {name?:string;purpose?:string;startsOn?:string;endsOn?:string;destinations?:Array<{countryCode:string;countryName:string;cityName:string}>};if(!input.name?.trim()||!input.startsOn||!input.endsOn)return NextResponse.json({error:"invalid_input"},{status:400});
 if(!input.destinations?.length||!input.destinations.every(x=>isManagedDestination(x.countryCode,x.countryName,x.cityName)))return NextResponse.json({error:"invalid_destination_master_data"},{status:400});
 const db=await getDb(),[before]=await db.select().from(trips).where(eq(trips.id,id)).limit(1);if(!before)return NextResponse.json({error:"not_found"},{status:404});
 const now=new Date().toISOString();await db.batch([db.update(trips).set({name:input.name.trim(),purpose:input.purpose?.trim(),startsOn:input.startsOn,endsOn:input.endsOn,updatedAt:now}).where(eq(trips.id,id)),db.delete(tripDestinations).where(eq(tripDestinations.tripId,id)),...(input.destinations??[]).map((x,i)=>db.insert(tripDestinations).values({id:crypto.randomUUID(),tripId:id,countryCode:x.countryCode,countryName:x.countryName,cityName:x.cityName,sequence:i}))]);await recordAudit({tripId:id,actorEmail:user.email,entityType:"trip",entityId:id,action:"update",before,after:input});return NextResponse.json({saved:true});
}

export async function DELETE(_:NextRequest,{params}:Context){
 const user=await getChatGPTUser(),{id}=await params;if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const member=await requireTripMember(id,user.email,{write:true});if(!member)return NextResponse.json({error:"forbidden"},{status:403});
 const db=await getDb(),[trip]=await db.select().from(trips).where(and(eq(trips.id,id),eq(trips.createdByEmail,user.email))).limit(1);if(!trip)return NextResponse.json({error:"creator_only"},{status:403});
 await db.update(trips).set({status:"archived",updatedAt:new Date().toISOString()}).where(eq(trips.id,id));await recordAudit({tripId:id,actorEmail:user.email,entityType:"trip",entityId:id,action:"archive",before:trip});return NextResponse.json({deleted:true,recoverable:true});
}
