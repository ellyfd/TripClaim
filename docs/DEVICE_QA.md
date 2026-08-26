# TripClaim 裝置驗收矩陣

本矩陣以 2026-08-26 UIUX / IA consistency、personal-state persistence、owner-only travel attachment、24h Calendar 與 canonical flight timezone 完成後的共同 IA 驗收：**出差／總覽／行程／準備／報支**。桌機負責全貌與批次整理；手機維持相同 ownership，只把內容改成單日／任務優先。

Runtime baseline：`79ef033702780415753a52788ef8fd5bb6280775`（PR #103，tested head `855cbe0c070fa76c913253a97588d13e3bed139c`，CI run #140 / run id `32920287123`，156/156 tests）。Production D1 必須完成 migrations through `0025_comp_leave_overrides.sql`。

| 裝置／模式 | 尺寸 | 必驗流程 | 通過條件 |
| --- | --- | --- | --- |
| iPhone Safari | 390×844 | 出差 → 總覽 → 行程 → 準備 → 報支 | Bottom Navigation 固定且五個概念一致；操作 control ≥44px；safe area 不遮擋；所有旅程日期可達；Calendar 固定 00:00–23:00；Trip row 只有開啟＋overflow |
| Android Chrome | 412×915 | 總覽 → 行程切日／新增活動 → 準備上傳 travel／調整補休 → 報支一般文件 | 行程單日時間軸；保存後 reload 一致；不同 workspace upload ownership 清楚；mutation 不重複送出；補休 override reload 保留／reset 回自動；航班顯示兩端當地時間與時區 |
| PWA standalone | 390×844 / 412×915 | 冷啟動、離線啟動、一般費用離線上傳、背景回前景 | 無瀏覽器工具列依賴；離線頁可達；一般費用 queue 不遺失；travel 不離線建立失聯文件；owner-private source attachment 不因 PWA 暴露 |
| 小型桌機 | 1024×768 | 總覽、shared 行程、行前準備、報支工具 drawer | 無整頁水平捲動；shared/personal ownership 不混回同一欄；Calendar 7-day window 可操作；24h grid 可捲到夜間；desktop 不重複第二個「← 全部出差」 |
| 一般桌機 | 1280×800 / 1440×900 | Overview next action、行程、準備、文件確認、ZIP 匯出 | 主工作區置中；導覽一致；Overview source-order count 正確；過期行程不冒充下一個；文件搜尋／取消可逆；Save/Delete pending 可見；travel band 顯示 endpoint timezone / true duration |
| 大型桌機 | 1920×1080 | 31 天行程與 1,000 筆費用 | Desktop grid 一次最多 7 天；前／後 7 天可達全部日期；長列表／表格穩定；Overview 不複製來源資料；shared booking details 保持 secondary disclosure |

## 發布前快速檢核

1. 確認 runtime CI 為 run #140、156/156、Build Pass、Sites artifact validation Pass；production D1 migrations 已套用 through 0025。
2. 從「全部出差」開兩趟日期不同的 Trip，確認每列只有一個主要 CTA「開啟出差」，並先進「總覽」。
3. Desktop top nav 使用「全部出差／總覽／行程／行前準備／我的報支」，沒有 1/2/3/4 假 step；desktop 不重複 contextual back。Mobile 使用「出差／總覽／行程／準備／報支」且保留必要 contextual back。
4. 快速 Trip A → Trip B；正確資料到達前只能顯示中性 loading，不得閃上一趟日期／活動或假 fallback。
5. Overview：一張來回／多航段票只算 1 張 source order，不因航段數膨脹；所有活動都已過期時顯示「目前沒有後續安排」或等價，不得拿歷史第一筆冒充下一個。
6. 在「行程」新增一般活動，保存後 reload 必須存在；未保存 draft 不得偽裝 persisted；取消後 reload 不得保留修改。
7. 同一活動快速連點 Save／按 Enter，保存期間顯示 pending 並鎖定重複操作；reload 後只能一筆。
8. 若可安全模擬 API failure，Save 失敗顯示錯誤並保留未儲存 draft，不得偽裝成功。
9. 建立 15–31 天 Trip：desktop 每個 grid window 最多 7 天，前／後 7 天可走到首尾；mobile 日期列可到全部日期。
10. Calendar 固定 00:00–23:00；23:00、00:00、凌晨 flight 可達；`完整 24 小時` 是 status，不是假 toggle。
11. 全天活動位於真正 all-day lane；flight departure / arrival time log 不被 partial-hour cell 裁掉。
12. Calendar 是行程 primary；同行者訂單航段／價格／訂購時間為預設收合 secondary details。
13. Agenda toolbar **不得**顯示尚未完成 Preview → Confirm → Write lifecycle 的 Excel／CSV／截圖／PDF bulk import CTA。
14. 在「我的報支 → 我的文件」輸入不存在字串，必須 0 results；「確認資料」可 Cancel／Esc。
15. 文件 Save／Delete 期間顯示 pending 且不能重複 mutation；load failure 顯示錯誤，不可偽裝「還沒有文件」。
16. Card Evidence Matcher failure 顯示失敗／retry，不可偽裝 0 candidate。
17. 建立新出差輸入部分資料後測「儲存草稿並離開」→ resume；再「放棄草稿」→ reload，不得復活。
18. 使用 Safari、Chrome 各上傳一張一般測試收據。
19. 一般費用斷網上傳第二張，確認先保存；恢復網路後續傳。
20. 同一費用切換原始／申報幣別，原幣不得消失。
21. 刪除一般 non-travel 費用，確認仍可復原。
22. 從 **「行前準備 → 我的行前資料」** 上傳來回／多航段機票；每個真實 departure → arrival 航段投影到行程，整張票只形成一筆本人報支。
23. Amsterdam：CI73 `TPE 2026/11/03 23:15 (Asia/Taipei, UTC+8) → AMS 2026/11/04 07:50 (Europe/Amsterdam, UTC+1)` = **15h35m / -7h**；CI74 `AMS 2026/11/06 15:35 → TPE 2026/11/07 10:40` = **12h05m / +7h**。
24. CI73／CI74 travel band 依兩端票面 local time 放置；11/07 因抵達而出現在 Calendar，但 Trip formal end date 仍 11/06。
25. 出發／抵達欄位明確是當地時間；IANA timezone deterministic resolve；無法唯一判定時不得猜 fixed offset。
26. EVA regression：BR87 `TPE 2026/06/15 23:30 → CDG 2026/06/16 08:05`；BR88 `CDG 2026/06/25 11:20 → TPE 2026/06/26 06:55`。
27. 從任一 travel 航段刪除，確認同 source order 的所有航段、projection、travel expense、本人正式 source document／附件全部消失；reload 不復活。
28. 重新上傳第 22 步相同檔案，必須像新 upload 重新辨識；同步後只能有新 order。
29. 使用同行者 A/B：A 可看 B 必要行程／允許共享的訂單比較，但 **不得**看到或開啟 B 的 travel source attachment；B 自己可看自己的附件。
30. 「行前準備」可看同行者 readiness，但不得顯示他人的原始文件、個人報支或補休 override。
31. 補休：點 `+0.5` 等 server success → reload 值仍在；再 `-0.5` → reload 保留；「恢復自動試算」→ reload 回 auto baseline。新增／取代／刪除本人 flight 後自動基線不需 reload 即更新。
32. 從「行前準備」上傳住宿，startsAt = 15:00、endsAt = 11:00；城市／地址缺失仍可同步；modal 不出現來回票文案。
33. Booking 缺價格顯示「未填」，訂購時間為可讀 zh-TW。
34. 若有 pending storage cleanup，開「系統管理 → 系統健康」驗證可讀／可重試、不暴露 object key；**最舊項目超過 24 小時**立即 No-Go。
35. 桌機 1024、1280、1440、1920px 逐一確認無整頁水平捲動。
36. 手機 390／412px 確認 Bottom Navigation 五工作區、Trip row「開啟出差＋overflow」、all-day lane、flight logs 與補休操作均未被 safe area 遮住。

## Travel Order 真人 smoke test 最小資料集

- 1 張來回機票（至少 2 航段；有轉機更佳）。
- 1 張跨時區航班 fixture（Amsterdam CI73／CI74 或等價案例），可核對 local time、IANA timezone、UTC-derived duration。
- 1 張住宿訂單（清楚包含 check-in / check-out 日期）。
- 同一張機票檔案保留一份，供「刪除後重新上傳同檔」。
- 2 個同行者帳號，供 owner-only attachment 驗證。

驗收順序固定為：**先確認 D1 migrations through 0025 → 行前準備上傳 → 確認 endpoint local time／IANA timezone／duration → 同步 → 24h Calendar projection → owner-only attachment → comp-leave persistence → 整單刪除 → 重傳同檔 → 再同步 → 確認只有新資料**。

## Audit / UIUX destructive QA 最小流程

1. Trip A 新增「會議」→ 快速連點保存 → pending lock → reload → 只一筆。
2. Trip A 編輯／取消 → reload → 未儲存修改不存在。
3. Trip A → B 快速切換 → 不得看到 A 日期／內容。
4. 31 天 Trip：desktop 7-day windows 到首尾；mobile 到每一天；Calendar 一律 24h。
5. 我的文件搜尋不存在字串 → 0 results；Save/Delete pending lock；確認修改 → Cancel／Esc → reload 不保存。
6. 建立出差草稿 → 儲存離開 → resume → 放棄 → reload 不復活。
7. CI73／CI74：兩端 local time + IANA timezone + UTC duration + 跨日 travel band 一致。
8. Travel whole-order delete + 同檔重傳 + hotel 15:00／11:00。
9. A/B 同行者：他人 travel source attachment owner-only。
10. Comp leave +0.5 reload、-0.5 reload、reset reload。
11. Overview：multi-leg ticket = 1 source order；past agenda ≠ next itinerary。
12. Agenda toolbar 無 unfinished bulk import CTA。
13. Excel／ZIP／manifest reconciliation。

雲端自動瀏覽器若被 Sites 登入頁阻擋，不得繞過登入；該輪以 automated device contracts 為基線，真人 smoke/destructive QA 留在 `UAT_RELEASE_RECORD.md`。