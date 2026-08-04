import {NextRequest,NextResponse} from "next/server";
import {and,desc,eq} from "drizzle-orm";
import {getChatGPTUser} from "../../chatgpt-auth";
import {getDb} from "../../../db";
import {requireTripMember} from "../../../db/access";
import {personalExpenses} from "../../../db/schema";
export async function GET(request:NextRequest){const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});const tripId=request.nextUrl.searchParams.get("tripId");if(!tripId)return NextResponse.json({error:"trip_id_required"},{status:400});if(!await requireTripMember(tripId,user.email))return NextResponse.json({error:"forbidden"},{status:403});const db=await getDb(),expenses=await db.select().from(personalExpenses).where(and(eq(personalExpenses.ownerEmail,user.email),eq(personalExpenses.tripId,tripId))).orderBy(desc(personalExpenses.expenseDate));const totals=Object.entries(expenses.reduce<Record<string,number>>((sum,x)=>{sum[x.currency]=(sum[x.currency]??0)+x.amountMinor;return sum},{})).map(([currency,amountMinor])=>({currency,amountMinor}));return NextResponse.json({expenses,totals});}
