# TripClaim 分階段發布與回復手冊

目前 runtime release candidate：`79ef033702780415753a52788ef8fd5bb6280775`（PR #103，tested head `855cbe0c070fa76c913253a97588d13e3bed139c`，CI run #140 / run id `32920287123`，156/156 tests）。此版本已包含 2026-08-18 Audit remediation、async/performance hardening、24h Calendar、flight endpoint timezone/UTC、UIUX/IA consistency、owner-only travel attachment 與 server-persisted comp-leave override；**尚未完成 production Sites Gate A / 48h Gate B，因此 GitHub merge 不等於正式站 GO。**

## 發布閘門

- **Runtime**：任何晚於 `79ef033702780415753a52788ef8fd5bb6280775` 的 `app/`、`db/`、`drizzle/`、`public/`、runtime script 或 dependency 變更，都必須建立新的 runtime/CI baseline。docs-only commit 不改 runtime candidate。
- **程式**：Build、全部 node tests、Sites artifact validation、security/travel/privacy regression 全綠。目前基線 156/156。
- **D1**：production 必須完成 migrations through `0025_comp_leave_overrides.sql`。0024 是 flight endpoint timezone/UTC prerequisite；0025 是 comp-leave persistence prerequisite。
- **Audit data-state**：一般行程 persistence/cancel、cross-trip stale state、文件搜尋/Cancel/Esc、create-draft lifecycle 必須維持。
- **Async / performance**：mutation Loading → Success/Error；busy 不重複送出；文件 load/matcher failure 不偽裝 empty；desktop 長行程每次最多 7 天 grid。
- **Calendar**：固定 00:00–23:00；all-day lane 真實存在；flight 以 departure→arrival duration band + endpoint time log 顯示；arrival 可延伸 Calendar projection，但不改 Trip formal date。
- **Timezone / DST**：booking 保存 endpoint local datetime + IANA timezone + derived UTC；真實 duration 由 UTC instants 計算；固定 UTC offset 不能作 canonical timezone。
- **IA**：全部出差 → 總覽 → 行程／行前準備／我的報支；desktop/mobile 同一心智模型；Trip list 只有一個 primary entry；Calendar primary，shared booking details secondary。
- **Privacy**：個人文件／卡片／報支／travel source attachment owner-only。Shared booking projection 不得把他人的 document ID / attachment URL 傳給 client；attachment endpoint 再次 owner-check。
- **Personal state**：補休人工 override 必須 server-persisted；只在 server acknowledgement 後更新 UI；reload 保留；reset 後 reload 回 auto baseline。
- **Overview**：source-order count 不得等於 raw flight-leg row count；所有活動已過期時不得冒充「下一個行程」。
- **No dead CTA**：沒有完整 Loading/Preview/Confirm/Write 或等價閉環的 production CTA 不得顯示；Agenda bulk import 未完成前不得露出 Excel/CSV/截圖/PDF入口。
- **Storage / pending storage cleanup**：System Management → 系統健康可觀察 pending object deletion；不得暴露 object key。
- **裝置／UAT**：完成 `docs/DEVICE_QA.md` 與 `docs/UAT_RELEASE_RECORD.md`，留下具名測試人、Sites checkpoint、runtime/migration evidence、destructive QA、48h、GO/NO-GO。

## 發布順序

1. **確認 GitHub runtime baseline**：runtime `79ef033702780415753a52788ef8fd5bb6280775`；tested head `855cbe0c070fa76c913253a97588d13e3bed139c`；run #140 / `32920287123`；156/156；Sites artifact Pass。
2. **確認 production D1**：migrations through `0025_comp_leave_overrides.sql` 已套用。
   - 若 `0024` 缺失，flight endpoint timezone/UTC 為 release blocker。
   - 若 `0025` 缺失，comp-leave override persistence 為 release blocker。
   - 不得用 fallback、local state 或 UI 隱藏 migration 缺失。
3. **ChatGPT Sites version / checkpoint**：建立包含 #103 runtime 的 Sites 版本，維持既有 `https://quick-trip-claim.ellyfd.chatgpt.site/` URL，記錄 checkpoint/version。
4. **Audit Critical Journey**：Overview default → itinerary create/edit/cancel + reload → duplicate-submit lock → Trip A/B rapid switch → document search 0 result → Cancel/Esc → create draft resume/abandon。
5. **UIUX / privacy / personal-state QA**：
   - Trip list 只有「開啟出差」主入口；desktop semantic nav、mobile same IA。
   - desktop 不重複 contextual back；24h 是 status，不是假 control。
   - Calendar primary；shared booking details 預設收合。
   - 同行者看不到他人的 travel source attachment；本人仍可看自己的。
   - comp leave +0.5 reload 保留、-0.5 reload 保留、reset reload 回 auto；travel order change 會 revalidate。
   - Overview multi-leg ticket 只算一張 source order；past agenda 不冒充 next。
   - Agenda toolbar 無 unfinished bulk import CTA。
6. **Flight timezone / Amsterdam QA**：
   - CI73 TPE `2026-11-03 23:15` / Asia/Taipei → AMS `2026-11-04 07:50` / Europe/Amsterdam = **15h35m / -7h**。
   - CI74 AMS `2026-11-06 15:35` / Europe/Amsterdam → TPE `2026-11-07 10:40` / Asia/Taipei = **12h05m / +7h**。
   - 11/07 因 actual arrival 出現在 Calendar；Trip formal end date 仍 11/06。
   - IANA/DST 正確；unresolved airport timezone 要求確認，不猜 fixed offset。
7. **Travel whole-order destructive QA**：行前準備上傳來回票 → BR87/BR88 exact（若用 fixture）→ 同步 → 一張票一筆 expense → 任一航段刪除整單 → reload 無 ghost → 同檔重傳 fresh lifecycle → 只有新 order → hotel 15:00/11:00。
8. **一般報支 / PWA regression**：一般收據、離線 queue、recoverable delete、文件確認、card statement/fee、missing requirements。
9. **System Health**：記錄 pending、最舊等待、最高 attempts；必要時 bounded retry；object key 不可見。
10. **Export / Device QA**：Excel/ZIP/manifest reconciliation；Safari/Chrome/PWA/1024/1280/1440/1920 smoke。
11. **Gate A 全 PASS 後**才開始 3–5 人內部漸進與 48h Gate B；任一 P1/data-integrity/privacy/timezone/storage/finance regression 立即 NO-GO。

## 48 小時漸進啟用

1. 內部 3–5 人各完成一趟「總覽 → 行前準備 → 行程 → 我的報支」。至少一人完整填寫 `UAT_RELEASE_RECORD.md`。
2. T+0／T+4h／T+24h／T+48h 記錄：上傳失敗、OCR 待確認、pending storage、最舊等待、duplicate/stale/privacy incident、comp-leave state loss、timezone incident、匯出差額。
3. 每個觀察點由管理者開「系統管理 → 系統健康」記錄 pending／最舊等待／最高 attempts。正常情況應回落至 0。
4. 只有 Gate B PASS 且 UAT 最終決策 GO 才擴到部門；舊流程短期備援，之後唯讀。

## Storage cleanup 判讀

- **正常**：pending = 0，或短暫出現後在後續 travel 操作／人工 bounded retry 回到 0。
- **需觀察**：pending 未增加但最舊等待跨一個觀察週期；記錄 attempts / last error 後重試。
- **停止擴大**：pending 持續增加、**最舊項目超過 24 小時**仍未清除，或同一筆 attempts 持續上升。
- 系統健康頁不得顯示實際 object key；管理者只需 owner、Trip、來源、等待時間、attempts、最後錯誤。

## 停止條件

### Audit / data-state / interaction

- 一般活動保存後 reload 消失、取消後錯誤保存，或未保存 draft 偽裝 persisted。
- Save/Delete 可重複送出形成 duplicate mutation，或 failure 顯示 success。
- Trip switch 閃出上一趟／假日期，或 stale request 覆蓋 active trip。
- 文件搜尋無匹配仍顯示原文件；Cancel/Esc 不可逆；load/matcher failure 偽裝 empty。
- Create draft 放棄後 reload 復活；edit 污染 create draft。
- 長行程一次掛載全部日期或任一天不可達。
- Calendar 非 24h、夜間 flight 被隱藏、flight 退化成一小格、all-day lane 假裝成小時列。
- Desktop/mobile IA 分裂、Trip list 再出現繞過 Overview 的第二主入口、desktop 重複返回入口。
- 固定 24h 狀態又變成可按但無作用的 fake control。
- Agenda production toolbar 再次出現沒有完整 lifecycle 的 bulk import CTA。

### Privacy / personal state / overview integrity

- 任一同行者可取得他人的 travel source document ID、attachment URL 或附件內容。
- Attachment endpoint 只驗 trip membership 而不驗 owner。
- Comp-leave +0.5/-0.5 顯示成功但 reload 消失；reset 後舊 override 復活；他人 override 影響本人。
- Overview 將一張多航段 ticket 算成多張 source order。
- 所有 agenda 已過期仍把歷史活動顯示為「下一個行程」。
- Overview 成為 Booking/Document/Expense/Agenda 的第二個可修改 source。

### Timezone / flight integrity

- Production D1 缺 0024，或 runtime 在缺 migration 下繼續顯示／寫入錯資料。
- Departure/arrival 共用一個 timezone，或票面 local datetime 被裝置／Trip timezone 改寫。
- CI73 / CI74 local time、IANA timezone、duration、timezone difference 不符 expected。
- Duration 直接用兩端 local clock 相減；DST 使用 fixed offset。
- CI74 arrival 讓 Trip formal end date 被改成 11/07。
- Unresolved airport timezone 被系統猜值。
- Agenda 變成第二份 canonical timezone source。

### Travel / finance / storage

- 一張多航段 ticket 形成多筆 airfare expense。
- Travel delete 後 UI／legacy trash 復活或留下 ghost。
- 同檔重傳重用舊 document/order，或 replace 後新舊 order 並存。
- BR87 / BR88 或實際 fixture 漏航段／日期時間錯誤。
- Hotel 非 15:00 / 11:00。
- 一般 expense recoverability / PWA queue regression。
- 報支總額與明細／ZIP／manifest 不一致；原始幣別／本人原始文件遺失。
- Pending storage 持續增加或**最舊項目超過 24 小時**。

出現任一停止條件即停止擴大；保存 evidence，建立 fix branch + regression，完整 CI、重新發布 Sites 後從受影響 Gate A flow 重做。不得用手動刪資料或勾 GO 掩蓋問題。

## 回復演練

1. 記錄目前 Sites version/checkpoint、GitHub main、runtime candidate、tested head、migration through 0025、System Health pending。
2. 從 Sites deployment history 選前一個已驗收成功版本重新部署。
3. **不回滾 D1 schema**；新增欄位／表保持向後相容。至少保留 `pending_object_deletions`、flight endpoint timezone/UTC fields、`trip_comp_leave_overrides`。
4. 驗證登入、全部出差、Overview、24h 行程、行前準備、comp leave、我的報支、owner-only attachment、既有費用、export。
5. 舊 runtime 若不讀 0024/0025，也不得刪欄位／刪表或逆向 migration。
6. 回復後重新檢查 System Health；pending 由安全版本處理，不直接清 tombstone。
7. 對失敗版本建立修復分支；完整 CI + 新 UAT baseline 後再漸進發布。

正式 GO 必須同時具備：**GitHub/CI Pass + production migrations through 0025 + Sites checkpoint evidence + Gate A destructive UAT Pass + owner/privacy/comp-leave/Overview consistency Pass + Storage Health Pass + export/device Pass + 48h Gate B Pass**。