import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("replace validates attached travel document ownership trip and active state",async()=>{
 const source=await read("app/api/trips/[id]/bookings/replace/route.ts");
 assert.match(source,/eq\(uploadedDocuments\.id,input\.documentId\)/);
 assert.match(source,/eq\(uploadedDocuments\.tripId,id\)/);
 assert.match(source,/eq\(uploadedDocuments\.ownerEmail,user\.email\)/);
 assert.match(source,/isNull\(uploadedDocuments\.deletedAt\)/);
 assert.match(source,/error:"invalid_document"/);
});

test("replace rejects mismatched or already-used travel documents",async()=>{
 const source=await read("app/api/trips/[id]/bookings/replace/route.ts");
 assert.match(source,/isTravelDocument\(document\.documentType,input\.kind\)/);
 assert.match(source,/error:"document_kind_mismatch"/);
 assert.match(source,/error:"document_not_ready"/);
 assert.match(source,/linkedBookings\.some\(booking=>booking\.kind!==input\.kind\)/);
 assert.match(source,/error:"document_in_use_other_kind"/);
 assert.match(source,/document\.confirmedAt\|\|linkedExpenses\.length>0/);
 assert.match(source,/error:"document_already_used"/);
});

test("document boundary validation happens before old order graph deletion",async()=>{
 const source=await read("app/api/trips/[id]/bookings/replace/route.ts");
 const validationStart=source.indexOf("if(input.documentId)");
 const oldGraphRead=source.indexOf("const [oldBookings,allDocuments,allExpenses]");
 const firstDelete=source.indexOf("db.delete(agendaItems)");
 assert.ok(validationStart>=0);
 assert.ok(oldGraphRead>validationStart);
 assert.ok(firstDelete>oldGraphRead);
 assert.ok(source.indexOf('error:"invalid_document"',validationStart)<oldGraphRead);
 assert.ok(source.indexOf('error:"document_kind_mismatch"',validationStart)<oldGraphRead);
});

test("validated document id is the only document id written into the new order",async()=>{
 const source=await read("app/api/trips/[id]/bookings/replace/route.ts");
 assert.match(source,/documentId:validatedDocument\?\.id/);
 assert.match(source,/sourceDocumentId:validatedDocument\?\.id/);
 assert.match(source,/entityId:validatedDocument\?\.id\?\?bookingIds\[0\]/);
});
