import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("expense upload UI no longer offers a second flight or stay intake",async()=>{
 const source=await read("app/ExpenseWizardLive.tsx");
 assert.match(source,/const expenseUploadTypes=\["自動辨識","收據／發票","刷卡單","信用卡帳單","交通票券"\]/);
 assert.doesNotMatch(source,/expenseUploadTypes=.*"機票"|expenseUploadTypes=.*"住宿"/);
 assert.match(source,/行前準備 → 我的行前資料/);
 assert.doesNotMatch(source,/行程 → 我的行前資料/);
 assert.match(source,/body\.append\("uploadContext","expense"\)/);
 assert.match(source,/className="expense-upload-type"/);
 assert.match(source,/className="expense-upload-main"/);
});

test("online expense auto-detection discards travel drafts instead of keeping standalone documents",async()=>{
 const source=await read("app/ExpenseWizardLive.tsx");
 assert.match(source,/isTravelDocument\(data\.documentType\)/);
 assert.match(source,/\/api\/documents\/\$\{data\.id\}\?discard=1/);
 assert.match(source,/state:"travel"/);
 assert.match(source,/travelIntakeMessage/);
});

test("offline expense queue discards documents that later resolve to travel",async()=>{
 const source=await read("public/sw.js");
 assert.match(source,/isExpenseContext\(upload\.formData\)/);
 assert.match(source,/isTravelDocumentType\(data\.documentType\)/);
 assert.match(source,/discardUploadedDraft\(upload\.url, data\.id\)/);
 assert.match(source,/await removeUpload\(upload\.id\)/);
 assert.match(source,/type: "tripclaim-upload-rejected"/);
 assert.match(source,/reason: "travel_intake_required"/);
 assert.match(source,/queued: true, queueId: id/);
});

test("PWA bridge surfaces queued sync and rejection outcomes to the expense UI",async()=>{
 const [register,expense]=await Promise.all([read("app/PWARegister.tsx"),read("app/ExpenseWizardLive.tsx")]);
 assert.match(register,/tripclaim:upload-synced/);
 assert.match(register,/tripclaim:upload-rejected/);
 assert.match(register,/detail:event\.data/);
 assert.match(expense,/window\.addEventListener\("tripclaim:upload-synced",synced\)/);
 assert.match(expense,/window\.addEventListener\("tripclaim:upload-rejected",rejected\)/);
 assert.match(expense,/x\.queueId===detail\.id/);
});
