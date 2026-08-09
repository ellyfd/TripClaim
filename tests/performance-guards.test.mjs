import test from "node:test";
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("responsive design system is loaded last and covers the device matrix",async()=>{
 const [layout,globals,system]=await Promise.all([read("app/layout.tsx"),read("app/globals.css"),read("app/styles/design-system.css")]);
 assert.ok(layout.indexOf('import "./globals.css"')<layout.indexOf('import "./styles/design-system.css"'));
 assert.doesNotMatch(globals,/styles\/design-system\.css/);
 for(const rule of [/@media\(min-width:1440px\)/,/@media\(min-width:1200px\) and \(max-width:1439px\)/,/@media\(min-width:900px\) and \(max-width:1199px\)/,/@media\(max-width:899px\)/])assert.match(system,rule);
 assert.match(system,/grid-template-columns:minmax\(0,1fr\) 320px/);
 assert.match(system,/content-visibility:auto/);
});

test("31-day and 1,000-expense workloads stay inside the grouping budget",()=>{
 const start=performance.now(),days=Array.from({length:31},(_,index)=>`2026-06-${String(index+1).padStart(2,"0")}`),members=Array.from({length:24},(_,index)=>`member-${index+1}`),currencies=["TWD","USD","EUR","GBP","JPY"],categories=["機票(自行刷卡)","住宿","車資","餐飲","國外交易手續費"];
 const agenda=days.flatMap((date,day)=>members.map((member,index)=>({date,member,hour:8+(day+index)%15})));
 const expenses=Array.from({length:1000},(_,index)=>({category:categories[index%categories.length],currency:currencies[index%currencies.length],amountMinor:100+index}));
 const groups=new Map();
 for(const item of expenses){const key=`${item.category}\u0000${item.currency}`;groups.set(key,(groups.get(key)??0)+item.amountMinor)}
 assert.equal(agenda.length,744);
 assert.ok(groups.size<=categories.length*currencies.length);
 assert.equal([...groups.values()].reduce((sum,value)=>sum+value,0),expenses.reduce((sum,item)=>sum+item.amountMinor,0));
 assert.ok(performance.now()-start<250,"synthetic workload exceeded 250 ms");
});
