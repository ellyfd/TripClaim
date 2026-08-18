import {NextRequest,NextResponse} from "next/server";
import {asc,count,max} from "drizzle-orm";
import {getChatGPTUser} from "../../../chatgpt-auth";
import {recordAudit,requireSystemAdmin} from "../../../../db/access";
import {pendingObjectDeletions,retryPendingObjectDeletions} from "../../../../db/object-deletion-queue";

const publicRow=(row:typeof pendingObjectDeletions.$inferSelect)=>({id:row.id,ownerEmail:row.ownerEmail,tripId:row.tripId,sourceType:row.sourceType,sourceId:row.sourceId,attempts:row.attempts,lastError:row.lastError,createdAt:row.createdAt,updatedAt:row.updatedAt});
async function summary(db:NonNullable<Awaited<ReturnType<typeof requireSystemAdmin>>>){
 const [totals]=await db.select({pending:count(),maxAttempts:max(pendingObjectDeletions.attempts)}).from(pendingObjectDeletions);
 const [oldest]=await db.select({createdAt:pendingObjectDeletions.createdAt}).from(pendingObjectDeletions).orderBy(asc(pendingObjectDeletions.createdAt)).limit(1);
 return {pending:Number(totals?.pending??0),oldestCreatedAt:oldest?.createdAt??null,maxAttempts:Number(totals?.maxAttempts??0)};
}

export async function GET(){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const db=await requireSystemAdmin(user);if(!db)return NextResponse.json({error:"admin_required"},{status:403});
 const [health,rows]=await Promise.all([summary(db),db.select().from(pendingObjectDeletions).orderBy(asc(pendingObjectDeletions.createdAt)).limit(100)]);
 return NextResponse.json({summary:{...health,shown:rows.length},items:rows.map(publicRow)});
}

export async function POST(request:NextRequest){
 const user=await getChatGPTUser();if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 const db=await requireSystemAdmin(user);if(!db)return NextResponse.json({error:"admin_required"},{status:403});
 const input=await request.json().catch(()=>({})) as {action?:string};
 if(input.action!=="retry_pending_storage")return NextResponse.json({error:"invalid_action"},{status:400});
 const before=await summary(db),rows=await db.select().from(pendingObjectDeletions).orderBy(asc(pendingObjectDeletions.createdAt)).limit(100);
 const groups=[...new Map(rows.map(row=>[`${row.ownerEmail}\n${row.tripId}`,{ownerEmail:row.ownerEmail,tripId:row.tripId}])).values()];
 let attempted=0,deleted=0;
 for(const group of groups){const result=await retryPendingObjectDeletions({...group,limit:25});attempted+=result.attempted;deleted+=result.deleted;}
 const health=await summary(db),result={attempted,deleted,remaining:health.pending,oldestCreatedAt:health.oldestCreatedAt,maxAttempts:health.maxAttempts};
 await recordAudit({actorEmail:user.email,entityType:"system_health",entityId:"pending_object_deletions",action:"retry_pending_storage",before,after:result});
 return NextResponse.json(result);
}
