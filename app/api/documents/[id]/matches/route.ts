import {NextResponse} from "next/server";
import {and,eq} from "drizzle-orm";
import {getChatGPTUser} from "../../../../chatgpt-auth";
import {getDb} from "../../../../../db";
import {requireTripMember} from "../../../../../db/access";
import {personalExpenses,uploadedDocuments} from "../../../../../db/schema";

const dayDistance=(a:string|null,b:string)=>a?Math.abs((Date.parse(a)-Date.parse(b))/86400000):99;
const words=(value:string|null)=>new Set((value??"").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>2));
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const {id}=await params,db=await getDb(),[document]=await db.select().from(uploadedDocuments).where(and(eq(uploadedDocuments.id,id),eq(uploadedDocuments.ownerEmail,user.email))).limit(1);
 if(!document)return NextResponse.json({error:"not_found"},{status:404});if(!await requireTripMember(document.tripId,user.email))return NextResponse.json({error:"forbidden"},{status:403});
 const expenses=await db.select().from(personalExpenses).where(and(eq(personalExpenses.tripId,document.tripId),eq(personalExpenses.ownerEmail,user.email))),needle=words(document.merchant);
 const candidates=expenses.map(expense=>{const days=dayDistance(document.expenseDate,expense.expenseDate),merchantHits=[...needle].filter(x=>words(expense.merchant).has(x)).length,currencyMatch=!document.detectedCurrency||document.detectedCurrency===expense.originalCurrency,amountMatch=!document.detectedAmountMinor||document.detectedAmountMinor===expense.originalAmountMinor,cardMatch=!document.cardLast4||document.cardLast4===expense.cardLast4;const score=Math.max(0,100-(Math.min(days,10)*8)+(merchantHits?20:0)+(currencyMatch?10:0)+(amountMatch?20:0)+(cardMatch?15:0));return {id:expense.id,expenseDate:expense.expenseDate,merchant:expense.merchant,category:expense.category,originalCurrency:expense.originalCurrency,originalAmountMinor:expense.originalAmountMinor,cardLast4:expense.cardLast4,score,reasons:[days<=1?"日期相近":null,merchantHits?"店家相符":null,currencyMatch?"原幣相符":null,amountMatch?"原幣金額相符":null,cardMatch?"卡末四碼相符":null].filter(Boolean)}}).filter(x=>x.score>=45).sort((a,b)=>b.score-a.score).slice(0,5);
 return NextResponse.json({linkedExpenseId:document.linkedExpenseId,candidates,ambiguous:candidates.length>1&&candidates[0].score-candidates[1].score<15});
}
