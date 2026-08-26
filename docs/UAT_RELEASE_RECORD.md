# TripClaim 最終 UAT／發布觀察紀錄

用途：Final Release Gate 的真人驗收證據。只驗正式站使用者實際看得到、做得到、reload 後仍正確的流程；CI 已覆蓋的 internal invariant 不要求測試者打 legacy API 或抄內部 UUID。

## A. Release candidate

- Runtime：`3146683521391f2a6175905b7e487581631c8394`（PR #109）
- Tested head：`3e44efa291cf5423756729987b23776f6d977265`
- CI：run #155 / `32964679254`
- Build：PASS
- Sites artifact：PASS
- Tests：**162 / 162 PASS，0 fail**
- D1 migrations：through `0026_company_master_database.sql`
- Production URL：`https://quick-trip-claim.ellyfd.chatgpt.site/`

### Sites evidence

- 驗收日期：
- 驗收人：
- Sites version / checkpoint：
- 發布當下 GitHub main：
- 瀏覽器／裝置：
- 測試 Trip：

## B. Gate A — 操作流程

### B1. 最短 IA

- [ ] 全部出差只有建立／選擇 Trip 的責任。
- [ ] 點 `開啟出差` 直接進 **行程**。
- [ ] 新建 Trip 完成後直接進 **行程**。
- [ ] Desktop 只有：全部出差 / 行程 / 我的報支。
- [ ] Mobile 只有：出差 / 行程 / 報支。
- [ ] 不出現需要使用者理解的「總覽」或「行前準備」中繼工作區。
- [ ] 舊 `stage=overview` / `stage=preparation` URL 會安全落到 itinerary，不產生死頁。

### B2. 我的行程資料與 Calendar 在同一頁

- [ ] 行程頁上方直接看到 **我的行程資料**。
- [ ] 可直接上傳／登記機票。
- [ ] 可直接上傳／登記住宿。
- [ ] 可直接處理待辦與補休。
- [ ] 機票確認同步後，不換頁，下面 Calendar 直接更新。
- [ ] 住宿確認同步後，不換頁，下面 Calendar 直接更新。
- [ ] 一般活動可直接在 Calendar 新增／編輯。
- [ ] 同行者機票／住宿詳細比較維持次要／預設收合，不搶 Calendar 主畫面。

### B3. Calendar

- [ ] 固定顯示 00:00–23:00。
- [ ] 全天活動在真正 all-day lane。
- [ ] 航班不是一小時卡片，而是 departure → arrival travel band。
- [ ] 航班有明確 `出發` 與 `到達` time log。
- [ ] 15–31 天 Trip desktop 每次最多顯示 7 天 grid，前後切換可達全部日期。
- [ ] Mobile 可到所有 Trip 日期。
- [ ] Flight arrival 超過 Trip formal end date 時 Calendar 可延伸，但 Trip end date 不被改寫。

### B4. 一般活動 persistence

- [ ] 新增一般活動 → Save → reload → 仍存在。
- [ ] 快速連點 Save / Enter → pending lock 可見 → reload 只有一筆。
- [ ] Edit → Save → reload → 新值存在。
- [ ] Edit → Cancel → reload → 取消值沒有被保存。
- [ ] 快速切 Trip A → B 不閃出 A 的日期／內容。

## C. Travel destructive QA

### C1. 機票

- [ ] 上傳一張本人真實或去識別化來回／多航段票。
- [ ] Parser 顯示所有實際航段。
- [ ] 每段有正確 departure airport / local datetime / arrival airport / local datetime。
- [ ] 一張票只有一筆 airfare expense，不按航段重複計價。
- [ ] Confirm sync 後所有航段直接出現在同頁 Calendar。

EVA fixture（若使用）：

| Flight | Departure | Arrival | 結果 |
| --- | --- | --- | --- |
| BR87 | TPE 2026/06/15 23:30 | CDG 2026/06/16 08:05 | ☐ Pass ☐ Fail |
| BR88 | CDG 2026/06/25 11:20 | TPE 2026/06/26 06:55 | ☐ Pass ☐ Fail |

### C2. Amsterdam timezone

Official Trip dates可維持 `2026-11-03 → 2026-11-06`。

- [ ] CI73：TPE `11/03 23:15` / Asia-Taipei → AMS `11/04 07:50` / Europe-Amsterdam。
- [ ] CI73 actual duration **15h35m**，timezone difference **-7h**。
- [ ] CI74：AMS `11/06 15:35` / Europe-Amsterdam → TPE `11/07 10:40` / Asia-Taipei。
- [ ] CI74 actual duration **12h05m**，timezone difference **+7h**。
- [ ] Calendar 出現 11/07 arrival projection，但 Trip formal end date 仍 11/06。
- [ ] IANA / DST 正確；無法唯一判斷的 airport timezone 要求確認，不猜 fixed offset。

### C3. Whole-order delete / same-file re-upload

- [ ] 從任一 flight leg 刪除，提示永久刪除整張 travel order。
- [ ] 同 source order 所有 legs、Calendar projection、travel expense、正式 travel document 一起消失。
- [ ] Reload 後不復活。
- [ ] 使用完全相同檔案重新上傳，重新走辨識流程，不載入舊 order。
- [ ] Confirm sync 後只有新 source order。

### C4. 住宿

- [ ] 上傳住宿文件後 check-in = **15:00**。
- [ ] checkout = **11:00**。
- [ ] 城市／地址辨識不到仍可同步。
- [ ] Confirm 後同頁 Calendar 直接出現住宿。

## D. Personal data / privacy

### D1. Travel source attachment

使用同 Trip 的 A / B 兩位成員：

- [ ] A 可看到 B 必要的 shared flight/stay schedule。
- [ ] A 看不到／打不開 B 的 travel source attachment。
- [ ] B 可正常打開自己的 source attachment。
- [ ] My documents / cards / claims / comp-leave 仍是 owner-private。

### D2. Comp leave

- [ ] 行程頁顯示自動補休試算。
- [ ] `+0.5` → server success → reload → 保留。
- [ ] `-0.5` → server success → reload → 保留。
- [ ] `恢復自動試算` → reload → override 消失，回自動值。
- [ ] 本人 flight order replace/delete 後，補休會重新計算。

## E. Ordinary document / claim regression

- [ ] 我的報支可上傳一般 non-travel 收據。
- [ ] 一般文件 delete 顯示移到垃圾桶／可復原，不顯示 travel permanent warning。
- [ ] 可立即 restore，文件與關聯 ordinary expense 回來。
- [ ] Travel document delete 仍是 permanent whole-order，不提供 restore。
- [ ] 文件 search 不存在字串 → 0 results。
- [ ] 文件確認可 Cancel / Esc；取消後 reload 不保存變更。
- [ ] Save/Delete pending 可見且不重複 mutation。
- [ ] 一般 expense offline queue / reconnect retry 正常。
- [ ] 原始幣別與原始金額保留；非白名單要求 TWD reporting。
- [ ] Excel / ZIP / manifest / attachments reconciliation 一致。

## F. Company master / D1

Production 必須完成：

- [ ] 0023 pending object deletion。
- [ ] 0024 flight endpoint timezone / UTC。
- [ ] 0025 comp-leave override。
- [ ] 0026 versioned company master database。
- [ ] Trip destination / claim type / currency 等正式 master 使用 D1 catalog。
- [ ] 無法 mapping 的 legacy 值保持 exception，不靜默改為「其他」。

任何 `no such table` / `no such column` 或硬編碼 fallback 掩蓋缺 migration → **NO-GO**。

## G. System Health

由 system admin 開啟：**系統管理 → 系統健康**。

- [ ] 頁面正常載入。
- [ ] 不顯示實際 R2 object key。
- [ ] pending storage cleanup = 0，或 bounded retry 後回 0。
- [ ] pending 不持續增加。
- [ ] **最舊項目超過 24 小時**不得發生。

## H. Device QA

依 `docs/DEVICE_QA.md`：

- [ ] iPhone Safari / Android Chrome 390–412px。
- [ ] PWA standalone / offline ordinary expense。
- [ ] 1024 / 1280 / 1440 / 1920 desktop。
- [ ] Desktop / mobile 都維持三入口 IA。

## I. Gate A result

- [ ] PASS
- [ ] FAIL

Gate A FAIL 時停止發布；修 runtime → full CI → republish → 從受影響 flow 重做。

## J. Gate B — 48h observation

| 時間 | Upload failure | OCR/manual | Pending storage | Oldest pending | Stale/duplicate | Privacy | Travel/Timezone | Export diff | 備註 |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |
| T+0 |  |  |  |  |  |  |  |  |  |
| T+4h |  |  |  |  |  |  |  |  |  |
| T+24h |  |  |  |  |  |  |  |  |  |
| T+48h |  |  |  |  |  |  |  |  |  |

Gate B 必須同時滿足：

- [ ] 無 itinerary persistence / stale render / duplicate mutation。
- [ ] 無 flight missing / timezone / duration regression。
- [ ] 無 travel ghost / restore / same-file old reuse。
- [ ] 無 owner privacy leak。
- [ ] 無 comp-leave state loss。
- [ ] 無 ordinary document restore regression。
- [ ] 無 financial reconciliation difference。
- [ ] Pending storage 不持續增長且 oldest <= 24h。

## K. Final decision

- [ ] **GO** — Gate A + Gate B 均 PASS。
- [ ] **NO-GO** — 任一 migration、persistence、privacy、travel lifecycle、timezone、storage health 或 financial integrity 失敗。