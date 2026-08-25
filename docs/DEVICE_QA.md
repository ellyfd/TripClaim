# TripClaim 裝置驗收矩陣

本矩陣以 2026-08-18 Audit remediation、async/performance launch-hardening、24h Calendar 與 canonical flight timezone 完成後的共同 IA 驗收：**出差／總覽／行程／準備／報支**。桌機負責全貌與批次整理；手機維持相同 ownership，只將內容改成單日／任務優先。每次發布前先執行完整 CI；正式站需由有權限的測試帳號完成下列人工 smoke test。

Runtime baseline：`ced77248140b0a696ead06b3b8e26b887f6ca98c`（PR #91，tested head `cc39eb026583cb6b463d337541445eba7a5c08de`，CI run #122 / run id `32842598637`，146/146 tests）。D1 migration 最新為 `0024_flight_endpoint_timezones.sql`。

| 裝置／模式 | 尺寸 | 必驗流程 | 通過條件 |
| --- | --- | --- | --- |
| iPhone Safari | 390×844 | 出差 → 總覽 → 行程 → 準備 → 報支 | Bottom Navigation 固定且五個概念一致；操作 control ≥44px；safe area 不遮擋；完整旅程日期皆可達；Calendar 可到 00:00–23:00 |
| Android Chrome | 412×915 | 總覽 → 行程切日／新增活動 → 準備上傳 travel → 報支一般文件 | 行程單日時間軸；保存後 reload 一致；不同 workspace 的 upload ownership 清楚；mutation 不可重複送出；航班顯示兩端當地時間與時區 |
| PWA standalone | 390×844 / 412×915 | 冷啟動、離線啟動、一般費用離線上傳、背景回前景 | 無瀏覽器工具列依賴；離線頁可達；一般費用 queue 不遺失；travel 不離線建立失聯文件 |
| 小型桌機 | 1024×768 | 總覽、shared 行程、行前準備、報支工具 drawer | 無整頁水平捲動；shared/personal ownership 不混回同一欄；長行程 7-day window 可操作；24h grid 可捲到夜間時段 |
| 一般桌機 | 1280×800 / 1440×900 | Overview next action、行程、準備、文件確認、ZIP 匯出 | 主工作區置中；導覽一致；文件搜尋／取消可逆；Save/Delete pending 狀態可見；travel band 顯示 endpoint timezone 與真實 duration |
| 大型桌機 | 1920×1080 | 31 天行程與 1,000 筆費用 | Desktop grid 一次最多 7 天；前／後 7 天可達全部日期；長列表／表格穩定；Overview 不複製來源資料 |

## 發布前快速檢核

1. 確認 GitHub release candidate 完整 CI 為 success；目前基線為 run #122、146/146，Sites artifact validation Pass；D1 已套用 `0024_flight_endpoint_timezones.sql`。
2. 從「全部出差」開啟兩趟日期不同的 Trip，確認都先進「總覽」。
3. 快速切換兩趟 Trip；正確資料到達前只能顯示中性 loading，不得閃上一趟日期／活動或 `2026-06-16` 假 fallback。
4. 在「行程」新增一般活動，保存後 reload 必須存在；未保存 draft 不得偽裝成 persisted event；取消編輯後 reload 不得保留未儲存修改。
5. 對同一筆新活動快速連點 Save／按 Enter，保存期間應顯示 pending 並鎖定重複操作；reload 後只能有一筆 persisted event。
6. 若可安全模擬斷線／API failure，行程 Save 失敗應顯示錯誤並保留未儲存 draft；不得偽裝成功。
7. 建立至少 15 天、理想 31 天 Trip：desktop 一次最多顯示／掛載 7 天 grid，前／後 7 天可到第一天與最後一天；mobile 日期列仍可到全部日期。
8. Calendar 固定 00:00–23:00；確認 23:00、00:00、凌晨活動／航班直接可達，沒有「完整 24 小時」toggle 或 08:00–22:00 隱藏模式。
9. 在「我的報支 → 我的文件」輸入完全不匹配字串，必須顯示 0 results；點「確認資料」後可 Cancel／Esc。
10. 文件 Save／Delete 期間應顯示 pending 且不能重複 mutation；若可安全模擬 load failure，顯示「文件載入失敗」而不是「還沒有文件」。
11. 若可安全模擬 Card Evidence Matcher failure，顯示失敗與 retry，不得偽裝成 0 candidate。
12. 建立新出差輸入部分資料後測「儲存草稿並離開」；重新進入可續填；再測「放棄草稿」並 reload，草稿不得復活。
13. 使用 Safari、Chrome 各上傳一張一般測試收據。
14. 一般費用斷網上傳第二張，確認先保存；恢復網路後自動續傳。
15. 同一筆費用切換原始／申報幣別，確認原幣不消失。
16. 刪除一般 non-travel 測試費用，確認仍可復原。
17. 從 **「行前準備 → 我的行前資料」** 上傳來回／多航段機票，確認每個實際 departure → arrival 航段投影到「行程」，整張票只形成一筆本人報支。
18. Amsterdam timezone regression：CI73 `TPE 2026/11/03 23:15 (Asia/Taipei, UTC+8) → AMS 2026/11/04 07:50 (Europe/Amsterdam, UTC+1)` 顯示真實飛行 **15h35m / 時差 -7h**；CI74 `AMS 2026/11/06 15:35 → TPE 2026/11/07 10:40` 顯示 **12h05m / 時差 +7h**。
19. CI73／CI74 的 Calendar travel band 必須依票面兩端 local time 放置；11/07 因實際抵達而出現在 Calendar，但 Trip 正式 end date 不被改寫。
20. 若修改／手動建立航段：出發／抵達欄位明確標示「當地」，IANA timezone 可由機場自動帶入；無法唯一判定時不得猜 fixed UTC offset，必須人工確認。
21. EVA regression 真人確認：BR87 `TPE 2026/06/15 23:30 → CDG 2026/06/16 08:05`；BR88 `CDG 2026/06/25 11:20 → TPE 2026/06/26 06:55`。
22. 從任一 travel 航段刪除，確認同 source order 的所有航段、行程 projection、travel expense、正式文件與附件全部消失；reload 不復活。
23. 重新上傳第 17 步相同機票，確認像全新 upload 重新辨識；同步後只能存在這次新 order。
24. 從「行前準備」上傳住宿，確認 startsAt = 入住日 15:00、endsAt = 退房日 11:00；城市／地址缺失仍可同步；modal 不出現來回票文案。
25. Booking 缺價格時顯示「未填」，訂購時間為可讀 zh-TW 顯示。
26. 若有 pending storage cleanup，開「系統管理 → 系統健康」驗證可讀／可重試且不暴露 object key。
27. 桌機 1024、1280、1440、1920px 逐一確認無整頁水平捲動。
28. 手機 390／412px 確認 Bottom Navigation 為「出差／總覽／行程／準備／報支」，沒有另一套中央＋上傳 IA。

## Travel Order 真人 smoke test 最小資料集

- 1 張來回機票（至少 2 航段；若有轉機更佳）。
- 1 張跨時區航班 fixture（Amsterdam CI73／CI74 或等價案例），可核對兩端 local time、IANA timezone 與 UTC-derived duration。
- 1 張住宿訂單（清楚包含 check-in / check-out 日期）。
- 同一張機票檔案保留一份，供「刪除後重新上傳同檔」測試。

驗收順序固定為：**先確認 D1 migration 0024 → 行前準備上傳 → 確認兩端 local time／IANA timezone／真實 duration → 確認同步 → 行程檢查 24h travel-band projection → 刪除任一航段 → 確認整單消失 → 重傳同檔 → 再次同步 → 確認只有新資料**。

## Audit destructive QA 最小流程

1. Trip A 新增「會議」→ 快速連點保存 → pending lock → reload → 必須只存在一筆。
2. Trip A 編輯／取消 → reload → 未儲存修改不得存在。
3. Trip A → Trip B 快速切換 → 不得看到 A 的日期／內容。
4. 31 天 Trip：desktop 7-day window 從第一段切到最後一段；mobile 仍可到每一天；Calendar 一律 24h。
5. 我的文件搜尋不存在字串 → 0 results；文件 Save/Delete 有 pending lock。
6. 文件確認修改 → Cancel／Esc → reload 不保存修改。
7. 建立出差草稿 → 儲存離開 → resume → 放棄 → reload 不復活。
8. CI73／CI74：兩端 local time + IANA timezone + UTC duration + 跨日 travel band 全部一致。
9. Travel whole-order delete + 同檔重傳 + hotel 15:00／11:00。
10. Excel／ZIP／manifest reconciliation。

雲端自動瀏覽器若被 Sites 登入頁阻擋，不得繞過登入；該輪以自動裝置契約測試為基線，真人 smoke/destructive QA 留在 `UAT_RELEASE_RECORD.md`。