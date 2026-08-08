import {NextRequest,NextResponse} from "next/server";
import {and,eq} from "drizzle-orm";
import {getChatGPTUser} from "../../../chatgpt-auth";
import {getDb} from "../../../../db";
import {recordAudit,requireTripMember} from "../../../../db/access";
import {agendaItems,personalExpenses,travelBookings,uploadedDocuments} from "../../../../db/schema";
import {validateExpenseMaster} from "../../../master-data-validation";
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const {id}=await params,input=await request.json() as {expenseDate?:string;category?:string;merchant?:string;currency?:string;amountMinor?:number;originalCurrency?:string;originalAmountMinor?:number;reportingCurrency?:string;reportingAmountMinor?:number;cardLast4?:string|null;receiptCount?:number;remark?:string;costCenter?:string;exchangeRate?:string;exchangeRateSource?:string;claimedTwdMinor?:number|null},db=await getDb();
 const [before]=await db.select().from(personalExpenses).where(and(eq(personalExpenses.id,id),eq(personalExpenses.ownerEmail,user.email))).limit(1);
 if(!before)return NextResponse.json({error:"not_found"},{status:404});if(!await requireTripMember(before.tripId,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const originalCurrency=(input.originalCurrency||input.currency||before.originalCurrency||before.currency).trim().toUpperCase(),master=validateExpenseMaster({claimType:input.category,originalCurrency,reportingCurrency:input.reportingCurrency||before.reportingCurrency}),originalAmountMinor=input.originalAmountMinor??input.amountMinor??before.originalAmountMinor??before.amountMinor,decision=master.currencyDecision,reportingCurrency=master.reportingCurrency,reportingAmountMinor=input.reportingAmountMinor??input.claimedTwdMinor??before.reportingAmountMinor??(reportingCurrency===originalCurrency?originalAmountMinor:undefined);
 if(!input.expenseDate||!master.valid||!input.merchant||typeof originalAmountMinor!=="number"||originalAmountMinor<0||typeof reportingAmountMinor!=="number"||reportingAmountMinor<0||!Number.isInteger(input.receiptCount)||input.receiptCount<1||!input.costCenter)return NextResponse.json({error:"invalid_master_data",issues:master.issues},{status:400});
 if(decision.requiresTwd&&reportingCurrency!=="TWD")return NextResponse.json({error:"twd_reporting_required",message:decision.reason},{status:400});
 const next={expenseDate:input.expenseDate,category:input.category,categoryCode:master.claimTypeCode,merchant:input.merchant,originalCurrency,originalAmountMinor,reportingCurrency,reportingAmountMinor,currency:reportingCurrency,amountMinor:reportingAmountMinor,cardLast4:input.cardLast4||null,receiptCount:input.receiptCount,remark:input.remark?.trim()||null,costCenter:input.costCenter.trim(),exchangeRate:input.exchangeRate?.trim()||null,exchangeRateSource:input.exchangeRateSource?.trim()||null,currencyDecisionReason:decision.reason,claimedTwdMinor:reportingCurrency==="TWD"?reportingAmountMinor:null,updatedAt:new Date().toISOString()};
 await db.update(personalExpenses).set(next).where(and(eq(personalExpenses.id,id),eq(personalExpenses.ownerEmail,user.email)));await recordAudit({tripId:before.tripId,actorEmail:user.email,entityType:"personal_expense",entityId:id,action:"update",before,after:next});return NextResponse.json({saved:true});
}
export async function DELETE(_request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const {id}=await params,db=await getDb();const [before]=await db.select().from(personalExpenses).where(and(eq(personalExpenses.id,id),eq(personalExpenses.ownerEmail,user.email))).limit(1);
 if(!before)return NextResponse.json({error:"not_found"},{status:404});if(!await requireTripMember(before.tripId,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const [document]=before.sourceDocumentId?await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.id,before.sourceDocumentId),eq(uploadedDocuments.ownerEmail,user.email))).limit(1):[];
 const linkedBookings=before.sourceDocumentId?await db.select().from(travelBookings).where(and(eq(travelBookings.documentId,before.sourceDocumentId),eq(travelBookings.ownerEmail,user.email),eq(travelBookings.tripId,before.tripId))):before.sourceBookingId?await db.select().from(travelBookings).where(and(eq(travelBookings.id,before.sourceBookingId),eq(travelBookings.ownerEmail,user.email))):[];
 if(document){const {env}=await import("cloudflare:workers");await env.BUCKET.delete(document.objectKey)}
 const now=new Date().toISOString(),writes=[db.delete(personalExpenses).where(before.sourceDocumentId?and(eq(personalExpenses.sourceDocumentId,before.sourceDocumentId),eq(personalExpenses.ownerEmail,user.email)):and(eq(personalExpenses.id,id),eq(personalExpenses.ownerEmail,user.email)))];
 for(const booking of linkedBookings)writes.push(db.update(travelBookings).set({deletedAt:now,updatedAt:now,version:booking.version+1}).where(eq(travelBookings.id,booking.id)));
 for(const booking of linkedBookings)writes.push(db.update(agendaItems).set({deletedAt:now,updatedAt:now,updatedByEmail:user.email}).where(and(eq(agendaItems.tripId,before.tripId),eq(agendaItems.notes,`booking:${booking.id}`))));
 if(document)writes.push(db.delete(uploadedDocuments).where(and(eq(uploadedDocuments.id,document.id),eq(uploadedDocuments.ownerEmail,user.email))));
 await db.batch(writes);
 await recordAudit({tripId:before.tripId,actorEmail:user.email,entityType:"personal_expense",entityId:id,action:"cascade_delete",before,after:{documentDeleted:Boolean(document),bookingsDeleted:linkedBookings.map(x=>x.id)}});
 return NextResponse.json({deleted:true,documentDeleted:Boolean(document),bookingsDeleted:linkedBookings.length});
}
