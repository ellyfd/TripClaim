import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("global styles are ordered into audited legacy and product-shell modules",async()=>{
 const [entry,legacy,shell]=await Promise.all([
  read("app/globals.css"),read("app/styles/legacy.css"),read("app/styles/product-shell.css"),
 ]);
 assert.match(entry,/@import "tailwindcss";/);
 assert.match(entry,/@import "\.\/styles\/legacy\.css";/);
 assert.match(entry,/@import "\.\/styles\/product-shell\.css";/);
 assert.ok(entry.indexOf("legacy.css")<entry.indexOf("product-shell.css"));
 assert.doesNotMatch(legacy,/\.quick-copy|\.tripbar|\.itinerary-shell/);
 assert.match(shell,/--app-max:1440px/);
 assert.match(shell,/@media\(min-width:801px\) and \(max-width:1199px\)/);
});
