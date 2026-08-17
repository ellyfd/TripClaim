import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("flight and stay review uploads bypass the offline background queue",async()=>{
 const source=await read("public/sw.js");
 assert.match(source,/TRAVEL_DOCUMENT_TYPES = new Set\(\["flight", "stay", "機票", "住宿"\]\)/);
 assert.match(source,/isTravelReviewForm\(formData\)/);
 assert.match(source,/error: "travel_upload_requires_connection"/);
 assert.match(source,/queued: false/);
 const travelStart=source.indexOf("if (isTravelReviewForm(formData))");
 const queueStart=source.indexOf("const id = await saveUpload(request)",travelStart);
 assert.ok(travelStart>=0&&queueStart>travelStart);
 const travelBlock=source.slice(travelStart,queueStart);
 assert.match(travelBlock,/return await fetch\(request\)/);
 assert.doesNotMatch(travelBlock,/saveUpload/);
});

test("ordinary expense documents remain offline-first",async()=>{
 const source=await read("public/sw.js");
 const queueStart=source.indexOf("const id = await saveUpload(request)");
 assert.ok(queueStart>=0);
 const queueBlock=source.slice(queueStart);
 assert.match(queueBlock,/tripclaim-upload-saved/);
 assert.match(queueBlock,/self\.registration\.sync\.register\("tripclaim-upload"\)/);
 assert.match(queueBlock,/已保存在手機，恢復連線後自動辨識/);
 assert.match(queueBlock,/queued: true/);
});
