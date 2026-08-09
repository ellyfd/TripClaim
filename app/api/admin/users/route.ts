import {NextRequest,NextResponse} from "next/server";
import {eq} from "drizzle-orm";
import {getChatGPTUser} from "../../../chatgpt-auth";
import {recordAudit,requireSystemAdmin} from "../../../../db/access";
import {systemUsers} from "../../../../db/schema";

const roles=["admin","member","finance","viewer"] as const;
type Role=typeof roles[number];
const validEmail=(value:string)=>value.length<=160&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function context(){const user=await getChatGPTUser();if(!user)return {error:NextResponse.json({error:"authentication_required"},{status:401})};const db=await requireSystemAdmin(user);if(!db)return {error:NextResponse.json({error:"admin_required"},{status:403})};return {user,db}}

export async function GET(){const ctx=await context();if(ctx.error)return ctx.error;return NextResponse.json({users:await ctx.db!.select().from(systemUsers).orderBy(systemUsers.createdAt)});}

export async function POST(request:NextRequest){const ctx=await context();if(ctx.error)return ctx.error;const input=await request.json() as {email?:string;displayName?:string;role?:Role},email=(input.email??"").trim().toLowerCase(),role=roles.includes(input.role as Role)?input.role as Role:"member";if(!validEmail(email))return NextResponse.json({error:"invalid_email"},{status:400});const now=new Date().toISOString(),displayName=input.displayName?.trim()||email.split("@")[0];await ctx.db!.insert(systemUsers).values({email,displayName,role,createdByEmail:ctx.user!.email,createdAt:now,updatedAt:now}).onConflictDoNothing();await recordAudit({actorEmail:ctx.user!.email,entityType:"system_user",entityId:email,action:"create",after:{email,displayName,role}});return NextResponse.json({saved:true},{status:201});}

export async function PATCH(request:NextRequest){const ctx=await context();if(ctx.error)return ctx.error;const input=await request.json() as {email?:string;role?:Role},email=(input.email??"").trim().toLowerCase(),role=input.role;if(!validEmail(email)||!role||!roles.includes(role))return NextResponse.json({error:"invalid_user_role"},{status:400});const users=await ctx.db!.select().from(systemUsers),before=users.find(x=>x.email===email);if(!before)return NextResponse.json({error:"not_found"},{status:404});if(before.role==="admin"&&role!=="admin"&&users.filter(x=>x.role==="admin").length===1)return NextResponse.json({error:"last_admin"},{status:409});await ctx.db!.update(systemUsers).set({role,updatedAt:new Date().toISOString()}).where(eq(systemUsers.email,email));await recordAudit({actorEmail:ctx.user!.email,entityType:"system_user",entityId:email,action:"role_change",before,after:{...before,role}});return NextResponse.json({saved:true});}

export async function DELETE(request:NextRequest){const ctx=await context();if(ctx.error)return ctx.error;const email=(request.nextUrl.searchParams.get("email")??"").trim().toLowerCase();if(email===ctx.user!.email)return NextResponse.json({error:"cannot_remove_self"},{status:409});const users=await ctx.db!.select().from(systemUsers),before=users.find(x=>x.email===email);if(!before)return NextResponse.json({error:"not_found"},{status:404});if(before.role==="admin"&&users.filter(x=>x.role==="admin").length===1)return NextResponse.json({error:"last_admin"},{status:409});await ctx.db!.delete(systemUsers).where(eq(systemUsers.email,email));await recordAudit({actorEmail:ctx.user!.email,entityType:"system_user",entityId:email,action:"delete",before});return NextResponse.json({deleted:true});}
