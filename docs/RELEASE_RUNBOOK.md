# TripClaim 分階段發布與回復手冊

目前 runtime release candidate：`fc584347383ab40b3c9fc62bbf99f948bb7e68a7`（PR #87，tested head `eef83256dcf123bf3fc9e19c8ef4a3e1a124140f`，CI run #116 / run id `32107106389`，136/136 tests）。此版本包含 2026-08-18 Product / UX / Technical Audit 的 P1 remediation 與 async/performance P2 launch-hardening；**尚未完成 Sites 真人 destructive UAT，因此不能把 GitHub 合併視為正式站 GO。**

## 發布閘門

- **Runtime**：若 `fc584347...` 之後有任何 `app/`、`db/`、`drizzle/`、`public/`、runtime script 或 dependency 變更，必須重新建立完整 CI baseline；docs-only commit 不改 runtime candidate。
- **程式**：build、全部 node tests、Sites artifact validation 與既有 security/travel regression 全綠。目前基線 136/136。
- **Audit remediation**：行程 persistence、cross-trip stale state、文件搜尋／取消、create-draft lifecycle、shared/personal IA split 必須保留 regression guard。
- **Async / performance hardening**：mutation 必須 Loading → Success／Error、busy 期間不得重複送出；文件 load/matcher failure 不得偽裝空資料；長行程 desktop grid 每次最多 7 天且全部日期可達。
- **資料**：migration 為 additive；未知主檔值進例外佇列，不靜默轉換。
- **裝置**：完成 `DEVICE_QA.md`；內部測試帳號完成 Safari、Chrome、PWA 與桌機 smoke/destructive QA。
- **UAT**：完成 `UAT_RELEASE_RECORD.md`，記錄 Sites version、GitHub main SHA、runtime candidate、migration、具名測試人、Audit Critical Journey、async lifecycle、long-trip window、travel lifecycle、storage health、匯出 reconciliation、48h 觀察與 Go／No-Go。
- **安全**：附件只經登入授權串流，回應使用 `private, no-store` 與 `nosniff`。
- **人員**：通過 Sites 登入後由 TripClaim 建立一般使用者；停用帳號不可再次自動建立。
- **Storage**：系統管理 → 系統健康可查看 pending object deletion；正式 travel 刪除不得產生無追蹤 R2 object。

## 發布順序

1. **確認 GitHub baseline**：main 至少包含 runtime `fc584347...`；CI run #116 success；136/136。
2. **ChatGPT Sites Publish/checkpoint**：將包含此 runtime 的版本發布到 `https://quick-trip-claim.ellyfd.chatgpt.site/`，記錄 Sites version/checkpoint。
3. **先做 Audit destructive QA**：
   - Trip Overview 為預設入口。
   - 新增／編輯一般活動 → 保存 → reload 一致。
   - Save／Delete 顯示 pending 並鎖定重複 mutation；快速連點 Save 後 reload 只能有一筆 event。
   - 兩趟 Trip 快速切換無 stale/default 日期。
   - 文件搜尋無匹配 = 0 results；確認編輯可 Cancel／Esc。
   - 文件 load failure 與 empty state 分離；Card Evidence Matcher failure 有 error／retry。
   - create draft 可保存離開、resume、放棄且 reload 不復活。
   - 31 天 desktop 行程一次最多 7 天 grid，前／後 7 天可達全部日期；mobile 仍可到全部日期。
   - desktop/mobile 都是出差／總覽／行程／準備／報支同一 IA。
4. **再做 Travel destructive QA**：行前準備上傳來回票 → BR87/BR88 完整 → 同步 → 整單刪除 → reload 無 ghost → 同檔重傳 → 只有新 source order → hotel 15:00/11:00。
5. **一般報支回歸**：一般收據、離線 queue、recoverable delete、文件確認、卡片、缺件、export reconciliation。
6. **Storage health**：記錄 pending、最舊等待、最高 attempts；必要時執行管理者重試。
7. 上述全部 Pass 才開始內部 3–5 人漸進啟用；任一 P1 data-state 或 mutation-integrity 問題重現立即 No-Go。

## 漸進啟用

1. 內部 3–5 人：各完成一趟「總覽 → 行前準備 → 行程 → 我的報支」演練；至少一人完整填寫 `UAT_RELEASE_RECORD.md`。
2. 觀察 48 小時：上傳失敗率、OCR 待確認率、pending storage cleanup、匯出差額、**stale/persistence issue 數**與 duplicate mutation 填入同一份 UAT record。
3. 每個觀察時段由管理者開啟「系統管理 → 系統健康」，記錄 pending、最舊等待與最高 attempts。正常情況應回落至 0。
4. 僅在 UAT 最終決策為 GO 時擴至一個部門；保留舊流程短期備援。
5. 指標穩定後全面啟用；舊流程僅唯讀查詢。

## Storage cleanup 判讀

- **正常**：pending = 0，或短暫出現後在後續 travel 操作／人工重試後回到 0。
- **需觀察**：pending 未增加但最舊等待持續超過一個觀察週期；記錄 attempts 與最後錯誤後重試。
- **停止擴大**：pending 持續增加、**最舊項目超過 24 小時**仍未清除，或同一筆 attempts 持續上升。
- 系統健康頁不得顯示實際 object key；管理者只需看到 owner、Trip、來源、等待時間、attempts 與最後錯誤。

## 停止條件

### Audit / data-state / async

- 新增或編輯一般活動在 reload 後消失、回到舊值，或未保存 draft 偽裝成已持久化資料。
- 行程 Save／Delete 可被快速重複送出並形成 duplicate mutation，或 mutation failure 被顯示為 success。
- 切換 Trip 時短暫顯示另一趟／預設日期，或舊 request 覆蓋目前 active trip。
- 文件搜尋輸入無匹配字串仍顯示原文件。
- 文件確認無法取消／Esc 關閉，或取消後未儲存修改仍被保存。
- 文件 list load failure 被顯示成真正 empty inbox；Card Evidence Matcher failure 被顯示成 0 candidate，沒有 error／retry path。
- 建立出差「放棄草稿」後 reload 又復活；編輯既有 trip 污染 create draft。
- 31 天 desktop 行程一次掛載全部日期，或 7-day window／mobile 日期列無法到達任一實際日期。
- Desktop／mobile 出現兩套互相矛盾的 IA，或 shared itinerary 再度混入 personal preparation ownership。

### Privacy / finance / travel

- 任一使用者可讀到他人的個人附件、卡片或報支資料。
- 報支總額與明細／ZIP／manifest 不一致。
- 原始幣別或原始文件遺失。
- 一般費用上傳成功卻沒有文件／費用紀錄，或 PWA 重啟後離線 queue 遺失。
- Travel order 刪除後仍可在 UI／legacy trash 復活。
- 同一 travel 檔案刪除後重傳沒有 fresh document lifecycle，或同步後新舊 order 同時存在。
- BR87 缺 `CDG` 或 `2026/06/16 08:05`；其他實際航段漏讀／日期時間錯誤。
- 住宿不是 15:00 check-in／11:00 checkout。
- Pending storage cleanup 持續增加或**最舊項目超過 24 小時**。

出現任一條件即停止擴大，保留資料並修復；不得用手動刪資料掩蓋健康指標，也不得在 UAT record 勾 GO。

## 回復演練

1. 記錄目前 Sites `version_id`、GitHub main SHA、實際 runtime candidate、migration 版本，以及系統健康 pending 數量。
2. 從 Sites 部署紀錄選擇前一個已成功且通過驗收的版本重新部署。
3. 不回滾資料庫 schema；新增欄位保持向後相容。`pending_object_deletions` 必須保留。
4. 驗證登入、全部出差、Overview、行程、行前準備、我的報支、文件下載、既有費用與匯出。
5. 回復後重新檢查系統健康；pending 由修復版本處理，不直接清 tombstone。
6. 對失敗版本建立修復分支；修復通過完整閘門後建立新的 UAT baseline，再漸進發布。

正式回復會切換生產版本，只有事故或產品負責人明確授權時執行；日常發布只做流程演練與前一成功版本可用性確認。