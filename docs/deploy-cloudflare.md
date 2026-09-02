# 自架部署指南：部署到自己的 Cloudflare 帳號

本指南說明如何把 TripClaim 部署到**你自己的 Cloudflare 帳號**，完全不經過
ChatGPT／GPT site 平台。適合想要自有網域、自有資料庫、不依賴 ChatGPT 帳號
登入的情境。

TripClaim 本來就跑在 Cloudflare Workers runtime 上（vinext + D1 + R2），
所以自架不需要改動應用程式碼——差別只在三件事：

| 項目 | GPT site 版 | 自架版 |
| --- | --- | --- |
| 託管與網域 | `*.chatgpt.site`，平台代管 | 自己的 Workers（`*.workers.dev` 或自訂網域） |
| 登入方式 | ChatGPT 帳號（平台注入身分 header） | Cloudflare Zero Trust Access（Google／GitHub／Email OTP…） |
| D1／R2 資源 | 平台代管，隨 checkpoint 部署 | 自己建立、自己套 migration（本指南涵蓋） |

角色邏輯不變：**第一個登入的使用者自動成為系統管理員**，之後的使用者
自動成為一般成員，管理員可在「系統管理」啟用／停用帳號。

> ⚠️ 資料不會自動搬家：GPT site 版的 D1 資料庫與 R2 附件存在平台端，
> 自架版是全新的空資料庫。如需搬移歷史資料，得另外從舊環境匯出。

---

## 前置需求

- Cloudflare 帳號（免費方案即可起步；額度見文末）
- Node.js ≥ 22.13
- 本 repo 的 checkout，且能執行 `npm run install:ci`

## 步驟 1：登入 wrangler

```bash
npx wrangler login
```

或在 CI／無瀏覽器環境改用環境變數：

```bash
export CLOUDFLARE_API_TOKEN=...   # 權限：Workers Scripts:Edit、D1:Edit、Workers R2 Storage:Edit
export CLOUDFLARE_ACCOUNT_ID=...
```

## 步驟 2：建立 D1 資料庫與 R2 bucket

```bash
npx wrangler d1 create tripclaim-db        # 記下回傳的 database_id
npx wrangler r2 bucket create tripclaim-attachments
```

## 步驟 3：設定 Cloudflare Access（登入保護）

自架版用 [Cloudflare Zero Trust Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-public-app/)
取代 ChatGPT 登入。Access 在請求到達 Worker 之前完成身分驗證，Worker 端
再驗證 Access 簽發的 JWT，把通過驗證的 email 轉成 app 既有的身分 header。
**沒有 Access 保護的自架部署等於不設防**（身分 header 可被偽造），部署腳本
預設會拒絕執行。

1. 進入 [Cloudflare Zero Trust dashboard](https://one.dash.cloudflare.com/)，
   首次使用會要求選一個 team name——`<team-name>.cloudflareaccess.com`
   就是你的 **team domain**。
2. 到 **Access → Applications → Add an application → Self-hosted**：
   - Application domain 填你的 Worker 網址
     （例：`tripclaim.<你的子網域>.workers.dev`，之後若綁自訂網域要一併加入）。
   - 選擇登入方式（預設的 One-time PIN 免設定即可用；也可接 Google、GitHub 等 IdP）。
   - 建立 Allow policy，限定允許的 email 或網域（例：公司網域、指定同事清單）。
3. 建立完成後，在應用程式的 **Overview** 頁複製 **Application Audience (AUD) tag**。

## 步驟 4：填入部署設定

```bash
cp deploy.cloudflare.example.json deploy.cloudflare.json
```

編輯 `deploy.cloudflare.json`（此檔已被 gitignore，不會誤入版控）：

```json
{
  "workerName": "tripclaim",
  "d1DatabaseName": "tripclaim-db",
  "d1DatabaseId": "＜步驟 2 回傳的 database_id＞",
  "r2BucketName": "tripclaim-attachments",
  "accessTeamDomain": "＜team-name＞.cloudflareaccess.com",
  "accessAud": "＜步驟 3 的 AUD tag＞",
  "imagesBinding": true
}
```

`imagesBinding` 對應 Cloudflare Images 的圖片轉換綁定；若你的帳號未開通
Images，設為 `false`，Worker 會自動改回傳原始圖片（不做尺寸最佳化），
其餘功能不受影響。

## 步驟 5：建置並部署

```bash
npm run install:ci
npm run build
npm run deploy:cloudflare
```

部署腳本會依序：

1. 以 vinext 產生的 `dist/server/wrangler.json` 為基底，套上你的設定，
   寫出 `dist/server/wrangler.selfhost.json`。
2. `wrangler d1 migrations apply`——把 `drizzle/` 下的資料庫遷移套到遠端 D1
   （已套用過的會自動略過，之後每次部署都可安心重跑）。
3. `wrangler deploy`——上傳 Worker 與靜態資產。

只想驗證設定不真的部署時：

```bash
npm run deploy:cloudflare -- --dry-run
```

完成後開啟 Worker 網址，經 Access 登入的第一個帳號即成為系統管理員。

## 步驟 6（選用）：綁定自訂網域

1. Cloudflare dashboard → Workers & Pages → 你的 Worker →
   **Settings → Domains & Routes → Add Custom Domain**。
2. 回到 Zero Trust 的 Access 應用程式，把自訂網域加入 Application domain，
   確保新網域也在 Access 保護範圍內。

## 步驟 7（選用）：GitHub Actions 自動部署

`.github/workflows/deploy-cloudflare.yml` 已就緒。到 repo 的
**Settings → Secrets and variables → Actions** 設定：

| 類型 | 名稱 | 內容 |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | 同步驟 1 的 API token |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 帳號 id |
| Variable | `TRIPCLAIM_D1_DATABASE_ID` | 步驟 2 的 database_id |
| Variable | `TRIPCLAIM_ACCESS_TEAM_DOMAIN` | 步驟 3 的 team domain |
| Variable | `TRIPCLAIM_ACCESS_AUD` | 步驟 3 的 AUD tag |
| Variable | `CLOUDFLARE_DEPLOY_ENABLED` | 設 `true` 後，push `main` 即自動部署 |

也可以不設 `CLOUDFLARE_DEPLOY_ENABLED`，改在 Actions 頁面手動觸發
「Deploy to Cloudflare」workflow。

---

## 運作原理：登入怎麼被替換掉

GPT site 版由平台在請求上注入 `oai-authenticated-user-email` header，
app 以此辨識使用者。自架版在 `worker/index.ts` 加了一層轉接：

1. 只要設定了 `ACCESS_TEAM_DOMAIN`（部署腳本會寫入 Worker vars），
   Worker 進入自架登入模式。
2. 先移除外部請求帶入的所有 `oai-*` header（防偽造）。
3. 驗證 Cloudflare Access 附上的 `cf-access-jwt-assertion` JWT——
   以 team domain 的公開金鑰驗簽章，並核對 `iss`、`aud`、有效期間
   （`worker/cf-access.ts`）。
4. 驗證通過後，把 JWT 內的 email 寫回 `oai-authenticated-user-email`，
   app 層的角色、權限、審計邏輯完全沿用。
5. 原本的 `/signout-with-chatgpt` 改導向 Access 的登出端點；
   `/signin-with-chatgpt` 改顯示「帳號尚未啟用」說明頁
   （Access 已登入但被管理員停用的帳號會被 app 導到這裡）。

繞過 Access 直連 Worker 的請求沒有有效 JWT，一律回 403。

## 費用參考（2026 年時點，請以官方定價為準）

- **Workers**：免費方案每日 10 萬次請求。
- **D1**：免費方案 5 GB 儲存、每日 500 萬次讀取。
- **R2**：免費方案 10 GB 儲存，無輸出流量費。
- **Zero Trust Access**：免費方案最多 50 位使用者。
- **Images 轉換**：非必要（可用 `imagesBinding: false` 關閉）。

小團隊的差旅報帳用量通常落在免費額度內。

## 疑難排解

- **部署腳本說缺少 Access 設定**：這是預設的安全防護。請完成步驟 3；
  若只是要在封閉網路做暫時測試，可加 `--allow-no-auth`（正式環境切勿使用）。
- **打開網址直接 403「此部署由 Cloudflare Access 保護」**：代表請求沒帶
  有效的 Access JWT——通常是 Access 應用程式的 domain 沒涵蓋你目前的網址，
  或者 team domain／AUD 設定值與 Access 應用程式不一致。
- **登入後顯示「帳號尚未啟用」**：你的帳號被管理員停用了；帳號啟用狀態
  由第一位管理員在「系統管理」中控制。
- **圖片載入異常**：帳號未開通 Cloudflare Images 時，把
  `deploy.cloudflare.json` 的 `imagesBinding` 設為 `false` 後重新部署。
