import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("document search is wired to the rendered collection and has a real empty state",async()=>{
 const source=await read("app/DocumentInbox.tsx");
 assert.match(source,/const normalizedQuery=query\.trim\(\)\.toLowerCase\(\)/);
 assert.match(source,/const visible=docs\.filter/);
 assert.match(source,/d\.expenseDate,d\.currency,d\.detectedCurrency/);
 assert.match(source,/visible\.map\(d=>/);
 assert.match(source,/找不到相符文件/);
 assert.match(source,/\{visible\.length\} \/ \{docs\.length\} 份/);
});

test("document confirmation is reversible with cancel escape and dirty protection",async()=>{
 const source=await read("app/DocumentInbox.tsx");
 assert.match(source,/\[dirty,setDirty\]=useState\(false\)/);
 assert.match(source,/放棄這次尚未儲存的文件修改/);
 assert.match(source,/event\.key==="Escape"/);
 assert.match(source,/className="document-editor-actions"/);
 assert.match(source,/type="button"[^>]*onClick=\{\(\)=>closeEditor\(\)\}>取消/);
});

test("booking comparison does not present missing price as zero and formats booked time",async()=>{
 const source=await read("app/BookingPanel.tsx");
 assert.match(source,/const formatPrice=.*:"未填"/);
 assert.match(source,/new Intl\.DateTimeFormat\("zh-TW"/);
 assert.match(source,/timeZone:"Asia\/Taipei"/);
 assert.match(source,/formatBookedAt\(order\.bookedAt\)/);
});

test("missing requirements expose direct repair actions",async()=>{
 const [missing,expense]=await Promise.all([read("app/MissingRequirements.tsx"),read("app/ExpenseWizardLive.tsx")]);
 assert.match(missing,/"補刷卡單"/);
 assert.match(missing,/"補信用卡帳單"/);
 assert.match(missing,/"去確認"/);
 assert.match(missing,/onFix\?\:\(item:Requirement\)=>void/);
 assert.match(expense,/const fixRequirement=\(item:Requirement\)=>/);
 assert.match(expense,/onFix=\{fixRequirement\}/);
});

test("audited action controls meet the 44px target without expanding the data grid",async()=>{
 const [globalCss,auditCss]=await Promise.all([read("app/globals.css"),read("app/styles/audit-fixes.css")]);
 assert.match(globalCss,/@import "\.\/styles\/audit-fixes\.css";\s*$/);
 assert.match(auditCss,/min-height:44px/);
 assert.match(auditCss,/\.agenda-window-nav button/);
 assert.match(auditCss,/\.trip-context-nav \.back\{width:108px;min-width:108px;height:44px/);
 assert.doesNotMatch(auditCss,/\.sheet-add[^\n]*min-height:44px/);
});
