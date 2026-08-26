import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("selecting or creating a trip opens the working itinerary directly",async()=>{
 const [page,create]=await Promise.all([read("app/page.tsx"),read("app/CreateTripWizardLive.tsx")]);
 assert.match(page,/target:TripStage="itinerary"/);
 assert.match(page,/<CreateTripForm onCreate=\{trip=>openTrip\(trip,"itinerary"\)\}/);
 assert.doesNotMatch(page,/TripOverview|stage==="overview"|navigate\("overview"\)/);
 assert.match(create,/選一趟出差就直接進行程/);
 assert.match(create,/建立後直接開啟行程/);
});

test("travel input and its visible calendar result share one workspace",async()=>{
 const source=await read("app/ItineraryWizardLive.tsx");
 assert.match(source,/className="itinerary-inline-prep itinerary-primary-intake"/);
 assert.match(source,/<TripTodoPanel/);
 assert.match(source,/<CompLeavePanel/);
 assert.match(source,/<AgendaSheet/);
 assert.match(source,/上傳機票／住宿後會直接排進行事曆/);
 assert.match(source,/tripclaim:data-changed/);
 assert.doesNotMatch(source,/請到「行前準備」/);
 const intake=source.indexOf("itinerary-primary-intake"),calendar=source.indexOf("<AgendaSheet"),secondary=source.indexOf("itinerary-secondary-tools");
 assert.ok(intake>=0&&calendar>intake&&secondary>calendar);
});

test("agenda toolbar exposes only working controls and does not advertise unfinished bulk import",async()=>{
 const source=await read("app/AgendaSheet.tsx");
 assert.match(source,/agenda-view-status/);
 assert.doesNotMatch(source,/匯入 Excel／CSV|讀取截圖／PDF|importFile|imageFile|fileRef|imageRef|agenda-import-message/);
 assert.doesNotMatch(source,/validateDestinationMaster/);
});
