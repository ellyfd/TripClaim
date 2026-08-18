# TripClaim 分階段發布與回復手冊

## 發布閘門

- 程式：lint、build、全部測試與 CSS audit 通過。
- 資料：migration 為 additive；未知主檔值進例外佇列，不靜默轉換。
- 裝置：完成 `DEVICE_QA.md` 的自動檢核；內部測試帳號完成手機 smoke test。
- UAT：完成 `UAT_RELEASE_RECORD.md`，記錄 Sites version、GitHub main SHA、migration、具名測試人、travel whole-order lifecycle、storage health、48h 觀察與 Go／No-Go。
- 安全：附件只經登入授權串流，回應使用 `private, no-store` 與 `nosniff`。
- 人員：通過 Sites 登入後由 TripClaim 自動建立一般使用者；停用帳號不可再次自動建立。
- Storage：系統管理 → 系統健康可查看 pending object deletion；正式 travel 刪除不得產生無追蹤 R2 object。

## 漸進啟用

1. 內部 3–5 人：各完成一趟「行前 → 旅途中 → 回國後」演練，並至少一人完整填寫 `UAT_RELEASE_RECORD.md` 的 travel order 刪除／同檔重傳流程。
2. 觀察 48 小時：上傳失敗率、OCR 待確認率、pending storage cleanup、匯出差額皆為可接受範圍；數據填入同一份 UAT release record。
3. 每個觀察時段由管理者開啟「系統管理 → 系統健康」：記錄 pending 數量、最舊等待時間與最高 attempts。正常情況應回落至 0；若短暫出現 pending，可先執行「重試待清理附件」。
4. 僅在 UAT 最終決策為 GO 時擴至一個部門；保留舊流程作為短期備援。
5. 指標穩定後全面啟用；舊流程僅唯讀查詢。

## Storage cleanup 判讀

- **正常**：pending = 0，或短暫出現後在後續 travel 操作／人工重試後回到 0。
- **需觀察**：pending 未增加但最舊等待持續超過一個觀察週期；記錄 attempts 與最後錯誤後重試。
- **停止擴大**：pending 持續增加、最舊等待超過 24 小時仍未清除，或同一筆 attempts 持續上升。這代表 R2 cleanup 已不是瞬時錯誤，需要先處理 storage／權限／服務異常。
- 系統健康頁不得顯示實際 object key；管理者只需看到 owner、Trip、來源、等待時間、attempts 與最後錯誤。

## 停止條件

- 任一使用者可讀到他人的個人附件或卡片資料。
- 報支總額與明細不一致。
- 原始幣別或原始文件遺失。
- 上傳成功卻沒有文件或費用紀錄。
- PWA 重啟後一般費用離線佇列遺失。
- Travel order 刪除後仍可在 UI／legacy trash 復活。
- 同一 travel 檔案刪除後重傳沒有取得新的 document ID，或同步後新舊 order 同時存在。
- 機票實際航段漏讀、departure／arrival 日期時間錯誤，或住宿不是 15:00 check-in／11:00 checkout。
- Pending storage cleanup 持續增加或最舊項目超過 24 小時仍無法清除。

出現任一條件即停止擴大，保留資料並執行回復或修復；不得用手動刪資料掩蓋健康指標，也不得在 UAT record 上勾選 GO。

## 回復演練

1. 記錄目前 Sites `version_id`、GitHub main SHA、資料 migration 版本，以及系統健康 pending 數量。
2. 從 Sites 部署紀錄選擇前一個已成功且通過驗收的版本重新部署。
3. 不回滾資料庫 schema；新欄位保持向後相容，舊版忽略即可。`pending_object_deletions` 亦保留，避免回復版本時遺失未完成的 storage cleanup 記錄。
4. 驗證登入、我的出差、文件下載、既有費用與匯出。
5. 回復後重新檢查系統健康；若 pending 仍存在，由修復版本處理，不直接清空 tombstone。
6. 對失敗版本建立修復分支；修復通過完整閘門後建立新的 `UAT_RELEASE_RECORD.md` 驗收紀錄，再漸進發布。

正式回復會切換生產版本，只有在事故或獲得產品負責人明確授權時執行；日常發布只做流程演練與前一成功版本可用性確認。
