import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("unmapped legacy masters remain visible exceptions instead of becoming other",async()=>{
 const [migration,missing,view]=await Promise.all([
  read("drizzle/0018_backfill_master_codes.sql"),
  read("app/api/missing-requirements/route.ts"),
  read("app/MissingRequirements.tsx"),
 ]);
 assert.match(migration,/master_data_exceptions/);
 assert.doesNotMatch(migration,/ELSE 'EXP-/);
 assert.match(missing,/masterDataExceptions/);
 assert.match(missing,/eq\(masterDataExceptions\.status,"open"\)/);
 assert.match(missing,/停止正式歸類/);
 assert.match(view,/無法對應主檔的舊資料/);
});
