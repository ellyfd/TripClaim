import {NextRequest,NextResponse} from "next/server";
import {desc,eq} from "drizzle-orm";
import {getChatGPTUser} from "../../chatgpt-auth";
import {ensureUser,recordAudit} from "../../../db/access";
import {MASTER_DATA_VERSION,validateDestinationMaster} from "../../../db/company-master";
import {agendaItems,travelBookings,tripDestinations,tripMembers,tripMemberTodos,trips} from "../../../db/schema";

export async function GET(){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const db=await ensureUser(user),memberships=await db.select().from(tripMembers).where(eq(tripMembers.userEmail,user.email)),ids=new Set(memberships.map(x=>x.tripId));
 const [all,destinations,agenda,bookings,todos]=await Promise.all([db.select().from(trips).orderBy(desc(trips.updatedAt)),db.select().from(tripDestinations),db.select().from(agendaItems),db.select().from(travelBookings),db.select().from(tripMemberTodos)]);
 return NextResponse.json({trips:all.filter(x=>ids.has(x.id)&&x.status!=="archived").map(trip=>{const ownBookings=bookings.filter(x=>x.tripId===trip.id&&x.ownerEmail===user.email&&!x.deletedAt),ownTodos=todos.filter(x=>x.tripId===trip.id&&x.userEmail===user.email&&x.checked),checks=[agenda.some(x=>x.tripId===trip.id&&!x.deletedAt),ownBookings.some(x=>x.kind==="flight"),ownBookings.some(x=>x.kind==="stay"),ownTodos.some(x=>x.itemKey==="travel_request"),ownTodos.some(x=>x.itemKey==="internet")];return{...trip,destinations:destinations.filter(x=>x.tripId===trip.id).sort((a,b)=>a.sequence-b.sequence),progress:Math.round(checks.filter(Boolean).length/checks.length*100),remaining:checks.filter(x=>!x).length}})});
}

export async function POST(request:NextRequest){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const input=await request.json() as {name?:string;purpose?:string;startsOn?:string;endsOn?:string;destinations?:Array<{countryCode:string;countryName:string;cityCode?:string;cityName:string;timezone?:string}>};if(!input.name?.trim()||!input.startsOn||!input.endsOn)return NextResponse.json({error:"invalid_input"},{status:400});
 const db=await ensureUser(user),resolved=await Promise.all((input.destinations??[]).map(async x=>({...x,validation:await validateDestinationMaster(x)})));if(!resolved.length||resolved.some(x=>!x.validation.destination))return NextResponse.json({error:"invalid_destination_master_data"},{status:400});
 const masterDataVersion=resolved[0].validation.masterDataVersion;if(masterDataVersion!==MASTER_DATA_VERSION)return NextResponse.json({error:"master_data_version_mismatch"},{status:409});const now=new Date().toISOString(),id=crypto.randomUUID();await db.batch([db.insert(trips).values({id,name:input.name.trim(),purpose:input.purpose?.trim(),startsOn:input.startsOn,endsOn:input.endsOn,createdByEmail:user.email,status:"draft",masterDataVersion,createdAt:now,updatedAt:now}),db.insert(tripMembers).values({id:crypto.randomUUID(),tripId:id,userEmail:user.email,role:"creator",joinedAt:now}),...resolved.map((x,i)=>db.insert(tripDestinations).values({id:crypto.randomUUID(),tripId:id,countryCode:x.validation.destination!.countryCode,countryName:x.validation.destination!.countryName,cityCode:x.validation.destination!.cityCode,cityName:x.validation.destination!.cityName,timezone:x.timezone,sequence:i}))]);await recordAudit({tripId:id,actorEmail:user.email,entityType:"trip",entityId:id,action:"create",after:{...input,masterDataVersion,destinations:resolved.map(x=>x.validation.destination)}});return NextResponse.json({id,saved:true,masterDataVersion},{status:201});
}
