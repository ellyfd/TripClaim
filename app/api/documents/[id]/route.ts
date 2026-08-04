import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { recordAudit, requireTripMember } from "../../../../db/access";
import { agendaItems, personalExpenses, travelBookings, uploadedDocuments } from "../../../../db/schema";

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser(); if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const {id}=await params; const db=await getDb(); const [doc]=await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.id,id),eq(uploadedDocuments.ownerEmail,user.email))).limit(1);
 if(!doc)return NextResponse.json({error:"not_found"},{status:404});
 if(!await requireTripMember(doc.tripId,user.email))return NextResponse.json({error:"forbidden"},{status:403});
 const {env}=await import("cloudflare:workers"); const object=await env.BUCKET.get(doc.objectKey); if(!object)return NextResponse.json({error:"content_missing"},{status:404});
 const download=request.nextUrl.searchParams.get("download")==="1",name=download?(doc.suggestedName||doc.originalName):doc.originalName;
 return new Response(object.body,{headers:{"content-type":doc.mimeType,"content-disposition":`${download?"attachment":"inline"}; filename*=UTF-8''${encodeURIComponent(name)}`,"cache-control":"private, no-store"}});
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser(); if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const {id}=await params; const input=await request.json() as {claimType?:string;expenseDate?:string;merchant?:string;currency?:string;amountMinor?:number;paymentMethod?:"cash"|"credit_card"|"other";cardLast4?:string;suggestedName?:string;status?:"review"|"ready"};
 const safeName=input.suggestedName?.replace(/[^\p{L}\p{N}._-]+/gu,"-").slice(0,180); const db=await getDb();const [before]=await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.id,id),eq(uploadedDocuments.ownerEmail,user.email))).limit(1);if(!before)return NextResponse.json({error:"not_found"},{status:404});if(!await requireTripMember(before.tripId,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const now=new Date().toISOString();const result=await db.update(uploadedDocuments).set({claimType:input.claimType,expenseDate:input.expenseDate,merchant:input.merchant,currency:input.currency,amountMinor:input.amountMinor,paymentMethod:input.paymentMethod,cardLast4:input.paymentMethod==="credit_card"?input.cardLast4:null,suggestedName:safeName,status:input.status??"review",updatedAt:now}).where(and(eq(uploadedDocuments.id,id),eq(uploadedDocuments.ownerEmail,user.email))).returning({id:uploadedDocuments.id,tripId:uploadedDocuments.tripId});
 if(!result.length)return NextResponse.json({error:"not_found"},{status:404});
 if(input.status==="ready"&&input.expenseDate&&input.merchant&&input.currency&&typeof input.amountMinor==="number"){
  const [existing]=await db.select({id:personalExpenses.id}).from(personalExpenses).where(and(eq(personalExpenses.sourceDocumentId,id),eq(personalExpenses.ownerEmail,user.email))).limit(1);const values={tripId:result[0].tripId,ownerEmail:user.email,sourceDocumentId:id,category:input.claimType??"其他",merchant:input.merchant,expenseDate:input.expenseDate,amountMinor:input.amountMinor,currency:input.currency,cardLast4:input.paymentMethod==="credit_card"?input.cardLast4:null,status:"ready" as const,updatedAt:now};if(existing)await db.update(personalExpenses).set(values).where(eq(personalExpenses.id,existing.id));else await db.insert(personalExpenses).values({id:crypto.randomUUID(),...values,createdAt:now});
 }
 await recordAudit({tripId:before.tripId,actorEmail:user.email,entityType:"uploaded_document",entityId:id,action:"confirm",before,after:input});
 return NextResponse.json({saved:true,id});
}

export async function DELETE(_request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});const {id}=await params,db=await getDb();const [doc]=await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.id,id),eq(uploadedDocuments.ownerEmail,user.email))).limit(1);if(!doc)return NextResponse.json({error:"not_found"},{status:404});if(!await requireTripMember(doc.tripId,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const bookings=await db.select().from(travelBookings).where(and(eq(travelBookings.documentId,id),eq(travelBookings.ownerEmail,user.email),eq(travelBookings.tripId,doc.tripId))),now=new Date().toISOString();
 const {env}=await import("cloudflare:workers");await env.BUCKET.delete(doc.objectKey);
 const writes=[db.delete(personalExpenses).where(and(eq(personalExpenses.sourceDocumentId,id),eq(personalExpenses.ownerEmail,user.email))),db.delete(uploadedDocuments).where(and(eq(uploadedDocuments.id,id),eq(uploadedDocuments.ownerEmail,user.email)))];
 for(const booking of bookings)writes.push(db.update(travelBookings).set({deletedAt:now,updatedAt:now,version:booking.version+1}).where(eq(travelBookings.id,booking.id)));
 for(const booking of bookings)writes.push(db.update(agendaItems).set({deletedAt:now,updatedAt:now,updatedByEmail:user.email}).where(and(eq(agendaItems.tripId,doc.tripId),eq(agendaItems.notes,`booking:${booking.id}`))));
 await db.batch(writes);await recordAudit({tripId:doc.tripId,actorEmail:user.email,entityType:"uploaded_document",entityId:id,action:"cascade_delete",before:{originalName:doc.originalName,documentType:doc.documentType,status:doc.status},after:{bookingsDeleted:bookings.map(x=>x.id)}});return NextResponse.json({deleted:true,expenseDeleted:true,bookingsDeleted:bookings.length});
}
