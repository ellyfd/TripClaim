import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("booking attachment requires an active booking in the requested trip",async()=>{
 const source=await read("app/api/trips/[id]/bookings/[bookingId]/attachment/route.ts");
 assert.match(source,/eq\(travelBookings\.id,bookingId\)/);
 assert.match(source,/eq\(travelBookings\.tripId,id\)/);
 assert.match(source,/isNull\(travelBookings\.deletedAt\)/);
});

test("booking attachment is owner-only even for another trip member",async()=>{
 const source=await read("app/api/trips/[id]/bookings/[bookingId]/attachment/route.ts");
 assert.match(source,/booking\.ownerEmail!==user\.email/);
 assert.match(source,/attachment_owner_only/);
 assert.match(source,/status:403/);
 assert.match(source,/eq\(uploadedDocuments\.id,booking\.documentId\)/);
 assert.match(source,/eq\(uploadedDocuments\.tripId,id\)/);
 assert.match(source,/eq\(uploadedDocuments\.ownerEmail,user\.email\)/);
 assert.match(source,/isNull\(uploadedDocuments\.deletedAt\)/);
});

test("member-safe booking APIs do not expose another person's document id or attachment URL",async()=>{
 const [visibility,bookings,summary,panel]=await Promise.all([
  read("db/travel-booking-visibility.ts"),
  read("app/api/trips/[id]/bookings/route.ts"),
  read("app/api/trips/[id]/summary/route.ts"),
  read("app/BookingPanel.tsx"),
 ]);
 assert.match(visibility,/documentId:isOwner\?\(booking\.documentId\?\?null\):null/);
 assert.match(visibility,/canEdit:isOwner/);
 assert.match(bookings,/travelBookingForViewer\(booking,user\.email\)/);
 assert.match(bookings,/visible\.canEdit&&visible\.documentId\?/);
 assert.match(summary,/bookings:bookings\.map\(booking=>travelBookingForViewer\(booking,user\.email\)\)/);
 assert.match(panel,/原始附件只限訂單本人查看/);
 assert.match(panel,/原始附件僅訂單本人可查看/);
 assert.match(panel,/查看我的訂單附件/);
});

test("owner attachment delivery keeps private no-sniff sandbox headers",async()=>{
 const source=await read("app/api/trips/[id]/bookings/[bookingId]/attachment/route.ts");
 assert.match(source,/"cache-control":"private, no-store"/);
 assert.match(source,/"x-content-type-options":"nosniff"/);
 assert.match(source,/"content-security-policy":"sandbox; default-src 'none'"/);
});
