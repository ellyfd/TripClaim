import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("legacy booking trash restore is permanently disabled",async()=>{
 const source=await read("app/api/trash/[kind]/[id]/route.ts");
 assert.match(source,/if\(kind==="booking"\)return NextResponse\.json\(\{error:"travel_restore_disabled"/);
 assert.match(source,/status:410/);
 assert.doesNotMatch(source,/db\.update\(travelBookings\)\.set\(\{deletedAt:null/);
});

test("travel documents and travel-linked expenses cannot revive through ordinary trash kinds",async()=>{
 const source=await read("app/api/trash/[kind]/[id]/route.ts");
 assert.match(source,/isTravelDocument\(item\.documentType\)\|\|linkedBooking/);
 assert.match(source,/if\(item\.sourceBookingId\)return NextResponse\.json\(\{error:"travel_restore_disabled"/);
 assert.match(source,/isTravelDocument\(document\?\.documentType\)\|\|linkedBooking/);
});

test("ordinary document and expense restore remain recoverable",async()=>{
 const source=await read("app/api/trash/[kind]/[id]/route.ts");
 assert.match(source,/db\.update\(uploadedDocuments\)\.set\(\{deletedAt:null/);
 assert.match(source,/db\.update\(personalExpenses\)\.set\(\{deletedAt:null/);
 assert.match(source,/action:"restore_graph"/);
 assert.match(source,/return NextResponse\.json\(\{restored:true\}\)/);
});
