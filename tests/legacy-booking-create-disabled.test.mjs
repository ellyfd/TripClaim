import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("legacy booking POST cannot append a second order graph",async()=>{
 const source=await read("app/api/trips/[id]/bookings/route.ts");
 assert.match(source,/export async function POST/);
 assert.match(source,/error:"replace_required"/);
 assert.match(source,/\/bookings\/replace/);
 assert.match(source,/status:409/);
 assert.doesNotMatch(source,/db\.insert\(travelBookings\)/);
 assert.doesNotMatch(source,/db\.insert\(agendaItems\)/);
 assert.doesNotMatch(source,/db\.insert\(personalExpenses\)/);
});

test("booking comparison UI cannot create or edit travel orders",async()=>{
 const [panel,itinerary]=await Promise.all([
  read("app/BookingPanel.tsx"),
  read("app/ItineraryWizardLive.tsx"),
 ]);
 assert.doesNotMatch(panel,/mode:"edit"\|"compare"/);
 assert.doesNotMatch(panel,/method:"POST"/);
 assert.doesNotMatch(panel,/>編輯<\/button>/);
 assert.match(panel,/我的行前資料/);
 assert.match(itinerary,/<BookingPanel tripId=\{tripId\}\/>/);
 assert.doesNotMatch(itinerary,/BookingPanel tripId=\{tripId\} mode=/);
});
