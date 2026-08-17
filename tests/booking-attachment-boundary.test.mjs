import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("shared booking attachment requires an active booking in the requested trip",async()=>{
 const source=await read("app/api/trips/[id]/bookings/[bookingId]/attachment/route.ts");
 assert.match(source,/eq\(travelBookings\.id,bookingId\)/);
 assert.match(source,/eq\(travelBookings\.tripId,id\)/);
 assert.match(source,/isNull\(travelBookings\.deletedAt\)/);
});

test("booking document must belong to the booking owner and same active trip",async()=>{
 const source=await read("app/api/trips/[id]/bookings/[bookingId]/attachment/route.ts");
 assert.match(source,/eq\(uploadedDocuments\.id,booking\.documentId\)/);
 assert.match(source,/eq\(uploadedDocuments\.tripId,id\)/);
 assert.match(source,/eq\(uploadedDocuments\.ownerEmail,booking\.ownerEmail\)/);
 assert.match(source,/isNull\(uploadedDocuments\.deletedAt\)/);
});

test("shared attachment delivery keeps private no-sniff sandbox headers",async()=>{
 const source=await read("app/api/trips/[id]/bookings/[bookingId]/attachment/route.ts");
 assert.match(source,/"cache-control":"private, no-store"/);
 assert.match(source,/"x-content-type-options":"nosniff"/);
 assert.match(source,/"content-security-policy":"sandbox; default-src 'none'"/);
});
