import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("expense intake uses one upload entry and sends travel back to the calendar workspace",async()=>{
 const source=await read("app/ExpenseWizardLive.tsx");
 assert.match(source,/const expenseUploadTypes=\["自動辨識","收據／發票","刷卡單","信用卡帳單","交通票券"\]/);
 assert.match(source,/className="expense-upload-type"/);
 assert.match(source,/value=\{uploadType\}/);
 assert.match(source,/className="expense-upload-main"/);
 assert.doesNotMatch(source,/className="expense-type-buttons"/);
 assert.match(source,/共用這一個上傳入口/);
 assert.match(source,/行程 → 我的行程資料/);
 assert.doesNotMatch(source,/行前準備 → 我的行前資料/);
 assert.doesNotMatch(source,/步驟 3/);
});

test("trip workspace is simplified to trips, calendar, and claim",async()=>{
 const page=await read("app/page.tsx");
 assert.match(page,/type Stage="create"\|"itinerary"\|"expense"/);
 assert.match(page,/target:TripStage="itinerary"/);
 assert.match(page,/const resolveTripStage=.*value==="expense"\?"expense":"itinerary"/);
 assert.match(page,/aria-label="Trip workspace"/);
 assert.match(page,/<i><HomeIcon\/><\/i>全部出差/);
 assert.match(page,/<i><CalendarIcon\/><\/i>行程/);
 assert.match(page,/<i><ReceiptIcon\/><\/i>我的報支/);
 assert.doesNotMatch(page,/<i>◎<\/i>總覽/);
 assert.doesNotMatch(page,/<i>✓<\/i>行前準備/);
 assert.doesNotMatch(page,/TripOverview|TripPreparation/);
 assert.match(page,/aria-label="手機工作區"/);
 for(const label of ["出差","行程","報支"])assert.match(page,new RegExp(`>${label}<\\/span>`));
 assert.doesNotMatch(page,/>總覽<\/span>|>準備<\/span>/);
 assert.doesNotMatch(page,/className="camera"/);
});

test("travel upload, todo, comp leave, and calendar live on the same itinerary surface",async()=>{
 const itinerary=await read("app/ItineraryWizardLive.tsx");
 assert.match(itinerary,/import TripTodoPanel from "\.\/TripTodoPanel"/);
 assert.match(itinerary,/import CompLeavePanel from "\.\/CompLeavePanel"/);
 assert.match(itinerary,/className="itinerary-inline-prep itinerary-primary-intake"/);
 assert.match(itinerary,/<TripTodoPanel tripId=\{tripId\}/);
 assert.match(itinerary,/<CompLeavePanel tripId=\{tripId\}/);
 assert.match(itinerary,/上傳機票／住宿/);
 assert.match(itinerary,/直接排進行事曆/);
 assert.match(itinerary,/AgendaSheet dates=\{dates\}/);
 assert.match(itinerary,/onBookingSaved=\{\(\)=>void load\(tripId\)\}/);
 assert.match(itinerary,/tripclaim:data-changed/);
 assert.doesNotMatch(itinerary,/請到「行前準備」/);
 assert.match(itinerary,/BookingPanel tripId=\{tripId\}/);
 const intake=itinerary.indexOf("itinerary-primary-intake"),calendar=itinerary.indexOf("<AgendaSheet"),secondary=itinerary.indexOf("itinerary-secondary-tools");
 assert.ok(intake>=0&&calendar>intake&&secondary>calendar);
});

test("trip list has one primary entry and opens the calendar directly",async()=>{
 const [source,page]=await Promise.all([read("app/CreateTripWizardLive.tsx"),read("app/page.tsx")]);
 assert.match(source,/function CreateTripWizardLive\(\{onCreate\}:\{onCreate:/);
 assert.doesNotMatch(source,/onExpense/);
 assert.match(source,/const openTrip=\(trip:Trip\)=>onCreate/);
 assert.match(source,/onClick=\{\(\)=>openTrip\(t\)\}>開啟出差/);
 assert.doesNotMatch(source,/className="claim"|>我的報支<\/button>/);
 assert.match(page,/<CreateTripForm onCreate=\{trip=>openTrip\(trip,"itinerary"\)\}\/?>/);
 assert.doesNotMatch(page,/onExpense=/);
});

test("shared booking details remain secondary and mobile nav is three equal actions",async()=>{
 const [hierarchy,simplified,globals]=await Promise.all([read("app/styles/ia-hierarchy.css"),read("app/styles/simplified-trip-ia.css"),read("app/globals.css")]);
 assert.match(hierarchy,/\.shared-booking-details>summary\{/);
 assert.match(hierarchy,/\.shared-booking-details\[open\]>summary i/);
 assert.match(simplified,/\.workspace-mobile-nav\.simplified-trip-nav\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important\}/);
 assert.match(simplified,/\.itinerary-inline-prep\{display:block/);
 assert.match(simplified,/\.itinerary-secondary-tools>summary/);
 assert.match(simplified,/\.itinerary-secondary-grid\{display:grid/);
 assert.match(simplified,/\.todo-members>section:not\(\.mine\)\{display:none\}/);
 assert.match(globals,/@import "\.\/styles\/ia-hierarchy\.css";\n@import "\.\/styles\/simplified-trip-ia\.css";\n@import "\.\/styles\/audit-fixes\.css";\s*$/);
});

test("flight and stay booking guidance are domain-specific",async()=>{
 const source=await read("app/TripTodoPanel.tsx");
 assert.match(source,/kind==="flight"\?"來回／多航段只建立一筆本人報支，不重複計價。":"住宿訂單只建立一筆本人報支；入住與退房直接同步行程。"/);
 assert.doesNotMatch(source,/<small>來回票只建立一筆本人報支，不重複計價。<\/small>/);
 assert.match(source,/直接同步行程/);
});

test("simplified workspace actions retain audited touch targets",async()=>{
 const source=await read("app/styles/audit-fixes.css");
 assert.match(source,/\.expense-upload-type select\{min-height:44px/);
 assert.match(source,/\.workspace-mobile-nav button\{min-width:0;min-height:52px/);
 assert.match(source,/\.trip-overview-page button/);
 assert.match(source,/\.trip-preparation-page button/);
});
