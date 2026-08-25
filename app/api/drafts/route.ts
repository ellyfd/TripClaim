import {NextRequest,NextResponse} from "next/server";
import {and,eq} from "drizzle-orm";
import {getChatGPTUser} from "../../chatgpt-auth";
import {ensureUser} from "../../../db/access";
import {tripDrafts} from "../../../db/schema";

type DraftFlow="create"|"itinerary"|"expense";
const validFlow=(value:string|null):value is DraftFlow=>value==="create"||value==="itinerary"||value==="expense";

export async function GET(request:NextRequest){const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});const flow=request.nextUrl.searchParams.get("flow");if(!validFlow(flow))return NextResponse.json({error:"flow_required"},{status:400});const db=await ensureUser(user);const [draft]=await db.select().from(tripDrafts).where(and(eq(tripDrafts.ownerEmail,user.email),eq(tripDrafts.flow,flow))).limit(1);return NextResponse.json({draft:draft?{...draft,payload:JSON.parse(draft.payloadJson)}:null})}
export async function PUT(request:NextRequest){const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});const input=await request.json() as {flow?:DraftFlow;step?:number;payload?:unknown};if(!input.flow||!validFlow(input.flow)||!input.step)return NextResponse.json({error:"invalid_input"},{status:400});const db=await ensureUser(user),now=new Date().toISOString(),id=`${user.email}:${input.flow}`;await db.insert(tripDrafts).values({id,ownerEmail:user.email,flow:input.flow,step:input.step,payloadJson:JSON.stringify(input.payload??{}),updatedAt:now}).onConflictDoUpdate({target:tripDrafts.id,set:{step:input.step,payloadJson:JSON.stringify(input.payload??{}),updatedAt:now}});return NextResponse.json({saved:true,updatedAt:now})}
export async function DELETE(request:NextRequest){const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});const flow=request.nextUrl.searchParams.get("flow");if(!validFlow(flow))return NextResponse.json({error:"flow_required"},{status:400});const db=await ensureUser(user);await db.delete(tripDrafts).where(and(eq(tripDrafts.ownerEmail,user.email),eq(tripDrafts.flow,flow)));return NextResponse.json({deleted:true,flow})}
