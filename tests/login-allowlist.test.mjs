import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";

const root=new URL("../",import.meta.url);
const read=(path)=>readFile(new URL(path,root),"utf8");

test("the server-owned login list gates every authenticated API",async()=>{
 const [auth,access]=await Promise.all([read("app/chatgpt-auth.ts"),read("db/access.ts")]);
 assert.match(auth,/const identity = await getChatGPTIdentity\(\)/);
 assert.match(auth,/ensureSystemRole/);
 assert.match(auth,/return role \? identity : null/);
 assert.match(access,/current\?\.role\?\?null/);

 const apiRoot=new URL("app/api/",root),routes=[];
 const walk=async(dir)=>{for(const entry of await readdir(dir,{withFileTypes:true})){const url=new URL(`${entry.name}${entry.isDirectory()?"/":""}`,dir);if(entry.isDirectory())await walk(url);else if(entry.name==="route.ts")routes.push(url)}};
 await walk(apiRoot);
 for(const route of routes){const source=await readFile(route,"utf8");assert.match(source,/getChatGPTUser/,`${route.pathname} must use the shared login allowlist gate`)}
});
