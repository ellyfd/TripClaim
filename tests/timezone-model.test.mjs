import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {flightTiming,formatUtcOffset,zonedLocalToUtc} from "../app/timezone-utils.ts";
import {resolveAirportTimezone} from "../app/travel-timezone.ts";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("managed airport timezone resolution is deterministic for Amsterdam regressions",()=>{
 assert.deepEqual(resolveAirportTimezone("TPE").timezone,"Asia/Taipei");
 assert.deepEqual(resolveAirportTimezone("AMS").timezone,"Europe/Amsterdam");
 assert.deepEqual(resolveAirportTimezone("CDG").timezone,"Europe/Paris");
 assert.equal(resolveAirportTimezone("???").timezone,null);
});

test("CI73 true duration uses endpoint timezones instead of subtracting local clocks",()=>{
 const timing=flightTiming({departureLocalAt:"2026-11-03T23:15",departureTimezone:"Asia/Taipei",arrivalLocalAt:"2026-11-04T07:50",arrivalTimezone:"Europe/Amsterdam"});
 assert.ok(timing);
 assert.equal(timing.departureUtcAt,"2026-11-03T15:15:00.000Z");
 assert.equal(timing.arrivalUtcAt,"2026-11-04T06:50:00.000Z");
 assert.equal(timing.durationMinutes,15*60+35);
 assert.equal(timing.timezoneDifferenceMinutes,-7*60);
 assert.equal(formatUtcOffset(timing.departureOffsetMinutes),"UTC+8");
 assert.equal(formatUtcOffset(timing.arrivalOffsetMinutes),"UTC+1");
});

test("CI74 true duration preserves return endpoint local time",()=>{
 const timing=flightTiming({departureLocalAt:"2026-11-06T15:35",departureTimezone:"Europe/Amsterdam",arrivalLocalAt:"2026-11-07T10:40",arrivalTimezone:"Asia/Taipei"});
 assert.ok(timing);
 assert.equal(timing.departureUtcAt,"2026-11-06T14:35:00.000Z");
 assert.equal(timing.arrivalUtcAt,"2026-11-07T02:40:00.000Z");
 assert.equal(timing.durationMinutes,12*60+5);
 assert.equal(timing.timezoneDifferenceMinutes,7*60);
});

test("IANA conversion follows DST instead of a fixed UTC offset",()=>{
 assert.equal(zonedLocalToUtc("2026-07-01T12:00","Europe/Amsterdam"),"2026-07-01T10:00:00.000Z");
 assert.equal(zonedLocalToUtc("2026-11-01T12:00","Europe/Amsterdam"),"2026-11-01T11:00:00.000Z");
});

test("timezone migration is additive and booking remains canonical source",async()=>{
 const [migration,schema,replace,itinerary,sheet,todo]=await Promise.all([
  read("drizzle/0024_flight_endpoint_timezones.sql"),read("db/schema.ts"),read("app/api/trips/[id]/bookings/replace/route.ts"),read("app/ItineraryWizardLive.tsx"),read("app/AgendaSheet.tsx"),read("app/TripTodoPanel.tsx")
 ]);
 for(const field of ["departure_timezone","departure_utc_at","arrival_timezone","arrival_utc_at"])assert.match(migration,new RegExp(field));
 for(const field of ["departureTimezone","departureUtcAt","arrivalTimezone","arrivalUtcAt"])assert.match(schema,new RegExp(field));
 assert.match(replace,/resolveAirportTimezone/);
 assert.match(replace,/flightTiming/);
 assert.ok(replace.indexOf("const normalizedLegs")<replace.indexOf("const [oldBookings"),"timezone validation must happen before old graph deletion/replacement work");
 assert.match(itinerary,/bookingById/);
 assert.match(itinerary,/departureTimezone:booking\.departureTimezone/);
 assert.match(sheet,/實際飛行/);
 assert.match(sheet,/travel band 高度不等於實際飛行時數/);
 assert.match(todo,/出發時間（當地）/);
 assert.match(todo,/抵達時間（當地）/);
 assert.match(todo,/出發時區/);
 assert.match(todo,/抵達時區/);
 assert.doesNotMatch(todo,/new Date\(segment\.endAt\).*new Date\(segment\.startAt\)/s);
});
