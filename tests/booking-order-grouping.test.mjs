import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("booking comparison groups attached legs by source document and manual legs by order key",async()=>{
 const source=await read("app/BookingPanel.tsx");
 assert.match(source,/booking\.documentId\?`document:\$\{booking\.documentId\}`:`manual:\$\{booking\.ownerEmail\}:\$\{booking\.kind\}:\$\{booking\.bookedAt\}`/);
 assert.match(source,/existing\.legs\.push\(booking\)/);
 assert.match(source,/existing\.amountMinor\+=booking\.amountMinor/);
 assert.match(source,/legs:\[\.\.\.order\.legs\]\.sort\(\(a,b\)=>a\.startAt\.localeCompare\(b\.startAt\)\)/);
});

test("comparison renders one card per order with all flight legs inside",async()=>{
 const source=await read("app/BookingPanel.tsx");
 assert.match(source,/const orders=useMemo\(\(\)=>groupBookingOrders\(items\),\[items\]\)/);
 assert.match(source,/orders\.map\(order=>/);
 assert.doesNotMatch(source,/items\.map\(x=><article/);
 assert.match(source,/機票・\$\{order\.legs\.length\} 航段/);
 assert.match(source,/order\.legs\.map\(\(leg,index\)=>/);
 assert.match(source,/整張訂單價格/);
 assert.match(source,/刪除整張訂單/);
});

test("deleting a grouped comparison card still calls whole-order booking DELETE once",async()=>{
 const source=await read("app/BookingPanel.tsx");
 assert.match(source,/const first=order\.legs\[0\]/);
 assert.match(source,/\/bookings\/\$\{first\.id\}/);
 assert.match(source,/method:"DELETE"/);
 assert.match(source,/同張訂單的所有去程／回程航段/);
});
