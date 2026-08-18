# TripClaim 最終 UAT／發布觀察紀錄

用途：Sprint 8 最後真人閘門。此文件記錄一次具名、可重現的 Sites 驗收；沒有完成本紀錄，不將「GitHub main 已合併」視為「正式站已驗收」。

## A. 發布基線

- 驗收日期：
- 驗收人：
- Sites production URL：`https://quick-trip-claim.ellyfd.chatgpt.site/`
- Sites version / checkpoint：
- GitHub main SHA：
- D1 migration 最新版本：`0023_pending_object_deletions.sql`
- 瀏覽器／裝置：
- 測試 Trip ID：

## B. 最小測試資料

- [ ] 一張真實或去識別化來回／多航段機票，至少 2 個實際 departure → arrival 航段。
- [ ] 保留上述同一個檔案，供「刪除後同檔重傳」測試。
- [ ] 一張住宿文件，清楚包含 check-in 與 check-out 日期。
- [ ] 一般非 travel 收據 1 張，用來確認普通費用仍保留可復原刪除。

> 測試附件不得使用其他人的私人文件；正式 UAT 可使用本人文件或去識別化測試資料。

## C. Travel order 必測流程

### C1. 第一次上傳機票

- [ ] 從唯一 travel intake 上傳機票。
- [ ] 系統成功建立新的 server document ID。
- [ ] OCR／PDF parser 顯示所有實際航段，而不是只顯示第一段。
- [ ] 每段均有正確的出發機場、出發日期時間、抵達機場、抵達日期時間。
- [ ] 跨日航段以抵達日為 endAt，不把出發日複製成抵達日。
- [ ] 多航段／來回只顯示一筆整張票金額。

第一次 document ID：

航段紀錄：

| # | 航班 | Departure | Arrival | 結果 |
| --- | --- | --- | --- | --- |
| 1 |  |  |  | ☐ Pass ☐ Fail |
| 2 |  |  |  | ☐ Pass ☐ Fail |
| 3 |  |  |  | ☐ Pass ☐ Fail |
| 4 |  |  |  | ☐ Pass ☐ Fail |

### C2. 確認並同步

- [ ] 按「確認並同步」有明確回饋，不是無反應。
- [ ] 所有實際航段直接出現在共同行程。
- [ ] 行程不建立另一套重複 travel 卡片資料。
- [ ] 本人報支只形成一筆整張機票費用。
- [ ] TODO 的機票完成狀態由 active booking evidence 決定，不能手動偽造完成。

### C3. 從任一航段刪除

從哪一段執行刪除：

- [ ] 刪除提示明確寫「永久刪除整張訂單」。
- [ ] 去程、回程、轉機等同 source order 所有航段全部消失。
- [ ] 共同行程內對應 agenda 全部消失。
- [ ] 對應 travel expense 全部消失。
- [ ] 正式 travel document／可見附件全部消失。
- [ ] legacy trash 無法將 travel booking／document／expense／agenda 復原。
- [ ] 重新整理頁面後資料仍未復活。

### C4. 同一檔案重新上傳

- [ ] 使用 C1 完全相同的機票檔案重新上傳。
- [ ] 系統建立新的 document ID，不載入第一次 document。
- [ ] 不出現「已有舊檔，載入既有文件」之類 duplicate reuse 行為。
- [ ] parser 再次讀出所有實際航段。

第二次 document ID：

- [ ] 第二次 document ID 與第一次不同。

### C5. 第二次確認並同步

- [ ] 同步後 itinerary 只存在第二次的新 source order。
- [ ] 不同時存在新舊航段。
- [ ] 不產生第二份重複機票報支。
- [ ] 重新整理後結果不變。

## D. 住宿必測流程

- [ ] 上傳住宿文件。
- [ ] 飯店名稱可辨識／可人工確認。
- [ ] check-in 日期正確。
- [ ] itinerary startsAt 固定為 check-in 日 **15:00**。
- [ ] check-out 日期正確。
- [ ] itinerary endsAt 固定為 check-out 日 **11:00**。
- [ ] PDF 中付款時間、建立訂單時間等其他 timestamp 不覆蓋 15:00／11:00。
- [ ] 城市或地址辨識不到時仍可確認同步。
- [ ] 住宿直接出現在共同行程住宿列。

## E. 一般非 travel 刪除回歸

- [ ] 上傳一般收據。
- [ ] 刪除普通費用／文件仍走 recoverable delete。
- [ ] 可立即復原。
- [ ] 復原後原始文件與費用仍存在。
- [ ] 此流程不會觸發「永久刪除整張 travel order」提示。

## F. 系統健康／Storage cleanup

由管理者開啟：**系統管理 → 系統健康**。

發布前：

- Pending：
- 最舊等待：
- 最高 attempts：

完成 C3 刪除後：

- Pending：
- 最舊等待：
- 最高 attempts：

- [ ] 正常情況 pending = 0，或短暫出現後自行／人工重試回到 0。
- [ ] 管理頁不顯示實際 R2 object key。
- [ ] 若有 pending，可按「重試待清理附件」，重試結果有明確回饋。
- [ ] 若重試仍失敗，tombstone 保留，attempts 增加，不會把失敗記錄清空。
- [ ] pending 持續增加或最舊等待 >24 小時時，判定 No-Go，停止擴大發布。

## G. 手機／PWA 快速驗收

依 `docs/DEVICE_QA.md` 執行，至少完成：

- [ ] iPhone Safari 或 Android Chrome 390–412px：Bottom Navigation 可達。
- [ ] 一般費用離線拍照可保存並於恢復連線後續傳。
- [ ] Travel 上傳在離線狀態不建立失聯 server document；恢復連線後重新上傳。
- [ ] 今日行程不顯示縮小版大型 Excel。
- [ ] Bottom Sheet 不被 safe area 遮住。

## H. 報帳／匯出 reconciliation

- [ ] 原始幣別與原始金額仍保留。
- [ ] 非公司白名單幣別要求 TWD reporting，不靜默覆蓋原幣。
- [ ] 同一報支項目不同 reporting currency 拆行。
- [ ] Excel 彙總、費用明細、ZIP manifest、附件分組金額一致。
- [ ] 信用卡帳單只做付款證明；國外交易手續費獨立列 TWD。

## I. 48 小時觀察

| 時間 | 上傳失敗 | OCR 待確認 | Pending storage | 最舊等待 | 匯出差額 | 備註 |
| --- | ---: | ---: | ---: | --- | ---: | --- |
| T+0 |  |  |  |  |  |  |
| T+4h |  |  |  |  |  |  |
| T+24h |  |  |  |  |  |  |
| T+48h |  |  |  |  |  |  |

## J. Go / No-Go

以下任一為 No-Go：

- [ ] 有使用者可讀到他人的私人附件／卡片／報帳。
- [ ] Travel order 刪除後可復活或留下可見 ghost。
- [ ] 同檔重傳沒有建立新的 document ID。
- [ ] 確認同步後新舊 travel order 同時存在。
- [ ] 機票漏實際航段或 departure／arrival 日期時間錯誤。
- [ ] 住宿不是 15:00 check-in／11:00 checkout。
- [ ] 報支總額與明細／ZIP 不一致。
- [ ] 原始幣別或原始文件遺失。
- [ ] Pending storage cleanup 持續增加或最舊項目 >24 小時仍未清除。

最終決策：**☐ GO　☐ NO-GO**

決策人：

決策時間：

備註／Issue／PR：
