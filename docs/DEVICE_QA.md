# TripClaim 裝置驗收矩陣

本矩陣以 2026-08-18 Audit remediation 後的共同 IA 驗收：**出差／總覽／行程／準備／報支**。桌機負責全貌與批次整理；手機維持相同 ownership，只將內容改成單日／任務優先。每次發布前先執行完整 CI；正式站需由有權限的測試帳號完成下列人工 smoke test。

Runtime baseline：`63536beb66927549ffac516087123f36c30589d9`（PR #83，CI run #109，133/133 tests）。

| 裝置／模式 | 尺寸 | 必驗流程 | 通過條件 |
| --- | --- | --- | --- |
| iPhone Safari | 390×844 | 出差 → 總覽 → 行程 → 準備 → 報支 | Bottom Navigation 固定且五個概念一致；操作 control ≥44px；safe area 不遮擋 |
| Android Chrome | 412×915 | 總覽 → 行程切日／新增活動 → 準備上傳 travel → 報支一般文件 | 行程單日時間軸；保存後 reload 一致；不同 workspace 的 upload ownership 清楚 |
| PWA standalone | 390×844 / 412×915 | 冷啟動、離線啟動、一般費用離線上傳、背景回前景 | 無瀏覽器工具列依賴；離線頁可達；一般費用 queue 不遺失；travel 不離線建立失聯文件 |
| 小型桌機 | 1024×768 | 總覽、shared 行程、行前準備、報支工具 drawer | 無整頁水平捲動；shared/personal ownership 不混回同一欄 |
| 一般桌機 | 1280×800 / 1440×900 | Overview next action、行程、準備、文件確認、ZIP 匯出 | 主工作區置中；導覽一致；文件搜尋／取消可逆 |
| 大型桌機 | 1920×1080 | 31 天行程與 1,000 筆費用 | 長列表／表格穩定；Overview 不複製來源資料；工具與主欄維持清楚 |

## 發布前快速檢核

1. 確認 GitHub release candidate 完整 CI 為 success；目前基線為 run #109、133/133。
2. 從「全部出差」開啟兩趟日期不同的 Trip，確認都先進「總覽」。
3. 快速切換兩趟 Trip；正確資料到達前只能顯示中性 loading，不得閃上一趟日期／活動或 `2026-06-16` 假 fallback。
4. 在「行程」新增一般活動，保存後 reload 必須存在；未保存 draft 不得偽裝成 persisted event；取消編輯後 reload 不得保留未儲存修改。
5. 在「我的報支 → 我的文件」輸入完全不匹配字串，必須顯示 0 results；點「確認資料」後可 Cancel／Esc。
6. 建立新出差輸入部分資料後測「儲存草稿並離開」；重新進入可續填；再測「放棄草稿」並 reload，草稿不得復活。
7. 使用 Safari、Chrome 各上傳一張一般測試收據。
8. 一般費用斷網上傳第二張，確認先保存；恢復網路後自動續傳。
9. 同一筆費用切換原始／申報幣別，確認原幣不消失。
10. 刪除一般 non-travel 測試費用，確認仍可復原。
11. 從 **「行前準備 → 我的行前資料」** 上傳來回／多航段機票，確認每個實際 departure → arrival 航段投影到「行程」，整張票只形成一筆本人報支。
12. EVA regression 真人確認：BR87 `TPE 2026/06/15 23:30 → CDG 2026/06/16 08:05`；BR88 `CDG 2026/06/25 11:20 → TPE 2026/06/26 06:55`。
13. 從任一 travel 航段刪除，確認同 source order 的所有航段、行程 projection、travel expense、正式文件與附件全部消失；reload 不復活。
14. 重新上傳第 11 步相同機票，確認像全新 upload 重新辨識；同步後只能存在這次新 order。
15. 從「行前準備」上傳住宿，確認 startsAt = 入住日 15:00、endsAt = 退房日 11:00；城市／地址缺失仍可同步；modal 不出現來回票文案。
16. Booking 缺價格時顯示「未填」，訂購時間為可讀 zh-TW 顯示。
17. 若有 pending storage cleanup，開「系統管理 → 系統健康」驗證可讀／可重試且不暴露 object key。
18. 桌機 1024、1280、1440、1920px 逐一確認無整頁水平捲動。
19. 手機 390／412px 確認 Bottom Navigation 為「出差／總覽／行程／準備／報支」，沒有另一套中央＋上傳 IA。

## Travel Order 真人 smoke test 最小資料集

- 1 張來回機票（至少 2 航段；若有轉機更佳）。
- 1 張住宿訂單（清楚包含 check-in / check-out 日期）。
- 同一張機票檔案保留一份，供「刪除後重新上傳同檔」測試。

驗收順序固定為：**行前準備上傳 → 確認同步 → 行程檢查 projection → 刪除任一航段 → 確認整單消失 → 重傳同檔 → 再次同步 → 確認只有新資料**。

## Audit destructive QA 最小流程

1. Trip A 新增「會議」→ 保存 → reload → 必須存在。
2. Trip A → Trip B 快速切換 → 不得看到 A 的日期／內容。
3. 我的文件搜尋不存在字串 → 0 results。
4. 文件確認修改 → Cancel／Esc → reload 不保存修改。
5. 建立出差草稿 → 儲存離開 → resume → 放棄 → reload 不復活。
6. Travel whole-order delete + 同檔重傳 + hotel 15:00／11:00。
7. Excel／ZIP／manifest reconciliation。

雲端自動瀏覽器若被 Sites 登入頁阻擋，不得繞過登入；該輪以自動裝置契約測試為基線，真人 smoke/destructive QA 留在 `UAT_RELEASE_RECORD.md`。
