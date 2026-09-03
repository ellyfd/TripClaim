import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("desktop has one all-trips entry while mobile keeps the contextual back action",async()=>{
 const [page,styles]=await Promise.all([read("app/page.tsx"),read("app/styles/ia-hierarchy.css")]);
 assert.match(page,/<i><HomeIcon\/><\/i>全部出差/);
 assert.match(page,/className="back" onClick=\{goTrips\}>← 全部出差<\/button>/);
 assert.match(styles,/@media\(min-width:801px\)[\s\S]*\.trip-context-nav \.back\{display:none\}/);
 assert.match(styles,/@media\(max-width:800px\)/);
 assert.doesNotMatch(styles,/@media\(max-width:800px\)[\s\S]*\.trip-context-nav \.back\{display:none\}/);
});

test("fixed 24-hour calendar is rendered as status rather than a fake control",async()=>{
 const [sheet,styles]=await Promise.all([read("app/AgendaSheet.tsx"),read("app/styles/ia-hierarchy.css")]);
 assert.match(sheet,/className="agenda-view-status" role="status" aria-label="顯示範圍">完整 24 小時<\/span>/);
 assert.doesNotMatch(sheet,/aria-pressed="true">完整 24 小時/);
 assert.doesNotMatch(sheet,/agenda-view-toggle/);
 assert.match(styles,/\.agenda-view-status\{/);
});
