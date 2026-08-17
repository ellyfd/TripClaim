import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("synced travel agenda rows cannot be edited independently from their booking",async()=>{
 const [route,sheet,wizard]=await Promise.all([
  read("app/api/trips/[id]/agenda/[itemId]/route.ts"),
  read("app/AgendaSheet.tsx"),
  read("app/ItineraryWizardLive.tsx"),
 ]);
 assert.match(route,/bookingIdFromNotes/);
 assert.match(route,/managed_travel_item/);
 assert.match(route,/請從訂單資料修改/);
 assert.match(sheet,/isSyncedTravel/);
 assert.match(sheet,/if\(!synced\)onEdit\(item\)/);
 assert.match(wizard,/if\(isSyncedTravel\(row\)\)/);
});

test("deleting a synced travel agenda row permanently deletes the owner order graph",async()=>{
 const [route,wizard]=await Promise.all([
  read("app/api/trips/[id]/agenda/[itemId]/route.ts"),
  read("app/ItineraryWizardLive.tsx"),
 ]);
 assert.match(route,/travel_booking_owner_only/);
 assert.match(route,/booking\.ownerEmail!==user\.email/);
 assert.match(route,/hardDeleteOrderGraph/);
 assert.match(route,/hard_delete_travel_order/);
 assert.match(route,/permanent:true,travelOrder:true/);
 assert.match(wizard,/永久刪除.*整張機票／住宿訂單/);
 assert.match(wizard,/只有訂單本人可以刪除/);
});

test("ordinary agenda items retain recoverable deletion",async()=>{
 const route=await read("app/api/trips/[id]/agenda/[itemId]/route.ts");
 assert.match(route,/action:"soft_delete"/);
 assert.match(route,/recoverable:true,travelOrder:false/);
});
