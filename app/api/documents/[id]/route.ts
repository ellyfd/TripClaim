import {NextRequest,NextResponse} from "next/server";
import {and,eq,isNull} from "drizzle-orm";
import {getChatGPTUser} from "../../../chatgpt-auth";
import {getDb} from "../../../../db";
import {recordAudit,requireTripMember} from "../../../../db/access";
import {hardDeleteOrderGraph} from "../../../../db/order-graph";
import {deleteObjectKeysWithRetry} from "../../../../db/object-storage";
import {masterDataExceptions,personalExpenses,travelBookings,uploadedDocuments} from "../../../../db/schema";
import {MASTER_DATA_VERSION} from "../../../managed-config";
import {validateExpenseMaster} from "../../../master-data-validation";

const isTravelDocument=(documentType?:string|null)=>Boolean(documentType&&(documentType==="flight"||documentType==="stay"||documentType.includes("機票")||documentType.includes("住宿")));

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const {id}=await params,db=await getDb();const [doc]=await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.id,id),eq(uploadedDocuments.ownerEmail,user.email),isNull(uploadedDocuments.deletedAt))).limit(1);
 if(!doc)return NextResponse.json({error:"not_found"},{status:404});if(!await requireTripMember(doc.tripId,user.email))return NextResponse.json({error:"forbidden"},{status:403});
 const {env}=await import("cloudflare:workers");const object=await env.BUCKET.get(doc.objectKey);if(!object)return NextResponse.json({error:"content_missing"},{status:404});
 const download=request.nextUrl.searchParams.get("download")==="1",name=download?(doc.suggestedName||doc.originalName):doc.originalName;
 return new Response(object.body,{headers:{"content-type":doc.mimeType,"content-disposition":`${download?"attachment":"inline"}; filename*=UTF-8''${encodeURIComponent(name)}`,"cache-control":"private, no-store","x-content-type-options":"nosniff","content-security-policy":"sandbox; default-src 'none'"}});
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const {id}=await params;const input=await request.json() as {claimType?:string;expenseDate?:string;merchant?:string;currency?:string;amountMinor?:number;originalCurrency?:string;originalAmountMinor?:number;reportingCurrency?:string;reportingAmountMinor?:number;paymentMethod?:"cash"|"credit_card"|"other";cardLast4?:string;linkedExpenseId?:string|null;billedTwdMinor?:number|null;suggestedName?:string;status?:"review"|"ready"};
 const db=await getDb();const [before]=await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.id,id),eq(uploadedDocuments.ownerEmail,user.email),isNull(uploadedDocuments.deletedAt))).limit(1);if(!before)return NextResponse.json({error:"not_found"},{status:404});if(!await requireTripMember(before.tripId,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const isCardEvidence=before.documentType.includes("信用卡帳單")||before.documentType.includes("刷卡單");
 if(input.linkedExpenseId){const [owned]=await db.select({id:personalExpenses.id}).from(personalExpenses).where(and(eq(personalExpenses.id,input.linkedExpenseId),eq(personalExpenses.ownerEmail,user.email),eq(personalExpenses.tripId,before.tripId))).limit(1);if(!owned)return NextResponse.json({error:"invalid_expense_link"},{status:400});}
 const originalCurrency=(input.originalCurrency??before.detectedCurrency??before.currency??"TWD").toUpperCase(),master=validateExpenseMaster({claimType:input.claimType,originalCurrency,reportingCurrency:input.reportingCurrency??input.currency});
 if(!isCardEvidence&&!master.claimTypeCode)return NextResponse.json({error:"invalid_claim_type",issues:master.issues},{status:400});
 if(isCardEvidence&&input.claimType&&input.claimType!=="國外交易手續費")return NextResponse.json({error:"card_evidence_is_not_expense",message:"信用卡帳單與刷卡單是付款證明；只有國外交易手續費可另列 TWD 費用"},{status:400});
 const safeName=input.suggestedName?.replace(/[^\p{L}\p{N}._-]+/gu,"-").slice(0,180);
 const originalAmountMinor=input.originalAmountMinor??before.detectedAmountMinor??input.amountMinor??before.amountMinor??0,decision=master.currencyDecision,reportingCurrency=master.reportingCurrency;
 if(master.issues.some(issue=>issue.field==="reportingCurrency"))return NextResponse.json({error:"invalid_reporting_currency",issues:master.issues},{status:400});
 const reportingAmountMinor=input.reportingAmountMinor??(reportingCurrency===originalCurrency?originalAmountMinor:undefined);
 if(input.claimType==="國外交易手續費"&&reportingCurrency!=="TWD")return NextResponse.json({error:"foreign_fee_must_be_twd",message:"國外交易手續費只能以 TWD 報支"},{status:400});
 if(input.status==="ready"&&decision.requiresTwd&&(reportingCurrency!=="TWD"||typeof reportingAmountMinor!=="number"))return NextResponse.json({error:"twd_reporting_amount_required",message:decision.reason},{status:400});
 const now=new Date().toISOString(),confirmedValues={claimType:input.claimType,expenseDate:input.expenseDate,merchant:input.merchant,originalCurrency,originalAmountMinor,reportingCurrency,reportingAmountMinor,paymentMethod:input.paymentMethod,cardLast4:input.cardLast4,linkedExpenseId:input.linkedExpenseId,billedTwdMinor:input.billedTwdMinor,suggestedName:safeName,status:input.status??"review"};
 const result=await db.update(uploadedDocuments).set({claimType:input.claimType,expenseDate:input.expenseDate,merchant:input.merchant,currency:originalCurrency,amountMinor:originalAmountMinor,detectedCurrency:before.detectedCurrency??originalCurrency,detectedAmountMinor:before.detectedAmountMinor??originalAmountMinor,paymentMethod:input.paymentMethod,cardLast4:input.cardLast4||null,linkedExpenseId:isCardEvidence?input.linkedExpenseId||null:null,billedTwdMinor:isCardEvidence?input.billedTwdMinor??null:null,suggestedName:safeName,status:input.status??"review",confirmedValues:JSON.stringify(confirmedValues),confirmedByEmail:user.email,confirmedAt:now,updatedAt:now}).where(and(eq(uploadedDocuments.id,id),eq(uploadedDocuments.ownerEmail,user.email))).returning({id:uploadedDocuments.id,tripId:uploadedDocuments.tripId});
 if(!result.length)return NextResponse.json({error:"not_found"},{status:404});
 const shouldCreateExpense=!isCardEvidence||input.claimType==="國外交易手續費";
 if(input.status==="ready"&&shouldCreateExpense&&input.expenseDate&&input.merchant&&typeof reportingAmountMinor==="number"){
  const [existing]=await db.select({id:personalExpenses.id}).from(personalExpenses).where(and(eq(personalExpenses.sourceDocumentId,id),eq(personalExpenses.ownerEmail,user.email))).limit(1);
  const values={tripId:result[0].tripId,ownerEmail:user.email,sourceDocumentId:id,category:input.claimType,categoryCode:master.claimTypeCode,merchant:input.merchant,expenseDate:input.expenseDate,amountMinor:reportingAmountMinor,currency:reportingCurrency,originalAmountMinor,originalCurrency,reportingAmountMinor,reportingCurrency,currencyDecisionReason:decision.reason,claimedTwdMinor:reportingCurrency==="TWD"?reportingAmountMinor:null,cardLast4:input.paymentMethod==="credit_card"?input.cardLast4:null,status:"ready" as const,masterDataVersion:MASTER_DATA_VERSION,updatedAt:now};
  if(existing)await db.update(personalExpenses).set(values).where(eq(personalExpenses.id,existing.id));else await db.insert(personalExpenses).values({id:crypto.randomUUID(),...values,createdAt:now});
 }
 if(input.status==="ready"&&!shouldCreateExpense)await db.delete(personalExpenses).where(and(eq(personalExpenses.sourceDocumentId,id),eq(personalExpenses.ownerEmail,user.email)));
 await recordAudit({tripId:before.tripId,actorEmail:user.email,entityType:"uploaded_document",entityId:id,action:"confirm",before,after:input});
 return NextResponse.json({saved:true,id});
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const {id}=await params,db=await getDb();const [doc]=await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.id,id),eq(uploadedDocuments.ownerEmail,user.email))).limit(1);
 if(!doc)return NextResponse.json({error:"not_found"},{status:404});if(!await requireTripMember(doc.tripId,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 if(request.nextUrl.searchParams.get("discard")==="1"){
  const [[booking],[expense]]=await Promise.all([
   db.select({id:travelBookings.id}).from(travelBookings).where(and(eq(travelBookings.documentId,id),eq(travelBookings.tripId,doc.tripId),eq(travelBookings.ownerEmail,user.email))).limit(1),
   db.select({id:personalExpenses.id}).from(personalExpenses).where(and(eq(personalExpenses.sourceDocumentId,id),eq(personalExpenses.tripId,doc.tripId),eq(personalExpenses.ownerEmail,user.email))).limit(1),
  ]);
  if(booking||expense||doc.confirmedAt)return NextResponse.json({error:"discard_not_allowed",message:"此文件已被正式資料使用，不能以草稿方式刪除"},{status:409});
  const objectCleanup=await deleteObjectKeysWithRetry([doc.objectKey]);
  if(objectCleanup.objectDeleteFailures){
   await recordAudit({tripId:doc.tripId,actorEmail:user.email,entityType:"uploaded_document",entityId:id,action:"discard_storage_cleanup_failed",before:{originalName:doc.originalName,documentType:doc.documentType,status:doc.status},after:{objectDeleteFailures:objectCleanup.objectDeleteFailures,attemptsUsed:objectCleanup.attemptsUsed}});
   return NextResponse.json({error:"discard_storage_cleanup_failed",message:"附件儲存清理暫時失敗，草稿仍保留；請重試",retryable:true,objectDeleteFailures:objectCleanup.objectDeleteFailures},{status:503});
  }
  await db.batch([
   db.delete(masterDataExceptions).where(and(eq(masterDataExceptions.ownerEmail,user.email),eq(masterDataExceptions.sourceType,"uploaded_document"),eq(masterDataExceptions.sourceId,id))),
   db.delete(uploadedDocuments).where(and(eq(uploadedDocuments.id,id),eq(uploadedDocuments.ownerEmail,user.email),eq(uploadedDocuments.tripId,doc.tripId))),
  ]);
  await recordAudit({tripId:doc.tripId,actorEmail:user.email,entityType:"uploaded_document",entityId:id,action:"discard_unlinked_upload",before:{originalName:doc.originalName,documentType:doc.documentType,status:doc.status,contentHash:doc.contentHash},after:{objectDeleted:true,attemptsUsed:objectCleanup.attemptsUsed}});
  return NextResponse.json({discarded:true,exact:true,objectDeleted:true,objectDeleteAttempts:objectCleanup.attemptsUsed});
 }
 const [linkedBooking]=await db.select({id:travelBookings.id}).from(travelBookings).where(and(eq(travelBookings.documentId,id),eq(travelBookings.tripId,doc.tripId),eq(travelBookings.ownerEmail,user.email),isNull(travelBookings.deletedAt))).limit(1);
 if(isTravelDocument(doc.documentType)||linkedBooking){
  const deleted=await hardDeleteOrderGraph({tripId:doc.tripId,ownerEmail:user.email,bookingId:linkedBooking?.id,documentId:id});
  await recordAudit({tripId:doc.tripId,actorEmail:user.email,entityType:"uploaded_document",entityId:id,action:"hard_delete_order_graph",before:{originalName:doc.originalName,documentType:doc.documentType,status:doc.status},after:{bookingIds:deleted.bookingIds,documentIds:deleted.documentIds,duplicateDocumentsDeleted:deleted.duplicateDocumentsDeleted,objectDeleted:deleted.objectDeleted,objectDeleteFailures:deleted.objectDeleteFailures,objectDeleteAttempts:deleted.objectDeleteAttempts}});
  return NextResponse.json({deleted:true,permanent:true,travel:true,bookingsDeleted:deleted.bookingIds.length,documentDeleted:true,documentsDeleted:deleted.documentIds.length,duplicateDocumentsDeleted:deleted.duplicateDocumentsDeleted,objectDeleted:deleted.objectDeleted,objectDeleteFailures:deleted.objectDeleteFailures,objectDeleteAttempts:deleted.objectDeleteAttempts,cleanupPending:deleted.objectDeleteFailures>0});
 }
 if(doc.deletedAt)return NextResponse.json({deleted:true,recoverable:true,undo:{kind:"document",id}});
 const now=new Date().toISOString();await db.batch([
  db.update(uploadedDocuments).set({deletedAt:now,updatedAt:now}).where(and(eq(uploadedDocuments.id,id),eq(uploadedDocuments.ownerEmail,user.email),eq(uploadedDocuments.tripId,doc.tripId))),
  db.update(personalExpenses).set({deletedAt:now,updatedAt:now}).where(and(eq(personalExpenses.sourceDocumentId,id),eq(personalExpenses.ownerEmail,user.email),eq(personalExpenses.tripId,doc.tripId))),
 ]);
 await recordAudit({tripId:doc.tripId,actorEmail:user.email,entityType:"uploaded_document",entityId:id,action:"soft_delete_graph",before:{originalName:doc.originalName,documentType:doc.documentType,status:doc.status},after:{deletedAt:now,recoverable:true}});
 return NextResponse.json({deleted:true,recoverable:true,travel:false,undo:{kind:"document",id}});
}
