import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("flight and stay todo GET ignores historical manual overrides",async()=>{
 const source=await read("app/api/trips/[id]/todos/route.ts");
 assert.match(source,/managedTravelKeys=new Set<ItemKey>\(\["flight","stay"\]\)/);
 assert.match(source,/if\(managedTravelKeys\.has\(key\)\)return\[key,\{checked:systemEvidence,source:systemEvidence\?"system":null,managed:true\}\]/);
 assert.ok(source.indexOf("if(managedTravelKeys.has(key))")<source.indexOf("const override=todos.find"));
});

test("flight and stay todo PATCH rejects manual completion",async()=>{
 const source=await read("app/api/trips/[id]/todos/route.ts");
 assert.match(source,/if\(managedTravelKeys\.has\(input\.itemKey\)\)return NextResponse\.json\(\{error:"managed_todo"/);
 assert.match(source,/不能手動勾選/);
 assert.match(source,/status:409/);
});

test("travel todo checkboxes are visibly booking-managed",async()=>{
 const source=await read("app/TripTodoPanel.tsx");
 assert.match(source,/const isManagedTravelTodo=\(key:ItemKey\)=>key==="flight"\|\|key==="stay"/);
 assert.match(source,/if\(isManagedTravelTodo\(key\)\)return/);
 assert.match(source,/disabled=\{!mine\|\|saving===key\|\|managed\}/);
 assert.match(source,/訂單同步/);
 assert.match(source,/\{checked:true,source:"system",managed:true\}/);
});
