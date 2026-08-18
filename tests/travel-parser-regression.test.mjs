import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {extractFlightSegments} from "../app/travel-flight-parser.js";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("EVA round-trip parser returns complete BR87 outbound and BR88 return values",()=>{
 const managed=new Set(["TPE","CDG"]);
 // BR87 deliberately uses date-before-time plus cabin/terminal text. The old strict anchored regex
 // could miss this leg while still matching the contiguous BR88 return layout.
 const source=[
  "TAIPEI TPE TERMINAL 2 PARIS CDG TERMINAL 1",
  "BR87 ECONOMY CLASS Y 15JUN2026 DEPARTURE 23:30 ARRIVAL 16JUN2026 08:05",
  "PARIS CDG TERMINAL 1 TAIPEI TPE TERMINAL 2",
  "BR88 11:20 25JUN2026 06:55 26JUN2026",
 ].join(" ");
 const segments=extractFlightSegments(source,code=>managed.has(code));
 assert.equal(segments.length,2);
 assert.deepEqual(segments[0],{
  title:"BR87 TPE → CDG",
  origin:"TPE",
  destination:"CDG",
  startAt:"2026-06-15T23:30",
  endAt:"2026-06-16T08:05",
  duration:null,
 });
 assert.deepEqual(segments[1],{
  title:"BR88 CDG → TPE",
  origin:"CDG",
  destination:"TPE",
  startAt:"2026-06-25T11:20",
  endAt:"2026-06-26T06:55",
  duration:null,
 });
});

test("EVA compact HHMM text layer also returns complete outbound values",()=>{
 const managed=new Set(["TPE","CDG"]);
 const source="TPE TERMINAL 2 CDG TERMINAL 1 BR87 CABIN Y 15JUN2026 2330 16JUN2026 0805";
 const [segment]=extractFlightSegments(source,code=>managed.has(code));
 assert.equal(segment?.origin,"TPE");
 assert.equal(segment?.destination,"CDG");
 assert.equal(segment?.startAt,"2026-06-15T23:30");
 assert.equal(segment?.endAt,"2026-06-16T08:05");
});

test("document route uses flight-centric parsing and merges all detected flight segments",async()=>{
 const source=await read("app/api/documents/route.ts");
 assert.match(source,/extractFlightSegments/);
 assert.match(source,/const flightCentric=isFlight\?extractFlightSegments/);
 assert.match(source,/const allSegments=\[\.\.\.segments,\.\.\.flightCentric\]/);
 assert.match(source,/findIndex\(item=>item\.title===segment\.title&&item\.startAt===segment\.startAt&&item\.endAt===segment\.endAt\)/);
 assert.match(source,/sort\(\(a,b\)=>a\.startAt\.localeCompare\(b\.startAt\)\)/);
 assert.match(source,/segments:allSegments/);
});

test("hotel extraction pins itinerary times to 15:00 check-in and 11:00 checkout",async()=>{
 const source=await read("app/api/documents/route.ts");
 assert.match(source,/CHECK\[- \]\?IN\|入住/);
 assert.match(source,/CHECK\[- \]\?OUT\|退房/);
 assert.match(source,/stayStart=stayStartDate\?`\$\{stayStartDate\}T15:00`/);
 assert.match(source,/stayEnd=stayEndDate\?`\$\{stayEndDate\}T11:00`/);
 assert.match(source,/resolvedStart=isStay\?\(stayStart\?\?times\[0\]/);
 assert.match(source,/resolvedEnd=isStay\?\(stayEnd\?\?times\[1\]/);
});

test("hotel sync requires the stay itself, not optional city or address fields",async()=>{
 const [todo,replace]=await Promise.all([
  read("app/TripTodoPanel.tsx"),
  read("app/api/trips/[id]/bookings/replace/route.ts"),
 ]);
 assert.match(todo,/城市（選填）/);
 assert.match(todo,/飯店地址（選填）/);
 assert.match(todo,/legs\.some\(leg=>!leg\.title\|\|!leg\.startAt\|\|!leg\.endAt\)/);
 assert.match(replace,/input\.kind==="flight"\?legs\.some/);
 assert.match(replace,/:legs\.some\(leg=>!leg\.title\?\.trim\(\)\|\|!leg\.startAt\|\|!leg\.endAt\)/);
 assert.match(replace,/place=input\.kind==="stay"\?\(destination\|\|origin\|\|leg\.title!/);
});
