import {NextRequest,NextResponse} from "next/server";
import {eq} from "drizzle-orm";
import {getChatGPTUser} from "../../chatgpt-auth";
import {ensureUser} from "../../../db/access";
import {userProfiles} from "../../../db/schema";

export async function GET(){
 const user=await getChatGPTUser();
 if(!user)return NextResponse.json({displayName:"Elly Cheng",email:"elly@example.com",notificationEmail:"elly@example.com",fullName:"Elly Cheng"});
 const db=await ensureUser(user),[profile]=await db.select().from(userProfiles).where(eq(userProfiles.email,user.email)).limit(1);
 return NextResponse.json({...user,displayName:profile?.displayName??user.displayName,notificationEmail:profile?.notificationEmail??user.email});
}

export async function PATCH(request:NextRequest){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const input=await request.json() as {displayName?:string;notificationEmail?:string},displayName=input.displayName?.trim(),notificationEmail=input.notificationEmail?.trim().toLowerCase();
 if(!displayName||displayName.length>80||!notificationEmail||notificationEmail.length>160||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail))return NextResponse.json({error:"invalid_profile"},{status:400});
 const db=await ensureUser(user);await db.update(userProfiles).set({displayName,notificationEmail,updatedAt:new Date().toISOString()}).where(eq(userProfiles.email,user.email));
 return NextResponse.json({saved:true,displayName,email:user.email,notificationEmail});
}
