import {NextRequest,NextResponse} from "next/server";
import {and,eq,isNull} from "drizzle-orm";
import {getChatGPTUser} from "../../../../chatgpt-auth";
import {getDb} from "../../../../../db";
import {requireTripMember} from "../../../../../db/access";
import {travelBookings,travelRequests,tripMembers,tripMemberTodos,uploadedDocuments} from "../../../../../db/schema";

const itemKeys=["flight","stay","travel_request","internet"] as const;
type ItemKey=(typeof itemKeys)[number];
const managedTravelKeys=new Set<ItemKey>(["flight","stay"]);

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser(),{id}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email))return NextResponse.json({error:"forbidden"},{status:403});
 const db=await getDb();
 const [members,todos,bookings,documents,requests]=await Promise.all([
  db.select({userEmail:tripMembers.userEmail,role:tripMembers.role}).from(tripMembers).where(eq(tripMembers.tripId,id)),
  db.select().from(tripMemberTodos).where(eq(tripMemberTodos.tripId,id)),
  db.select({ownerEmail:travelBookings.ownerEmail,kind:travelBookings.kind}).from(travelBookings).where(and(eq(travelBookings.tripId,id),isNull(travelBookings.deletedAt))),
  db.select({ownerEmail:uploadedDocuments.ownerEmail,documentType:uploadedDocuments.documentType,status:uploadedDocuments.status}).from(uploadedDocuments).where(and(eq(uploadedDocuments.tripId,id),isNull(uploadedDocuments.deletedAt))),
  db.select({confirmedByEmail:travelRequests.confirmedByEmail,status:travelRequests.status}).from(travelRequests).where(eq(travelRequests.tripId,id))
 ]);
 const evidence=(email:string,key:ItemKey)=>{
  if(key==="flight")return bookings.some(x=>x.ownerEmail===email&&x.kind==="flight");
  if(key==="stay")return bookings.some(x=>x.ownerEmail===email&&x.kind==="stay");
  if(key==="travel_request")return requests.some(x=>x.confirmedByEmail===email&&x.status==="confirmed");
  return documents.some(x=>x.ownerEmail===email&&["網路","esim","sim"].some(term=>x.documentType.toLowerCase().includes(term)));
 };
 return NextResponse.json({currentUserEmail:user.email,members:members.map(member=>{const values=itemKeys.map(key=>{const systemEvidence=evidence(member.userEmail,key);if(managedTravelKeys.has(key))return[key,{checked:systemEvidence,source:systemEvidence?"system":null,managed:true}];const override=todos.find(todo=>todo.userEmail===member.userEmail&&todo.itemKey===key);return[key,override?{checked:override.checked,source:"manual",managed:false}:{checked:systemEvidence,source:systemEvidence?"system":null,managed:false}]});return{...member,items:Object.fromEntries(values)}})});
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getChatGPTUser(),{id}=await params;
 if(!user)return NextResponse.json({error:"authentication_required"},{status:401});
 if(!await requireTripMember(id,user.email,{write:true}))return NextResponse.json({error:"forbidden"},{status:403});
 const input=await request.json() as {itemKey?:ItemKey;checked?:boolean};
 if(!input.itemKey||!itemKeys.includes(input.itemKey)||typeof input.checked!=="boolean")return NextResponse.json({error:"invalid_todo"},{status:400});
 if(managedTravelKeys.has(input.itemKey))return NextResponse.json({error:"managed_todo",message:"機票／住宿完成狀態由已同步訂單自動管理，不能手動勾選"},{status:409});
 const db=await getDb(),now=new Date().toISOString();
 const [existing]=await db.select({id:tripMemberTodos.id}).from(tripMemberTodos).where(and(eq(tripMemberTodos.tripId,id),eq(tripMemberTodos.userEmail,user.email),eq(tripMemberTodos.itemKey,input.itemKey))).limit(1);
 if(existing)await db.update(tripMemberTodos).set({checked:input.checked,updatedAt:now}).where(eq(tripMemberTodos.id,existing.id));
 else await db.insert(tripMemberTodos).values({id:crypto.randomUUID(),tripId:id,userEmail:user.email,itemKey:input.itemKey,checked:input.checked,updatedAt:now});
 return NextResponse.json({saved:true,itemKey:input.itemKey,checked:input.checked});
}
