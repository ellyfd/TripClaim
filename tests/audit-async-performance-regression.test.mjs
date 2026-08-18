import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("itinerary mutations expose busy success error lifecycle and block duplicate submit",async()=>{
 const source=await read("app/ItineraryWizardLive.tsx");
 assert.match(source,/\[busy,setBusy\]=useState<null\|"save"\|"delete">\(null\)/);
 assert.match(source,/const save=async\(row:Agenda\)=>\{if\(busy\)return/);
 assert.match(source,/setBusy\("save"\);setStatus\("正在保存…"\)/);
 assert.match(source,/finally\{setBusy\(null\)\}/);
 assert.match(source,/保存中…/);
 assert.match(source,/正在永久刪除整張訂單…/);
 assert.match(source,/刪除失敗，網路或伺服器暫時無法回應/);
});

test("document inbox distinguishes loading failure and makes save delete matcher failures visible",async()=>{
 const source=await read("app/DocumentInbox.tsx");
 assert.match(source,/\[loadError,setLoadError\]=useState\(false\)/);
 assert.match(source,/\[pendingAction,setPendingAction\]=useState<string\|null>\(null\)/);
 assert.match(source,/const requestSeq=useRef\(0\)/);
 assert.match(source,/文件載入失敗/);
 assert.match(source,/正在保存文件資料…/);
 assert.match(source,/保存中…/);
 assert.match(source,/正在刪除文件與關聯資料…/);
 assert.match(source,/刪除中…/);
 assert.match(source,/正在尋找可配對的本人費用…/);
 assert.match(source,/配對候選載入失敗/);
 assert.doesNotMatch(source,/\.catch\(\(\)=>\{\}\)/);
});

test("long trip agenda renders at most seven grid days while keeping every day reachable",async()=>{
 const source=await read("app/AgendaSheet.tsx");
 assert.match(source,/const renderedDayLimit=7/);
 assert.match(source,/renderDates=visibleDates\.slice\(windowStart,windowStart\+renderedDayLimit\)/);
 assert.match(source,/visibleDates\.map\(\(d,i\)=>/);
 assert.match(source,/renderDates\.map\(\(d,i\)=>/);
 assert.match(source,/renderDates\.map\(\(date,i\)=>/);
 assert.match(source,/repeat\(\$\{renderDates\.length\}/);
 assert.match(source,/← 前 7 天/);
 assert.match(source,/後 7 天 →/);
 assert.match(source,/一次只掛載最多 7 天/);
});
