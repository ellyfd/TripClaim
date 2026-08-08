import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { personalExpenses, travelDocuments } from "../../../db/schema";
import { decideReportingCurrency, managedClaimTypeCode, MASTER_DATA_VERSION } from "../../managed-config";

const TRIP_ID = "france-poland-2026";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const db = await getDb();
  const documents = await db.select().from(travelDocuments).where(and(eq(travelDocuments.ownerEmail, user.email), eq(travelDocuments.tripId, TRIP_ID))).orderBy(desc(travelDocuments.updatedAt));
  const expenses = await db.select().from(personalExpenses).where(and(eq(personalExpenses.ownerEmail, user.email), eq(personalExpenses.tripId, TRIP_ID))).orderBy(desc(personalExpenses.updatedAt));
  return NextResponse.json({ documents, expenses });
}

export async function POST(request: NextRequest) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const input = await request.json() as { kind?: "flight"|"stay"; title?: string; travelerName?: string; startAt?: string; endAt?: string; amountMinor?: number; currency?: string; cardLast4?: string; shareSummary?: boolean; createExpense?: boolean };
  if (!input.kind || !input.title || !input.startAt || !input.endAt) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const now = new Date().toISOString(); const id = crypto.randomUUID(); const db = await getDb();
  await db.insert(travelDocuments).values({ id, ownerEmail:user.email, tripId:TRIP_ID, kind:input.kind, title:input.title, travelerName:input.travelerName ?? user.displayName, startAt:input.startAt, endAt:input.endAt, amountMinor:input.amountMinor, currency:input.currency, cardLast4:input.cardLast4, shareSummary:input.shareSummary ?? true, createExpense:input.createExpense ?? true, createdAt:now, updatedAt:now });
  if (input.createExpense !== false && input.amountMinor && input.currency) { const originalCurrency=input.currency.toUpperCase(),decision=decideReportingCurrency(originalCurrency),category=input.kind==="flight"?"機票(自行刷卡)":"住宿";await db.insert(personalExpenses).values({ id:crypto.randomUUID(), ownerEmail:user.email, tripId:TRIP_ID, sourceDocumentId:id, category, categoryCode:managedClaimTypeCode(category), merchant:input.title, expenseDate:input.startAt.slice(0,10), originalAmountMinor:input.amountMinor, originalCurrency, reportingAmountMinor:decision.requiresTwd?null:input.amountMinor, reportingCurrency:decision.reportingCurrency, currencyDecisionReason:decision.reason, amountMinor:decision.requiresTwd?0:input.amountMinor, currency:decision.reportingCurrency, cardLast4:input.cardLast4, status:"review", masterDataVersion:MASTER_DATA_VERSION, createdAt:now, updatedAt:now });}
  return NextResponse.json({ id, saved:true });
}
