# TripClaim 執行優化規劃書

最後更新：2026-08-26  
決策角色：CPO、CTO、IA、UIUX、財務流程

## 一、產品主流程

**建立／選擇出差 → 行程 → 我的報支**

使用者不需要理解 Booking、Document、Agenda、Expense 的內部資料分工；系統在後端維持正確 ownership 與生命週期即可。

### 使用者操作

1. **全部出差**：建立或選擇一趟出差。
2. **行程**：同一頁完成「我的行程資料」與 Calendar。
   - 上傳／登記機票。
   - 上傳／登記住宿。
   - 查看／完成待辦與補休。
   - 確認後機票、住宿直接出現在同頁 Calendar。
   - 一般活動直接在 Calendar 新增／編輯。
3. **我的報支**：回國後處理一般費用、文件、信用卡證明、缺件與正式匯出。

Desktop：**全部出差 / 行程 / 我的報支**  
Mobile：**出差 / 行程 / 報支**

`overview`、`preparation` 不再是使用者工作區；舊 URL 只作 compatibility，進入後回到 `itinerary`。

## 二、不可回歸的產品原則

1. **操作集中、資料分權**：使用者在同一個行程工作面操作，但個人文件、信用卡、補休與報支仍是本人資料。
2. Trip 只保留一份正式資料圖；Calendar 是 Booking / Agenda 的投影，不建立第二份可獨立修改的 travel truth。
3. 機票／住宿上傳後，確認同步必須在**同頁 Calendar**立即反映，不要求使用者跨頁找結果。
4. 一張機票可有任意多航段，但只形成**一張 source order、一筆 airfare expense**。
5. Travel order 使用 whole-order lifecycle：建立、replace、delete 都以整張 source-order graph 為單位。
6. 刪除任一 travel 航段／來源文件／travel expense，代表永久刪除完整 source-order graph；travel 不可 restore。
7. 一般 non-travel 文件與費用維持 recoverable delete / restore。
8. 每次 travel re-upload 都建立新的 server document ID；`contentHash` 不得作 active identity。
9. Hotel 固定以入住日 15:00、退房日 11:00 投影 Calendar；城市／地址為選填。
10. Calendar 固定 00:00–23:00；全天活動有真正 all-day lane。
11. Flight 必須顯示 departure → arrival duration band，並清楚顯示出發與到達 time log。
12. Flight departure / arrival 各自保存票面 local datetime + IANA timezone；UTC 只用於絕對時間、duration 與 audit。
13. 真實 flight duration 只由 `arrivalUtcAt - departureUtcAt` 計算；不得直接相減兩端 local clock。
14. IANA timezone 必須遵守 DST；無法 deterministic resolve 的 airport timezone 要求人工確認，不猜 fixed offset。
15. 同行者只看到需要共用的 flight/stay schedule projection；他人的 travel source attachment、個人報支、信用卡與補休不可讀。
16. 使用者看得到的可修改狀態必須 server-persisted；不得用 React/local-only state 偽裝已保存。
17. 所有 Save/Delete mutation 必須有 Loading → Success/Error lifecycle 並阻止 duplicate submit。
18. 未具備完整 Preview → Confirm → Write lifecycle 的 bulk import 不得暴露成 production CTA。
19. 公司報支項目、申報幣別、國家／城市等正式主檔由 D1 versioned company master 提供，不允許自由文字成為正式主檔值。
20. 原始交易資料不可被申報資料覆蓋；非白名單幣別保留原幣／原金額並要求 TWD reporting。

## 三、目前完成狀態

### Data / lifecycle

- [x] Travel whole-order create / replace / permanent delete。
- [x] Fresh document ID on every travel upload / re-upload。
- [x] Durable pending object deletion tombstone + bounded R2 retry。
- [x] Ordinary document / expense recoverable delete；travel document 永久 whole-order delete。
- [x] Owner-only travel source attachment。
- [x] Comp-leave owner-scoped server persistence + reset-to-auto。
- [x] Versioned D1 company master database。

### Calendar / flight integrity

- [x] Fixed 24h Calendar + true all-day lane。
- [x] Flight departure → arrival duration band across midnight。
- [x] Explicit departure / arrival local time logs。
- [x] Calendar projection may extend to actual flight arrival date without rewriting Trip formal dates。
- [x] Endpoint IANA timezone + derived UTC + DST-safe duration。
- [x] 31-day desktop Calendar renders max 7 days per window; all dates remain reachable。

### UIUX / IA

- [x] Trip selection / creation opens `行程` directly。
- [x] Travel upload / todo / comp leave and Calendar live on the same page。
- [x] Removed obsolete `TripOverview` and `TripPreparation` runtime workspaces。
- [x] Travel intake renamed **「我的行程資料」**。
- [x] Desktop top-level IA reduced to 全部出差 / 行程 / 我的報支。
- [x] Mobile top-level IA reduced to 出差 / 行程 / 報支。
- [x] Trip list has one primary `開啟出差` entry。
- [x] Shared booking details remain secondary / collapsed under Calendar。
- [x] Removed unfinished Agenda bulk-import CTAs。

### Audit / interaction

- [x] Itinerary create/edit isolated draft + server acknowledgement + reload confirmation。
- [x] Cancel is a real rollback。
- [x] Cross-trip stale state guarded。
- [x] Document search 0-result state、Cancel/Esc、dirty protection。
- [x] Loading / failure / empty states separated。
- [x] 44px interaction targets where applicable。
- [x] PWA ordinary expense offline queue; travel upload requires fresh online server document ID。

## 四、Release baseline

- Runtime release candidate：`3146683521391f2a6175905b7e487581631c8394`（PR #109）。
- Tested head：`3e44efa291cf5423756729987b23776f6d977265`。
- CI：run #155 / run id `32964679254`。
- Build：PASS。
- Sites artifact validation：PASS。
- Automated tests：**162 / 162 PASS，0 fail**。
- Production D1 migrations：through `0026_company_master_database.sql`。
- Operational tracker：GitHub Issue #85 `Final Sites UAT & 48h release gate`。

## 五、Production migration prerequisites

1. `0023_pending_object_deletions.sql`：durable storage cleanup。
2. `0024_flight_endpoint_timezones.sql`：flight endpoint IANA timezone / UTC。
3. `0025_comp_leave_overrides.sql`：comp-leave persistence。
4. `0026_company_master_database.sql`：versioned company master D1 database。

任一 prerequisite 缺失即 **NO-GO**；不得以 fallback、local state 或硬編碼資料掩蓋 production schema 缺失。

## 六、Final Release Gate（唯一未完成工作）

### Gate A — Production publish + authenticated destructive UAT

- [ ] Production D1 migrations through 0026 已套用。
- [ ] 發布包含 runtime `3146683521391f2a6175905b7e487581631c8394` 的既有 ChatGPT Site checkpoint/version。
- [ ] 建立／選擇 Trip 後直接進 `行程`，沒有必要的「總覽／行前準備」中繼頁。
- [ ] 上傳／登記 flight → confirm → **同頁 Calendar** 出現所有實際航段。
- [ ] 上傳／登記 stay → confirm → **同頁 Calendar** 出現 15:00 check-in / 11:00 checkout。
- [ ] 待辦與補休在同一個行程工作面可操作；補休 reload 保留、reset 回 auto。
- [ ] Calendar 固定 24h、all-day lane 正確、長行程所有日期可達。
- [ ] Amsterdam CI73 / CI74 local time、timezone、duration、跨日 arrival projection 正確。
- [ ] BR87 / BR88 exact-value regression 正確。
- [ ] 任一 travel leg delete → whole order 消失 → reload 不復活 → same-file re-upload 為 fresh lifecycle。
- [ ] 同行者看不到他人的 travel source attachment。
- [ ] Ordinary document delete → 可立即 restore；travel document delete → permanent whole-order。
- [ ] 我的報支：一般費用、offline queue、文件、卡片、缺件、export reconciliation 正確。
- [ ] System Management → 系統健康正常；不暴露 object key；pending storage cleanup 正常。
- [ ] `docs/DEVICE_QA.md` 與 `docs/UAT_RELEASE_RECORD.md` 完成。

### Gate B — 48h observation

Gate A PASS 後才開始 T+0 / T+4h / T+24h / T+48h：

- [ ] 無 persistence / stale render / duplicate mutation。
- [ ] 無 flight missing leg / timezone / duration / hidden-night-flight regression。
- [ ] 無 travel ghost / restore / reused-old-upload regression。
- [ ] 無 owner privacy leak。
- [ ] 無 comp-leave state loss。
- [ ] 無 ordinary restore regression。
- [ ] 無 financial reconciliation difference。
- [ ] Pending storage 不持續成長，且**最舊項目超過 24 小時**不得發生。

**Gate A + Gate B 均 PASS 才可由 NO-GO 改為 GO。**

## 七、固定 regression fixtures

### EVA

- BR87：TPE → CDG，`2026-06-15 23:30 → 2026-06-16 08:05`。
- BR88：CDG → TPE，`2026-06-25 11:20 → 2026-06-26 06:55`。

### Amsterdam

- CI73：TPE `2026-11-03 23:15` → AMS `2026-11-04 07:50`；**15h35m / -7h**。
- CI74：AMS `2026-11-06 15:35` → TPE `2026-11-07 10:40`；**12h05m / +7h**。
- Trip formal end date 可維持 11/06；Calendar 因實際 arrival 顯示 11/07。

## 八、北極星指標

首要指標：**使用者回國後完成一趟報支所需的人工時間**。

輔助指標：出差中單據即時上傳率、OCR 後人工修改率、回國後缺件數、信用卡配對率、上傳失敗率、旅行資料一次確認成功率。