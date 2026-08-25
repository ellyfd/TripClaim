import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("remote timezone runtime requires additive migration 0024 while local runner applies sorted SQL files",async()=>{
 const [migration,runner,notes]=await Promise.all([
  read("drizzle/0024_flight_endpoint_timezones.sql"),
  read("scripts/db-migrate-local.mjs"),
  read("docs/TIMEZONE_IMPLEMENTATION_NOTES.md"),
 ]);
 assert.match(migration,/ALTER TABLE `travel_bookings` ADD COLUMN `departure_timezone` text/);
 assert.match(migration,/ALTER TABLE `travel_bookings` ADD COLUMN `arrival_timezone` text/);
 assert.match(runner,/readdirSync\("drizzle"\)\.filter\(\(f\) => f\.endsWith\("\.sql"\)\)\.sort\(\)/);
 assert.match(notes,/must not be published against a D1 database that has not applied migration 0024/);
});
