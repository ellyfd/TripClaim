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

test("identical-copy cleanup starts backing-object retry only after database cleanup",async()=>{
 const source=await read("db/order-graph.ts");
 const batchIndex=source.indexOf("await db.batch(writes)");
 const retryIndex=source.indexOf("await deleteObjectKeysWithRetry(documents.map");
 assert.ok(batchIndex>=0&&retryIndex>batchIndex);
 assert.match(source,/deleteObjectKeysWithRetry/);
 assert.match(source,/duplicateDocumentsDeleted:Math\.max\(0,documentIds\.length-1\)/);
 assert.match(source,/objectDeleteFailures:objectCleanup\.objectDeleteFailures/);
 assert.match(source,/failedObjectKeys:objectCleanup\.failedObjectKeys/);
});

test("manual travel orders without documents still group only by kind and bookedAt",async()=>{
 const source=await read("db/order-graph.ts");
 assert.match(source,/eq\(travelBookings\.kind,seed\.kind\)/);
 assert.match(source,/eq\(travelBookings\.bookedAt,seed\.bookedAt\)/);
});
