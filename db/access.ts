import { and, eq } from "drizzle-orm";
import { getDb } from ".";
import { auditLogs, systemUsers, tripMembers, userProfiles } from "./schema";
import type { ChatGPTUser } from "../app/chatgpt-auth";

export async function ensureUser(user:ChatGPTUser){const db=await getDb();const now=new Date().toISOString();await db.insert(userProfiles).values({email:user.email,displayName:user.displayName,notificationEmail:user.email,createdAt:now,updatedAt:now}).onConflictDoUpdate({target:userProfiles.email,set:{updatedAt:now}});return db}
export async function ensureSystemRole(user:ChatGPTUser){const db=await ensureUser(user),now=new Date().toISOString(),existing=await db.select().from(systemUsers),current=existing.find(x=>x.email===user.email);if(!existing.length){await db.insert(systemUsers).values({email:user.email,displayName:user.displayName,role:"admin",createdByEmail:user.email,createdAt:now,updatedAt:now});return {db,role:"admin" as const}}return {db,role:current?.role??null}}
export async function requireSystemAdmin(user:ChatGPTUser){const {db,role}=await ensureSystemRole(user);return role==="admin"?db:null}
export async function getMembership(tripId:string,email:string){const db=await getDb();const [member]=await db.select().from(tripMembers).where(and(eq(tripMembers.tripId,tripId),eq(tripMembers.userEmail,email))).limit(1);return member??null}
export async function requireTripMember(tripId:string,email:string,{write=false}:{write?:boolean}={}){const member=await getMembership(tripId,email);if(!member)return null;if(write&&member.role==="viewer")return null;return member}
export async function recordAudit(input:{tripId?:string;actorEmail:string;entityType:string;entityId:string;action:string;before?:unknown;after?:unknown}){const db=await getDb();await db.insert(auditLogs).values({id:crypto.randomUUID(),tripId:input.tripId,actorEmail:input.actorEmail,entityType:input.entityType,entityId:input.entityId,action:input.action,beforeJson:input.before===undefined?null:JSON.stringify(input.before),afterJson:input.after===undefined?null:JSON.stringify(input.after),createdAt:new Date().toISOString()})}
