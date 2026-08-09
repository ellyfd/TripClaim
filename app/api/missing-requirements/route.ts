import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { requireTripMember } from "../../../db/access";
import { masterDataExceptions, uploadedDocuments } from "../../../db/schema";

const exceptionFieldLabel:Record<string,string>={
 category:"報支項目",
 claimType:"報支項目",
 currency:"原始幣別",
 reporting_currency:"申報幣別",
 reportingCurrency:"申報幣別",
 city:"國家／城市",
 destination:"國家／城市",
};

export async function GET(request:NextRequest){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const tripId=request.nextUrl.searchParams.get("tripId");if(!tripId)return NextResponse.json({error:"trip_id_required"},{status:400});if(!await requireTripMember(tripId,user.email))return NextResponse.json({error:"forbidden"},{status:403});
 const db=await getDb();const [docs,masterExceptions]=await Promise.all([
  db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.ownerEmail,user.email),eq(uploadedDocuments.tripId,tripId),isNull(uploadedDocuments.deletedAt))),
  db.select().from(masterDataExceptions).where(and(eq(masterDataExceptions.ownerEmail,user.email),eq(masterDataExceptions.tripId,tripId),eq(masterDataExceptions.status,"open"))),
 ]);
 const normalized=docs.map(d=>d.documentType.toLowerCase());const has=(...terms:string[])=>normalized.some(x=>terms.some(t=>x.includes(t)));
 const requirements:{id:string;label:string;detail:string;status:"complete"|"missing"|"review"}[]=[];
 for(const doc of docs.filter(d=>d.paymentMethod==="credit_card"&&d.status==="ready")){
  const suffix=doc.cardLast4?` •${doc.cardLast4}`:"";requirements.push({id:`slip-${doc.id}`,label:`${doc.merchant??"信用卡消費"}${suffix}：刷卡單`,detail:has("刷卡單")?"已找到本趟刷卡單":"信用卡付款需附刷卡單",status:has("刷卡單")?"complete":"missing"});requirements.push({id:`statement-${doc.id}`,label:`${doc.merchant??"信用卡消費"}${suffix}：信用卡帳單`,detail:has("信用卡帳單")?"已找到本趟個人帳單":"需核對台幣請款與國外手續費",status:has("信用卡帳單")?"complete":"missing"});
 }
 for(const doc of docs.filter(d=>d.status!=="ready"))requirements.push({id:`review-${doc.id}`,label:doc.originalName,detail:"尚未確認日期、類型、店家或金額",status:"review"});
 for(const item of masterExceptions)requirements.push({id:`master-${item.id}`,label:`${exceptionFieldLabel[item.fieldName]??"公司主檔"}：${item.rawValue}`,detail:"無法對應公司固定主檔，已保留原始資料並停止正式歸類；請交由管理者確認。",status:"review"});
 return NextResponse.json({requirements,summary:{total:requirements.length,missing:requirements.filter(x=>x.status==="missing").length,review:requirements.filter(x=>x.status==="review").length,complete:requirements.filter(x=>x.status==="complete").length}});
}
