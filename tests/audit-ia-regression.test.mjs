import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("expense intake uses one upload entry with optional type preselection",async()=>{
 const source=await read("app/ExpenseWizardLive.tsx");
 assert.match(source,/const expenseUploadTypes=\["自動辨識","收據／發票","刷卡單","信用卡帳單","交通票券"\]/);
 assert.match(source,/className="expense-upload-type"/);
 assert.match(source,/value=\{uploadType\}/);
 assert.match(source,/className="expense-upload-main"/);
 assert.doesNotMatch(source,/className="expense-type-buttons"/);
 assert.match(source,/共用這一個上傳入口/);
 assert.match(source,/行前準備 → 我的行前資料/);
 assert.doesNotMatch(source,/行程 → 我的行前資料/);
 assert.doesNotMatch(source,/步驟 3/);
});

test("trip workspace promotes overview and uses the same non-linear IA on desktop and mobile",async()=>{
 const page=await read("app/page.tsx");
 assert.match(page,/type Stage="create"\|"overview"\|"itinerary"\|"preparation"\|"expense"/);
 assert.match(page,/target:TripStage="overview"/);
 assert.match(page,/aria-label="Trip workspace"/);
 assert.match(page,/<i>◎<\/i>總覽/);
 assert.match(page,/<i>▤<\/i>行程/);
 assert.match(page,/<i>✓<\/i>行前準備/);
 assert.match(page,/<i>\$<\/i>我的報支/);
 assert.doesNotMatch(page,/<i>[1-4]<\/i>(總覽|行程|行前準備|我的報支)/);
 assert.match(page,/aria-label="手機工作區"/);
 for(const label of ["總覽","行程","準備","報支"])assert.match(page,new RegExp(`>${label}<\\/span>`));
 assert.doesNotMatch(page,/className="camera"/);
});

test("shared itinerary no longer embeds personal preparation tools or engineering copy",async()=>{
 const [itinerary,preparation]=await Promise.all([read("app/ItineraryWizardLive.tsx"),read("app/TripPreparation.tsx")]);
 assert.doesNotMatch(itinerary,/TripTodoPanel/);
 assert.doesNotMatch(itinerary,/CompLeavePanel/);
 assert.match(itinerary,/同行者共用/);
 assert.match(itinerary,/所有同行者共用同一份日曆/);
 assert.doesNotMatch(itinerary,/Shared workspace|shared bookings/);
 assert.match(itinerary,/BookingPanel tripId=\{tripId\}/);
 assert.match(preparation,/TripTodoPanel/);
 assert.match(preparation,/CompLeavePanel/);
 assert.match(preparation,/<h1>行前準備<\/h1>/);
 assert.match(preparation,/自己的機票、住宿、待辦與補休在這裡完成/);
 assert.match(preparation,/查看同行者是否已準備好/);
 assert.match(preparation,/看不到他們的原始文件或個人報支/);
 assert.match(preparation,/同行者只看到完成狀態與需要共用的行程資訊/);
 assert.doesNotMatch(preparation,/Personal workspace|資料邊界/);
});

test("trip overview aggregates status without leaking implementation terminology",async()=>{
 const source=await read("app/TripOverview.tsx");
 assert.match(source,/\/summary`\)/);
 assert.match(source,/\/todos`\)/);
 assert.match(source,/\/api\/missing-requirements\?tripId=/);
 assert.match(source,/下一步：\{nextLabel\}/);
 assert.match(source,/onNavigate\("preparation"\)/);
 assert.match(source,/onNavigate\("itinerary"\)/);
 assert.match(source,/onNavigate\("expense"\)/);
 assert.match(source,/共用與個人資料分開/);
 assert.match(source,/總覽只整理狀態，不另外複製一份資料/);
 assert.doesNotMatch(source,/Trip Overview|booking projection|Booking \/ Document \/ Expense/);
});

test("trip list has one primary entry and always opens overview",async()=>{
 const [source,page]=await Promise.all([read("app/CreateTripWizardLive.tsx"),read("app/page.tsx")]);
 assert.match(source,/function CreateTripWizardLive\(\{onCreate\}:\{onCreate:/);
 assert.doesNotMatch(source,/onExpense/);
 assert.match(source,/const openTrip=\(trip:Trip\)=>onCreate/);
 assert.match(source,/onClick=\{\(\)=>openTrip\(t\)\}>開啟出差/);
 assert.doesNotMatch(source,/className="claim"|>我的報支<\/button>/);
 assert.match(source,/先看總覽/);
 assert.match(source,/建立後先看出差總覽/);
 assert.match(source,/建立並開啟出差/);
 assert.match(page,/<CreateTripForm onCreate=\{trip=>openTrip\(trip,"overview"\)\}\/?>/);
 assert.doesNotMatch(page,/onExpense=/);
});

test("secondary booking disclosure and mobile trip actions keep the IA hierarchy",async()=>{
 const [styles,globals]=await Promise.all([read("app/styles/ia-hierarchy.css"),read("app/globals.css")]);
 assert.match(styles,/\.shared-booking-details>summary\{/);
 assert.match(styles,/\.shared-booking-details\[open\]>summary i/);
 assert.match(styles,/@media\(max-width:800px\)[\s\S]*\.trip-row-actions\{grid-template-columns:minmax\(0,1fr\) auto!important\}/);
 assert.match(globals,/@import "\.\/styles\/ia-hierarchy\.css";\n@import "\.\/styles\/audit-fixes\.css";\s*$/);
});

test("flight and stay booking guidance are domain-specific",async()=>{
 const source=await read("app/TripTodoPanel.tsx");
 assert.match(source,/kind==="flight"\?"來回／多航段只建立一筆本人報支，不重複計價。":"住宿訂單只建立一筆本人報支；入住與退房直接同步行程。"/);
 assert.doesNotMatch(source,/<small>來回票只建立一筆本人報支，不重複計價。<\/small>/);
 assert.match(source,/直接同步行程/);
});

test("unified upload selector and workspace actions retain audited touch targets",async()=>{
 const source=await read("app/styles/audit-fixes.css");
 assert.match(source,/\.expense-upload-type select\{min-height:44px/);
 assert.match(source,/\.trip-overview-page button/);
 assert.match(source,/\.trip-preparation-page button/);
 assert.match(source,/\.workspace-mobile-nav button\{min-width:0;min-height:52px/);
});
