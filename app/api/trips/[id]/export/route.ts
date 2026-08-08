import {NextResponse} from "next/server";
import {and,asc,eq,inArray} from "drizzle-orm";
import {strToU8,zipSync} from "fflate";
import {getChatGPTUser} from "../../../../chatgpt-auth";
import {getDb} from "../../../../../db";
import {requireTripMember} from "../../../../../db/access";
import {personalExpenses,uploadedDocuments} from "../../../../../db/schema";
import {buildExpenseGroups,originalAmountOf,originalCurrencyOf,reportingAmountOf,reportingCurrencyOf,safeFilePart} from "../../../../expense-export";

const csv=(rows:(string|number)[][])=>"\ufeff"+rows.map(row=>row.map(value=>`"${String(value??"").replaceAll('"','""')}"`).join(",")).join("\r\n");

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser(),{id:tripId}=await params;if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(tripId,user.email))return NextResponse.json({error:"forbidden"},{status:403});
 const db=await getDb(),expenses=await db.select().from(personalExpenses).where(and(eq(personalExpenses.tripId,tripId),eq(personalExpenses.ownerEmail,user.email))).orderBy(asc(personalExpenses.expenseDate)),groups=buildExpenseGroups(expenses),documentIds=[...new Set(expenses.map(x=>x.sourceDocumentId).filter(Boolean))] as string[];
 const documents=documentIds.length?await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.tripId,tripId),eq(uploadedDocuments.ownerEmail,user.email),inArray(uploadedDocuments.id,documentIds))):[],documentsById=new Map(documents.map(x=>[x.id,x])),files:Record<string,Uint8Array>={};
 files["00_旅費報支彙總.csv"]=strToU8(csv([["行次","報支項目","申報幣別","申報總額","費用筆數","憑證數"],...groups.map(g=>[g.rowNumber,g.category,g.currency,(g.amountMinor/100).toFixed(2),g.expenses.length,g.expenses.reduce((sum,x)=>sum+(x.receiptCount||1),0)])]));
 files["00_費用明細.csv"]=strToU8(csv([["行次","日期","報支項目","店家／說明","原始幣別","原始金額","申報幣別","申報金額","憑證數","Remark","費用歸屬","卡末四碼"],...groups.flatMap(g=>g.expenses.map(x=>[g.rowNumber,x.expenseDate,x.category,x.merchant,originalCurrencyOf(x),((originalAmountOf(x))/100).toFixed(2),reportingCurrencyOf(x),((reportingAmountOf(x))/100).toFixed(2),x.receiptCount,x.remark??"",x.costCenter,x.cardLast4??""]))]));
 const manifest:{generatedAt:string;tripId:string;ownerEmail:string;groups:Array<Record<string,unknown>>}={generatedAt:new Date().toISOString(),tripId,ownerEmail:user.email,groups:[]};
 const {env}=await import("cloudflare:workers");
 for(const group of groups){const groupEntry={rowNumber:group.rowNumber,category:group.category,currency:group.currency,amountMinor:group.amountMinor,folder:group.folder,expenses:[] as Array<Record<string,unknown>>};manifest.groups.push(groupEntry);for(const expense of group.expenses){const doc=expense.sourceDocumentId?documentsById.get(expense.sourceDocumentId):null,base=`${expense.expenseDate.replaceAll("-","")}_${safeFilePart(expense.category)}_${safeFilePart(expense.merchant)}_${reportingCurrencyOf(expense)}${(reportingAmountOf(expense)/100).toFixed(2)}`;let attachment:string|null=null;if(doc){const object=await env.BUCKET.get(doc.objectKey);if(object){const extension=doc.originalName.includes(".")?doc.originalName.slice(doc.originalName.lastIndexOf(".")):"",name=`${base}_${safeFilePart(doc.documentType)}${extension}`,path=`${group.folder}/${name}`;files[path]=new Uint8Array(await object.arrayBuffer());attachment=path}}groupEntry.expenses.push({expenseId:expense.id,documentId:expense.sourceDocumentId,originalName:doc?.originalName??null,attachment,originalCurrency:originalCurrencyOf(expense),originalAmountMinor:originalAmountOf(expense),reportingCurrency:reportingCurrencyOf(expense),reportingAmountMinor:reportingAmountOf(expense)})}}
 files["00_附件索引_manifest.json"]=strToU8(JSON.stringify(manifest,null,2));
 const zipped=zipSync(files,{level:6}),body=zipped.buffer.slice(zipped.byteOffset,zipped.byteOffset+zipped.byteLength) as ArrayBuffer;
 return new Response(body,{headers:{"content-type":"application/zip","content-disposition":`attachment; filename*=UTF-8''${encodeURIComponent(`TripClaim_${tripId}.zip`)}`,"cache-control":"private, no-store"}});
}
