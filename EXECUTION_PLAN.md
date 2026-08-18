# TripClaim 執行優化規劃書

最後更新：2026-08-18  
決策角色：CPO、CTO、IA、UIUX、財務流程  
產品主流程：建立出差 → 共同行程 → 我的報帳

## 一、不可變更的產品原則

1. 同一趟出差共用 Trip、成員、行程與文件資料，不建立三套互不相連的資料。
2. 桌機負責規劃、核對、批次整理與匯出；手機負責今日行程、拍照上傳、補資料與確認例外。
3. 報支項目、報支幣別、國家、城市與機場是公司固定主檔。任何真人角色都不得新增、修改或刪除。
4. 固定主檔驗證必須同時存在於 UI、API、OCR、匯入、背景工作與資料庫層。
5. 原始交易資料不可被申報資料覆蓋。非白名單幣別須保留原始幣別與金額，並提醒只能以 TWD 申報。
6. 同一報支項目若申報幣別不同，彙總、Excel 與 ZIP 必須分行、分組。
7. 同行者共編行程，但每個人的信用卡、文件、報帳與缺件狀態維持私有；他人未完成不得阻擋本人。
8. 機票與住宿是 travel order，不是彼此獨立的卡片。正式 travel order 必須以「整張訂單 graph」建立、取代與刪除；任何單一航段不得自行脫離訂單生命週期。

## 二、生命週期入口

| 階段 | 預設入口 | 主要 CTA |
| --- | --- | --- |
| 行前 | 共同行程 | 繼續安排行程 |
| 出差中 | 今日行程 | 拍照／上傳 |
| 回國後 | 我的報帳 | 整理我的報帳 |
| 已完成 | 出差摘要 | 查看／重新下載 |

## 三、執行順序

### Sprint 0：基線、護欄與可追蹤規格

- [x] 固定主檔介面改為唯讀。
- [x] 文件確認與部分 API 改用完整公司報支項目清單。
- [x] 國家、城市與機場辨識使用管理主檔。
- [x] 將本規劃寫入版本庫。
- [x] 建立現有資料與匯出 Golden Dataset。
- [x] 列出所有舊硬編碼、localStorage 與重複規則。
- [x] 登入人員與角色改為伺服器端主檔，管理異動需管理者權限並留下 audit。
- [x] 出差與工作階段寫入正式網址，移除 sessionStorage 選旅程與固定示範旅程端點。

完成定義：現況可重現；資料、權限與輸出規則都有單一文件；後續變更可測試比較。

### Sprint 1：固定主檔與雙幣別資料核心（P0）

- [x] 將報支項目、申報幣別、國家、城市、機場改為版本化唯讀主檔。
- [x] 正式資料只保存主檔 ID／外部代碼，不接受自由文字成為正式值。
- [x] 費用加入 originalCurrency、originalAmount、reportingCurrency、reportingAmount。
- [x] 保存匯率、匯率來源、轉換原因與人工確認狀態的資料欄位。
- [x] 未知幣別不再靜默覆蓋為 TWD；文件確認改為保留原幣並要求 TWD 申報。
- [x] API、OCR、Excel／CSV 匯入共用同一驗證服務。
- [x] 舊資料無法映射時進例外清單，不自動歸類為「其他」。

完成定義：非法主檔值無法寫入；原始幣別不會消失；同一筆資料可完整還原辨識與申報決策。

### Sprint 2：個人卡、手續費與附件關聯（P0）

- [x] 信用卡帳單只作為證明文件，不形成第二筆消費。
- [x] 保存 TWD 實際請款、卡末四碼與帳單附件。
- [x] 國外交易手續費獨立形成「國外交易手續費｜TWD」。
- [x] 日期、店家、原幣、TWD 金額與卡末四碼候選配對；多筆相近時要求人工確認。
- [x] 無法唯一匹配時進待確認。
- [x] 一般非 travel 費用／文件可使用後端 soft delete、復原與 audit log；正式機票／住宿改為 permanent whole-order delete，不進 travel trash、不允許 restore。

完成定義：帳單不重複計費；手續費獨立；一般費用誤刪可復原；正式 travel order 刪除後不得由任何 legacy trash／舊文件重新復活。

### Sprint 3：正式彙總與輸出（P0）

- [x] 共用 groupKey = 公司報支項目 + 申報幣別；同項目不同幣別強制拆行。
- [x] Excel 包含報支彙總、費用明細、信用卡與手續費、缺件與附件索引。
- [x] ZIP 依報支行次建立「序號_項目_幣別」資料夾。
- [x] 產生 manifest，保存費用、附件、原始檔名與標準檔名對照。
- [x] ZIP 內彙總、明細、manifest 與附件使用同一次 server-side export snapshot。

完成定義：相同項目不同申報幣別必定拆行；Excel、ZIP、明細與附件 100% 對應。

### Sprint 4：響應式骨架與 Design System（P0）

- [x] 移除首頁中已被正式工作台取代、但仍留在 bundle 的舊 Prototype 元件與示範資料。
- [x] 將歷史重複 CSS 依頁面模組拆分並移除失效選擇器。
- [x] 將全站 Design System 與四段響應式骨架抽離為獨立樣式模組。
- [x] 統一 Typography、Spacing、Control、Radius、Color tokens，並建立最終優先層避免縮放時字級跳動。
- [x] 收斂核心工作台為四段：≥1440、1200–1439、900–1199、<900。
- [x] 桌機主欄使用 minmax(0, 1fr)，右欄不足寬度改 Drawer。
- [x] Header、Dialog、Popover、Bottom Sheet 與 Safe Area 使用一致高度、圓角與裝置邊界規則。
- [x] 資料重新載入使用穩定 callback，避免共同行程或文件更新後讀到舊旅程狀態。

完成定義：1024、1280、1440、1920px 無整頁水平捲動；右欄不壓縮主工作區；字級比例一致。

### Sprint 5：PWA 收件匣與 OCR Pipeline（P0）

- [x] 拍照後先存 IndexedDB，一秒內顯示「已保存，辨識中」。
- [x] 建立 client job ID 與 retry queue；一般費用附件維持離線 queue；travel 上傳必須在線取得新的 server document ID，離線不背景補傳。每次 travel 重傳都建立新的 document ID。`contentHash` 僅保留作稽核與清除歷史 byte-identical ghost copies，不得用來重新載入／重用舊 travel document。
- [x] 一般費用離線可繼續拍照，背景同步或恢復連線後續傳；travel 離線時明確要求恢復連線後重新上傳。
- [x] 圖片方向校正、長邊縮至 2200px、壓縮與清晰度檢查後再 OCR；模糊時要求人工確認。
- [x] PDF 優先讀文字層；無文字層的掃描檔明確標示待確認；圖片 OCR worker 跨檔案重複使用。
- [x] OCR 保存 raw text、candidate、confidence、mapping reason 與 confirmed value。

完成定義：手機兩次點擊內完成上傳；一般費用一秒內獲得保存回饋且離線重啟後可續傳；travel 離線不產生失聯文件；重新上傳同檔案不得讓已刪除 travel order 回魂。

### Sprint 6：桌機工作台與 IA 重排（P1）

- [x] 共同行程中間為大型 Excel 工作區，右側集中機票、住宿、出差單、網路、完成度與補休。
- [x] 報帳中間為費用流水帳，文件、缺件、信用卡與輸出放右側。
- [x] 同行者訂單比較放主區底部，不塞右欄；比較單位為 source order，不是每個航段一張重複訂單卡。
- [x] 全天與住宿置頂；預設顯示 08:00–22:00。
- [x] 行程與費用長列表只渲染可見內容。

完成定義：核心資料始終在中間；使用者不必在卡片堆裡尋找下一步。

### Sprint 7：手機 Today Mode（P1）

- [x] 手機不再顯示縮小 Excel，改為日期切換＋單日時間軸；進入行程時優先定位今天。
- [x] 全天與住宿置頂，活動使用 Bottom Sheet 編輯。
- [x] Bottom Navigation 在首頁、空狀態及捲動中都固定存在；未選出差時提示先選擇，不讓導覽消失。
- [x] 報帳首屏只顯示上傳、最近上傳、待確認、缺件與今日費用。
- [x] 匯出、信用卡與完整文件匣收進「更多」；批次匯出留在電腦版。

完成定義：390px 可順暢操作；導覽不消失；手機首屏沒有管理、完整匯出或大型表格。

### Sprint 8：遷移、資料完整性、壓力測試與分階段發布（P1）

- [x] 舊資料 mapping 與 migration exceptions。
- [x] 新舊加總雙讀比較。
- [x] 31 天行程、多成員、1,000 筆費用與大量附件測試。
- [x] iPhone Safari、Android Chrome 與 PWA standalone 裝置契約、自動測試與人工驗收矩陣。
- [x] 權限、惡意檔案、私有下載與稽核測試（採登入即時串流，不產生可外流的公開 URL）。
- [x] 逐步啟用與 rollback 技術演練手冊。
- [x] Travel order 改為 whole-order lifecycle：任一航段／travel 文件／travel 費用刪除都永久刪除完整 graph；legacy trash 不得復活。
- [x] Travel 確認同步使用 replace lifecycle；同類舊訂單 graph 與新訂單建立在同一 D1 batch 內完成，不 append 半套資料。
- [x] R2 正式附件刪除先做 bounded retry；DB graph 刪除時同 batch 建立 pending object deletion tombstone，失敗 key 保持可追蹤並於後續 travel 操作重試，成功後才清 tombstone。
- [ ] 內部真人試用（需由具 Sites 權限的測試帳號依 `docs/DEVICE_QA.md` 執行）。

完成定義：零未追蹤孤兒附件；所有 storage cleanup failure 都有 tombstone／attempt 記錄；零未知資料被靜默轉換；travel order 無 ghost／無 restore；完整可回滾。

### 2026-08-18 Travel Order Lifecycle Amendment（P0，不得回歸）

1. 每次上傳都建立新的 document ID；重新上傳不得指向已刪除 document。
2. 一張機票訂單可包含任意多個實際航段；每一航段必須保存自己的 departure → arrival 日期、時間與機場。
3. 來回／多航段只形成一筆整張機票報支金額，不得因航段數重複計價。
4. 點任一去程、回程、轉機航段、travel 文件或其 travel expense 的刪除，都代表永久刪除完整 source order graph。
5. Travel order 不使用 soft delete restore；legacy trash API 不得復活 travel booking、travel document、agenda 或 travel expense。
6. 「確認並同步」不是 append；必須以 whole-order replace 取代本人同類舊 travel order，並讓所有相關 panel 重新載入。
7. 住宿行程以入住日 15:00 作為 startsAt、退房日 11:00 作為 endsAt；城市與地址可選填，不得阻擋同步。
8. `contentHash` 不是訂單身份。它只能用於稽核及刪除歷史 byte-identical ghost copies，不得用來載入舊 order 成為 active source。
9. 正式 travel attachment 的 D1 graph 刪除與 object deletion tombstone 必須同 batch；R2 失敗只能形成「已追蹤待清理」，不得形成無記錄 orphan object。
10. Travel booking 的完成狀態由正式 booking evidence 管理，使用者不能靠手動勾選 TODO 偽造已完成。

## 四、桌機與手機 IA

### 桌機

- 我的出差：日期、地點、階段、本人完成度、缺件及單一主要 CTA。
- 共同行程：大型行程表＋右側工具欄。
- 我的報帳：中間費用流水帳＋右側上傳、待確認、缺件、信用卡及輸出。

### 手機

- 固定 Bottom Navigation：出差、今日、＋上傳、待辦、我的。
- 今日頁：日期切換、下一站、全天、住宿與單日時間軸。
- 報帳頁：大型上傳、最近上傳、待確認、缺件與今日費用。

## 五、驗收護欄

1. 所有點擊區至少 44×44px。
2. 同行者不可查看他人的卡號、帳單、收據與個人報帳。
3. 他人未完成班機或住宿不得阻擋本人。
4. 來回多航段只計一筆整張機票費用。
5. 非白名單原幣保留，申報 TWD，且必須顯示原因。
6. 帳單附件不重複建立消費；手續費獨立為 TWD。
7. 報支表、明細、ZIP 與附件索引的組別、順序與金額一致。
8. 刪除任一 travel 航段後，同張 source order 的所有航段、agenda、travel expense、正式文件與可見附件必須一起消失。
9. 刪除後重新上傳相同檔案，必須得到新的 document ID；不得載入舊 travel order。
10. 新文件確認同步後，共同行程只保留新 source order 的航段／住宿，不得同時存在新舊版本。
11. 住宿必須以 15:00 check-in 與 11:00 checkout 形成行程；PDF 其他時間戳不得覆蓋這兩個時間。
12. R2 刪除失敗不得留下無追蹤 object；failed object key 必須存在 pending deletion tombstone 並可後續重試。

## 六、北極星指標

- 出差中單據即時上傳率。
- 平均上傳點擊數。
- OCR 後人工修改率。
- 回國後待確認及缺件筆數。
- 信用卡帳單自動配對率。
- 人工重新命名時間。
- 回國至完成報帳的平均時間。

首要指標：使用者回國後完成一趟報帳所需的人工時間。
