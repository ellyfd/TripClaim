# TripClaim 時區資料模型建議

目的：跨國航班、住宿、會議在 Calendar 顯示時，同時保留「使用者看到的當地時間」與「系統可正確計算的絕對時間」。

## 核心原則

1. 不使用「整趟 Trip 單一 timezone」處理跨國 travel。
2. 每個時間點保存 local datetime + IANA timezone；UTC 為衍生／索引用絕對時間。
3. 航班 departure 與 arrival 必須各自有 timezone，不能共用一個 `timezone` 欄位。
4. Calendar 顯示 event-local time；航班 travel band 的幾何長度不可被解讀為真實飛行時數，真實 duration 以 UTC 計算並明示。
5. DST 必須由 IANA timezone 規則決定，不把固定 `UTC+N` 當 canonical timezone。

## Flight canonical fields

- departureLocalAt
- departureTimezone（例如 `Asia/Taipei`）
- departureUtcAt
- arrivalLocalAt
- arrivalTimezone（例如 `Europe/Amsterdam`）
- arrivalUtcAt
- originAirportCode
- destinationAirportCode

可衍生：

- actualDurationMinutes = arrivalUtcAt - departureUtcAt
- departureUtcOffset / arrivalUtcOffset（只做顯示／audit，不做 canonical identity）

## 顯示規則

航班卡／travel band 必須同時顯示：

`CI73 TPE → AMS`
`11/03 23:15 TPE (UTC+8)`
`→ 11/04 07:50 AMS (UTC+1)`
`實際飛行 15h35m・時差 -7h`

Calendar 日欄仍採各 event 的當地日期／時間。跨時區航班是 connector / travel band，不以畫面高度直接代表 elapsed duration。

## Amsterdam regression

2026-11-03 / 11-04：
- TPE 23:15，Asia/Taipei UTC+8
- AMS 07:50，Europe/Amsterdam UTC+1
- 實際 elapsed duration：15h35m

2026-11-06 / 11-07：
- AMS 15:35，Europe/Amsterdam UTC+1
- TPE 10:40，Asia/Taipei UTC+8
- 實際 elapsed duration：12h05m

## Migration direction

目前 `travelBookings.timezone` 單欄不足以完整表示跨時區 flight。後續 migration 應 additive：先新增 departure/arrival timezone + UTC 欄位，舊 `timezone` 暫時保留 compatibility；完成 backfill 與 read migration 後再決定是否 deprecate。
