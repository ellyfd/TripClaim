import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("R2 object deletion uses bounded retries and returns remaining keys",async()=>{
 const source=await read("db/object-storage.ts");
 assert.match(source,/maxAttempts=3/);
 assert.match(source,/for\(let attempt=1;attempt<=Math\.max\(1,maxAttempts\)&&pending\.length;attempt\+\+\)/);
 assert.match(source,/Promise\.allSettled\(current\.map\(key=>bucket!\.delete\(key\)\)\)/);
 assert.match(source,/pending=current\.filter\(\(_,index\)=>results\[index\]\.status==="rejected"\)/);
 assert.match(source,/failedObjectKeys:pending/);
 assert.match(source,/attemptsUsed/);
});

test("formal order deletion and replace track storage tombstones before DB graph removal",async()=>{
 const [graph,replace,queue,migration]=await Promise.all([
  read("db/order-graph.ts"),
  read("app/api/trips/[id]/bookings/replace/route.ts"),
  read("db/object-deletion-queue.ts"),
  read("drizzle/0023_pending_object_deletions.sql"),
 ]);
 for(const source of [graph,replace]){
  const tombstone=source.indexOf("queueObjectDeletionWrite");
  const batch=source.indexOf("await db.batch(writes)");
  const cleanup=source.indexOf("await deleteObjectKeysWithRetry",batch);
  const reconcile=source.indexOf("await reconcileQueuedObjectDeletionResult",cleanup);
  assert.ok(tombstone>=0&&batch>tombstone&&cleanup>batch&&reconcile>cleanup);
  assert.match(source,/retryPendingObjectDeletions/);
 }
 assert.match(queue,/pending_object_deletions/);
 assert.match(queue,/onConflictDoUpdate/);
 assert.match(queue,/deleteObjectKeysWithRetry\(rows\.map/);
 assert.match(queue,/db\.delete\(pendingObjectDeletions\)/);
 assert.match(migration,/object_key` text NOT NULL UNIQUE/);
 assert.match(migration,/pending_object_deletions_owner_trip_idx/);
 assert.match(replace,/cleanupPending:queueState\.queued>0/);
 assert.match(replace,/cleanupQueued:queueState\.queued/);
});

test("successful formal storage cleanup clears tombstones while failed keys remain retryable",async()=>{
 const source=await read("db/object-deletion-queue.ts");
 assert.match(source,/const failed=new Set\(result\.failedObjectKeys\)/);
 assert.match(source,/succeeded=keys\.filter\(key=>!failed\.has\(key\)\)/);
 assert.match(source,/db\.delete\(pendingObjectDeletions\).*succeeded/s);
 assert.match(source,/attempts:row\.attempts\+result\.attemptsUsed/);
 assert.match(source,/lastError:`R2 delete failed after/);
 assert.match(source,/remaining:remaining\.length/);
});

test("unlinked draft discard keeps its DB row when storage cleanup fails",async()=>{
 const source=await read("app/api/documents/[id]/route.ts");
 const discardStart=source.indexOf('if(request.nextUrl.searchParams.get("discard")==="1")');
 const permanentStart=source.indexOf("const deleted=await hardDeleteOrderGraph",discardStart);
 const block=source.slice(discardStart,permanentStart);
 const cleanup=block.indexOf("await deleteObjectKeysWithRetry([doc.objectKey])");
 const failure=block.indexOf("if(objectCleanup.objectDeleteFailures)");
 const batch=block.indexOf("await db.batch([");
 assert.ok(cleanup>=0&&failure>cleanup&&batch>failure);
 assert.match(block,/error:"discard_storage_cleanup_failed"/);
 assert.match(block,/retryable:true/);
 assert.match(block,/status:503/);
 assert.ok(block.indexOf("return NextResponse.json({error:\"discard_storage_cleanup_failed\"")<batch);
});

test("successful draft discard deletes storage before the exact DB rows",async()=>{
 const source=await read("app/api/documents/[id]/route.ts");
 const discardStart=source.indexOf('if(request.nextUrl.searchParams.get("discard")==="1")');
 const permanentStart=source.indexOf("const deleted=await hardDeleteOrderGraph",discardStart);
 const block=source.slice(discardStart,permanentStart);
 assert.ok(block.indexOf("await deleteObjectKeysWithRetry([doc.objectKey])")<block.indexOf("db.delete(uploadedDocuments)"));
 assert.match(block,/objectDeleted:true/);
 assert.match(block,/objectDeleteAttempts:objectCleanup\.attemptsUsed/);
});
