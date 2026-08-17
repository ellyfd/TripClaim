import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("order deletion expands one uploaded document to all byte-identical legacy copies",async()=>{
 const source=await read("db/order-graph.ts");
 assert.match(source,/primaryDocument\?\.contentHash/);
 assert.match(source,/eq\(uploadedDocuments\.contentHash,primaryDocument\.contentHash\)/);
 assert.match(source,/eq\(uploadedDocuments\.ownerEmail,input\.ownerEmail\)/);
 assert.match(source,/eq\(uploadedDocuments\.tripId,input\.tripId\)/);
 assert.match(source,/const documentIds=documents\.map/);
 assert.match(source,/inArray\(travelBookings\.documentId,documentIds\)/);
 assert.match(source,/inArray\(personalExpenses\.sourceDocumentId,documentIds\)/);
 assert.match(source,/inArray\(uploadedDocuments\.id,documentIds\)/);
});

test("identical-copy cleanup removes every backing object only after database cleanup",async()=>{
 const source=await read("db/order-graph.ts");
 const batchIndex=source.indexOf("await db.batch(writes)");
 const bucketIndex=source.indexOf("env.BUCKET.delete(document.objectKey)");
 assert.ok(batchIndex>=0&&bucketIndex>batchIndex);
 assert.match(source,/Promise\.allSettled\(documents\.map/);
 assert.match(source,/duplicateDocumentsDeleted:Math\.max\(0,documentIds\.length-1\)/);
 assert.match(source,/objectDeleteFailures/);
});

test("manual travel orders without documents still group only by kind and bookedAt",async()=>{
 const source=await read("db/order-graph.ts");
 assert.match(source,/eq\(travelBookings\.kind,seed\.kind\)/);
 assert.match(source,/eq\(travelBookings\.bookedAt,seed\.bookedAt\)/);
});
