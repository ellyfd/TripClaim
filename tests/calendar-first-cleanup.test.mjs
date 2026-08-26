import test from "node:test";
import assert from "node:assert/strict";
import {access,readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
const missing=async path=>{try{await access(new URL(`../${path}`,import.meta.url));return false}catch{return true}};

test("obsolete overview and preparation workspaces are removed from runtime source",async()=>{
 assert.equal(await missing("app/TripOverview.tsx"),true);
 assert.equal(await missing("app/TripPreparation.tsx"),true);
 const page=await read("app/page.tsx");
 assert.match(page,/type Stage="create"\|"itinerary"\|"expense"/);
 assert.doesNotMatch(page,/TripOverview|TripPreparation|"overview"|"preparation"/);
});

test("travel intake uses the calendar mental model instead of a separate preparation step",async()=>{
 const [todo,itinerary,page]=await Promise.all([
  read("app/TripTodoPanel.tsx"),
  read("app/ItineraryWizardLive.tsx"),
  read("app/page.tsx"),
 ]);
 assert.match(todo,/<h2>我的行程資料<\/h2>/);
 assert.match(todo,/上傳或登記機票、住宿後，會直接出現在下方行事曆/);
 assert.doesNotMatch(todo,/我的行前資料|行前準備/);
 assert.match(itinerary,/<TripTodoPanel tripId=\{tripId\} onBookingSaved=\{\(\)=>void load\(tripId\)\}\/>/);
 assert.match(itinerary,/AgendaSheet dates=\{dates\}/);
 assert.match(itinerary,/上方「我的行程資料」/);
 assert.doesNotMatch(itinerary,/請到「行前準備」/);
 assert.match(page,/<i>⌂<\/i>全部出差/);
 assert.match(page,/<i>▤<\/i>行程/);
 assert.match(page,/<i>\$<\/i>我的報支/);
 assert.doesNotMatch(page,/>總覽<|>行前準備<|>準備<\/span>/);
});

test("calendar stays visually primary while secondary trip information is deferred",async()=>{
 const [itinerary,css]=await Promise.all([
  read("app/ItineraryWizardLive.tsx"),
  read("app/styles/simplified-trip-ia.css"),
 ]);
 const intakeIndex=itinerary.indexOf("itinerary-primary-intake");
 const calendarIndex=itinerary.indexOf("<AgendaSheet");
 const secondaryIndex=itinerary.indexOf("itinerary-secondary-tools");
 assert.ok(intakeIndex>=0&&calendarIndex>intakeIndex&&secondaryIndex>calendarIndex);
 assert.match(itinerary,/<summary>補休與同行者機票／住宿<\/summary>/);
 assert.match(itinerary,/上傳機票／住宿後會直接排進行事曆/);
 assert.match(css,/\.simplified-itinerary-page \.side-booking-actions button\{min-height:48px/);
 assert.match(css,/\.simplified-itinerary-page \.todo-members\{grid-column:1\/-1;display:flex;gap:8px;margin:0;max-height:92px/);
 assert.match(css,/\.itinerary-secondary-tools>summary/);
 assert.match(css,/\.itinerary-secondary-grid\{display:grid/);
 assert.match(css,/@media\(max-width:800px\)[\s\S]*\.todo-members>section:not\(\.mine\)\{display:none\}/);
});
