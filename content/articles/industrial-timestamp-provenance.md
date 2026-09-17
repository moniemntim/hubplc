---
title: 工業記錄時間戳與時鐘校正的追溯
description: 分開設備、接收與寫入時間，用慢十八秒案例說明原始時間、版本化校正與不確定度。
date: 2026-09-17
author: 站長
draft: false
---

## 三種時間先分開記錄

工業記錄至少要分開 device time、server time 與 receive time。device time 是設備產生資料時的時鐘，server time 是伺服器寫入或接收服務處理時的時鐘，receive time是本案例接收服務記下收到訊息的時刻，不保證等於網卡收包時刻。三者相同時很方便，不同時若只留一欄就失去追溯能力。

本例 PLC-A 的 device clock 比 server 慢 18 秒。設備在本地 10:00:00 產生壓力 2.40 bar，封包於 server 10:00:18.120 收到，資料庫在 10:00:18.150 寫入。記錄 raw_device_time、server_received_at、server_stored_at、clock_offset_estimate 和 offset_uncertainty；校正後時間只能是衍生欄，不可覆蓋原始值。

時間資料模型應把四個問題分開回答：事件何時在設備發生、何時到達通訊端、何時被伺服器接收、何時寫入資料庫。server_time 與 receive_time 在某些架構可能只差數毫秒，但不能因此合併欄位。保留欄位名稱和來源，後續才能判斷延遲是設備、網路、佇列還是資料庫造成。

| 欄位 | 案例值 | 意義 | 可否覆寫 |
| --- | --- | --- | --- |
| device_time | 10:00:00 | 設備來源時刻 | 不可 |
| receive_time | 10:00:18.120 | 通訊收到時刻 | 不可 |
| server_time | 10:00:18.150 | 伺服器寫入時刻 | 不可 |
| offset_estimate | +18 s | 校正推估 | 可新增版本 |
| uncertainty | ±0.2 s | 估計不確定度 | 不可省略 |

## ISO 8601 與時區格式

ISO 官方說明以年、月、日、時、分、秒及毫秒形成可理解的日期時間表示，並可表示 UTC、帶 offset 的本地時間與區間。本案例要求所有交換時間使用 `YYYY-MM-DDThh:mm:ss.sss±hh:mm`，例如 `2026-09-17T10:00:00.000+08:00`；資料庫另保存 UTC 正規化值，方便跨站排序。

不要把 `10:00:00` 當成完整工業時間，因為缺少日期與時區。也不要看到 +08:00 就推論設備已校時；offset 只表示寫入該值的時區語意。若設備只給無時區字串，先標記 timezone_unknown，再由站點設定或同步紀錄補充，不可默默套用伺服器時區。

同步事件的 offset 估計要說明方向。若 server 觀察到 device_time=10:00:00.000、receive_time=10:00:18.120，記錄 `server_minus_device_observed=18.120s`；若另有 120 ms 傳輸延遲估計，採用 clock offset 可能是 18.000 s，而不是直接把 18.120 s 寫成校正值。所有估計都附 measurement_id 和方法版本。

時間戳的精度不應超過來源能力。設備只提供秒級時，資料庫雖可寫入毫秒欄位，也只能把未提供的位數標為未知，不可用 `.000` 假裝量測到毫秒。receive_time 可以是毫秒級，但 device_time 的精度仍獨立標示。

在報表中把時間來源做成欄位而非註解，例如 `time_basis=corrected_device` 或 `time_basis=receive`。操作員改變排序依據時，匯出檔也應保留 basis、offset_version 和 uncertainty，讓另一位工程師能重現畫面結果。

若資料延遲超過服務門檻，品質標記應反映接收延遲，而不是把 device timestamp 改成現在時間來掩飾問題。

若現場只能使用伺服器時間，系統仍可保存事件，但品質必須為 SourceMissing，報表標題也要說明排序依據。等設備補上來源時間後，新增資料套用新規則，歷史資料不應被無聲重算。

| 輸入 | 解析 | 狀態 | 處理 |
| --- | --- | --- | --- |
| 2026-09-17T10:00:00.000+08:00 | 完整 offset | 可排序 | 轉 UTC 並保留原文 |
| 2026-09-17T02:00:00.000Z | UTC | 可排序 | 與 +08:00 同一瞬間 |
| 2026-09-17 10:00:00 | 無 offset | 不完整 | 標記 unknown |
| 10:00:00 | 只有時間 | 不可追溯日期 | 拒收或補上下文 |

## 18秒差的校正與不確定度

用同步事件估計偏移：server 在 10:00:18.120 收到 device_time=10:00:00.000 的樣本，先得到約 +18.120 秒的觀測差；若網路延遲估計為 120 ms，不能把全部差額都當成時鐘差。可用多筆往返或已知時間脈衝估計 offset，並保存估計方法、採樣時間與不確定度。

若工程上決定用 +18.0 秒校正，衍生 corrected_device_time=10:00:18.000，且 uncertainty 至少包含估計誤差與傳輸延遲假設，例如 ±0.2 秒。排序時先使用 corrected time，但同一時間再用 receive_time、sequence 做穩定排序。任何圖表都應能切換 raw device time 與 corrected time，避免修正值取代證據。

資料庫索引可用 UTC 正規化時間與 device_id、boot_id、sequence 組合，但顯示畫面仍應讓人看到原始時刻與時區。跨日或夏令時間切換時，不能只用本地字串排序。相同 device_id 重啟後 sequence 可能重新從零開始，必須以 boot_id 或明確的 clock generation 區分，不可把新資料判成重複。

排查時把時鐘問題與資料排序問題分開。先畫 raw device、receive、stored 三條線，再套用校正版本；若排序改變，報表必須顯示採用哪個版本。不要因校正後順序較符合直覺，就刪除原始順序或重寫事件時間。

當校時服務重新建立 offset，不能把新offset無條件套到舊事件；保留舊offset_version，新資料按適用時間套用。若有證據需重新校正歷史，另產生衍生版本並保留原報表。這避免歷史趨勢在每次校時後移動，造成稽核人員無法重現原來的報表。

| 項目 | 數值 | 解釋 |
| --- | --- | --- |
| 原始 device | 10:00:00.000 | 不可改寫 |
| server receive | 10:00:18.120 | 包含傳輸與處理前延遲 |
| 採用 offset | +18.000 s | 本案例衍生設定 |
| corrected | 10:00:18.000 | 只供比較/排序 |
| 不確定度 | ±0.200 s | 不得顯示成精確真值 |

例如校正後事件A為10:00:18.000±0.200秒，事件B為10:00:18.100±0.200秒，兩者可能區間重疊，無法確定實際先後。畫面可為穩定呈現而按ID排序，但應標為順序未定，不能將穩定排序當作物理順序證據。

## 事件追溯與故障排查

建立一筆事件後，查詢頁應同時顯示 event_id、device_time、receive_time、stored_at、clock_offset_version、sequence 和 raw payload hash。操作員看到壓力超限時，先確認來源時間是否前進，再看封包收到時間，最後比較伺服器寫入延遲。若 device time 倒退 3 秒而 receive time 正常，應標記時鐘/重啟疑慮，不要依伺服器時間把原始資料改寫。

驗收三條時間線：正常同步、設備慢 18 秒、設備重啟回到較早時間。正常時 source 與 receive 差值落在預設範圍；慢 18 秒時 raw 保留、corrected 可查且顯示不確定度；重啟時 sequence 或 boot_id 變更，排序不刪除事件。若只有 server time 可用，品質狀態應明示 source time unavailable。

若設備在 10:00:00 產生告警，10:00:18 收到；另一設備在 10:00:10 產生告警，10:00:11 收到，事件排序要依既定目的決定。物理發生順序只能在校正時間的不確定度足夠小且區間不重疊時判定，但操作員看到的通訊處置順序應另列 receive time。報表同時列兩種排序鍵，避免把監控延遲誤認為製程因果。

ISO 官方頁面說明 UTC、offset 與時間區間的表達用途；本文的資料庫欄位、offset 估計、品質旗標和重啟處理則是離線自訂設計，需依實際設備與同步服務另行驗證。

正式上線前以固定離線檔重播至少一次，保存輸入 hash、解析結果和報表輸出 hash。若同一檔案在重新匯入後 corrected time 或排序改變，應先停用報表發布並查 offset version，而不是接受新的結果覆蓋舊稽核證據。

驗收結果與原始證據一併歸檔。

| 故障 | 觀察 | 處置 | 預期結果 |
| --- | --- | --- | --- |
| offset 約18 s | 差值穩定 | 保留 raw 並建立 offset 版本 | 可追溯且可排序 |
| device time 倒退 | sequence/boot_id 改變 | 切新時鐘世代 | 不覆蓋舊事件 |
| receive 延遲突增 | device time 正常 | 查網路/佇列 | source 不被改寫 |
| 缺 source time | 只剩 server | 標記缺來源 | 報表顯示限制 |

## FAQ 限制與官方查核

驗收可用離線資料重播：先放入正常三筆，再插入 offset 改變、sequence 重置、缺 source time 三筆。結果應保留所有 raw payload，產生品質旗標 ClockUncertain、SourceMissing 或 NewBoot，並可由 event_id 找回原始封包。若只剩 corrected 值而找不到 raw，驗收應判失敗。

時鐘同步狀態本身也要記錄，例如 offset_version、last_sync_at、sync_method 和 sync_quality。若 NTP 曾失聯，不能沿用上一個 offset 卻標成高精度；應讓後續衍生時間帶有 Uncertain 狀態，直到新的同步樣本通過門檻。

同一事件的 event_id 應與原始 payload hash 關聯，查詢時可由衍生 corrected time 追到原始 bytes。若資料經過批次轉送，另保存 gateway sequence 和 batch receivedAt，避免資料庫寫入時間被誤當成感測事件時間。

跨時區查詢時先把完整 offset 時間轉成 UTC instant，再按 device/sequence 做穩定排序；畫面可顯示站點本地時間，但匯出仍要保留原 offset。

驗收報告要列出每筆資料的 raw source、校正後值、採用的 offset version 和 uncertainty，並把設備重啟造成的 boot generation 變更單獨標示。這樣稽核者能知道數值如何來自原始封包，而不是只看到一個看似精確的時間。

FAQ1：server 收到時間能否取代 device time？不能；它只能說明資料何時到達伺服器。

FAQ2：18 秒差是否全部都是設備時鐘差？不一定，還包含傳輸與排隊延遲，必須估計不確定度。

FAQ3：校正後時間能否覆蓋原始欄位？不能，校正值應是帶版本的衍生欄。

FAQ4：ISO 8601 字串有 offset 是否代表已完成時鐘同步？不代表，它只是時間表示格式。

限制：本文的 +18.0 秒、±0.2 秒與三條時間線是離線驗收案例，不是任何設備的保證規格。正式系統需依 PLC、閘道、NTP/PTP、資料庫精度與通訊延遲設計採樣和同步方案。

參考：[ISO 8601 — Date and time format（ISO 官方頁說明年月日、時分秒、UTC、offset、時間區間）](https://www.iso.org/iso-8601-date-and-time-format.html)

參考：[RFC 3339 Date and Time on the Internet（IETF 官方規範，供網路時間戳格式化查核）](https://www.rfc-editor.org/rfc/rfc3339)

## 延伸閱讀

- [工業 CSV 欄位規格與匯入驗收](/articles/industrial-csv-column-contract)
- [CSV 的空值 零值和無效值怎麼分開記錄](/articles/industrial-csv-zero-missing-invalid-quality)
