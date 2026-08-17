export type ObjectDeleteResult={objectsDeleted:number;objectDeleteFailures:number;failedObjectKeys:string[];attemptsUsed:number};

export async function deleteObjectKeysWithRetry(keys:Array<string|null|undefined>,maxAttempts=3):Promise<ObjectDeleteResult>{
 const objectKeys=[...new Set(keys.filter((key):key is string=>Boolean(key)))];
 if(!objectKeys.length)return {objectsDeleted:0,objectDeleteFailures:0,failedObjectKeys:[],attemptsUsed:0};
 let bucket:{delete:(key:string)=>Promise<unknown>}|null=null;
 try{const {env}=await import("cloudflare:workers");bucket=env.BUCKET}catch{return {objectsDeleted:0,objectDeleteFailures:objectKeys.length,failedObjectKeys:objectKeys,attemptsUsed:0}}
 let pending=objectKeys,attemptsUsed=0;
 for(let attempt=1;attempt<=Math.max(1,maxAttempts)&&pending.length;attempt++){
  attemptsUsed=attempt;
  const current=pending,results=await Promise.allSettled(current.map(key=>bucket!.delete(key)));
  pending=current.filter((_,index)=>results[index].status==="rejected");
 }
 return {objectsDeleted:objectKeys.length-pending.length,objectDeleteFailures:pending.length,failedObjectKeys:pending,attemptsUsed};
}
