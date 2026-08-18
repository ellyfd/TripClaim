# TripClaim 最終 UAT／發布觀察紀錄

用途：Sprint 8 最後真人閘門。此文件只要求真人驗證「使用者看得到、做得到」的正式站流程；已由 CI 覆蓋的 internal invariant 不再要求測試者開 DevTools、抄 UUID 或直接打 legacy API。

沒有完成本紀錄，不將「GitHub main 已合併」視為「正式站已驗收」。

## A. Release candidate 基線

### A1. GitHub／CI 已驗證

- Release candidate main SHA：`8a2195013b0cb5e393541f597612cd3c39a270a1`
- 對應 PR：`#76 Fix EVA outbound flight parsing and add executable regression`
- CI tested head：`d4ae1f5706c7beebc072d17bcc7636157c14366e`
- GitHub Actions：Auto test & merge `run #99`・success
- Build：Pass
- Sites artifact validation：Pass
- Automated tests：`113 / 113` Pass・`0` Fail
- D1 migration 最新版本：`0023_pending_object_deletions.sql`
- Execution Plan 最後更新：2026-08-18

本 release candidate 新增可執行 EVA regression：

- [x] BR87 `TPE → CDG`，`2026-06-15 23:30 → 2026-06-16 08:05` exact-value fixture Pass。
- [x] BR88 `CDG → TPE`，`2026-06-25 11:20 → 2026-06-26 06:55` exact-value fixture Pass。
- [x] EVA compact `HHMM` text layer 的 BR87 outbound fixture Pass。

> 若 Sites 發布前 main 又有新 commit，以上 release candidate 立即失效，必須以新的 main SHA／CI 結果重建本區基線，不可沿用舊紀錄。

### A2. 本次 Sites 驗收

- 驗收日期：
- 驗收人：
- Sites production URL：`https://quick-trip-claim.ellyfd.chatgpt.site/`
- Sites version / checkpoint：
- GitHub main SHA（發布當下再次確認）：
- 瀏覽器／裝置：
- 測試 Trip ID：

## B. 已由 automated guards 驗證，不要求真人重做

以下若 CI 不是全綠，本次 UAT 直接 No-Go；真人測試者不需為了這些項目打開 DevTools 或直接呼叫 API。

- [x] Fresh travel upload 不會用 `contentHash` 重用已刪除 document；每次 upload 由伺服器建立新的 document ID。
- [x] Legacy travel trash restore 已封鎖，travel booking／document／expense 不可由一般 trash API 復活。
- [x] 任一 booking DELETE 走 permanent whole-order graph deletion。
- [x] 單一航段 PATCH 不可繞過 whole-order replace lifecycle。
- [x] Confirm sync 使用 transactionally replace，不 append 舊 travel order。
- [x] Flight-centric parser 直接執行 exact-value fixture；BR87 與 BR88 都必須返回完整 origin／destination／startAt／endAt。
- [x] 住宿 15:00 check-in／11:00 checkout parser regression guard 存在。
- [x] 正式 travel attachment 的 R2 cleanup 使用 bounded retry；失敗 key 由 D1 tombstone 持續追蹤。
- [x] Tombstone 成功 cleanup 才清除；失敗時 attempts／last error 保留。
- [x] Admin health API 僅 system admin 可讀／重試，且 response 不暴露 R2 object key。
- [x] 一般 non-travel expense 保留 recoverable delete。

## C. 最小真人測試資料

- [ ] 一張本人真實或去識別化來回／多航段機票，至少 2 個實際 departure → arrival 航段。
- [ ] 保留上述完全相同檔案，供「刪除後同檔重傳」測試。
- [ ] 一張住宿文件，清楚包含 check-in 與 check-out 日期。
- [ ] 一般 non-travel 收據 1 張，用來確認普通費用仍可復原。

> 不使用其他人的私人文件。正式 UAT 可使用本人文件或去識別化測試資料。

## D. Travel order 真人必測流程

### D1. 第一次上傳機票

- [ ] 從「共同行程 → 我的行前資料」唯一 travel intake 上傳機票。
- [ ] 上傳後有明確成功／辨識中／需確認回饋，不是無反應。
- [ ] OCR／PDF parser 顯示所有實際航段，而不是只顯示第一段。
- [ ] 每段均有正確出發機場、出發日期時間、抵達機場、抵達日期時間。
- [ ] BR87 去程不得只剩 `TPE + 出發時間`；必須同時看到 `CDG + 抵達時間 2026/06/16 08:05`。
- [ ] 跨日航段以真正抵達日期作為 endAt。
- [ ] 多航段／來回只顯示一筆整張票金額。

航段紀錄：

| # | 航班 | Departure | Arrival | 結果 |
| --- | --- | --- | --- | --- |
| 1 | BR87 | TPE・2026/06/15 23:30 | CDG・2026/06/16 08:05 | ☐ Pass ☐ Fail |
| 2 | BR88 | CDG・2026/06/25 11:20 | TPE・2026/06/26 06:55 | ☐ Pass ☐ Fail |
| 3 |  |  |  | ☐ Pass ☐ Fail |
| 4 |  |  |  | ☐ Pass ☐ Fail |

### D2. 確認並同步

- [ ] 按「確認並同步」有明確完成回饋。
- [ ] 所有實際航段直接出現在共同行程。
- [ ] 不另外產生一套重複 travel 卡片／行程資料。
- [ ] 本人報支只形成一筆整張機票費用。
- [ ] 機票 TODO 顯示由「訂單同步」管理，不能手動勾出假完成狀態。
- [ ] 重新整理頁面後資料仍一致。

### D3. 從任一航段刪除整張訂單

從哪一段執行刪除：

- [ ] 刪除提示明確寫「永久刪除整張訂單」。
- [ ] 去程、回程、轉機等同 source order 所有航段全部消失。
- [ ] 共同行程內對應 agenda 全部消失。
- [ ] 對應 travel expense 全部消失。
- [ ] 正式 travel document／可見附件全部消失。
- [ ] 重新整理頁面後資料仍未復活。
- [ ] Booking comparison、TODO、行程與報帳 panel 都沒有殘留舊狀態。

> Legacy trash API 的不可復活性由 Section B automated guard 負責；真人只驗「正常 UI 無 ghost／重新整理不回魂」。

### D4. 同一檔案重新上傳

- [ ] 使用 D1 完全相同的機票檔案重新上傳。
- [ ] UI 重新跑一次讀取／辨識流程，而不是直接載入第一次舊結果。
- [ ] 不出現「已有舊檔，載入既有文件」之類 duplicate reuse 行為。
- [ ] parser 再次讀出所有實際航段，BR87 與 BR88 都完整。
- [ ] 可以正常再次「確認並同步」。

> Server document ID 是否不同由 Section B automated guard 保證；真人不需要開 DevTools 抄 UUID。真人驗收重點是：同檔重傳看起來像一份全新的 upload，舊 order 不回魂。

### D5. 第二次確認並同步

- [ ] 同步後 itinerary 只存在第二次的新 source order。
- [ ] 不同時存在新舊航段。
- [ ] 不產生第二份重複機票報支。
- [ ] 重新整理後結果不變。

## E. 住宿真人必測流程

- [ ] 上傳住宿文件。
- [ ] 飯店名稱可辨識／可人工確認。
- [ ] check-in 日期正確。
- [ ] itinerary startsAt 固定為 check-in 日 **15:00**。
- [ ] check-out 日期正確。
- [ ] itinerary endsAt 固定為 check-out 日 **11:00**。
- [ ] PDF 中付款時間、建立訂單時間等其他 timestamp 不覆蓋 15:00／11:00。
- [ ] 城市或地址辨識不到時仍可確認同步。
- [ ] 住宿直接出現在共同行程住宿列，不建立另外一套行程資料。
- [ ] 重新整理後結果不變。

## F. 一般 non-travel 刪除回歸

- [ ] 上傳一般收據。
- [ ] 刪除普通費用／文件仍顯示可復原行為。
- [ ] 可立即復原。
- [ ] 復原後原始文件與費用仍存在。
- [ ] 此流程不出現「永久刪除整張 travel order」警告。

## G. 系統健康／Storage cleanup 真人驗收

由 system admin 開啟：**系統管理 → 系統健康**。

發布前：

- Pending：
- 最舊等待：
- 最高 attempts：

完成 D3 刪除後：

- Pending：
- 最舊等待：
- 最高 attempts：

真人需要驗：

- [ ] 頁面可以正常載入，不是 404／500。
- [ ] 正常情況 pending = 0，或短暫出現後自行／人工重試回到 0。
- [ ] 管理頁不顯示實際 R2 object key。
- [ ] 若畫面已有 pending，可按「重試待清理附件」，結果有明確回饋。
- [ ] pending 持續增加或最舊等待 >24 小時時，判定 No-Go。

> 不要求 UAT 人員刻意破壞 R2 來製造 failure。失敗 tombstone 是否保留、attempts 是否增加已由 Section B automated guard 驗證。

## H. 手機／PWA 快速驗收

依 `docs/DEVICE_QA.md`，至少完成：

- [ ] iPhone Safari 或 Android Chrome 390–412px：Bottom Navigation 可達。
- [ ] 一般費用離線拍照可保存並於恢復連線後續傳。
- [ ] Travel 上傳在離線狀態不建立失聯 server document；恢復連線後可重新上傳。
- [ ] 今日行程不顯示縮小版大型 Excel。
- [ ] Bottom Sheet 不被 safe area 遮住。

## I. 報帳／匯出 reconciliation

- [ ] 原始幣別與原始金額仍保留。
- [ ] 非公司白名單幣別要求 TWD reporting，不靜默覆蓋原幣。
- [ ] 同一報支項目不同 reporting currency 拆行。
- [ ] Excel 彙總、費用明細、ZIP manifest、附件分組金額一致。
- [ ] 信用卡帳單只做付款證明；國外交易手續費獨立列 TWD。

## J. 48 小時觀察

| 時間 | 上傳失敗 | OCR 待確認 | Pending storage | 最舊等待 | 匯出差額 | 備註 |
| --- | ---: | ---: | ---: | --- | ---: | --- |
| T+0 |  |  |  |  |  |  |
| T+4h |  |  |  |  |  |  |
| T+24h |  |  |  |  |  |  |
| T+48h |  |  |  |  |  |  |

## K. Go / No-Go

以下任一成立即為 No-Go：

- [ ] 有使用者可讀到他人的私人附件／卡片／報帳。
- [ ] Travel order 刪除後可見資料復活或留下 ghost。
- [ ] 同檔重傳直接載入舊 upload／舊辨識結果，而不是一份新的上傳流程。
- [ ] 確認同步後新舊 travel order 同時存在。
- [ ] BR87 去程缺 `CDG` 或 `2026/06/16 08:05`。
- [ ] 其他實際航段漏段或 departure／arrival 日期時間錯誤。
- [ ] 住宿不是 15:00 check-in／11:00 checkout。
- [ ] 報支總額與明細／ZIP 不一致。
- [ ] 原始幣別或原始文件遺失。
- [ ] 系統健康 API／頁面無法使用。
- [ ] Pending storage cleanup 持續增加或最舊項目 >24 小時仍未清除。
- [ ] 發布當下 GitHub main SHA 與 Section A release candidate 不一致但沒有重新跑 CI／重建基線。

最終決策：**☐ GO　☐ NO-GO**

決策人：

決策時間：

備註／Issue／PR：
