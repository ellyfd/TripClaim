import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("discard mode deletes only the exact unlinked upload draft",async()=>{
 const source=await read("app/api/documents/[id]/route.ts");
 assert.match(source,/searchParams\.get\("discard"\)==="1"/);
 assert.match(source,/eq\(travelBookings\.documentId,id\)/);
 assert.match(source,/eq\(personalExpenses\.sourceDocumentId,id\)/);
 assert.match(source,/booking\|\|expense\|\|doc\.confirmedAt/);
 assert.match(source,/error:"discard_not_allowed"/);
 assert.match(source,/db\.delete\(uploadedDocuments\).*eq\(uploadedDocuments\.id,id\)/s);
 assert.match(source,/action:"discard_unlinked_upload"/);
 const discardStart=source.indexOf('if(request.nextUrl.searchParams.get("discard")==="1")');
 const permanentStart=source.indexOf("const deleted=await hardDeleteOrderGraph",discardStart);
 const discardBlock=source.slice(discardStart,permanentStart);
 assert.doesNotMatch(discardBlock,/hardDeleteOrderGraph/);
 assert.doesNotMatch(discardBlock,/eq\(uploadedDocuments\.contentHash/);
});

test("travel upload modal discards its draft on cancel close backdrop and replacement",async()=>{
 const source=await read("app/TripTodoPanel.tsx");
 assert.match(source,/const discardDraft=async/);
 assert.match(source,/\/api\/documents\/\$\{id\}\?discard=1/);
 assert.match(source,/const closeDraft=async/);
 assert.match(source,/onClick=\{\(\)=>void closeDraft\(\)\}/);
 assert.match(source,/if\(documentId\).*discardDraft\(documentId\)/s);
 const readStart=source.indexOf("const readFile=");
 const saveStart=source.indexOf("const saveBooking=");
 const readBlock=source.slice(readStart,saveStart);
 assert.doesNotMatch(readBlock,/setMembers\(/);
});

test("todo completion happens only after replace succeeds",async()=>{
 const source=await read("app/TripTodoPanel.tsx");
 const saveStart=source.indexOf("const saveBooking=");
 const saveBlock=source.slice(saveStart);
 assert.match(saveBlock,/\/bookings\/replace/);
 assert.match(saveBlock,/if\(!r\.ok\)/);
 assert.match(saveBlock,/setDocumentId\(undefined\)/);
 assert.match(saveBlock,/setMembers\(/);
 assert.ok(saveBlock.indexOf("setMembers(")>saveBlock.indexOf("if(!r.ok)"));
});
