import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("storage cleanup health is system-admin only",async()=>{
 const source=await read("app/api/admin/health/route.ts");
 assert.match(source,/requireSystemAdmin\(user\)/);
 assert.match(source,/error:"admin_required"/);
 assert.match(source,/status:403/);
 assert.match(source,/action!=="retry_pending_storage"/);
});

test("admin health payload never exposes storage object keys",async()=>{
 const source=await read("app/api/admin/health/route.ts");
 const start=source.indexOf("const publicRow=");
 const end=source.indexOf("async function summary",start);
 const publicRow=source.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.doesNotMatch(publicRow,/objectKey/);
 assert.match(publicRow,/ownerEmail/);
 assert.match(publicRow,/tripId/);
 assert.match(publicRow,/attempts/);
 assert.match(publicRow,/lastError/);
});

test("admin retry is bounded grouped cleanup and leaves an audit record",async()=>{
 const source=await read("app/api/admin/health/route.ts");
 assert.match(source,/\.limit\(100\)/);
 assert.match(source,/retryPendingObjectDeletions\(\{\.\.\.group,limit:25\}\)/);
 assert.match(source,/entityType:"system_health"/);
 assert.match(source,/action:"retry_pending_storage"/);
 assert.match(source,/recordAudit/);
});

test("system management exposes health without turning into a storage browser",async()=>{
 const [management,health,runbook]=await Promise.all([
  read("app/SystemManagement.tsx"),
  read("app/AdminStorageHealth.tsx"),
  read("docs/RELEASE_RUNBOOK.md"),
 ]);
 assert.match(management,/\["health","系統健康"\]/);
 assert.match(management,/<AdminStorageHealth\/>/);
 assert.match(health,/\/api\/admin\/health/);
 assert.match(health,/此頁不顯示實際 object key/);
 assert.doesNotMatch(health,/objectKey/);
 assert.match(runbook,/pending storage cleanup/);
 assert.match(runbook,/最舊項目超過 24 小時/);
});
