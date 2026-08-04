import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { personalCards } from "../../../db/schema";

export async function GET(){const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});const db=await getDb();const cards=await db.select().from(personalCards).where(eq(personalCards.ownerEmail,user.email)).orderBy(desc(personalCards.updatedAt));return NextResponse.json({cards});}
export async function POST(request:NextRequest){const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});const input=await request.json() as {issuer?:string;label?:string;last4?:string};const last4=String(input.last4??"").replace(/\D/g,"").slice(-4);if(last4.length!==4)return NextResponse.json({error:"invalid_last4"},{status:400});const now=new Date().toISOString();const db=await getDb();const id=crypto.randomUUID();await db.insert(personalCards).values({id,ownerEmail:user.email,issuer:input.issuer?.trim()||"未指定發卡行",label:input.label?.trim()||"我的個人卡",last4,createdAt:now,updatedAt:now});return NextResponse.json({id,saved:true});}
