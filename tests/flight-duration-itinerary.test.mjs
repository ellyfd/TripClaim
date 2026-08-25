import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {buildFlightSegments,calendarDatesForAgenda,flightRequiresFullDay,isSyncedFlight} from "../app/agenda-flight-layout.js";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
const agenda=[
 {id:"out",type:"交通/車程",title:"CI73 TPE → AMS",startsAt:"2026-11-03T23:15",endsAt:"2026-11-04T07:50",place:"TPE → AMS",notes:"booking:out",version:1},
 {id:"back",type:"交通/車程",title:"CI74 AMS → TPE",startsAt:"2026-11-06T15:35",endsAt:"2026-11-07T10:40",place:"AMS → TPE",notes:"booking:back",version:1},
];

test("calendar projection extends through actual flight arrival even when trip ends earlier",()=>{
 const dates=calendarDatesForAgenda("2026-11-03","2026-11-06",agenda);
 assert.deepEqual(dates,["2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07"]);
});

test("overnight flight classification remains explicit",()=>{
 assert.equal(isSyncedFlight(agenda[0]),true);
 assert.equal(isSyncedFlight(agenda[1]),true);
 assert.equal(flightRequiresFullDay(agenda[0]),true);
 assert.equal(flightRequiresFullDay(agenda[1]),true);
});

test("flight segments preserve exact departure and arrival cells across midnight",()=>{
 const dates=calendarDatesForAgenda("2026-11-03","2026-11-06",agenda),segments=buildFlightSegments(dates,agenda);
 const outboundStart=segments.get("2026-11-03|23:00")?.find(x=>x.item.id==="out"),outboundEnd=segments.get("2026-11-04|07:00")?.find(x=>x.item.id==="out");
 const returnStart=segments.get("2026-11-06|15:00")?.find(x=>x.item.id==="back"),returnEnd=segments.get("2026-11-07|10:00")?.find(x=>x.item.id==="back");
 assert.ok(outboundStart?.first);assert.equal(Math.round(outboundStart.topPercent),25);
 assert.ok(outboundEnd?.last);assert.equal(Math.round(outboundEnd.bottomPercent),17);
 assert.ok(returnStart?.first);assert.equal(Math.round(returnStart.topPercent),58);
 assert.ok(returnEnd?.last);assert.equal(Math.round(returnEnd.bottomPercent),33);
 assert.ok(segments.get("2026-11-04|03:00")?.some(x=>x.item.id==="out"));
 assert.ok(segments.get("2026-11-07|05:00")?.some(x=>x.item.id==="back"));
});

test("UI keeps the calendar at 24 hours and renders synced flights as travel bands",async()=>{
 const [sheet,itinerary,css]=await Promise.all([read("app/AgendaSheet.tsx"),read("app/ItineraryWizardLive.tsx"),read("app/styles/audit-fixes.css")]);
 assert.match(itinerary,/calendarDatesForAgenda\(x\.trip\.startsOn,x\.trip\.endsOn,agenda\)/);
 assert.match(sheet,/const showFullDay=true/);
 assert.match(sheet,/hourRows\(showFullDay\?0:8,showFullDay\?23:22\)/);
 assert.doesNotMatch(sheet,/setShowFullDay/);
 assert.doesNotMatch(sheet,/只看 08–22|完整 24 小時\$\{|跨夜航班・完整 24 小時/);
 assert.match(sheet,/固定顯示 00:00–23:00/);
 assert.match(sheet,/if\(isSyncedFlight\(row\)\)continue/);
 assert.match(sheet,/buildFlightSegments\(visibleDates,rows\)/);
 assert.match(sheet,/flight-duration-segment/);
 assert.match(sheet,/出發/);
 assert.match(sheet,/抵達/);
 assert.match(css,/Synced flight projections are duration bands/);
 assert.match(css,/\.flight-duration-segment\{/);
});
