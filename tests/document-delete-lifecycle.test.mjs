import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("ordinary documents soft-delete with linked expenses and keep an undo route",async()=>{
 const [route,trash]=await Promise.all([
  read("app/api/documents/[id]/route.ts"),
  read("app/api/trash/[kind]/[id]/route.ts"),
 ]);
 assert.match(route,/const isTravelDocument=/);
 assert.match(route,/linkedBooking/);
 assert.match(route,/if\(isTravelDocument\(doc\.documentType\)\|\|linkedBooking\)/);
 assert.match(route,/soft_delete_graph/);
 assert.match(route,/recoverable:true,travel:false,undo:\{kind:"document",id\}/);
 assert.match(route,/db\.update\(uploadedDocuments\)\.set\(\{deletedAt:now/);
 assert.match(route,/db\.update\(personalExpenses\)\.set\(\{deletedAt:now/);
 assert.match(trash,/kind==="document"/);
 assert.match(trash,/deletedAt:null/);
 assert.match(trash,/travel_restore_disabled/);
});

test("travel documents remain permanent whole-order deletes while ordinary UI offers restore",async()=>{
 const [route,inbox]=await Promise.all([
  read("app/api/documents/[id]/route.ts"),
  read("app/DocumentInbox.tsx"),
 ]);
 assert.match(route,/hardDeleteOrderGraph/);
 assert.match(route,/permanent:true,travel:true/);
 assert.match(inbox,/isTravelDocument/);
 assert.match(inbox,/移到垃圾桶/);
 assert.match(inbox,/可立即復原/);
 assert.match(inbox,/永久刪除.*整張機票／住宿訂單/);
 assert.match(inbox,/\/api\/trash\/\$\{result\.undo\.kind\}\/\$\{result\.undo\.id\}/);
});
