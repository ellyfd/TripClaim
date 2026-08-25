# TripClaim 執行優化規劃書

最後更新：2026-08-25  
決策角色：CPO、CTO、IA、UIUX、財務流程  
產品主流程：建立出差 → 出差總覽 → 行程／行前準備／我的報支

## 一、不可變更的產品原則

1. 同一趟出差共用 Trip、成員與 shared itinerary；個人文件、信用卡與報支維持本人 ownership，不建立互相矛盾的第二份真相。
2. Trip Overview 只彙整狀態與下一步，不複製 Booking、Document、Expense 或 Agenda 的來源資料。
3. Shared itinerary 與 Personal preparation 分離：行程只處理共同行程與 shared booking projection；本人機票／住宿、待辦與補休在「行前準備」。
4. 桌機負責規劃、核對、批次整理與匯出；手機使用同一 IA，改以單日行程與任務優先呈現，不另造第二套導覽心智模型。
5. 報支項目、報支幣別、國家、城市與機場是公司固定主檔。任何真人角色都不得新增、修改或刪除。
6. 固定主檔驗證必須同時存在於 UI、API、OCR、匯入、背景工作與資料庫層。
7. 原始交易資料不可被申報資料覆蓋。非白名單幣別須保留原始幣別與金額，並提醒只能以 TWD 申報。
8. 同一報支項目若申報幣別不同，彙總、Excel 與 ZIP 必須分行、分組。
9. 同行者可共編 shared itinerary，但每個人的信用卡、文件、報支與缺件狀態維持私有；他人未完成不得阻擋本人。
10. 機票與住宿是 travel order，不是彼此獨立的卡片。正式 travel order 必須以「整張 source-order graph」建立、取代與刪除；任何單一航段不得自行脫離訂單生命週期。
11. 跨時區航班不得使用「整趟 Trip 一個 timezone」或單一 booking timezone 當真相；departure / arrival 各自保存當地時間 + IANA timezone，UTC 只作絕對時間、duration 與 audit。

## 二、生命週期入口

| 階段 | 預設入口 | 主要 CTA |
| --- | --- | --- |
| 進入既有出差 | 出差總覽 | 依缺口導向行前準備／行程／我的報支 |
| 行前 | 行前準備 | 補齊機票、住宿、待辦與補休 |
| 行程規劃／出差中 | 行程 | 共編 shared itinerary；手機優先單日時間軸 |
| 回國後 | 我的報支 | 處理費用、文件、缺件、卡片與匯出 |
| 已完成 | 出差總覽 | 查看狀態／重新下載 |

## 三、執行順序

### Sprint 0：基線、護欄與可追蹤規格

- [x] 固定主檔介面改為唯讀。
- [x] 文件確認與 API 改用完整公司報支項目清單。
- [x] 國家、城市與機場辨識使用管理主檔。
- [x] 將本規劃寫入版本庫。
- [x] 建立現有資料與匯出 Golden Dataset。
- [x] 列出舊硬編碼、localStorage 與重複規則。
- [x] 登入人員與角色改為伺服器端主檔，管理異動需管理者權限並留下 audit。
- [x] 出差與工作階段寫入正式 URL，移除 sessionStorage 選旅程與固定示範旅程端點。

完成定義：現況可重現；資料、權限與輸出規則都有單一文件；後續變更可測試比較。

### Sprint 1：固定主檔與雙幣別資料核心（P0）

- [x] 將報支項目、申報幣別、國家、城市、機場改為版本化唯讀主檔。
- [x] 正式資料只保存主檔 ID／外部代碼，不接受自由文字成為正式值。
- [x] 費用加入 originalCurrency、originalAmount、reportingCurrency、reportingAmount。
- [x] 保存匯率、匯率來源、轉換原因與人工確認狀態。
- [x] 未知幣別不再靜默覆蓋為 TWD；保留原幣並要求 TWD 申報。
- [x] API、OCR、Excel／CSV 匯入共用同一驗證服務。
- [x] 舊資料無法映射時進例外清單，不自動歸類為「其他」。

完成定義：非法主檔值無法寫入；原始幣別不會消失；可完整還原辨識與申報決策。

### Sprint 2：個人卡、手續費與附件關聯（P0）

- [x] 信用卡帳單只作為證明文件，不形成第二筆消費。
- [x] 保存 TWD 實際請款、卡末四碼與帳單附件。
- [x] 國外交易手續費獨立形成「國外交易手續費｜TWD」。
- [x] 日期、店家、原幣、TWD 金額與卡末四碼候選配對；多筆相近時要求人工確認。
- [x] 無法唯一匹配時進待確認。
- [x] 一般 non-travel 費用／文件使用 recoverable delete；正式機票／住宿使用 permanent whole-order delete，不進 travel trash、不允許 restore。

完成定義：帳單不重複計費；手續費獨立；一般費用誤刪可復原；正式 travel order 刪除後不得由 legacy trash／舊文件復活。

### Sprint 3：正式彙總與輸出（P0）

- [x] groupKey = 公司報支項目 + 申報幣別；同項目不同幣別強制拆行。
- [x] Excel 包含報支彙總、費用明細、信用卡與手續費、缺件與附件索引。
- [x] ZIP 依報支行次建立「序號_項目_幣別」資料夾。
- [x] manifest 保存費用、附件、原始檔名與標準檔名對照。
- [x] ZIP 內彙總、明細、manifest 與附件使用同一次 server-side export snapshot。

完成定義：相同項目不同申報幣別必定拆行；Excel、ZIP、明細與附件 100% 對應。

### Sprint 4：響應式骨架與 Design System（P0）

- [x] 移除已被正式工作台取代的舊 Prototype 元件與示範資料。
- [x] 歷史重複 CSS 依模組拆分並移除失效選擇器。
- [x] 將 Design System 與四段響應式骨架抽離為獨立樣式模組。
- [x] 統一 Typography、Spacing、Control、Radius、Color tokens。
- [x] 核心工作台為 ≥1440、1200–1439、900–1199、<900 四段。
- [x] 桌機主欄使用 minmax(0, 1fr)，工具不足寬度改 Drawer。
- [x] Header、Dialog、Popover、Bottom Sheet 與 Safe Area 使用一致規則。
- [x] 操作型 control 依 2026-08-18 Audit remediation 補至至少 44×44px，不為此膨脹 data-grid cell。

完成定義：1024、1280、1440、1920px 無整頁水平捲動；操作型控制可達；字級比例一致。

### Sprint 5：PWA 收件匣與 OCR Pipeline（P0）

- [x] 一般費用拍照先存 IndexedDB，一秒內顯示保存／辨識狀態。
- [x] 建立 client job ID 與 retry queue；一般費用維持離線 queue；travel 上傳必須在線取得新的 server document ID，不離線背景補傳。
- [x] 每次 travel 重傳都建立新的 document ID；`contentHash` 僅供稽核與清除歷史 byte-identical ghost copies，不得作 active identity。
- [x] 圖片方向校正、長邊 2200px、壓縮與清晰度檢查後再 OCR。
- [x] PDF 優先讀文字層；無文字層掃描檔明確標示待確認。
- [x] OCR 保存 raw text、candidate、confidence、mapping reason 與 confirmed value。
- [x] 一般報支文件收斂成一個 upload entry；文件類型為 optional preselection。Travel evidence 不在報支頁建立第二入口。

完成定義：一般費用離線可續傳；travel 離線不產生失聯文件；同檔重傳不讓已刪除 travel order 回魂；上傳入口 ownership 清楚。

### Sprint 6：Trip Workspace IA（P1）

- [x] Trip Overview 成為進入既有出差的預設頁，只彙整狀態與下一步，不建立第二份資料。
- [x] 「行程」只放 shared calendar 與 shared booking projection，不再混入個人待辦／補休／本人 travel intake。
- [x] 「行前準備」集中本人機票、住宿、待辦與補休。
- [x] 「我的報支」集中本人費用、文件、缺件、卡片與匯出。
- [x] 同行者訂單比較以 source order 為單位，不以每個航段建立重複訂單卡。
- [x] 全天與住宿置頂；Calendar 固定顯示 00:00–23:00，沒有 08:00–22:00 隱藏模式。
- [x] 全部出差主要 CTA 改為「開啟出差」並先進 Overview。

完成定義：Shared itinerary、Personal preparation、Personal claim ownership 分離；資料來源維持 Booking / Document / Expense / Agenda 原本責任，不因 IA 重構複製資料。

### Sprint 7：手機工作模式（P1）

- [x] 手機行程不顯示縮小 Excel，使用日期切換＋單日時間軸；進入行程時優先定位今天。
- [x] 全天與住宿置頂，活動使用 Bottom Sheet 編輯。
- [x] 手機與桌機採同一 IA：出差／總覽／行程／準備／報支，不再另有中央「＋上傳」心智模型。
- [x] 一般費用上傳留在「我的報支」；機票／住宿上傳留在「行前準備」。
- [x] 報支首屏優先上傳、最近上傳、待確認、缺件與今日費用；批次匯出留在電腦版。

完成定義：390px 可順暢操作；導覽不消失；跨裝置 ownership 與入口一致。

### Sprint 8：遷移、資料完整性、壓力測試與分階段發布（P1）

- [x] 舊資料 mapping 與 migration exceptions。
- [x] 新舊加總雙讀比較。
- [x] 31 天行程、多成員、1,000 筆費用與大量附件測試。
- [x] iPhone Safari、Android Chrome 與 PWA standalone 自動裝置契約與人工驗收矩陣。
- [x] 權限、惡意檔案、私有下載與稽核測試。
- [x] 逐步啟用與 rollback 技術演練手冊。
- [x] Travel order whole-order lifecycle、replace lifecycle、storage tombstone durability。
- [x] Sprint 8 與 Sprint 9 重複的真人發布／驗收項目已收斂到下方唯一「Final Release Gate」，operational tracker 為 GitHub Issue #85。

完成定義：Sprint 8 的 code、migration、壓測與 release tooling 已完成；正式站驗收不在本 Sprint 重複計數，統一由 Final Release Gate 判定。

### Sprint 9：2026-08-18 Product / UX / Technical Audit Remediation（P1）

Audit 初始判定為 NO-GO；下列 code remediation 已完成：

- [x] ISSUE-001：行程 create/edit 改成 isolated draft；只有 server acknowledgement + reload 後才成為 persisted state；取消可真正 rollback。
- [x] ISSUE-002：移除 `2026-06-16` 假 fallback；trip workspace 以 tripId remount，切 trip 立即清空舊 state，stale response 不得覆蓋新 trip。
- [x] ISSUE-003：文件搜尋直接驅動 visible collection，支援日期／店家／類型／檔名／幣別，0 result 顯示 empty state。
- [x] ISSUE-004：文件確認加入 Cancel、Esc、dirty discard protection。
- [x] 缺件卡加入直達修復 CTA。
- [x] Booking 價格缺值顯示「未填」，不以 TWD 0 偽裝有效值；訂購時間 locale 化。
- [x] 住宿 modal 改為住宿專屬文案，不再顯示來回票說明。
- [x] 建立出差加入「儲存草稿並離開」／「放棄草稿」；server draft 可 owner-scoped delete，edit/list 不污染 create draft。
- [x] Shared itinerary／Personal preparation／Personal claim 分離並新增 Trip Overview。
- [x] 桌機／手機 navigation 使用同一 IA。
- [x] Runtime baseline `63536beb66927549ffac516087123f36c30589d9`（PR #83），CI run #109，build + Sites artifact validation + **133/133 tests** Pass。
- [x] Audit code remediation 已關帳；Sites 上的 Critical Journey / destructive QA 不在 Sprint 9 再列第二份待辦，統一交由 Final Release Gate。

完成定義：Sprint 9 的 P1 code remediation 已完成；其後 Audit P2 launch-hardening 由 Sprint 10 收尾。

### Sprint 10：Audit Async / Performance Launch Hardening（P2）

- [x] 行程 Save／Delete 加入明確 Loading → Success／Error lifecycle；mutation 期間鎖定重複送出，Save 失敗保留未儲存 draft。
- [x] 文件列表 load failure 與真正 empty state 分離；Save／Delete 有 per-action pending lock、成功後 server reload confirmation 與可見錯誤。
- [x] Card Evidence Matcher 移除 silent catch，加入 loading／error／retry 狀態，不再把候選載入失敗偽裝成「沒有可配對費用」。
- [x] 31 天長行程 desktop grid 每次最多掛載 7 天，保留前／後 7 天切換；手機日期列仍可到達全部日期。
- [x] 新增 `tests/audit-async-performance-regression.test.mjs`，並只調整舊 source-regex 以容許 busy guard，不弱化 rollback／Cancel 契約。
- [x] Runtime baseline `fc584347383ab40b3c9fc62bbf99f948bb7e68a7`（PR #87），tested head `eef83256dcf123bf3fc9e19c8ef4a3e1a124140f`，CI run #116（run id `32107106389`），build + Sites artifact validation + **136/136 tests** Pass。

完成定義：原 Audit 已知 async lifecycle 與長行程 DOM 掛載缺口完成 code-side hardening。

### Sprint 11：Flight Calendar / Timezone Integrity（P1）

- [x] PR #89：synced flight 不再只畫起飛那一個 hour cell；依 `startsAt → endsAt` 畫跨日 travel band，實際抵達超過 Trip end date 時只延伸 Calendar projection，不偷偷改正式 Trip 日期。
- [x] Amsterdam regression：CI73 `TPE 2026-11-03 23:15 → AMS 2026-11-04 07:50` 與 CI74 `AMS 2026-11-06 15:35 → TPE 2026-11-07 10:40` 均保留完整起迄。
- [x] PR #90：Calendar 固定 00:00–23:00，不再用 08:00–22:00 模式隱藏夜間出發，也移除「完整 24 小時」discoverability dependency。
- [x] PR #91：`travel_bookings` 新增 canonical endpoint fields：`departure_timezone`、`departure_utc_at`、`arrival_timezone`、`arrival_utc_at`；舊單一 `timezone` 只暫留 compatibility。
- [x] Flight intake 明確標示「出發時間（當地）／抵達時間（當地）」；IANA timezone 由 managed airport deterministic resolver 自動帶入，無法唯一判定時要求人工確認，不猜固定 offset。
- [x] UTC conversion 使用 IANA DST 規則；真實 flight duration 由 UTC instants 相減，不直接拿兩端 local clock 相減。
- [x] Booking 為 timezone canonical SoT；Agenda 不複製四個 canonical endpoint fields，shared itinerary 讀取時依 `booking:<id>` enrich projection。
- [x] CI73 真實飛行時間 **15h35m / 時差 -7h**；CI74 **12h05m / 時差 +7h**；Amsterdam summer/winter DST conversion 有 executable regression。
- [x] Additive D1 migration：`0024_flight_endpoint_timezones.sql`。
- [x] Runtime baseline `ced77248140b0a696ead06b3b8e26b887f6ca98c`（PR #91），tested head `cc39eb026583cb6b463d337541445eba7a5c08de`，CI run #122（run id `32842598637`），build + Sites artifact validation + **146/146 tests** Pass。

完成定義：跨時區航班同時保留兩端票面當地時間、IANA timezone 與 UTC 絕對時間；Calendar 不因夜間航班遺失資料，duration 不因時差被算錯。正式站仍須依 Final Release Gate 驗證 migration 0024 與實際 Sites behavior。

### Final Release Gate（唯一未完成工作）

目前 release baseline：

- GitHub main 可包含高於 runtime 的 docs-only commit；不得因此誤認 runtime 已改變。
- Runtime release candidate：`ced77248140b0a696ead06b3b8e26b887f6ca98c`（PR #91）。
- Tested head：`cc39eb026583cb6b463d337541445eba7a5c08de`。
- CI baseline：run #122（run id `32842598637`），build + Sites artifact validation + **146/146 tests** Pass。
- D1 migration：through `0024_flight_endpoint_timezones.sql`。
- 唯一 operational tracker：GitHub Issue **#85 `Final Sites UAT & 48h release gate`**。
- 驗收紀錄：`docs/UAT_RELEASE_RECORD.md`；裝置矩陣：`docs/DEVICE_QA.md`。

- [ ] **Gate A — Sites Publish / checkpoint + authenticated destructive UAT**：發布包含上述 runtime candidate 且已套用 migration 0024 的 ChatGPT Sites 版本；依 #85 與 UAT 文件完成 Audit Critical Journey、24h Calendar、Amsterdam CI73/CI74 travel band、endpoint timezone / DST / UTC duration、travel whole-order lifecycle、同檔重傳、住宿時間、一般報支 regression、storage health、export reconciliation 與 device QA。
- [ ] **Gate B — 48h observation + GO / NO-GO**：Gate A PASS 後才開始 T+0／T+4h／T+24h／T+48h 觀察；不得出現 persistence、cross-trip stale render、duplicate mutation、hidden flight、timezone/duration error、travel ghost／restore、privacy、storage-health 或 financial reconciliation regression。

執行規則：

1. Final Release Gate 的 checkbox 只在 Issue #85 與 `docs/UAT_RELEASE_RECORD.md` 記錄實際證據；已完成 Sprint 不再建立重複 release checklist。
2. GitHub merge、CI 全綠或 Sites artifact validation 都不等於 production Sites 已驗收。
3. **Migration 0024 是 #91 runtime 的硬性前置條件**；若正式環境出現 `no such column: departure_timezone`／`arrival_timezone`，立即 NO-GO，不得用 fallback 隱藏 migration 缺失。
4. Gate A 若發現 runtime defect，停止 Gate，建立獨立 fix branch／PR 與 regression coverage；完整 CI 通過、重新發布 Sites 後，從受影響 destructive flow 重新開始 Gate A。
5. Gate A 未 PASS 不得開始 48h observation；Gate B 未 PASS 不得標記 GO。

完成定義：Gate A + Gate B 均 PASS，才將 TripClaim 從 NO-GO 改為 GO。

### 2026-08-18 Travel Order Lifecycle Amendment（P0，不得回歸）

1. 每次上傳都建立新的 document ID；重新上傳不得指向已刪除 document。
2. 一張機票訂單可包含任意多個實際航段；每一航段保存自己的 departure → arrival 日期、時間與機場。
3. 來回／多航段只形成一筆整張機票報支金額，不因航段數重複計價。
4. 點任一去程、回程、轉機航段、travel 文件或其 travel expense 的刪除，都代表永久刪除完整 source order graph。
5. Travel order 不使用 soft delete restore；legacy trash API 不得復活 travel booking、travel document、agenda 或 travel expense。
6. 「確認並同步」不是 append；必須以 whole-order replace 取代本人同類舊 travel order，並重新載入所有相關 panel。
7. 住宿行程以入住日 15:00 作為 startsAt、退房日 11:00 作為 endsAt；城市與地址可選填，不得阻擋同步。
8. `contentHash` 不是訂單身份，只能用於稽核及刪除歷史 byte-identical ghost copies。
9. 正式 travel attachment 的 D1 graph 刪除與 object deletion tombstone 必須同 batch；R2 失敗只能形成「已追蹤待清理」。
10. Travel booking 完成狀態由正式 booking evidence 管理，不能靠手動勾選 TODO 偽造已完成。
11. EVA regression 必須保持 BR87 `TPE → CDG` `2026-06-15 23:30 → 2026-06-16 08:05` 與 BR88 `CDG → TPE` `2026-06-25 11:20 → 2026-06-26 06:55` exact-value pass。
12. Flight `startAt` / `endAt` 是兩端票面 local datetime；不得把其中一端強制轉成另一端 timezone 後覆蓋原值。
13. Flight canonical timezone identity 是 IANA timezone；`UTC+N` 只能做顯示／audit，不得當 DST-safe canonical timezone。
14. 真實飛行時間只能由 `arrivalUtcAt - departureUtcAt` 計算；跨時區 travel band 的視覺高度不得被解讀為 elapsed duration。

## 四、最終桌機與手機 IA

### 桌機

- 全部出差：出差列表、建立出差；主要 CTA「開啟出差」。
- 總覽：進度、下一步、缺件、下一個行程；只讀 aggregation。
- 行程：shared calendar + shared bookings；Calendar 固定 24h；flight band 顯示兩端當地時間／offset／真實 duration。
- 行前準備：本人 flights & stays、checklist、comp time；flight endpoint timezone 在此確認。
- 我的報支：expenses、documents inbox、cards & statements、review & export。

### 手機

- 固定 Bottom Navigation：出差、總覽、行程、準備、報支。
- 行程頁：日期切換、全天／住宿、單日 24h 時間軸，不顯示縮小版大型 Excel。
- 行前準備：本人 travel intake／待辦／補休。
- 我的報支：一般費用 upload、最近上傳、待確認、缺件與今日費用。
- 不再用 mobile-only 中央「＋上傳」改變 ownership；上傳回到各自 workspace。

## 五、驗收護欄

1. 操作型點擊區至少 44×44px；data-grid cell 不因觸控規範被不必要放大。
2. 同行者不可查看他人的卡號、帳單、收據與個人報支。
3. 他人未完成班機或住宿不得阻擋本人。
4. 來回多航段只計一筆整張機票費用。
5. 非白名單原幣保留，申報 TWD，且必須顯示原因。
6. 帳單附件不重複建立消費；手續費獨立為 TWD。
7. 報支表、明細、ZIP 與附件索引的組別、順序與金額一致。
8. 刪除任一 travel 航段後，同 source order 的所有航段、agenda、travel expense、正式文件與可見附件一起消失。
9. 刪除後重新上傳相同 travel 檔案，必須建立新的 document ID；不得載入舊 travel order。
10. 新文件確認同步後，行程只保留新 source order 的航段／住宿，不得同時存在新舊版本。
11. 住宿必須以 15:00 check-in 與 11:00 checkout 形成行程；其他 PDF timestamp 不得覆蓋。
12. R2 刪除失敗不得留下無追蹤 object；failed key 必須有 pending deletion tombstone 並可後續重試。
13. 新增／編輯一般活動未收到 server acknowledgement 前不得偽裝成 persisted event；reload 後必須一致。
14. 切換 trip 時不得先顯示其他 trip 的日期／內容；正確資料到達前只能顯示中性 loading state。
15. 文件搜尋無匹配時必須為 0 results；文件確認必須可取消／Esc 關閉。
16. Overview 只能 aggregation，不可成為 Booking／Document／Expense／Agenda 的第二個可獨立修改 source。
17. Desktop 與 mobile 必須維持同一 workspace IA。
18. Save／Delete 等 mutation 進行中必須顯示 pending 狀態並鎖定重複送出；失敗不得被偽裝成成功或空資料。
19. 文件 loading failure 必須與真正 0 文件／0 matcher candidate 分離，且提供可見 retry／error path。
20. 31 天 desktop 行程不得一次掛載全部日期 grid；單一 window 最多 7 天，但所有日期在 desktop 與 mobile 都必須可到達。
21. Calendar 必須固定 00:00–23:00；任何夜間／凌晨 flight 不得因預設時間範圍被隱藏。
22. Flight Calendar projection 可延伸到實際抵達日，但不得靜默改寫正式 Trip startsOn／endsOn。
23. 每個 flight endpoint 必須保留 local datetime + IANA timezone；無法 deterministic resolve 的 airport timezone 必須要求人工確認，不可猜。
24. UTC conversion 必須遵守 DST；Amsterdam 2026-07 與 2026-11 的 offset 不得被固定寫死為同一值。
25. CI73 / CI74 在 UI、booking 與 audit 中的 local time、UTC duration 與 timezone difference 必須一致。
26. #91 runtime 上線前 D1 必須完成 migration 0024；缺欄位即 release blocker。

## 六、北極星指標

- 出差中單據即時上傳率。
- 平均上傳點擊數。
- OCR 後人工修改率。
- 回國後待確認及缺件筆數。
- 信用卡帳單自動配對率。
- 人工重新命名時間。
- 回國至完成報支的平均時間。

首要指標：使用者回國後完成一趟報支所需的人工時間。
