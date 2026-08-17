import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("travel-sourced expense PATCH rebuilds source fields from the active booking",async()=>{
 const source=await read("app/api/expenses/[id]/route.ts");
 assert.match(source,/before\.sourceBookingId\?await db\.select\(\)\.from\(travelBookings\)/);
 assert.match(source,/error:"source_booking_missing"/);
 assert.match(source,/sourceBooking\.kind==="flight"\?"機票\(自行刷卡\)":"住宿"/);
 assert.match(source,/sourceBooking\?sourceBooking\.startAt\.slice\(0,10\):input\.expenseDate/);
 assert.match(source,/sourceBooking\?sourceBooking\.title:input\.merchant/);
 assert.match(source,/sourceBooking\?\.currency\|\|input\.originalCurrency/);
 assert.match(source,/sourceBooking\?\.amountMinor\?\?input\.originalAmountMinor/);
 assert.match(source,/action:sourceManaged\?"update_reporting_fields":"update"/);
});

test("travel expense UI locks booking-owned source fields but keeps reporting fields editable",async()=>{
 const source=await read("app/ExpenseSummary.tsx");
 assert.match(source,/sourceBookingId:string\|null/);
 assert.match(source,/travel-source-note/);
 assert.match(source,/日期、項目與名稱由來源訂單同步/);
 assert.match(source,/name="date"[^>]+disabled=\{Boolean\(x\.sourceBookingId\)\}/);
 assert.match(source,/name="category"[^>]+disabled=\{Boolean\(x\.sourceBookingId\)\}/);
 assert.match(source,/name="merchant"[^>]+disabled=\{Boolean\(x\.sourceBookingId\)\}/);
 assert.doesNotMatch(source,/name="currency"[^>]+disabled=\{Boolean\(x\.sourceBookingId\)\}/);
 assert.doesNotMatch(source,/name="amount"[^>]+disabled=\{Boolean\(x\.sourceBookingId\)\}/);
});

test("travel delete warning follows source linkage instead of mutable category text",async()=>{
 const source=await read("app/ExpenseSummary.tsx");
 assert.match(source,/const travel=Boolean\(x\.sourceBookingId\)\|\|x\.category\.includes\("機票"\)\|\|x\.category==="住宿"/);
 assert.match(source,/確定永久刪除/);
 assert.match(source,/且無法復原/);
});

test("client save keeps source fields unchanged for booking-managed expenses",async()=>{
 const source=await read("app/ExpenseSummary.tsx");
 assert.match(source,/sourceManaged=Boolean\(current\?\.sourceBookingId\)/);
 assert.match(source,/expenseDate:sourceManaged\?current\?\.expenseDate:f\.get\("date"\)/);
 assert.match(source,/category:sourceManaged\?current\?\.category:f\.get\("category"\)/);
 assert.match(source,/merchant:sourceManaged\?current\?\.merchant:f\.get\("merchant"\)/);
});
