import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
const readStyles=async()=>`${await read("app/globals.css")}\n${await read("app/styles/legacy.css")}\n${await read("app/styles/product-shell.css")}`;

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

test("the selected trip and stage are canonical URL state",async()=>{
 const [page,create,itinerary,expense]=await Promise.all([read("app/page.tsx"),read("app/CreateTripWizardLive.tsx"),read("app/ItineraryWizardLive.tsx"),read("app/ExpenseWizardLive.tsx")]);
 assert.match(page,/searchParams\.set\("trip",trip\.id\)/);
 assert.match(page,/searchParams\.set\("stage",target\)/);
 assert.match(page,/popstate/);
 assert.match(page,/target:\s*TripStage="overview"/);
 for(const source of [create,itinerary,expense])assert.doesNotMatch(source,/sessionStorage/);
 assert.match(itinerary,/\{tripId\}:\{tripId:string\}/);
 assert.match(expense,/\{tripId\}:\{tripId:string\}/);
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

test("managed airport directory drives ticket parsing and fresh uploads never reuse an old document",async()=>{
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
 assert.doesNotMatch(route,/duplicate_document|if\(duplicate\)return/);
 assert.match(route,/contentHash/);
});

test("non-travel expense deletion keeps recoverable evidence behavior",async()=>{
 const source=await read("app/api/expenses/[id]/route.ts");
 assert.match(source,/uploadedDocuments/);
 assert.match(source,/travelBookings/);
 assert.match(source,/agendaItems/);
 assert.match(source,/soft_delete_graph/);
 assert.match(source,/recoverable:true/);
});

test("deleting a linked travel document permanently deletes its whole order graph",async()=>{
 const source=await read("app/api/documents/[id]/route.ts");
 assert.match(source,/hardDeleteOrderGraph/);
 assert.match(source,/bookingsDeleted/);
 assert.match(source,/permanent:true/);
 assert.doesNotMatch(source,/recoverable:true/);
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

test("primary shell exposes one consistent trip workspace IA and adaptive workbench",async()=>{
 const [page,styles]=await Promise.all([
  read("app/page.tsx"),
  readStyles(),
 ]);
 assert.match(page,/aria-label="Trip workspace"/);
 assert.match(page,/<i>⌂<\/i>全部出差/);
 assert.match(page,/<i>◎<\/i>總覽/);
 assert.match(page,/<i>▤<\/i>行程/);
 assert.match(page,/<i>✓<\/i>行前準備/);
 assert.match(page,/<i>\$<\/i>我的報支/);
 assert.doesNotMatch(page,/<i>[1-4]<\/i>(總覽|行程|行前準備|我的報支)/);
 assert.match(page,/aria-label="手機工作區"/);
 assert.match(styles,/--app-max:1440px/);
 assert.match(styles,/--aside-width:288px/);
 assert.match(styles,/grid-template-columns:minmax\(0,1fr\) var\(--aside-width\)/);
 assert.match(styles,/safe-area-inset-bottom/);
});

test("deleting any booking deletes the complete order permanently",async()=>{
 const [panel,route,graph,storage,queue]=await Promise.all([
  read("app/BookingPanel.tsx"),
  read("app/api/trips/[id]/bookings/[bookingId]/route.ts"),
  read("db/order-graph.ts"),
  read("db/object-storage.ts"),
  read("db/object-deletion-queue.ts"),
 ]);
 assert.match(panel,/永久刪除整張訂單/);
 assert.match(route,/hardDeleteOrderGraph/);
 assert.match(route,/permanent:true/);
 assert.doesNotMatch(route,/recoverable:true/);
 assert.match(graph,/sourceBookingId/);
 assert.match(graph,/uploadedDocuments/);
 assert.match(graph,/deleteObjectKeysWithRetry/);
 assert.match(graph,/queueObjectDeletionWrite/);
 assert.match(storage,/BUCKET\.delete|bucket!\.delete/);
 assert.match(queue,/pendingObjectDeletions/);
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
 assert.match(source,/來回／多航段只建立一筆本人報支/);
 assert.match(source,/新增轉機航段/);
});

test("confirm sync transactionally replaces old travel data instead of appending or reusing",async()=>{
 const [todo,replace,upload]=await Promise.all([
  read("app/TripTodoPanel.tsx"),
  read("app/api/trips/[id]/bookings/replace/route.ts"),
  read("app/api/documents/route.ts"),
 ]);
 assert.match(todo,/\/bookings\/replace/);
 assert.doesNotMatch(todo,/reusable|已載入既有文件/);
 assert.match(replace,/db\.delete\(travelBookings\)/);
 assert.match(replace,/db\.delete\(uploadedDocuments\)/);
 assert.match(replace,/await db\.batch\(writes\)/);
 assert.match(replace,/replace_order_graph/);
 assert.match(replace,/replacedOrders/);
 assert.match(replace,/doc\.id!==input\.documentId/);
 assert.match(replace,/const now=new Date\(\)\.toISOString\(\),bookedAt=input\.bookedAt\?\?now/);
 assert.match(upload,/requested==="flight"\)return "機票"/);
 assert.match(upload,/requested==="stay"\)return "住宿"/);
 assert.match(upload,/T15:00/);
 assert.match(upload,/T11:00/);
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
 const [config,validation,documents,expense]=await Promise.all([
  read("app/managed-config.ts"),
  read("app/master-data-validation.ts"),
  read("app/api/documents/[id]/route.ts"),
  read("app/api/expenses/[id]/route.ts"),
 ]);
 assert.match(config,/刻意不提供 save/);
 assert.match(validation,/isManagedClaimType/);assert.match(validation,/MANAGED_CURRENCY_CODES/);
 assert.match(documents,/validateExpenseMaster/);assert.match(expense,/validateExpenseMaster/);
});

test("login users and roles are server-owned and admin-audited",async()=>{
 const [schema,migration,access,route,management]=await Promise.all([
  read("db/schema.ts"),read("drizzle/0021_system_users.sql"),read("db/access.ts"),read("app/api/admin/users/route.ts"),read("app/SystemManagement.tsx"),
 ]);
 for(const source of [schema,migration])assert.match(source,/system_users|systemUsers/);
 assert.match(access,/requireSystemAdmin/);
 assert.match(route,/admin_required/);
 assert.match(route,/last_admin/);
 assert.match(route,/recordAudit/);
 assert.doesNotMatch(management,/localStorage/);
 assert.match(management,/\/api\/admin\/users/);
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
 assert.match(documents,/masterDataExceptions/);assert.match(expenses,/categoryCode:master.claimTypeCode/);
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

test("API, OCR and CSV import share one master-data validation service",async()=>{
 const [service,trips,tripEdit,documents,confirm,expenses,agenda]=await Promise.all([
  read("app/master-data-validation.ts"),read("app/api/trips/route.ts"),read("app/api/trips/[id]/route.ts"),
  read("app/api/documents/route.ts"),read("app/api/documents/[id]/route.ts"),read("app/api/expenses/[id]/route.ts"),read("app/AgendaSheet.tsx"),
 ]);
 assert.match(service,/validateExpenseMaster/);assert.match(service,/validateDestinationMaster/);
 for(const source of [trips,tripEdit])assert.match(source,/validateDestinationMaster/);
 for(const source of [documents,confirm,expenses])assert.match(source,/validateExpenseMaster/);
 assert.match(agenda,/validateDestinationMaster/);
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

test("formal Excel contains five reconciled reporting sheets and is bundled with ZIP",async()=>{
 const route=await read("app/api/trips/[id]/export/route.ts"),summary=await read("app/ExpenseSummary.tsx");
 for(const name of ["報支彙總","費用明細","信用卡與手續費","缺件","附件索引"])assert.match(route,new RegExp(name));
 assert.match(route,/00_正式旅費報支\.xlsx/);assert.match(route,/searchParams\.get\("format"\)===\"xlsx\"/);
 assert.match(summary,/export\?format=xlsx/);
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

test("card statement evidence saves TWD billing and links only to owned candidate expenses",async()=>{
 const [schema,migration,confirm,matches,inbox]=await Promise.all([read("db/schema.ts"),read("drizzle/0019_card_statement_links.sql"),read("app/api/documents/[id]/route.ts"),read("app/api/documents/[id]/matches/route.ts"),read("app/DocumentInbox.tsx")]);
 for(const source of [schema,migration]){assert.match(source,/linked_expense_id|linkedExpenseId/);assert.match(source,/billed_twd_minor|billedTwdMinor/)}
 assert.match(confirm,/invalid_expense_link/);assert.match(confirm,/eq\(personalExpenses\.ownerEmail,user\.email\)/);
 assert.match(matches,/cardMatch/);assert.match(matches,/amountMatch/);assert.match(matches,/ambiguous/);
 assert.match(inbox,/CardEvidenceMatcher/);assert.match(inbox,/系統不會自行猜測/);
});

test("travel graphs are permanent while ordinary expenses keep recoverable deletion",async()=>{
 const [schema,migration,documents,expenses,bookings,graph,storage,queue,restore,inbox,summary]=await Promise.all([read("db/schema.ts"),read("drizzle/0020_recoverable_deletions.sql"),read("app/api/documents/[id]/route.ts"),read("app/api/expenses/[id]/route.ts"),read("app/api/trips/[id]/bookings/[bookingId]/route.ts"),read("db/order-graph.ts"),read("db/object-storage.ts"),read("db/object-deletion-queue.ts"),read("app/api/trash/[kind]/[id]/route.ts"),read("app/DocumentInbox.tsx"),read("app/ExpenseSummary.tsx")]);
 for(const source of [schema,migration])assert.match(source,/deleted_at|deletedAt/);
 for(const source of [documents,bookings]){assert.match(source,/hardDeleteOrderGraph/);assert.match(source,/permanent:true/);assert.doesNotMatch(source,/recoverable:true/)}
 assert.match(expenses,/hardDeleteOrderGraph/);assert.match(expenses,/soft_delete_graph/);assert.match(expenses,/recoverable:true/);
 assert.match(graph,/deleteObjectKeysWithRetry/);assert.match(graph,/queueObjectDeletionWrite/);assert.match(graph,/db\.delete\(travelBookings\)/);assert.match(graph,/db\.delete\(uploadedDocuments\)/);
 assert.match(storage,/BUCKET\.delete|bucket!\.delete/);assert.match(queue,/pendingObjectDeletions/);
 assert.match(restore,/restore_graph/);assert.match(restore,/db\.batch\(writes\)/);assert.match(restore,/ownerEmail,user\.email/);
 assert.doesNotMatch(inbox,/>復原</);assert.match(inbox,/無法復原/);assert.match(summary,/立即復原/);assert.match(summary,/永久刪除/);
});

test("expense workbench uses a desktop drawer and a mobile task order",async()=>{
 const [workbench,styles]=await Promise.all([
  read("app/ExpenseWizardLive.tsx"),
  readStyles(),
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

test("mobile itinerary stays focused on today while navigation follows the shared workspace IA",async()=>{
 const [agenda,page,styles]=await Promise.all([
  read("app/AgendaSheet.tsx"),
  read("app/page.tsx"),
  readStyles(),
 ]);
 assert.match(agenda,/todayIndex=visibleDates\.indexOf/);
 assert.match(agenda,/mobile-agenda-title">今日行程/);
 assert.match(page,/const mobileBottomNav=<nav/);
 assert.doesNotMatch(page,/const mobileBottomNav=activeTrip&&/);
 assert.match(page,/aria-label="手機工作區"/);
 assert.match(page,/>總覽<\/span>/);
 assert.match(page,/>行程<\/span>/);
 assert.match(page,/>準備<\/span>/);
 assert.match(page,/>報支<\/span>/);
 assert.doesNotMatch(page,/className="camera"/);
 assert.match(styles,/\.agenda-sheet-editor\{position:fixed!important/);
 assert.match(styles,/\.agenda-toolbar-actions>\.agenda-view-toggle/);
});

test("mobile expenses prioritize today's tasks while desktop keeps full reporting",async()=>{
 const [overview,workbench,styles]=await Promise.all([
  read("app/MobileExpenseOverview.tsx"),
  read("app/ExpenseWizardLive.tsx"),
  readStyles(),
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
