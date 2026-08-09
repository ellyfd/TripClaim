import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("server role controls whether management is visible in the header",async()=>{
 const [access,me,page,admin,management]=await Promise.all([read("db/access.ts"),read("app/api/me/route.ts"),read("app/page.tsx"),read("app/api/admin/users/route.ts"),read("app/SystemManagement.tsx")]);
 assert.match(access,/ensureSystemRole/);
 assert.match(access,/role:current\?\.role\?\?null/);
 assert.match(me,/ensureSystemRole/);
 assert.match(me,/authenticated:true,role/);
 assert.match(me,/authenticated:false,role:null/);
 assert.match(me,/role,displayName/);
 assert.match(page,/account\.role==="admin"&&<button className="management-trigger"/);
 assert.match(admin,/requireSystemAdmin/);
 assert.match(management,/開通分成兩層/);
 assert.match(management,/Sites 網站存取名單/);
});
