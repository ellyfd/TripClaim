import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";

const root=new URL("../",import.meta.url);
const read=(path)=>readFile(new URL(path,root),"utf8");

test("direct login auto-provisions a member while disabled users stay blocked",async()=>{
 const [auth,access,schema,migration,users]=await Promise.all([read("app/chatgpt-auth.ts"),read("db/access.ts"),read("db/schema.ts"),read("drizzle/0022_system_user_enabled.sql"),read("app/api/admin/users/route.ts")]);
 assert.match(auth,/const identity = await getChatGPTIdentity\(\)/);
 assert.match(auth,/ensureSystemRole/);
 assert.match(auth,/return role \? identity : null/);
 assert.match(auth,/displayName: email\.split\("@"\)\[0\]/);
 assert.match(access,/current\.enabled\?current\.role:null/);
 assert.match(access,/existing\.length\?"member" as const:"admin" as const/);
 assert.match(schema,/enabled: integer\("enabled"/);
 assert.match(migration,/ADD `enabled` integer DEFAULT 1 NOT NULL/);
 assert.match(users,/action:"disable"/);

 const apiRoot=new URL("app/api/",root),routes=[];
 const walk=async(dir)=>{for(const entry of await readdir(dir,{withFileTypes:true})){const url=new URL(`${entry.name}${entry.isDirectory()?"/":""}`,dir);if(entry.isDirectory())await walk(url);else if(entry.name==="route.ts")routes.push(url)}};
 await walk(apiRoot);
 for(const route of routes){const source=await readFile(route,"utf8");assert.match(source,/getChatGPTUser/,`${route.pathname} must use the shared login allowlist gate`)}
});
