import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("flight and stay todos are completed only by active bookings",async()=>{
 const source=await read("app/api/trips/[id]/todos/route.ts");
 assert.match(source,/travelBookings\.tripId,id\),isNull\(travelBookings\.deletedAt\)/);
 assert.match(source,/if\(key==="flight"\)return bookings\.some\(x=>x\.ownerEmail===email&&x\.kind==="flight"\)/);
 assert.match(source,/if\(key==="stay"\)return bookings\.some\(x=>x\.ownerEmail===email&&x\.kind==="stay"\)/);
 const flightLine=source.match(/if\(key==="flight"\)[^\n]+/)?.[0]??"";
 const stayLine=source.match(/if\(key==="stay"\)[^\n]+/)?.[0]??"";
 assert.doesNotMatch(flightLine,/documents/);
 assert.doesNotMatch(stayLine,/documents/);
});

test("document-backed todo evidence ignores deleted uploaded documents",async()=>{
 const source=await read("app/api/trips/[id]/todos/route.ts");
 assert.match(source,/uploadedDocuments\.tripId,id\),isNull\(uploadedDocuments\.deletedAt\)/);
 assert.match(source,/\["網路","esim","sim"\]/);
});

test("system evidence is evaluated once per todo item",async()=>{
 const source=await read("app/api/trips/[id]/todos/route.ts");
 assert.match(source,/const systemEvidence=evidence\(member\.userEmail,key\)/);
 assert.match(source,/checked:systemEvidence,source:systemEvidence\?"system":null/);
});
