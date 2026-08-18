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
});

test("trip workspace promotes overview and uses the same IA on desktop and mobile",async()=>{
 const page=await read("app/page.tsx");
 assert.match(page,/type Stage="create"\|"overview"\|"itinerary"\|"preparation"\|"expense"/);
 assert.match(page,/target:"overview"/);
 assert.match(page,/aria-label="Trip workspace"/);
 assert.match(page,/<i>1<\/i>總覽/);
 assert.match(page,/<i>2<\/i>行程/);
 assert.match(page,/<i>3<\/i>行前準備/);
 assert.match(page,/<i>4<\/i>我的報支/);
 assert.match(page,/aria-label="手機工作區"/);
 for(const label of ["總覽","行程","準備","報支"])assert.match(page,new RegExp(`>${label}<\\/span>`));
 assert.doesNotMatch(page,/className="camera"/);
});

test("shared itinerary no longer embeds personal preparation tools",async()=>{
 const [itinerary,preparation]=await Promise.all([read("app/ItineraryWizardLive.tsx"),read("app/TripPreparation.tsx")]);
 assert.doesNotMatch(itinerary,/TripTodoPanel/);
 assert.doesNotMatch(itinerary,/CompLeavePanel/);
 assert.match(itinerary,/Shared workspace/);
 assert.match(itinerary,/BookingPanel tripId=\{tripId\}/);
 assert.match(preparation,/TripTodoPanel/);
 assert.match(preparation,/CompLeavePanel/);
 assert.match(preparation,/我的行前準備/);
 assert.match(preparation,/Personal workspace/);
});

test("trip overview aggregates status but leaves source data in domain workspaces",async()=>{
 const source=await read("app/TripOverview.tsx");
 assert.match(source,/\/summary`\)/);
 assert.match(source,/\/todos`\)/);
 assert.match(source,/\/api\/missing-requirements\?tripId=/);
 assert.match(source,/下一步：\{nextLabel\}/);
 assert.match(source,/onNavigate\("preparation"\)/);
 assert.match(source,/onNavigate\("itinerary"\)/);
 assert.match(source,/onNavigate\("expense"\)/);
 assert.match(source,/這裡只看狀態，不複製資料/);
});

test("trip list and create completion open the trip instead of bypassing overview",async()=>{
 const source=await read("app/CreateTripWizardLive.tsx");
 assert.match(source,/target:"overview"\|"expense"/);
 assert.match(source,/openTrip\(t,"overview"\).*開啟出差/);
 assert.match(source,/建立後先看出差總覽/);
 assert.match(source,/建立並開啟出差/);
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
