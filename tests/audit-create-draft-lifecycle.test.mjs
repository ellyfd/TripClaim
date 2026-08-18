import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("create drafts have an authenticated owner-scoped delete lifecycle",async()=>{
 const route=await read("app/api/drafts/route.ts");
 assert.match(route,/export async function DELETE/);
 assert.match(route,/getChatGPTUser\(\)/);
 assert.match(route,/validFlow\(flow\)/);
 assert.match(route,/db\.delete\(tripDrafts\)/);
 assert.match(route,/eq\(tripDrafts\.ownerEmail,user\.email\)/);
 assert.match(route,/eq\(tripDrafts\.flow,flow\)/);
});

test("create draft autosave never writes while listing trips or editing an existing trip",async()=>{
 const source=await read("app/CreateTripWizardLive.tsx");
 assert.match(source,/mode!=="create"/);
 assert.match(source,/draftAction!=="idle"/);
 assert.match(source,/fetch\("\/api\/drafts",\{method:"PUT"/);
 assert.match(source,/setMode\("edit"\)/);
});

test("create wizard exposes explicit save-and-leave and abandon actions",async()=>{
 const source=await read("app/CreateTripWizardLive.tsx");
 assert.match(source,/儲存草稿並離開/);
 assert.match(source,/放棄草稿/);
 assert.match(source,/const saveCreateDraft=async/);
 assert.match(source,/const leaveWizard=async/);
 assert.match(source,/const abandonDraft=async/);
 assert.match(source,/fetch\("\/api\/drafts\?flow=create",\{method:"DELETE"\}\)/);
 assert.match(source,/草稿保存失敗，仍留在目前畫面/);
 assert.match(source,/放棄草稿失敗，草稿仍保留/);
});

test("saved create drafts resume and successful trip creation clears the draft",async()=>{
 const source=await read("app/CreateTripWizardLive.tsx");
 assert.match(source,/setHasCreateDraft\(true\)/);
 assert.match(source,/hasCreateDraft\?"繼續建立草稿"/);
 assert.match(source,/if\(!hasCreateDraft\)\{setForm\(initial\)/);
 assert.match(source,/await fetch\("\/api\/drafts\?flow=create",\{method:"DELETE"\}\)\.catch/);
 assert.match(source,/setHasCreateDraft\(false\)/);
});

test("draft exit actions keep audited touch targets",async()=>{
 const styles=await read("app/styles/audit-fixes.css");
 assert.match(styles,/\.wizard-exit-actions button/);
 assert.match(styles,/min-height:44px/);
 assert.match(styles,/\.discard-draft/);
});
