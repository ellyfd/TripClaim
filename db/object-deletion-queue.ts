import {and,asc,eq,inArray} from "drizzle-orm";
import {integer,sqliteTable,text} from "drizzle-orm/sqlite-core";
import {getDb} from ".";

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

async function attemptDelete(objectKey:string){
 const {env}=await import("cloudflare:workers");
 await env.BUCKET.delete(objectKey);
}

export async function settleQueuedObjectDeletion(objectKey:string){
 const db=await getDb(),now=new Date().toISOString();
 try{
  await attemptDelete(objectKey);
  await db.delete(pendingObjectDeletions).where(eq(pendingObjectDeletions.objectKey,objectKey));
  return {deleted:true,queued:false};
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  const [row]=await db.select().from(pendingObjectDeletions).where(eq(pendingObjectDeletions.objectKey,objectKey)).limit(1);
  if(row)await db.update(pendingObjectDeletions).set({attempts:row.attempts+1,lastError:message.slice(0,500),updatedAt:now}).where(eq(pendingObjectDeletions.objectKey,objectKey));
  return {deleted:false,queued:Boolean(row)};
 }
}

export async function retryPendingObjectDeletions(input:{ownerEmail:string;tripId:string;limit?:number}){
 const db=await getDb(),rows=await db.select().from(pendingObjectDeletions).where(and(eq(pendingObjectDeletions.ownerEmail,input.ownerEmail),eq(pendingObjectDeletions.tripId,input.tripId))).orderBy(asc(pendingObjectDeletions.createdAt)).limit(Math.max(1,Math.min(input.limit??10,25)));
 if(!rows.length)return {attempted:0,deleted:0,remaining:0};
 const deletedKeys:string[]=[];
 for(const row of rows){const result=await settleQueuedObjectDeletion(row.objectKey);if(result.deleted)deletedKeys.push(row.objectKey);}
 const remaining=await db.select({id:pendingObjectDeletions.id}).from(pendingObjectDeletions).where(and(eq(pendingObjectDeletions.ownerEmail,input.ownerEmail),eq(pendingObjectDeletions.tripId,input.tripId)));
 return {attempted:rows.length,deleted:deletedKeys.length,remaining:remaining.length};
}

export async function clearQueuedObjectDeletions(objectKeys:string[]){
 if(!objectKeys.length)return;
 const db=await getDb();
 await db.delete(pendingObjectDeletions).where(inArray(pendingObjectDeletions.objectKey,objectKeys));
}
