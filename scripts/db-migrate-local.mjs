#!/usr/bin/env node
// Apply drizzle/*.sql migrations to the local miniflare D1 database so a fresh
// checkout can use the API without hitting "no such table" 500s. The remote
// Sites D1 is migrated by the hosting platform; this script is dev-only.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const D1_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";

if (!existsSync(D1_DIR)) {
  console.error("找不到本機 D1 資料庫目錄。請先執行一次 `npm run dev` 讓 miniflare 建立資料庫，再重新執行本指令。");
  process.exit(1);
}
const dbFile = readdirSync(D1_DIR).find((f) => f.endsWith(".sqlite") && !f.startsWith("metadata"));
if (!dbFile) {
  console.error("D1 目錄裡沒有資料庫檔。請先執行一次 `npm run dev`，開啟首頁觸發任一 API 後再重試。");
  process.exit(1);
}

const db = new DatabaseSync(join(D1_DIR, dbFile));
db.exec("CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
const applied = new Set(db.prepare("SELECT name FROM _local_migrations").all().map((r) => r.name));
const files = readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort();

let count = 0;
for (const file of files) {
  if (applied.has(file)) continue;
  const sql = readFileSync(join("drizzle", file), "utf8").split("--> statement-breakpoint").join("\n");
  db.exec("BEGIN");
  try {
    db.exec(sql);
    db.prepare("INSERT INTO _local_migrations (name, applied_at) VALUES (?, ?)").run(file, new Date().toISOString());
    db.exec("COMMIT");
    console.log(`已套用 ${file}`);
    count++;
  } catch (error) {
    db.exec("ROLLBACK");
    if (/already exists|duplicate column name/.test(String(error.message))) {
      // Tables were created before this script existed; record and move on.
      db.prepare("INSERT INTO _local_migrations (name, applied_at) VALUES (?, ?)").run(file, new Date().toISOString());
      console.log(`略過 ${file}（結構已存在，補登記）`);
      continue;
    }
    console.error(`套用 ${file} 失敗：${error.message}`);
    process.exit(1);
  }
}
console.log(count ? `完成：本次套用 ${count} 個遷移。` : "本機資料庫已是最新，不需變更。");
