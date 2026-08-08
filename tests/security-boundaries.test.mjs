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

test("document extraction preserves AI evidence and human confirmation",async()=>{
 const [upload,confirm,schema,migration]=await Promise.all([
  read("app/api/documents/route.ts"),
  read("app/api/documents/[id]/route.ts"),
  read("db/schema.ts"),
  read("drizzle/0015_extraction_audit.sql"),
 ]);
 for(const source of [upload,schema,migration]){
  assert.match(source,/extractionRawText|extraction_raw_text/);
  assert.match(source,/extractionCandidates|extraction_candidates/);
  assert.match(source,/extractionMappingReason|extraction_mapping_reason/);
 }
 assert.match(confirm,/confirmedValues/);
 assert.match(confirm,/confirmedByEmail/);
 assert.match(confirm,/confirmedAt/);
});

test("manual flight registration starts with outbound and return segments",async()=>{
 const source=await read("app/TripTodoPanel.tsx");
 assert.match(source,/(?:next|base)==="flight"\?\[blankLeg\(\),blankLeg\(\)\]/);
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

test("formal records pin the immutable company master version",async()=>{
 const [config,schema,trips,bookings,documents,migration]=await Promise.all([
  read("app/managed-config.ts"),read("db/schema.ts"),read("app/api/trips/route.ts"),
  read("app/api/trips/[id]/bookings/route.ts"),read("app/api/documents/[id]/route.ts"),
  read("drizzle/0016_master_data_version.sql"),
 ]);
 assert.match(config,/MASTER_DATA_VERSION/);
 assert.match(schema,/masterDataVersion/);
 for(const source of [trips,bookings,documents])assert.match(source,/MASTER_DATA_VERSION/);
 assert.match(migration,/master_data_version/);
});

test("formal records store master codes and reject unmapped labels",async()=>{
 const [config,schema,trips,tripEdit,documents,expenses,migration]=await Promise.all([
  read("app/managed-config.ts"),read("db/schema.ts"),read("app/api/trips/route.ts"),read("app/api/trips/[id]/route.ts"),
  read("app/api/documents/route.ts"),read("app/api/expenses/[id]/route.ts"),read("drizzle/0017_master_codes.sql"),
 ]);
 assert.match(config,/CLAIM_TYPE_CODES/);assert.match(config,/resolveManagedDestination/);
 assert.match(schema,/masterDataExceptions/);assert.match(schema,/categoryCode/);
 for(const source of [trips,tripEdit])assert.match(source,/cityCode/);
 assert.match(documents,/masterDataExceptions/);assert.match(expenses,/managedClaimTypeCode/);
 assert.match(migration,/master_data_exceptions/);
});

test("legacy data is backfilled only when deterministic",async()=>{
 const migration=await read("drizzle/0018_backfill_master_codes.sql");
 assert.match(migration,/WHEN '機票\(自行刷卡\)' THEN 'EXP-01'/);
 assert.match(migration,/master_data_exceptions/);
 assert.match(migration,/category_code` IS NULL/);
 assert.match(migration,/city_code` IS NULL/);
 assert.doesNotMatch(migration,/ELSE 'EXP-/);
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

test("expense workbench uses a desktop drawer and a mobile task order",async()=>{
 const [workbench,styles]=await Promise.all([
  read("app/ExpenseWizardLive.tsx"),
  read("app/globals.css"),
 ]);
 assert.match(workbench,/expense-drawer-trigger/);
 assert.match(workbench,/expense-drawer-backdrop/);
 assert.match(styles,/@media\(min-width:801px\) and \(max-width:1199px\)/);
 assert.match(styles,/\.expense-tools\.drawer-open\{transform:translateX\(0\)\}/);
 assert.match(styles,/\.expense-upload-tools\{order:1/);
 assert.match(styles,/\.expense-workbench-main\{order:2\}/);
 assert.match(styles,/\.expense-tools \.missing-live\{order:3\}/);
 assert.match(styles,/\.expense-side-documents\{order:4\}/);
});

test("mobile itinerary is a focused today mode with persistent navigation",async()=>{
 const [agenda,page,styles]=await Promise.all([
  read("app/AgendaSheet.tsx"),
  read("app/page.tsx"),
  read("app/globals.css"),
 ]);
 assert.match(agenda,/todayIndex=visibleDates\.indexOf/);
 assert.match(agenda,/mobile-agenda-title">今日行程/);
 assert.match(page,/const mobileBottomNav=<nav/);
 assert.doesNotMatch(page,/const mobileBottomNav=activeTrip&&/);
 assert.match(page,/>今日<\/span>/);
 assert.match(styles,/\.agenda-sheet-editor\{position:fixed!important/);
 assert.match(styles,/\.agenda-toolbar-actions>\.agenda-view-toggle/);
});

test("mobile expenses prioritize today's tasks while desktop keeps full reporting",async()=>{
 const [overview,workbench,styles]=await Promise.all([
  read("app/MobileExpenseOverview.tsx"),
  read("app/ExpenseWizardLive.tsx"),
  read("app/globals.css"),
 ]);
 assert.match(overview,/>今日費用</);
 assert.match(overview,/>待確認</);
 assert.match(overview,/>最近費用</);
 assert.match(workbench,/mobile-expense-more/);
 assert.match(styles,/\.expense-real-list article:nth-child\(n\+6\)\{display:none\}/);
 assert.match(styles,/\.expense-workbench-main \.expense-totals\{display:none\}/);
});

test("PWA uploads persist before network delivery and retry after reconnect",async()=>{
 const [worker,register]=await Promise.all([read("public/sw.js"),read("app/PWARegister.tsx")]);
 assert.match(worker,/indexedDB\.open\(UPLOAD_DB/);
 assert.match(worker,/const id = crypto\.randomUUID\(\)/);
 assert.ok(worker.indexOf("await saveUpload(request)")<worker.indexOf("await fetch(request.clone())"));
 assert.match(worker,/tripclaim-upload/);
 assert.match(worker,/已保存在手機，恢復連線後自動辨識/);
 assert.match(register,/window\.addEventListener\("online", flush\)/);
 assert.match(register,/tripclaim-flush-uploads/);
});

test("client image processing reuses OCR and prepares images before upload",async()=>{
 const [processing,expense,travel]=await Promise.all([read("app/client-document-processing.ts"),read("app/ExpenseWizardLive.tsx"),read("app/TripTodoPanel.tsx")]);
 assert.match(processing,/let workerPromise/);
 assert.doesNotMatch(processing,/worker\.terminate/);
 assert.match(processing,/imageOrientation:"from-image"/);
 assert.match(processing,/limit=2200/);
 assert.match(processing,/圖片可能模糊/);
 for(const source of [expense,travel]){
  assert.match(source,/prepareImageForUpload/);
  assert.match(source,/recognizeDocumentText/);
  assert.doesNotMatch(source,/createWorker\("eng"\)/);
 }
});

test("PDF uploads prefer their text layer and flag scanned documents",async()=>{
 const route=await read("app/api/documents/route.ts");
 assert.match(route,/getDocumentProxy\(new Uint8Array\(bytes\)\)/);
 assert.match(route,/extractText\(pdf,\{mergePages:true\}\)/);
 assert.match(route,/PDF 沒有可讀文字層，可能是掃描檔/);
 assert.ok(route.indexOf("extractText(pdf")<route.indexOf("inferDocumentType(extracted"));
});
