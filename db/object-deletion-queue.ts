import {and,asc,eq,inArray} from "drizzle-orm";
import {integer,sqliteTable,text} from "drizzle-orm/sqlite-core";
import {getDb} from ".";
import {deleteObjectKeysWithRetry,type ObjectDeleteResult} from "./object-storage";

export const pendingObjectDeletions=sqliteTable("pending_object_deletions",{
 id:text("id").primaryKey(),
 ownerEmail:text("owner_email").notNull(),
 tripId:text("trip_id").notNull(),
 objectKey:text("object_key").notNull().unique(),
 sourceType:text("source_type").notNull(),
 sourceId:text("source_id"),
 attempts:integer("attempts").notNull().default(0),
 lastError:text("last_error"),
 createdAt:text("created_at").notNull(),
 updatedAt:text("updated_at").notNull(),
});

type QueueInput={ownerEmail:string;tripId:string;objectKey:string;sourceType:string;sourceId?:string|null;now?:string};

export function queueObjectDeletionWrite(db:Awaited<ReturnType<typeof getDb>>,input:QueueInput){
 const now=input.now??new Date().toISOString();
 return db.insert(pendingObjectDeletions).values({id:crypto.randomUUID(),ownerEmail:input.ownerEmail,tripId:input.tripId,objectKey:input.objectKey,sourceType:input.sourceType,sourceId:input.sourceId??null,attempts:0,lastError:null,createdAt:now,updatedAt:now}).onConflictDoUpdate({target:pendingObjectDeletions.objectKey,set:{ownerEmail:input.ownerEmail,tripId:input.tripId,sourceType:input.sourceType,sourceId:input.sourceId??null,updatedAt:now}});
}

export async function reconcileQueuedObjectDeletionResult(objectKeys:string[],result:ObjectDeleteResult){
 const keys=[...new Set(objectKeys.filter(Boolean))];
 if(!keys.length)return {cleared:0,queued:0};
 const failed=new Set(result.failedObjectKeys),succeeded=keys.filter(key=>!failed.has(key)),db=await getDb(),now=new Date().toISOString();
 const writes=[];
 if(succeeded.length)writes.push(db.delete(pendingObjectDeletions).where(inArray(pendingObjectDeletions.objectKey,succeeded)));
 for(const key of result.failedObjectKeys){
  const [row]=await db.select().from(pendingObjectDeletions).where(eq(pendingObjectDeletions.objectKey,key)).limit(1);
  if(row)writes.push(db.update(pendingObjectDeletions).set({attempts:row.attempts+result.attemptsUsed,lastError:`R2 delete failed after ${result.attemptsUsed} bounded attempt(s)`,updatedAt:now}).where(eq(pendingObjectDeletions.objectKey,key)));
 }
 if(writes.length)await db.batch(writes);
 return {cleared:succeeded.length,queued:result.failedObjectKeys.length};
}

export async function retryPendingObjectDeletions(input:{ownerEmail:string;tripId:string;limit?:number}){
 const db=await getDb(),rows=await db.select().from(pendingObjectDeletions).where(and(eq(pendingObjectDeletions.ownerEmail,input.ownerEmail),eq(pendingObjectDeletions.tripId,input.tripId))).orderBy(asc(pendingObjectDeletions.createdAt)).limit(Math.max(1,Math.min(input.limit??10,25)));
 if(!rows.length)return {attempted:0,deleted:0,remaining:0};
 const result=await deleteObjectKeysWithRetry(rows.map(row=>row.objectKey));
 await reconcileQueuedObjectDeletionResult(rows.map(row=>row.objectKey),result);
 const remaining=await db.select({id:pendingObjectDeletions.id}).from(pendingObjectDeletions).where(and(eq(pendingObjectDeletions.ownerEmail,input.ownerEmail),eq(pendingObjectDeletions.tripId,input.tripId)));
 return {attempted:rows.length,deleted:result.objectsDeleted,remaining:remaining.length};
}
