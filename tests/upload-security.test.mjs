import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("uploads verify real file signatures before object storage",async()=>{
 const route=await read("app/api/documents/route.ts");
 assert.match(route,/hasAllowedSignature\(bytes,file\.type\)/);
 assert.match(route,/file_content_mismatch/);
 assert.ok(route.indexOf("hasAllowedSignature(bytes,file.type)")<route.indexOf("env.BUCKET.put"));
 assert.doesNotMatch(route,/image\/svg/);
 assert.match(route,/15\*1024\*1024/);
});

test("document delivery is private, membership-bound and non-sniffable",async()=>{
 const route=await read("app/api/documents/[id]/route.ts");
 assert.match(route,/ownerEmail,user\.email/);
 assert.match(route,/requireTripMember/);
 assert.match(route,/private, no-store/);
 assert.match(route,/x-content-type-options":"nosniff/);
 assert.match(route,/content-security-policy":"sandbox/);
 assert.doesNotMatch(route,/publicUrl|signedUrl/);
});
