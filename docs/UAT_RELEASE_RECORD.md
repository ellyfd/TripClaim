# TripClaim 最終 UAT／發布觀察紀錄

用途：Final Release Gate 的真人驗收證據。此文件只要求真人驗證「正式站使用者看得到、做得到、reload 後仍正確」的流程；已由 CI 覆蓋的 internal invariant 不要求 UAT 人員打 legacy API 或翻查內部 UUID。

沒有完成本紀錄，不將「GitHub main 已合併／CI 全綠／Sites artifact 已產生」視為「正式站已驗收」。

## A. Release candidate 基線

### A1. GitHub／CI 已驗證

- Runtime release candidate：`79ef033702780415753a52788ef8fd5bb6280775`
- 對應 PR：`#103 Close remaining overview and itinerary IA dead ends`
- CI tested head：`855cbe0c070fa76c913253a97588d13e3bed139c`
- GitHub Actions：Auto test & merge `run #140`（run id `32920287123`）・success
- Build：Pass
- Sites artifact validation：Pass
- Automated tests：`156 / 156` Pass・`0` Fail
- D1 migrations required：through `0025_comp_leave_overrides.sql`
  - `0023_pending_object_deletions.sql`：durable storage cleanup tombstones
  - `0024_flight_endpoint_timezones.sql`：flight endpoint IANA timezone + UTC
  - `0025_comp_leave_overrides.sql`：owner-scoped comp-leave persistence
- Execution Plan 最後更新：2026-08-26

> 若 production Sites 發布前 runtime 又有新 code commit，以上 runtime candidate 立即失效；必須以新的 runtime SHA／tested head／CI run／migration baseline 重建本區。docs-only main commit 不等於 runtime 改變。

### A2. 本次 Sites 驗收

- 驗收日期：
- 驗收人：
- Sites production URL：`https://quick-trip-claim.ellyfd.chatgpt.site/`
- Sites version / checkpoint：
- 發布 runtime SHA：
- GitHub main SHA（發布當下）：
- Production D1 migration verified through：
- 瀏覽器／裝置：
- 測試 Trip：

## B. 已由 automated guards 驗證，不要求真人重做

以下任一 automated guard 不是全綠，本次 UAT 直接 No-Go。

- [x] Fresh travel upload 每次由 server 建立新 document ID；`contentHash` 不作 active identity。
- [x] Legacy travel trash restore 已封鎖；travel booking／document／expense 不得從普通 trash 復活。
- [x] 任一 travel booking DELETE 走 permanent whole-order graph deletion。
- [x] 單一航段 PATCH 不可繞過 whole-order replace lifecycle。
- [x] Confirm sync transactionally replace，不 append 同類舊 travel order。
- [x] EVA BR87／BR88 exact parser regression 存在。
- [x] Amsterdam CI73／CI74 endpoint timezone、UTC duration、DST regression 存在。
- [x] 住宿 15:00 check-in／11:00 checkout regression 存在。
- [x] 正式 travel attachment storage cleanup 使用 bounded retry + D1 tombstone。
- [x] Admin health 僅 system admin 可用，且 response 不暴露 R2 object key。
- [x] 一般 non-travel expense 保留 recoverable delete。
- [x] Shared booking projection 對非本人遮蔽 travel source document ID／attachment URL。
- [x] Travel attachment endpoint 再次執行 owner check，不只靠 UI 隱藏。
- [x] Comp-leave override 以 owner-scoped half-day units 持久化並留下 audit。
- [x] Overview travel count 以 source order 計，不以 flight leg row 計。
- [x] Agenda toolbar 不再暴露沒有完整 lifecycle 的 bulk import CTA。

## C. 最小真人測試資料

- [ ] Trip A：一般 3–7 天出差，至少兩位成員。
- [ ] Trip B：另一趟日期與內容明顯不同的出差，供 rapid-switch stale-state 測試。
- [ ] 一張本人真實或去識別化來回／多航段機票，至少 2 個實際 departure → arrival 航段。
- [ ] 保留完全相同機票檔案，供「刪除後同檔重傳」測試。
- [ ] Amsterdam CI73／CI74 測試資料，或具有相同 local time / endpoint timezone 的 fixture。
- [ ] 一張住宿文件，清楚包含 check-in／check-out 日期。
- [ ] 一般 non-travel 收據 1 張。
- [ ] 第二位同行者帳號，用來驗 owner-only travel attachment。

> 不使用未授權的他人私人文件。可使用本人資料或去識別化 fixture。

## D. Audit Critical Journey / Data-state UAT

### D1. Overview-first 與 IA

- [ ] 從「全部出差」點一趟既有出差，只看到一個主要 CTA「開啟出差」。
- [ ] 開啟後預設進「總覽」，不是直接進行程或報支。
- [ ] Desktop workspace：全部出差／總覽／行程／行前準備／我的報支。
- [ ] Mobile workspace：出差／總覽／行程／準備／報支。
- [ ] Desktop 不再重複顯示第二個「← 全部出差」；mobile 仍可用 contextual back。
- [ ] Workspace 不出現 1／2／3／4 假線性 step。
- [ ] `完整 24 小時` 是狀態標示，不是看似可按但無作用的按鈕。

### D2. 一般行程 create / edit / cancel persistence

- [ ] 新增一般活動「會議」，10:00–11:00。
- [ ] 按保存時有 pending 狀態，不能快速連點建立兩筆。
- [ ] 保存成功後 reload，活動仍存在且只一筆。
- [ ] 編輯活動，保存後 reload，新值仍存在。
- [ ] 再次編輯但按取消；reload 後未保存修改不得出現。
- [ ] Save/Delete 失敗時必須顯示可見錯誤，不可偽裝成功或空資料。

### D3. Rapid Trip A → Trip B stale-state

- [ ] 在 Trip A 行程頁停留後快速切到 Trip B。
- [ ] Trip B 第一個可見畫面不得閃出 Trip A 日期、活動、航班或住宿。
- [ ] 正確資料未到達前只可顯示中性 loading state。
- [ ] 不得出現歷史假 fallback date。

### D4. 文件搜尋與確認取消

- [ ] 在我的報支文件搜尋輸入確定不存在的字串，結果為 0 / 明確 empty state。
- [ ] 清除搜尋後原文件恢復。
- [ ] 開啟文件確認，修改欄位後按 Cancel，reload 後原值不變。
- [ ] 再次修改後按 Esc；dirty protection 正常，放棄後 reload 不得保存修改。

### D5. 建立出差草稿 lifecycle

- [ ] 建立新出差填一部分資料，按「儲存草稿並離開」。
- [ ] 回到全部出差後顯示「繼續建立草稿」。
- [ ] 重新整理後仍能繼續草稿。
- [ ] 選「放棄草稿」並確認；reload 後草稿不得復活。
- [ ] 編輯既有 Trip 不得污染新的 create draft。

## E. Flight / Timezone / Calendar UAT

### E1. Calendar 基本顯示

- [ ] Calendar 固定顯示 00:00–23:00，不存在 08:00–22:00 隱藏模式。
- [ ] 全天活動位於獨立 all-day lane，不是假裝成某個小時。
- [ ] 桌機 hour row 有足夠高度，flight time log 不被 partial-hour cell 裁掉。
- [ ] 15–31 天行程桌機一次最多顯示 7 天 grid；前／後 7 天可走到首尾。
- [ ] Mobile 可以切換到全部日期。
- [ ] Agenda primary toolbar 不顯示尚未完成 Preview → Confirm → Write 的 Excel／CSV／截圖／PDF bulk import CTA。

### E2. Amsterdam CI73 / CI74

Trip formal dates 可使用 `2026-11-03 → 2026-11-06`。

| 航班 | Departure local | Arrival local | Canonical timezone | Expected duration / difference |
| --- | --- | --- | --- | --- |
| CI73 | TPE・11/03 23:15 | AMS・11/04 07:50 | Asia/Taipei → Europe/Amsterdam | 15h35m / -7h |
| CI74 | AMS・11/06 15:35 | TPE・11/07 10:40 | Europe/Amsterdam → Asia/Taipei | 12h05m / +7h |

- [ ] CI73 去程有明確 `出發 11/3 23:15 · TPE` time log。
- [ ] CI73 到達有明確 `到達 11/4 07:50 · AMS` time log。
- [ ] CI74 出發與到達 time log 均存在。
- [ ] Flight 以完整 departure → arrival duration band 顯示，不是起飛時的一小格。
- [ ] 跨日中段可辨識為飛行中。
- [ ] Calendar 自動包含 11/07 實際抵達日。
- [ ] Trip formal end date 仍是 11/06，不因 Calendar projection 被改寫。
- [ ] CI73 不得顯示成 local-clock subtraction 的 8h35m。
- [ ] IANA timezone 正確；UTC+N 只作顯示，不取代 canonical timezone。
- [ ] 無法 deterministic resolve 的 airport timezone 必須要求確認，不可靜默猜值。

### E3. EVA BR87 / BR88 exact fixture（若本次使用該 fixture）

| # | 航班 | Departure | Arrival | 結果 |
| --- | --- | --- | --- | --- |
| 1 | BR87 | TPE・2026/06/15 23:30 | CDG・2026/06/16 08:05 | ☐ Pass ☐ Fail |
| 2 | BR88 | CDG・2026/06/25 11:20 | TPE・2026/06/26 06:55 | ☐ Pass ☐ Fail |

- [ ] 所有實際航段均存在，不只第一段。
- [ ] 每段出發／抵達日期、時間、機場正確。
- [ ] 來回／多航段只形成一筆整張機票報支。

## F. Travel whole-order destructive lifecycle

### F1. 第一次確認並同步

- [ ] 從「行前準備 → 我的行前資料」唯一 travel intake 上傳機票。
- [ ] 上傳有明確 reading／success／review feedback。
- [ ] 「確認並同步」成功後所有航段直接成為共同行程 projection。
- [ ] 本人報支只有一筆整張票費用。
- [ ] 機票 TODO 顯示由訂單同步管理，不能手動勾成完成。
- [ ] Reload 後一致。

### F2. 從任一航段永久刪除整張訂單

- [ ] 刪除提示明確寫「永久刪除整張訂單」。
- [ ] 去程／回程／轉機等同 source order 所有航段全部消失。
- [ ] 對應共同行程 projection 全部消失。
- [ ] 對應 travel expense 全部消失。
- [ ] 本人正式 travel source document／附件入口消失。
- [ ] Reload 後不復活。
- [ ] Booking details、TODO、Calendar、報支都沒有 ghost state。

### F3. 同一檔案重新上傳

- [ ] 使用完全相同機票檔案再次上傳。
- [ ] UI 重新跑完整 reading／review 流程，不直接載入第一次舊結果。
- [ ] 不出現 duplicate reuse／載入既有文件行為。
- [ ] 可再次確認並同步。
- [ ] 第二次同步後只存在新 source order projection，不同時存在新舊航段。
- [ ] 不產生第二筆重複機票報支。
- [ ] Reload 後結果不變。

## G. Shared / Personal privacy UAT

使用同行者 A 與 B：

- [ ] A 可在 shared Calendar 看見 B 需要共用的 flight / stay 行程時間。
- [ ] A 可查看允許共享的同行者訂單比較資訊。
- [ ] A 看不到 B 的 travel source attachment 連結／下載入口。
- [ ] B 自己仍可查看自己的 source attachment。
- [ ] 若以可達的正常 UI／link 重試他人附件，應被拒絕，不得下載內容。
- [ ] 行前準備可以看同行者 readiness，但不顯示對方原始文件或個人報支。
- [ ] 我的報支、卡片、帳單、收據、缺件狀態維持本人私有。

## H. Comp-leave persistence UAT

- [ ] 進入「行前準備」可看到自動補休試算值。
- [ ] 點 `+0.5`，等待「已保存」或等價 server success feedback 後數值改變。
- [ ] Reload，人工調整值仍存在。
- [ ] 再點 `-0.5`，reload 後仍存在且不出現 duplicate mutation。
- [ ] 點「恢復自動試算」，等待 server success。
- [ ] Reload，人工 override 已消失，回到由目前航班重新計算的自動值。
- [ ] 新增／取代／刪除本人的 flight order 後，不必 reload 即會重新抓資料並更新自動試算基線。
- [ ] 同行者的補休值／override 不得影響本人。

## I. Overview aggregation UAT

- [ ] 一張來回／多航段機票在總覽只算 **1 張 source order**，不能因 2+ booking rows 顯示成 2+ 張訂單。
- [ ] 總覽仍顯示實際共同行程筆數，但訂單數和行程／航段數語意分開。
- [ ] 有未來活動時，「下一個行程」顯示合理的下一筆。
- [ ] 所有活動都已過期時，不得把歷史第一筆活動冒充成「下一個行程」；應顯示「目前沒有後續安排」或等價狀態。
- [ ] 總覽只做 aggregation；無法在總覽直接創造第二份 Booking／Document／Expense／Agenda 真相。

## J. 住宿 UAT

- [ ] 從「行前準備 → 我的行前資料」上傳住宿文件。
- [ ] 飯店名稱可辨識／人工確認。
- [ ] check-in 日期正確，startsAt 固定 **15:00**。
- [ ] check-out 日期正確，endsAt 固定 **11:00**。
- [ ] 付款時間／訂購時間不得覆蓋 15:00／11:00。
- [ ] 城市或地址辨識不到時仍可確認同步。
- [ ] 住宿直接成為共同行程 projection，不建立第二份行程資料。
- [ ] Reload 後不變。

## K. 一般 non-travel 刪除／離線回歸

- [ ] 上傳一般收據。
- [ ] 刪除普通費用仍顯示 recoverable behavior，可立即復原。
- [ ] 復原後原始文件與費用仍存在。
- [ ] 此流程不顯示「永久刪除整張 travel order」。
- [ ] 手機一般費用離線拍照可先保存，恢復連線後續傳。
- [ ] Travel 上傳在離線狀態不建立失聯 server document；恢復連線後重新上傳。

## L. 系統健康／Storage cleanup

由 system admin 開啟：**系統管理 → 系統健康**。

發布前：

- Pending：
- 最舊等待：
- 最高 attempts：

完成 travel destructive delete 後：

- Pending：
- 最舊等待：
- 最高 attempts：

- [ ] 頁面正常載入，不是 404／500。
- [ ] 管理頁不顯示實際 R2 object key。
- [ ] 正常情況 pending = 0，或短暫出現後自行／人工重試回 0。
- [ ] 若有 pending，可按「重試待清理附件」並得到明確結果。
- [ ] pending 不得持續單向增加。
- [ ] **最舊項目超過 24 小時**時立即 No-Go。

## M. 手機／PWA Device QA

依 `docs/DEVICE_QA.md` 至少完成：

- [ ] iPhone Safari 390px 級距。
- [ ] Android Chrome 390–412px 級距。
- [ ] PWA standalone。
- [ ] Bottom Navigation 五個 workspace 可達。
- [ ] 今日行程／日期切換可達全部日期。
- [ ] 全天 lane、flight departure/arrival log、Bottom Sheet 不被 safe area 遮住。
- [ ] Trip list mobile 只有「開啟出差」＋ overflow menu，沒有已移除的空 action 欄。

## N. 報帳／匯出 reconciliation

- [ ] 原始幣別與原始金額保留。
- [ ] 非公司白名單幣別要求 TWD reporting，不靜默覆蓋原幣。
- [ ] 同一報支項目不同 reporting currency 拆行。
- [ ] Excel 彙總、費用明細、ZIP manifest、附件分組與金額一致。
- [ ] 信用卡帳單只做付款證明；國外交易手續費獨立列 TWD。

## O. 48 小時觀察

Gate A 全 PASS 後才開始。

| 時間 | 上傳失敗 | OCR 待確認 | Pending storage | 最舊等待 | duplicate / stale / privacy | 匯出差額 | 備註 |
| --- | ---: | ---: | ---: | --- | --- | ---: | --- |
| T+0 |  |  |  |  |  |  |  |
| T+4h |  |  |  |  |  |  |  |
| T+24h |  |  |  |  |  |  |  |
| T+48h |  |  |  |  |  |  |  |

## P. Go / No-Go

以下任一成立即 No-Go：

- [ ] Production runtime / checkpoint 無法證明包含 `79ef033702780415753a52788ef8fd5bb6280775` 等效內容。
- [ ] Production D1 未套用 migrations through 0025。
- [ ] `0024` 缺失造成 flight endpoint timezone／UTC 欄位錯誤。
- [ ] `0025` 缺失或失效造成補休 override reload 消失。
- [ ] 行程 create/edit 保存後 reload 消失，或取消後錯誤保存。
- [ ] Trip A → B 顯示 stale date／content／fake fallback。
- [ ] 文件搜尋／Cancel／Esc lifecycle 不符合 D4。
- [ ] BR87／BR88 或本次實際票任一真實航段漏段、日期時間錯誤。
- [ ] CI73／CI74 local time、IANA timezone、UTC-derived duration、timezone difference 錯誤。
- [ ] CI73 顯示 8h35m 等 local-clock subtraction 結果，而不是 15h35m。
- [ ] Calendar 無法顯示實際 arrival day，或反而靜默改寫 Trip formal end date。
- [ ] 夜間／凌晨航班因時間範圍被隱藏。
- [ ] Travel order 刪除後資料復活或留下 ghost。
- [ ] 同檔重傳直接重用舊 upload／舊 order。
- [ ] Confirm sync 後新舊 travel order 同時存在。
- [ ] 一張多航段票形成多筆 airfare expense。
- [ ] 同行者可取得他人的 travel source attachment／document ID 對應內容。
- [ ] 補休人工調整看似成功但 reload 消失，或 reset 後仍被舊 override 復活。
- [ ] Overview 把 flight leg rows 當成多張 source order。
- [ ] Overview 在所有活動已過期後仍把舊行程稱為「下一個行程」。
- [ ] Agenda 正式 toolbar 再次出現未完成 lifecycle 的 bulk import CTA。
- [ ] 住宿不是 15:00 check-in／11:00 checkout。
- [ ] 報支總額與明細／ZIP 不一致。
- [ ] 原始幣別或本人原始文件遺失。
- [ ] 系統健康頁無法使用、pending 持續增加或最舊項目超過 24 小時。

### 最終決策

- Gate A：☐ PASS ☐ FAIL
- Gate B / 48h：☐ PASS ☐ FAIL
- Release：☐ GO ☐ NO-GO
- 決策人：
- 決策時間：
- Sites version / checkpoint：
- 備註／evidence link：
