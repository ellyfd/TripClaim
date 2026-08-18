# TripClaim 最終 UAT／發布觀察紀錄

用途：Sprint 8／Audit remediation 最後真人閘門。此文件只要求真人驗證「使用者看得到、做得到」的正式站流程；已由 CI 覆蓋的 internal invariant 不要求測試者開 DevTools、抄 UUID 或直接打 legacy API。

**沒有完成本紀錄，不將「GitHub main 已合併」視為「正式站已驗收」。**

## A. Release candidate 基線

### A1. Runtime／CI 已驗證

- **Runtime release candidate SHA**：`fc584347383ab40b3c9fc62bbf99f948bb7e68a7`
- 對應 PR：`#87 Harden async lifecycle and long-trip agenda rendering`
- CI tested head：`eef83256dcf123bf3fc9e19c8ef4a3e1a124140f`
- GitHub Actions：Auto test & merge `run #116`（run id `32107106389`）・success
- Build：Pass
- Sites artifact validation：Pass
- Automated tests：`136 / 136` Pass・`0` Fail
- D1 migration 最新版本：`0023_pending_object_deletions.sql`
- Execution Plan 最後更新：2026-08-18

本 runtime candidate 已包含 2026-08-18 Product / UX / Technical Audit remediation 與後續 P2 launch-hardening：

- [x] 行程 create/edit 使用 isolated draft；server acknowledgement + reload 後才成為 persisted state。
- [x] 移除跨 trip 假日期／stale state；workspace 以 tripId remount 並防舊 response 覆蓋。
- [x] 文件搜尋、0-result empty state、Cancel／Esc／dirty discard protection。
- [x] Booking 缺值不顯示 TWD 0、timestamp locale 化、住宿專屬文案。
- [x] 一般報支文件收斂為單一 upload entry；travel intake 歸「行前準備」。
- [x] 建立出差具「儲存草稿並離開」／「放棄草稿」完整 server lifecycle。
- [x] Trip Overview 為預設入口；Shared itinerary、Personal preparation、Personal claim 分離。
- [x] 桌機與手機使用同一 workspace IA：出差／總覽／行程／準備／報支。
- [x] 行程 Save／Delete 有 busy lock、Loading → Success／Error，可阻擋重複 mutation；Save 失敗保留 draft。
- [x] 文件 load failure 與真正 empty state 分離；文件 Save／Delete 有 pending lock；Card Evidence Matcher 有 loading／error／retry，不再 silent catch。
- [x] 長行程 desktop grid 每次最多 render 7 天；前／後 7 天可走完整旅程；mobile 仍可到達全部日期。
- [x] BR87 `TPE → CDG`，`2026-06-15 23:30 → 2026-06-16 08:05` exact-value fixture Pass。
- [x] BR88 `CDG → TPE`，`2026-06-25 11:20 → 2026-06-26 06:55` exact-value fixture Pass。
- [x] EVA compact `HHMM` text layer outbound fixture Pass。
- [x] Travel whole-order delete／replace／fresh upload／no-restore／storage tombstone guards Pass。

> **基線判定規則**：`docs/`、README、UAT 紀錄等純文件 commit 可以高於 runtime candidate，不改變 runtime。若 `fc584347...` 之後有任何會影響執行結果的程式／schema／build commit（例如 `app/`、`db/`、`drizzle/`、`public/`、runtime scripts、dependencies），必須重新跑完整 CI 並重建本區基線。

### A2. 本次 Sites 驗收

- 驗收日期：
- 驗收人：
- Sites production URL：`https://quick-trip-claim.ellyfd.chatgpt.site/`
- Sites version / checkpoint：
- GitHub main SHA（發布當下留存稽核；docs-only commit 可高於 runtime candidate）：
- 實際 runtime candidate：`fc584347383ab40b3c9fc62bbf99f948bb7e68a7`
- 瀏覽器／裝置：
- 測試 Trip ID：

## B. 已由 automated guards 驗證，不要求真人重做

以下若 CI 不是全綠，本次 UAT 直接 No-Go：

- [x] Fresh travel upload 不會用 `contentHash` 重用已刪除 document；每次 upload 由伺服器建立新的 document ID。
- [x] Legacy travel trash restore 已封鎖。
- [x] 任一 booking DELETE 走 permanent whole-order graph deletion。
- [x] 單一航段 PATCH 不可繞過 whole-order replace lifecycle。
- [x] Confirm sync 使用 transactionally replace，不 append 舊 travel order。
- [x] BR87／BR88 parser exact-value regression。
- [x] 住宿 15:00 check-in／11:00 checkout parser regression。
- [x] R2 bounded retry + pending deletion tombstone durability。
- [x] Admin health API 僅 system admin 可讀／重試，且不暴露 R2 object key。
- [x] 一般 non-travel expense 保留 recoverable delete。
- [x] Trip-scoped workspace remount／stale-response guard。
- [x] Itinerary draft 與 persisted rows 分離。
- [x] Overview 不取代 Booking／Document／Expense／Agenda 的來源 ownership。
- [x] Itinerary mutation busy lock／failure draft retention。
- [x] Document load/save/delete/matcher failure-state contract。
- [x] Long-trip agenda desktop 7-day render-window contract。

## C. 最小真人測試資料

- [ ] 一張本人真實或去識別化來回／多航段機票，至少 2 個實際 departure → arrival 航段。
- [ ] 保留上述完全相同檔案，供「刪除後同檔重傳」測試。
- [ ] 一張住宿文件，清楚包含 check-in 與 check-out 日期。
- [ ] 一般 non-travel 收據 1 張。
- [ ] 至少兩趟不同日期的測試 Trip，用來驗證切換時不顯示上一趟 stale state。
- [ ] 一趟至少 15 天、理想 31 天的測試 Trip，用來驗證長行程 window 與所有日期可達性。

> 不使用其他人的私人文件。正式 UAT 可使用本人文件或去識別化測試資料。

## D. Audit Critical Journey：Trip／IA／Persistence

### D1. Overview-first 與跨裝置 IA

- [ ] 從「全部出差」點「開啟出差」後，預設進 **總覽**，不是直接塞進行程或報支。
- [ ] 桌機工作區順序／概念為：**全部出差／總覽／行程／行前準備／我的報支**。
- [ ] 手機 Bottom Navigation 為：**出差／總覽／行程／準備／報支**。
- [ ] 手機不再有與桌機 ownership 不一致的中央「＋上傳」入口。
- [ ] Overview 只顯示狀態與下一步；不能在 Overview 直接維護另一份 Booking／Expense／Agenda 真相。

### D2. 行程新增／編輯 persistence + mutation lifecycle

- [ ] 在「行程」新增一筆一般活動，例如 09:00「會議」。
- [ ] 未按保存前，畫面不得把 draft 偽裝成已同步正式 event。
- [ ] 按保存後立即看到「正在保存／保存中」類 pending 回饋，保存期間按鈕不可重複送出。
- [ ] 快速連點 Save／Enter 不得建立兩筆相同活動；Reload 後只能有一筆 persisted event。
- [ ] 保存完成後有明確 server-confirmed 完成回饋。
- [ ] Reload 後「會議」仍存在，日期／時間／名稱一致。
- [ ] 編輯既有一般活動後按「取消」，reload 後仍是原資料。
- [ ] 編輯並保存後 reload，結果保持新值。
- [ ] 若可安全模擬斷線／API failure，Save 顯示錯誤且未儲存 draft 仍留在編輯區，不得偽裝成功。
- [ ] Delete 期間顯示 pending 並鎖定重複操作；成功或失敗都有明確回饋。
- [ ] 機票／住宿 projection 不可當一般 event 直接獨立編輯；需導向「行前準備」來源訂單。

### D3. 切 Trip 不得顯示 stale/default data

- [ ] 準備兩趟日期明顯不同的 Trip A／Trip B。
- [ ] 從 A 切到 B 時，B 的正確資料到達前只能看到中性 loading state。
- [ ] 不得短暫顯示 A 的日期、活動、預設 `2026-06-16` 或其他非 B 資料。
- [ ] 快速來回切 A／B，舊 request 完成後不得覆蓋目前 active trip。

### D4. 建立出差草稿 lifecycle

- [ ] 建立新出差輸入部分資料後，點「儲存草稿並離開」。
- [ ] 返回列表後顯示「繼續建立草稿」。
- [ ] 重新進入草稿，資料仍存在。
- [ ] 點「放棄草稿」並確認後，草稿消失；reload 後不復活。
- [ ] 編輯既有 Trip 後返回，不得污染／重建「建立新出差」草稿。

### D5. 31 天／長行程 render window

- [ ] Desktop 開啟長行程時，一次只顯示／掛載最多 7 天 grid，而不是把 31 天全部塞在同一張表。
- [ ] 「前 7 天／後 7 天」可連續到達旅程第一天與最後一天，無日期漏失。
- [ ] 切換 7-day window 後活動仍對應正確日期；不得顯示上一 window 的 stale cell。
- [ ] 預設仍為 08:00–22:00；使用者可切完整 24 小時。
- [ ] Mobile 日期列仍能到達整趟旅程所有日期，不因 desktop 7-day window 而只剩 7 天。

## E. Audit Critical Journey：文件／報支互動

### E1. 文件搜尋

- [ ] 上傳或使用既有文件後，在「我的報支 → 我的文件」輸入完全不匹配的字串。
- [ ] 結果必須顯示 `0 / N` 與「找不到相符文件」，原文件不可繼續出現在結果列。
- [ ] 清除搜尋後文件重新出現。
- [ ] 日期、店家、請款類型、檔名可作為搜尋條件。

### E2. 文件確認可逆 + async lifecycle

- [ ] 點「確認資料」進入編輯。
- [ ] 不修改直接點「取消」可收合。
- [ ] 修改欄位後點「取消」會詢問是否放棄未儲存修改。
- [ ] 按 Esc 可走同一 dismiss lifecycle。
- [ ] 取消後 reload，不得保存未確認修改。
- [ ] Save／Delete 期間顯示 pending，且同一文件不能連點形成重複 mutation。
- [ ] 若可安全模擬文件列表 load failure，畫面顯示「文件載入失敗／重新讀取」，不得偽裝成「還沒有文件」。
- [ ] 若可安全模擬 Card Evidence Matcher failure，顯示失敗與 retry；不得偽裝成「目前沒有可安全配對的本人費用」。

### E3. 缺件／缺值語意

- [ ] 缺件卡可直接進入補刷卡單／補信用卡帳單／去確認等修復入口。
- [ ] Booking 未填價格顯示「未填」，不是有效的 `TWD 0`。
- [ ] 訂購時間顯示可讀的 zh-TW 時間，不直接顯示 ISO timestamp。
- [ ] 住宿 modal 顯示住宿專屬說明，不出現「來回票」文案。
- [ ] 一般報支文件只有一個主要 upload entry；文件類型為 optional preselection。

## F. Travel order 真人必測流程

### F1. 第一次上傳機票

- [ ] 從 **「行前準備 → 我的行前資料」** 唯一 travel intake 上傳機票。
- [ ] 上傳後有明確成功／辨識中／需確認回饋，不是無反應。
- [ ] parser 顯示所有實際航段。
- [ ] 每段均有正確出發機場、出發日期時間、抵達機場、抵達日期時間。
- [ ] BR87 去程不得只剩 `TPE + 出發時間`；必須看到 `CDG + 2026/06/16 08:05`。
- [ ] 跨日航段以真正抵達日期作為 endAt。
- [ ] 多航段／來回只顯示一筆整張票金額。

| # | 航班 | Departure | Arrival | 結果 |
| --- | --- | --- | --- | --- |
| 1 | BR87 | TPE・2026/06/15 23:30 | CDG・2026/06/16 08:05 | ☐ Pass ☐ Fail |
| 2 | BR88 | CDG・2026/06/25 11:20 | TPE・2026/06/26 06:55 | ☐ Pass ☐ Fail |
| 3 |  |  |  | ☐ Pass ☐ Fail |
| 4 |  |  |  | ☐ Pass ☐ Fail |

### F2. 確認並同步

- [ ] 按「確認並同步」有明確完成回饋。
- [ ] 所有實際航段直接投影到「行程」。
- [ ] 不建立另一套可獨立修改的 travel event／booking 真相。
- [ ] 本人報支只形成一筆整張機票費用。
- [ ] 機票 TODO 由「訂單同步」管理，不能手動偽造完成。
- [ ] Reload 後資料仍一致。

### F3. 從任一航段刪除整張訂單

- [ ] 刪除提示明確寫「永久刪除整張訂單」。
- [ ] 同 source order 的去程、回程、轉機全部消失。
- [ ] 行程 projection 全部消失。
- [ ] travel expense 全部消失。
- [ ] 正式 travel document／可見附件全部消失。
- [ ] Reload 後不復活。
- [ ] Shared booking、TODO、行程、報支都沒有舊 state。

### F4. 同一檔案重新上傳

- [ ] 使用 F1 完全相同機票檔案重新上傳。
- [ ] UI 重新跑讀取／辨識流程，不直接載入第一次舊結果。
- [ ] 不出現「已有舊檔，載入既有文件」等 duplicate reuse 行為。
- [ ] BR87／BR88 再次完整讀出。
- [ ] 可以正常再次「確認並同步」。

### F5. 第二次確認並同步

- [ ] 同步後行程只存在第二次的新 source order projection。
- [ ] 不同時存在新舊航段。
- [ ] 不產生第二份重複機票報支。
- [ ] Reload 後結果不變。

## G. 住宿真人必測流程

- [ ] 從「行前準備 → 我的行前資料」上傳住宿文件。
- [ ] 飯店名稱可辨識／可人工確認。
- [ ] check-in 日期正確，startsAt 固定 **15:00**。
- [ ] check-out 日期正確，endsAt 固定 **11:00**。
- [ ] 付款時間／建立訂單時間不得覆蓋 15:00／11:00。
- [ ] 城市或地址辨識不到時仍可確認同步。
- [ ] 住宿 projection 直接出現在「行程」，不建立另一套資料。
- [ ] Reload 後結果不變。

## H. 一般 non-travel／PWA 回歸

- [ ] 在「我的報支」上傳一般收據。
- [ ] 一般費用離線拍照可保存並在恢復連線後續傳。
- [ ] 刪除普通費用仍顯示 recoverable 行為並可立即復原。
- [ ] 復原後原始文件與費用仍存在。
- [ ] 此流程不出現「永久刪除整張 travel order」警告。
- [ ] Travel 離線上傳不建立失聯 server document；恢復網路後由「行前準備」重新上傳。

## I. 系統健康／Storage cleanup 真人驗收

由 system admin 開啟：**系統管理 → 系統健康**。

發布前：

- Pending：
- 最舊等待：
- 最高 attempts：

完成 F3 刪除後：

- Pending：
- 最舊等待：
- 最高 attempts：

- [ ] 頁面正常載入，不是 404／500。
- [ ] 正常情況 pending = 0，或短暫出現後重試回到 0。
- [ ] 管理頁不顯示實際 R2 object key。
- [ ] 若已有 pending，可按「重試待清理附件」，結果有明確回饋。
- [ ] pending 持續增加或最舊等待 >24 小時時，判定 No-Go。

## J. 報支／匯出 reconciliation

- [ ] 原始幣別與原始金額仍保留。
- [ ] 非公司白名單幣別要求 TWD reporting，不靜默覆蓋原幣。
- [ ] 同一報支項目不同 reporting currency 拆行。
- [ ] Excel 彙總、費用明細、ZIP manifest、附件分組金額一致。
- [ ] 信用卡帳單只做付款證明；國外交易手續費獨立列 TWD。

## K. 裝置快速驗收

依 `docs/DEVICE_QA.md`：

- [ ] iPhone Safari 390×844。
- [ ] Android Chrome 412×915。
- [ ] PWA standalone。
- [ ] Desktop 1024／1280／1440／1920px。
- [ ] 操作型 control 至少 44×44px；行程 Bottom Sheet 不被 safe area 遮住。
- [ ] 手機「行程」仍是單日／Today-focused，不顯示縮小大型 Excel。
- [ ] Desktop 長行程 7-day window 導覽可達全部日期；mobile 所有日期仍可達。

## L. 48 小時觀察

| 時間 | 上傳失敗 | OCR 待確認 | Pending storage | 最舊等待 | 匯出差額 | Stale/persistence issue | Duplicate mutation | 備註 |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |
| T+0 |  |  |  |  |  |  |  |  |
| T+4h |  |  |  |  |  |  |  |  |
| T+24h |  |  |  |  |  |  |  |  |
| T+48h |  |  |  |  |  |  |  |  |

## M. Go / No-Go

以下任一成立即為 **No-Go**：

- [ ] 新增／編輯一般行程在 reload 後消失或回到錯誤值。
- [ ] Save／Delete 可被快速重複送出並產生 duplicate mutation，或 failure 被顯示成成功／空資料。
- [ ] 切 Trip 時短暫顯示另一趟／預設日期或 stale data。
- [ ] 文件搜尋無匹配仍顯示舊文件，或文件確認無法取消。
- [ ] 文件 load／matcher failure 被偽裝成真正 empty／0 candidate，沒有可見 error path。
- [ ] 31 天 desktop 行程一次掛載全部日期，或 7-day window／mobile 日期列無法到達任一實際旅程日期。
- [ ] Desktop／mobile 出現兩套互相矛盾的 workspace IA。
- [ ] 有使用者可讀到他人的私人附件／卡片／報支。
- [ ] Travel order 刪除後可見資料復活或留下 ghost。
- [ ] 同檔重傳直接載入舊 upload／舊辨識結果。
- [ ] 確認同步後新舊 travel order 同時存在。
- [ ] BR87 去程缺 `CDG` 或 `2026/06/16 08:05`。
- [ ] 其他實際航段漏段或 departure／arrival 日期時間錯誤。
- [ ] 住宿不是 15:00 check-in／11:00 checkout。
- [ ] 報支總額與明細／ZIP 不一致。
- [ ] 原始幣別或原始文件遺失。
- [ ] 系統健康 API／頁面無法使用。
- [ ] Pending storage cleanup 持續增加或最舊項目 >24 小時仍未清除。
- [ ] Runtime candidate `fc584347...` 之後出現程式／schema／build 變更，但沒有新的完整 CI baseline。

最終決策：**☐ GO　☐ NO-GO**

決策人：

決策時間：

備註／Issue／PR：