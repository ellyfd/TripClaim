#!/usr/bin/env node
// 自架部署（不走 GPT site）：把 app 部署到你自己的 Cloudflare 帳號。
//
// vinext build 會在 dist/server/wrangler.json 產出完整的 Worker 設定，
// 但綁定值是 GPT site 平台的佔位資源。本腳本以該檔為基底，套上你在
// deploy.cloudflare.json（或環境變數）裡的 D1／R2／Access 設定，寫出
// dist/server/wrangler.selfhost.json，再依序執行：
//
//   1. wrangler d1 migrations apply（套用 drizzle/ 下的資料庫遷移）
//   2. wrangler deploy
//
// 用法：
//   node scripts/deploy-cloudflare.mjs [--dry-run] [--skip-migrations] [--allow-no-auth]
//
// 完整步驟見 docs/deploy-cloudflare.md。

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const generatedConfigPath = join(projectRoot, "dist/server/wrangler.json");
const selfhostConfigPath = join(projectRoot, "dist/server/wrangler.selfhost.json");
const userConfigPath = join(projectRoot, "deploy.cloudflare.json");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const skipMigrations = args.has("--skip-migrations");
const allowNoAuth = args.has("--allow-no-auth");

if (!existsSync(generatedConfigPath)) {
  fail("找不到 dist/server/wrangler.json。請先執行 `npm run build` 再部署。");
}

const fileConfig = existsSync(userConfigPath)
  ? JSON.parse(readFileSync(userConfigPath, "utf8"))
  : {};

const config = {
  workerName: env("TRIPCLAIM_WORKER_NAME") ?? fileConfig.workerName ?? "tripclaim",
  d1DatabaseName:
    env("TRIPCLAIM_D1_DATABASE_NAME") ?? fileConfig.d1DatabaseName ?? "tripclaim-db",
  d1DatabaseId: env("TRIPCLAIM_D1_DATABASE_ID") ?? fileConfig.d1DatabaseId,
  r2BucketName:
    env("TRIPCLAIM_R2_BUCKET_NAME") ?? fileConfig.r2BucketName ?? "tripclaim-attachments",
  accessTeamDomain:
    env("TRIPCLAIM_ACCESS_TEAM_DOMAIN") ?? fileConfig.accessTeamDomain,
  accessAud: env("TRIPCLAIM_ACCESS_AUD") ?? fileConfig.accessAud,
  imagesBinding: fileConfig.imagesBinding !== false,
};

if (!config.d1DatabaseId) {
  fail(
    "缺少 D1 database id。請先 `npx wrangler d1 create tripclaim-db`，把回傳的 database_id 填入 deploy.cloudflare.json 的 d1DatabaseId（或設環境變數 TRIPCLAIM_D1_DATABASE_ID）。",
  );
}

if ((!config.accessTeamDomain || !config.accessAud) && !allowNoAuth) {
  fail(
    "缺少 Cloudflare Access 設定（accessTeamDomain／accessAud）。沒有 Access 保護的部署等於不設防：任何人都能偽造身分 header 存取所有資料。\n" +
      "請依 docs/deploy-cloudflare.md 建立 Access 應用程式後填入設定；若你已用其他方式限制存取、確定要略過，加上 --allow-no-auth。",
  );
}
if (allowNoAuth && (!config.accessTeamDomain || !config.accessAud)) {
  console.warn(
    "⚠️  未設定 Cloudflare Access：此部署沒有登入驗證，身分 header 可被偽造。僅適合暫時性的封閉測試。",
  );
}

const base = JSON.parse(readFileSync(generatedConfigPath, "utf8"));
const selfhost = {
  ...base,
  name: config.workerName,
  topLevelName: config.workerName,
  d1_databases: [
    {
      binding: "DB",
      database_name: config.d1DatabaseName,
      database_id: config.d1DatabaseId,
      migrations_dir: "../../drizzle",
    },
  ],
  r2_buckets: [{ binding: "BUCKET", bucket_name: config.r2BucketName }],
  ...(config.imagesBinding ? { images: { binding: "IMAGES" } } : {}),
  vars: {
    ...base.vars,
    ...(config.accessTeamDomain
      ? { ACCESS_TEAM_DOMAIN: config.accessTeamDomain }
      : {}),
    ...(config.accessAud ? { ACCESS_AUD: config.accessAud } : {}),
  },
};

writeFileSync(selfhostConfigPath, JSON.stringify(selfhost, null, 2));
console.log(`已產生自架設定：${selfhostConfigPath}`);

const wranglerBin = join(projectRoot, "node_modules/.bin/wrangler");

if (!skipMigrations && !dryRun) {
  run(wranglerBin, [
    "d1",
    "migrations",
    "apply",
    config.d1DatabaseName,
    "--remote",
    "-c",
    selfhostConfigPath,
  ]);
}

run(wranglerBin, ["deploy", "-c", selfhostConfigPath, ...(dryRun ? ["--dry-run"] : [])]);

console.log(dryRun ? "Dry run 完成。" : "部署完成。");

function env(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function run(bin, cmdArgs) {
  console.log(`\n$ wrangler ${cmdArgs.join(" ")}`);
  const result = spawnSync(bin, cmdArgs, { stdio: "inherit", cwd: projectRoot });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
