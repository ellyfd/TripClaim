import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("trip workspaces remount by trip id and itinerary never renders a fake fallback date",async()=>{
 const [page,sheet]=await Promise.all([read("app/page.tsx"),read("app/AgendaSheet.tsx")]);
 assert.match(page,/key=\{`itinerary-\$\{activeTrip\.id\}`\}/);
 assert.match(page,/key=\{`expense-\$\{activeTrip\.id\}`\}/);
 assert.doesNotMatch(sheet,/2026-06-16/);
 assert.match(sheet,/const visibleDates=dates;/);
 assert.match(sheet,/if\(!visibleDates\.length\)return/);
 assert.match(sheet,/取得正確的出差日期前，不顯示其他旅程或預設日期/);
});

test("unsaved itinerary drafts stay outside persisted rows and cancel is a real rollback",async()=>{
 const source=await read("app/ItineraryWizardLive.tsx");
 assert.match(source,/\[draft,setDraft\]=useState<Agenda\|null>\(null\)/);
 assert.match(source,/const addAt=.*setDraft\(blankForCell\(date,time\)\)/);
 assert.doesNotMatch(source,/setRows\(v=>\[\.\.\.v,row\]\)/);
 assert.match(source,/const cancelDraft=\(\)=>\{[^}]*setDraft\(null\)/);
 assert.match(source,/保存失敗，未儲存內容仍保留在編輯區/);
 assert.match(source,/保存失敗，未儲存修改仍保留在編輯區/);
});

test("itinerary create and edit become visible only after server acknowledgement and reload",async()=>{
 const [client,api]=await Promise.all([read("app/ItineraryWizardLive.tsx"),read("app/api/trips/[id]/agenda/route.ts")]);
 assert.match(client,/method:"POST"/);
 assert.match(client,/setDraft\(null\);const confirmed=await load\(tripId\)/);
 assert.match(client,/已保存並同步給同行者/);
 assert.match(client,/const requestSeq=useRef\(0\)/);
 assert.match(client,/if\(seq!==requestSeq\.current\)return false/);
 assert.match(client,/useEffect\(\(\)=>\{setRows\(\[\]\);setDates\(\[\]\);setDraft\(null\)/);
 assert.match(api,/db\.insert\(agendaItems\)\.values\(value\)/);
 assert.match(api,/status:201/);
 assert.match(api,/db\.select\(\)\.from\(agendaItems\).*eq\(agendaItems\.tripId,id\)/);
});

test("travel data changes revalidate the calendar on the same workspace",async()=>{
 const client=await read("app/ItineraryWizardLive.tsx");
 assert.match(client,/window\.addEventListener\("tripclaim:data-changed",reload\)/);
 assert.match(client,/<TripTodoPanel tripId=\{tripId\} onBookingSaved=\{\(\)=>void load\(tripId\)\}/);
 assert.match(client,/AgendaSheet dates=\{dates\} rows=\{rows\}/);
});
