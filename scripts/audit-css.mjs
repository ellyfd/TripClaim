import {readdir,readFile,writeFile,mkdir} from "node:fs/promises";
import {join} from "node:path";
import postcss from "postcss";

async function sourceFiles(dir){
 const entries=await readdir(dir,{withFileTypes:true}),files=[];
 for(const entry of entries){
  const path=join(dir,entry.name);
  if(entry.isDirectory())files.push(...await sourceFiles(path));
  else if(/\.(?:ts|tsx|js|jsx)$/.test(entry.name))files.push(path);
 }
 return files;
}

const marker="/* 2026-07 product shell: one visual system for trips, itinerary and expenses. */";
const globals=await readFile("app/globals.css","utf8"),markerAt=globals.indexOf(marker),split=markerAt<0&&globals.includes("styles/legacy.css");
if(markerAt<0&&!split)throw new Error("Product-shell CSS marker or module imports are missing");
const sources=(await Promise.all((await sourceFiles("app")).map(file=>readFile(file,"utf8")))).join("\n");
const legacySource=split?await readFile("app/styles/legacy.css","utf8"):globals.slice(globals.indexOf("\n")+1,markerAt);
const root=postcss.parse(legacySource);
const keep=new Set(["active","busy","done","failed","missing","on","open","ready","review","warn"]),removed=[];
const used=name=>keep.has(name)||new RegExp(`(^|[^\\w-])${name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}([^\\w-]|$)`).test(sources);
root.walkRules(rule=>{
 const selectors=rule.selector.split(","),retained=selectors.filter(selector=>{
  const names=[...selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(match=>match[1]);
  const keepSelector=!names.length||names.some(used);if(!keepSelector)removed.push(selector.trim());return keepSelector;
 });
 if(retained.length)rule.selector=retained.join(",");else rule.remove();
});

console.log(`CSS audit: ${removed.length} unused legacy rules${removed.length?` (${removed.slice(0,8).join(", ")}${removed.length>8?", …":""})`:""}`);
if(process.argv.includes("--write")){
 await mkdir("app/styles",{recursive:true});
 await writeFile("app/styles/legacy.css",root.toString().trim()+"\n");
 if(!split){
  await writeFile("app/styles/product-shell.css",globals.slice(markerAt).trim()+"\n");
  await writeFile("app/globals.css",'@import "tailwindcss";\n@import "./styles/legacy.css";\n@import "./styles/product-shell.css";\n');
 }
}
