import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("personal trip resources require explicit trip context",async()=>{
 const routes=await Promise.all([
  read("app/api/documents/route.ts"),
  read("app/api/expenses/route.ts"),
  read("app/api/missing-requirements/route.ts"),
 ]);
 for(const source of routes){
  assert.match(source,/trip_id_required/);
  assert.doesNotMatch(source,/FALLBACK_TRIP_ID/);
  assert.match(source,/requireTripMember/);
 }
});

test("personal document and expense mutations verify ownership and membership",async()=>{
 const [documents,expenses]=await Promise.all([
  read("app/api/documents/[id]/route.ts"),
  read("app/api/expenses/[id]/route.ts"),
 ]);
 for(const source of [documents,expenses]){
  assert.match(source,/ownerEmail/);
  assert.match(source,/requireTripMember/);
  assert.match(source,/recordAudit/);
 }
});

test("managed airport directory drives ticket parsing",async()=>{
 const [route,directoryRaw]=await Promise.all([
  read("app/api/documents/route.ts"),
  read("db/managed-airports.json"),
 ]);
 const airports=JSON.parse(directoryRaw);
 assert.ok(airports.length>1500);
 assert.ok(airports.some(x=>x.code==="CDG"&&x.aliases.includes("PARIS CHARLES DE GAULLE")));
 assert.ok(airports.some(x=>x.code==="TPE"&&x.aliases.includes("TAIPEI TAIWAN TAOYUAN INTL")));
 assert.match(route,/normalizeManagedAirportText/);
 assert.match(route,/MANAGED_AIRPORT_CODES/);
 assert.ok(route.indexOf('if(duplicate)return')>route.indexOf('prefill=parseDocument'));
});

test("deleting an expense cascades its evidence and linked itinerary",async()=>{
 const source=await read("app/api/expenses/[id]/route.ts");
 assert.match(source,/uploadedDocuments/);
 assert.match(source,/travelBookings/);
 assert.match(source,/agendaItems/);
 assert.match(source,/cascade_delete/);
});

test("deleting a legacy linked document cannot deadlock",async()=>{
 const source=await read("app/api/documents/[id]/route.ts");
 assert.match(source,/bookingsDeleted/);
 assert.match(source,/agendaItems/);
 assert.doesNotMatch(source,/document_in_use/);
});

test("agenda defaults to business hours with pinned travel rows",async()=>{
 const source=await read("app/AgendaSheet.tsx");
 assert.match(source,/const topRows=\["全天","住宿"\]/);
 assert.match(source,/showFullDay\?0:8/);
 assert.match(source,/showFullDay\?23:22/);
 assert.match(source,/pinned-all-day/);
 assert.match(source,/pinned-stay/);
});

test("primary shell exposes one three-stage workflow and adaptive workbench",async()=>{
 const [page,styles]=await Promise.all([
  read("app/page.tsx"),
  read("app/globals.css"),
 ]);
 assert.match(page,/aria-label="主要流程"/);
 assert.match(page,/<i>1<\/i>我的出差/);
 assert.match(page,/<i>2<\/i>共同行程/);
 assert.match(page,/<i>3<\/i>我的報帳/);
 assert.match(styles,/--app-max:1440px/);
 assert.match(styles,/--aside-width:288px/);
 assert.match(styles,/grid-template-columns:minmax\(0,1fr\) var\(--aside-width\)/);
 assert.match(styles,/safe-area-inset-bottom/);
});

test("deleting a booking cascades to expense and orphaned attachment",async()=>{
 const [panel,route]=await Promise.all([
  read("app/BookingPanel.tsx"),
  read("app/api/trips/[id]/bookings/[bookingId]/route.ts"),
 ]);
 assert.doesNotMatch(panel,/keepExpense=true/);
 assert.match(route,/attachmentDeleted/);
 assert.match(route,/uploadedDocuments/);
 assert.match(route,/sourceBookingId/);
});

test("manual flight registration starts with outbound and return segments",async()=>{
 const source=await read("app/TripTodoPanel.tsx");
 assert.match(source,/next==="flight"\?\[blankLeg\(\),blankLeg\(\)\]/);
 assert.match(source,/來回票只建立一筆本人報支/);
 assert.match(source,/新增轉機航段/);
});

test("unknown currencies preserve the original and require TWD reporting",async()=>{
 const [config,documents,expense,migration]=await Promise.all([
  read("app/managed-config.ts"),
  read("app/api/documents/[id]/route.ts"),
  read("app/api/expenses/[id]/route.ts"),
  read("drizzle/0014_dual_currency.sql"),
 ]);
 assert.match(config,/requiresTwd:!allowed/);
 assert.match(config,/不在公司可申報幣別，只能以 TWD 報支/);
 for(const source of [documents,expense]){
  assert.match(source,/originalCurrency/);
  assert.match(source,/originalAmountMinor/);
  assert.match(source,/reportingCurrency/);
  assert.match(source,/reportingAmountMinor/);
  assert.match(source,/twd_reporting_(?:amount_)?required/);
 }
 assert.match(migration,/original_currency/);
 assert.match(migration,/reporting_currency/);
});

test("company claim and currency masters remain fixed",async()=>{
 const [config,documents,expense]=await Promise.all([
  read("app/managed-config.ts"),
  read("app/api/documents/[id]/route.ts"),
  read("app/api/expenses/[id]/route.ts"),
 ]);
 assert.match(config,/刻意不提供 save/);
 assert.match(documents,/isManagedClaimType/);
 assert.match(documents,/MANAGED_CURRENCY_CODES/);
 assert.match(expense,/isManagedClaimType/);
 assert.match(expense,/MANAGED_CURRENCY_CODES/);
});

test("exports group by company claim type and reporting currency",async()=>{
 const [grouping,route,inbox]=await Promise.all([
  read("app/expense-export.ts"),
  read("app/api/trips/[id]/export/route.ts"),
  read("app/DocumentInbox.tsx"),
 ]);
 assert.match(grouping,/reportingCurrencyOf/);
 assert.match(grouping,/const currency=reportingCurrencyOf\(item\),key=`\$\{item\.category\}/);
 assert.match(route,/00_旅費報支彙總\.csv/);
 assert.match(route,/00_費用明細\.csv/);
 assert.match(route,/00_附件索引_manifest\.json/);
 assert.match(route,/group\.folder/);
 assert.match(inbox,/api\/trips\/\$\{encodeURIComponent\(tripId\)\}\/export/);
});

test("card statements remain evidence and foreign fees are separate TWD expenses",async()=>{
 const [upload,confirm,workbench]=await Promise.all([
  read("app/api/documents/route.ts"),
  read("app/api/documents/[id]/route.ts"),
  read("app/ExpenseWizardLive.tsx"),
 ]);
 assert.match(upload,/cardEvidence\?null/);
 assert.match(upload,/此文件是付款證明，不會另建一筆消費/);
 assert.match(confirm,/shouldCreateExpense=!isCardEvidence\|\|input\.claimType==="國外交易手續費"/);
 assert.match(confirm,/foreign_fee_must_be_twd/);
 assert.match(confirm,/db\.delete\(personalExpenses\)/);
 assert.match(workbench,/批次核對與 CSV、Excel、PDF、ZIP 請回電腦版處理/);
});
