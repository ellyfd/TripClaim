import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("legacy queued flight and stay reviews are dropped before any server upload",async()=>{
 const source=await read("public/sw.js");
 const guardStart=source.indexOf("if (isTravelReviewForm(upload.formData))");
 const serverUpload=source.indexOf("const response = await fetch(upload.url",guardStart);
 assert.ok(guardStart>=0&&serverUpload>guardStart);
 const guardBlock=source.slice(guardStart,serverUpload);
 assert.match(guardBlock,/await removeUpload\(upload\.id\)/);
 assert.match(guardBlock,/reason: "travel_review_retry_required"/);
 assert.match(guardBlock,/我的行前資料/);
 assert.match(guardBlock,/continue/);
 assert.doesNotMatch(guardBlock,/fetch\(upload\.url/);
});

test("travel review UI requires a real server document id before loading parsed data",async()=>{
 const source=await read("app/TripTodoPanel.tsx");
 const readStart=source.indexOf("const readFile=");
 const saveStart=source.indexOf("const saveBooking=",readStart);
 const readBlock=source.slice(readStart,saveStart);
 const idGuard=readBlock.indexOf("if(!result?.id)");
 const setId=readBlock.indexOf("setDocumentId(result.id)");
 assert.ok(idGuard>=0&&setId>idGuard);
 assert.match(readBlock,/result\?\.queued\?"機票／住宿需在線完成上傳/);
 assert.match(readBlock,/setFile\(null\);setDocumentId\(undefined\)/);
 assert.match(readBlock,/未取得文件識別碼，請重新上傳文件/);
});

test("new travel review uploads still bypass the offline queue",async()=>{
 const source=await read("public/sw.js");
 const handleStart=source.indexOf("const handleDocumentUpload");
 const travelStart=source.indexOf("if (isTravelReviewForm(formData))",handleStart);
 const saveStart=source.indexOf("const id = await saveUpload(request)",travelStart);
 assert.ok(travelStart>=0&&saveStart>travelStart);
 const travelBlock=source.slice(travelStart,saveStart);
 assert.match(travelBlock,/return await fetch\(request\)/);
 assert.match(travelBlock,/travel_upload_requires_connection/);
 assert.match(travelBlock,/queued: false/);
 assert.doesNotMatch(travelBlock,/saveUpload/);
});
