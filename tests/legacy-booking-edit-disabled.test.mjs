import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("single booking PATCH cannot mutate one leg outside whole-order replace",async()=>{
 const source=await read("app/api/trips/[id]/bookings/[bookingId]/route.ts");
 const patchStart=source.indexOf("export async function PATCH");
 const deleteStart=source.indexOf("export async function DELETE");
 const patchBlock=source.slice(patchStart,deleteStart);
 assert.match(patchBlock,/error:"replace_required"/);
 assert.match(patchBlock,/\/bookings\/replace/);
 assert.match(patchBlock,/status:409/);
 assert.doesNotMatch(patchBlock,/db\.update/);
 assert.doesNotMatch(patchBlock,/db\.batch/);
});

test("booking DELETE keeps permanent whole-order graph cleanup",async()=>{
 const source=await read("app/api/trips/[id]/bookings/[bookingId]/route.ts");
 const deleteStart=source.indexOf("export async function DELETE");
 const deleteBlock=source.slice(deleteStart);
 assert.match(deleteBlock,/hardDeleteOrderGraph/);
 assert.match(deleteBlock,/permanent:true/);
 assert.match(deleteBlock,/documentsDeleted:deleted\.documentIds\.length/);
 assert.match(deleteBlock,/duplicateDocumentsDeleted/);
 assert.match(deleteBlock,/objectDeleteFailures/);
});
