import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { recordAudit, requireTripMember } from "../../../../db/access";
import { agendaItems, personalExpenses, travelBookings, uploadedDocuments } from "../../../../db/schema";
import {decideReportingCurrency,isManagedClaimType,managedClaimTypeCode,MANAGED_CURRENCY_CODES,MASTER_DATA_VERSION} from "../../../managed-config";

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
 const {id}=await params; const input=await request.json() as {claimType?:string;expenseDate?:string;merchant?:string;currency?:string;amountMinor?:number;originalCurrency?:string;originalAmountMinor?:number;reportingCurrency?:string;reportingAmountMinor?:number;paymentMethod?:"cash"|"credit_card"|"other";cardLast4?:string;suggestedName?:string;status?:"review"|"ready"};
 const db=await getDb();const [before]=await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.id,id),eq(uploadedDocuments.ownerEmail,user.email))).limit(1);if(!before)return NextResponse.json({error:"not_found"},{status:404});if(!await requireTripMember(before.tripId,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const isCardEvidence=before.documentType.includes("信用卡帳單")||before.documentType.includes("刷卡單");
 if(!isCardEvidence&&!isManagedClaimType(input.claimType))return NextResponse.json({error:"invalid_claim_type"},{status:400});
 if(isCardEvidence&&input.claimType&&input.claimType!=="國外交易手續費")return NextResponse.json({error:"card_evidence_is_not_expense",message:"信用卡帳單與刷卡單是付款證明；只有國外交易手續費可另列 TWD 費用"},{status:400});
 const safeName=input.suggestedName?.replace(/[^\p{L}\p{N}._-]+/gu,"-").slice(0,180);
 const originalCurrency=(input.originalCurrency??before.detectedCurrency??before.currency??"TWD").toUpperCase(),originalAmountMinor=input.originalAmountMinor??before.detectedAmountMinor??input.amountMinor??before.amountMinor??0,decision=decideReportingCurrency(originalCurrency),reportingCurrency=(input.reportingCurrency??input.currency??decision.reportingCurrency).toUpperCase();
 if(!MANAGED_CURRENCY_CODES.has(reportingCurrency))return NextResponse.json({error:"invalid_reporting_currency"},{status:400});
 const reportingAmountMinor=input.reportingAmountMinor??(reportingCurrency===originalCurrency?originalAmountMinor:undefined);
 if(input.claimType==="國外交易手續費"&&reportingCurrency!=="TWD")return NextResponse.json({error:"foreign_fee_must_be_twd",message:"國外交易手續費只能以 TWD 報支"},{status:400});
 if(input.status==="ready"&&decision.requiresTwd&&(reportingCurrency!=="TWD"||typeof reportingAmountMinor!=="number"))return NextResponse.json({error:"twd_reporting_amount_required",message:decision.reason},{status:400});
 const now=new Date().toISOString(),confirmedValues={claimType:input.claimType,expenseDate:input.expenseDate,merchant:input.merchant,originalCurrency,originalAmountMinor,reportingCurrency,reportingAmountMinor,paymentMethod:input.paymentMethod,cardLast4:input.paymentMethod==="credit_card"?input.cardLast4:null,suggestedName:safeName,status:input.status??"review"};const result=await db.update(uploadedDocuments).set({claimType:input.claimType,expenseDate:input.expenseDate,merchant:input.merchant,currency:originalCurrency,amountMinor:originalAmountMinor,detectedCurrency:before.detectedCurrency??originalCurrency,detectedAmountMinor:before.detectedAmountMinor??originalAmountMinor,paymentMethod:input.paymentMethod,cardLast4:input.paymentMethod==="credit_card"?input.cardLast4:null,suggestedName:safeName,status:input.status??"review",confirmedValues:JSON.stringify(confirmedValues),confirmedByEmail:user.email,confirmedAt:now,updatedAt:now}).where(and(eq(uploadedDocuments.id,id),eq(uploadedDocuments.ownerEmail,user.email))).returning({id:uploadedDocuments.id,tripId:uploadedDocuments.tripId});
 if(!result.length)return NextResponse.json({error:"not_found"},{status:404});
 const shouldCreateExpense=!isCardEvidence||input.claimType==="國外交易手續費";
 if(input.status==="ready"&&shouldCreateExpense&&input.expenseDate&&input.merchant&&typeof reportingAmountMinor==="number"){
  const [existing]=await db.select({id:personalExpenses.id}).from(personalExpenses).where(and(eq(personalExpenses.sourceDocumentId,id),eq(personalExpenses.ownerEmail,user.email))).limit(1);const values={tripId:result[0].tripId,ownerEmail:user.email,sourceDocumentId:id,category:input.claimType,categoryCode:managedClaimTypeCode(input.claimType),merchant:input.merchant,expenseDate:input.expenseDate,amountMinor:reportingAmountMinor,currency:reportingCurrency,originalAmountMinor,originalCurrency,reportingAmountMinor,reportingCurrency,currencyDecisionReason:decision.reason,claimedTwdMinor:reportingCurrency==="TWD"?reportingAmountMinor:null,cardLast4:input.paymentMethod==="credit_card"?input.cardLast4:null,status:"ready" as const,masterDataVersion:MASTER_DATA_VERSION,updatedAt:now};if(existing)await db.update(personalExpenses).set(values).where(eq(personalExpenses.id,existing.id));else await db.insert(personalExpenses).values({id:crypto.randomUUID(),...values,createdAt:now});
 }
 if(input.status==="ready"&&!shouldCreateExpense)await db.delete(personalExpenses).where(and(eq(personalExpenses.sourceDocumentId,id),eq(personalExpenses.ownerEmail,user.email)));
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
