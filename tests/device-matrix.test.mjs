import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("iPhone Safari and standalone PWA metadata are complete", () => {
  const layout = read("app/layout.tsx");
  const manifest = read("app/manifest.webmanifest/route.ts");
  assert.match(layout, /width:\s*"device-width"/);
  assert.match(layout, /initialScale:\s*1/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(layout, /appleWebApp:\s*\{/);
  assert.match(manifest, /display:\s*"standalone"/);
  assert.match(manifest, /purpose:\s*"maskable"/);
  assert.match(manifest, /start_url:\s*"\/"/);
  assert.match(manifest, /application\/manifest\+json/);
});

test("Android Chrome and offline upload contracts stay enabled", () => {
  const register = read("app/PWARegister.tsx");
  const worker = read("public/sw.js");
  assert.match(register, /serviceWorker\.register\("\/sw\.js"/);
  assert.match(worker, /tripclaim-upload-saved/);
  assert.match(worker, /tripclaim-upload-synced/);
  assert.match(worker, /credentials:\s*"include"/);
  assert.match(worker, /url\.pathname === "\/api\/documents"/);
  assert.match(worker, /caches\.match\(OFFLINE_URL\)/);
});

test("mobile work mode keeps navigation and safe-area controls reachable", () => {
  const css = read("app/styles/product-shell.css") + read("app/styles/legacy.css");
  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(css, /\.mobile-nav\{position:fixed!important;display:grid!important/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /height:calc\(66px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /\.agenda-mobile-days\{display:flex/);
  assert.match(css, /\.sheet-date:not\(\.mobile-active\).*display:none/);
  assert.match(css, /\.agenda-sheet-editor\{position:fixed!important/);
});

test("desktop widths preserve the main workspace before collapsing tools", () => {
  const css = read("app/styles/design-system.css") + read("app/styles/product-shell.css");
  for (const breakpoint of [
    /@media\(min-width:1440px\)/,
    /@media\(min-width:1200px\) and \(max-width:1439px\)/,
    /@media\(min-width:900px\) and \(max-width:1199px\)/,
    /@media\(max-width:899px\)/,
  ]) assert.match(css, breakpoint);
  assert.match(css, /minmax\(0,1fr\)/);
  assert.match(css, /overflow-x:hidden/);
});
