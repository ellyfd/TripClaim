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

test("top-level IA uses concise itinerary and claim labels",async()=>{
 const [page,expense]=await Promise.all([read("app/page.tsx"),read("app/ExpenseWizardLive.tsx")]);
 assert.match(page,/<i>2<\/i>行程/);
 assert.match(page,/<i>3<\/i>我的報支/);
 assert.match(expense,/<h1>我的報支<\/h1>/);
 assert.match(expense,/行程 → 我的行前資料/);
});

test("flight and stay booking guidance are domain-specific",async()=>{
 const source=await read("app/TripTodoPanel.tsx");
 assert.match(source,/kind==="flight"\?"來回／多航段只建立一筆本人報支，不重複計價。":"住宿訂單只建立一筆本人報支；入住與退房直接同步行程。"/);
 assert.doesNotMatch(source,/<small>來回票只建立一筆本人報支，不重複計價。<\/small>/);
 assert.match(source,/直接同步行程/);
});

test("unified upload selector retains the audited 44px interaction target",async()=>{
 const source=await read("app/styles/audit-fixes.css");
 assert.match(source,/\.expense-upload-type select\{min-height:44px/);
});
