import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("EVA-style anchored parsing remains available and merges all detected flight segments",async()=>{
 const source=await read("app/api/documents/route.ts");
 assert.match(source,/const anchored=\[\.\.\.source\.matchAll/);
 assert.doesNotMatch(source,/const anchored=segments\.length\?\[\]:/);
 assert.match(source,/origin=codes\.at\(-2\),destination=codes\.at\(-1\)/);
 assert.match(source,/const allSegments=\[\.\.\.segments,\.\.\.anchored\]/);
 assert.match(source,/findIndex\(item=>item\.title===segment\.title&&item\.startAt===segment\.startAt&&item\.endAt===segment\.endAt\)/);
 assert.match(source,/sort\(\(a,b\)=>a\.startAt\.localeCompare\(b\.startAt\)\)/);
 assert.match(source,/segments:allSegments/);
});

test("hotel extraction pins itinerary times to 15:00 check-in and 11:00 checkout",async()=>{
 const source=await read("app/api/documents/route.ts");
 assert.match(source,/CHECK\[- \]\?IN\|入住/);
 assert.match(source,/CHECK\[- \]\?OUT\|退房/);
 assert.match(source,/stayStart=stayStartDate\?`\$\{stayStartDate\}T15:00`/);
 assert.match(source,/stayEnd=stayEndDate\?`\$\{stayEndDate\}T11:00`/);
 assert.match(source,/resolvedStart=isStay\?\(stayStart\?\?times\[0\]/);
 assert.match(source,/resolvedEnd=isStay\?\(stayEnd\?\?times\[1\]/);
});

test("hotel sync requires the stay itself, not optional city or address fields",async()=>{
 const [todo,replace]=await Promise.all([
  read("app/TripTodoPanel.tsx"),
  read("app/api/trips/[id]/bookings/replace/route.ts"),
 ]);
 assert.match(todo,/城市（選填）/);
 assert.match(todo,/飯店地址（選填）/);
 assert.match(todo,/legs\.some\(leg=>!leg\.title\|\|!leg\.startAt\|\|!leg\.endAt\)/);
 assert.match(replace,/input\.kind==="flight"\?legs\.some/);
 assert.match(replace,/:legs\.some\(leg=>!leg\.title\?\.trim\(\)\|\|!leg\.startAt\|\|!leg\.endAt\)/);
 assert.match(replace,/place=input\.kind==="stay"\?\(destination\|\|origin\|\|leg\.title!/);
});
