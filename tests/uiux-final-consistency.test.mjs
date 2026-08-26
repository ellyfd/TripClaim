import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("trip overview counts source orders instead of flight-leg rows",async()=>{
 const source=await read("app/TripOverview.tsx");
 assert.match(source,/const sourceOrderKey=/);
 assert.match(source,/new Set\(\(summary\?\.bookings\?\?\[\]\)\.map\(sourceOrderKey\)\)\.size/);
 assert.match(source,/來自 \$\{sourceOrderCount\} 張機票／住宿訂單/);
 assert.doesNotMatch(source,/bookingCount=summary\?\.bookings\?\.length/);
});

test("overview never compares local itinerary strings against UTC ISO or reuses a past item as next",async()=>{
 const source=await read("app/TripOverview.tsx");
 assert.match(source,/browserLocalNowKey/);
 assert.match(source,/upcomingAgenda=summary\?\.agenda\?\.find\(item=>item\.startsAt>=browserLocalNowKey\(\)\)\?\?null/);
 assert.doesNotMatch(source,/new Date\(\)\.toISOString\(\)\.slice\(0,16\)/);
 assert.doesNotMatch(source,/summary\?\.agenda\?\.\[0\]/);
 assert.match(source,/目前沒有後續安排/);
});

test("agenda toolbar exposes only working controls and does not advertise unfinished bulk import",async()=>{
 const source=await read("app/AgendaSheet.tsx");
 assert.match(source,/agenda-view-status/);
 assert.doesNotMatch(source,/匯入 Excel／CSV|讀取截圖／PDF|importFile|imageFile|fileRef|imageRef|agenda-import-message/);
 assert.doesNotMatch(source,/validateDestinationMaster/);
});
