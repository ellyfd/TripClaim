import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("comp leave override is stored as owner-scoped half-day units with a unique trip-user key",async()=>{
 const [schema,migration]=await Promise.all([read("db/schema.ts"),read("drizzle/0025_comp_leave_overrides.sql")]);
 assert.match(schema,/tripCompLeaveOverrides = sqliteTable\("trip_comp_leave_overrides"/);
 assert.match(schema,/tripId: text\("trip_id"\)\.notNull\(\)/);
 assert.match(schema,/userEmail: text\("user_email"\)\.notNull\(\)/);
 assert.match(schema,/halfUnits: integer\("half_units"\)\.notNull\(\)/);
 assert.match(migration,/CREATE TABLE `trip_comp_leave_overrides`/);
 assert.match(migration,/`half_units` integer NOT NULL/);
 assert.match(migration,/CREATE UNIQUE INDEX `trip_comp_leave_overrides_trip_user_unique` ON `trip_comp_leave_overrides` \(`trip_id`,`user_email`\)/);
});

test("comp leave API reads and mutates only the signed-in member's override",async()=>{
 const route=await read("app/api/trips/[id]/comp-leave/route.ts");
 assert.match(route,/requireTripMember\(id,user\.email\)/);
 assert.match(route,/requireTripMember\(id,user\.email,\{write:true\}\)/);
 assert.match(route,/eq\(tripCompLeaveOverrides\.tripId,tripId\)/);
 assert.match(route,/eq\(tripCompLeaveOverrides\.userEmail,userEmail\)/);
 assert.match(route,/currentUserEmail:user\.email/);
 assert.match(route,/Number\.isInteger\(halfUnits\)/);
 assert.match(route,/halfUnits<0\|\|halfUnits>730/);
 assert.match(route,/db\.update\(tripCompLeaveOverrides\)/);
 assert.match(route,/db\.insert\(tripCompLeaveOverrides\)/);
 assert.match(route,/db\.delete\(tripCompLeaveOverrides\)/);
 assert.match(route,/entityType:"comp_leave_override"/);
 assert.match(route,/action:"reset"/);
});

test("comp leave UI persists only after server acknowledgement and can restore automatic calculation",async()=>{
 const source=await read("app/CompLeavePanel.tsx");
 assert.match(source,/fetch\(`\/api\/trips\/\$\{tripId\}\/comp-leave`\)/);
 assert.match(source,/method:"PATCH"/);
 assert.match(source,/body:JSON\.stringify\(\{halfUnits\}\)/);
 assert.match(source,/setOverrideHalfUnits\(body\.overrideHalfUnits\)/);
 assert.match(source,/method:"DELETE"/);
 assert.match(source,/setOverrideHalfUnits\(null\)/);
 assert.match(source,/恢復自動試算/);
 assert.match(source,/畫面未套用這次調整/);
 assert.doesNotMatch(source,/\[manual,setManual\]/);
 assert.match(source,/window\.addEventListener\("tripclaim:data-changed",reload\)/);
 assert.match(source,/人工調整會保存到本人資料/);
});
