---
title: NTP失敗時如何判定時間品質
description: 以synchronized、holdover、unsynchronized與20ppm×3600秒案例建立NTP失效時間品質、漂移不確定度及step/slew恢復記錄。
date: 2026-09-21
author: 茂伯
draft: false
category: 工業通訊與網路
---

## 一 用本地證據定義時間品質

NTP 失敗時不要只看 stratum 判定時間準確度。本文把時間品質分為 synchronized、holdover、unsynchronized，依本地 last_sync_age、offset、dispersion、來源可達性與校驗結果決定。stratum 是來源層級資訊，不是本機目前誤差的直接上限；設備可能顯示低 stratum 但已很久沒有同步。

每個事件保存 wall_clock、receive_time、sampling_time、clock_epoch、quality 與 correction。本地receive_monotonic可用來算抵達後年齡，不能自動包含來源到接收的傳輸時間，wall_clock 用於對外時間；兩者不能混成因果證據。NTP unavailable 不代表必然立刻跳時，可能維持 holdover，也可能在恢復時 step 或 slew，必須記錄實際校正事件。

本案例假設oscillator在指定條件下經驗證的最壞漂移上限為20 ppm、holdover 3600 秒，新增不確定度 20×10^-6×3600=0.072 秒；若同步時 baseline uncertainty=0.010 秒，簡化 bound=0.082 秒。這是已驗證最壞漂移上限 下的案例計算，不是所有時鐘的普遍保證。

| 欄位 | 案例值 | 用途 | 限制 |
| --- | --- | --- | --- |
| quality | synchronized/holdover/unsynced | 控制門檻 | 依本地證據 |
| last_sync_age | 3600s | 同步新鮮度 | 不是誤差本身 |
| offset | 量測值 | 對時偏移 | 需來源有效 |
| dispersion | 估計不確定度 | 誤差背景 | 依實作定義 |
| monotonic_age | 經過時間 | 資料age | 非UTC時間 |

offset 與 dispersion 要保存量測時間和來源，不是每次讀取都覆蓋成最新單值。若來源短暫抖動，保留一段觀測窗口才能判斷是否超過門檻；但品質狀態仍依目前政策及最新有效樣本更新。

來源品質 unknown 時，不要把時間戳改成 0，也不要讓所有資料自動變成現在時間。保留原始時間、接收時間與 unknown reason，讓上層決定是否可用。

## 二 synchronized holdover unsynchronized

synchronized 表示近期同步成功、來源可達、offset/dispersion 在本地門檻內；holdover 表示曾同步但目前無法取得新來源，仍可能暫時使用本地時鐘，資料要增加不確定度；unsynchronized 表示沒有可接受基準或品質檢查失敗，不應把時間當作已校準。門檻由工程規格定義。

last_sync_age 不能單獨決定狀態。同步一秒前但 dispersion 異常，可能仍不可用；同步一小時前但已驗證 oscillator drift、holdover 上限未到，可能仍是 holdover 可用。狀態要由多個證據合成，並把每項 evidence 保存。

資料 age 使用 monotonic_now−monotonic_received 或 monotonic_now−同一時鐘域的monotonic_sample；不要用 wall_clock_now−source_timestamp 直接判斷，因為校時 step 會使差值跳變。跨重啟要增加 clock_epoch，避免新開機的 monotonic 或 wall-clock 與舊資料直接相減。

| 狀態 | 必要證據 | 資料處理 | 恢復 |
| --- | --- | --- | --- |
| synchronized | 近期成功/來源有效/門檻內 | 可依規格使用 | 持續更新 |
| holdover | 曾同步/來源暫失/drift已估 | 附不確定度 | 恢復後驗證 |
| unsynchronized | 無基準或校驗失敗 | 保留但不可用 | 重新建立epoch |
| unknown | 證據缺失/矛盾 | 不填0 | 人工或重新同步 |

holdover 使用資料時，要在輸出旁帶 estimated_uncertainty 與 last_sync_age。下游可以依任務門檻接受或拒絕，而不是看到一個 wall-clock 就自行猜誤差。不同任務可用同一時間源但採不同品質要求。

對生產控制、稽核或追溯，時間品質門檻可能不同。報表可接受 holdover，但安全事件可能要求 synchronized；不能以一個全域布林值替代不同用途的資料政策。

## 三 NTP恢復的step slew與因果

NTP unavailable 後恢復，時鐘可能 step 一次跳到新值，也可能 slew 逐步調整；應以實際校正事件與平台紀錄判定，不預設一定跳時。事件記錄同時帶 wall-clock、receive monotonic、clock_epoch、correction 與 correction_mode，讓工程師知道某時間序列是否跨過校正。

UTC 時間戳可以排序來源事件，但不能單獨證明因果。設備A記錄10:00.100，設備B記錄10:00.050，數字雖將B排在前面，若兩端不確定度大於50毫秒，不能據此判斷真實先後；同一來源可用sequence或單調計數判斷它自己的順序；接收序列只證明抵達先後，跨設備因果仍需請求回覆或其他明確關聯。

恢復後先做新同步驗證，再把狀態從 holdover 轉 synchronized。舊資料不因恢復而重寫；若 step 造成 wall-clock 倒退，保留原始事件時間與 correction event，報表可用 receive_time 排序。slew 則可能使短期 offset 持續變化，也要記錄估計不確定度。

| 時間線 | wall_clock | monotonic/epoch | quality |
| --- | --- | --- | --- |
| 09:00同步 | 09:00.000 | 1000.0/E1 | synchronized |
| 09:30失來源 | 09:30.100 | 2800.0/E1 | holdover |
| 10:30仍失 | 10:30.200 | 6400.0/E1 | holdover+drift |
| 10:31恢復step | 可能跳值 | 6460/E1 | correction event |
| 10:32驗證 | 新UTC | 6520/E1 | synchronized |

step 發生時，wall-clock 可能不單調；receive monotonic 仍可用來計算資料 age。slew 則可能使來源時間與接收時間的差逐步變化，兩者都應在事件紀錄中標明 correction_mode，不能把校正造成的跳變當成製程事件。

若 offset 短時間反覆越過門檻，標 CorrectionUnstable，等待重新同步，不要以平均值掩蓋每次校正。

若重啟造成 clock_epoch 改變，資料年齡與事件排序要先分 epoch。不能把重啟後 5 秒與舊 epoch 的 3600 秒直接相減，也不能以 wall-clock 相等推論同一筆資料。

## 四 漂移估算與實務驗收

驗收案例以 last_sync_age=3600 秒、drift estimate=20 ppm、baseline uncertainty=0.010 秒計算 0.072+0.010=0.082 秒 bound。測試報告要列 drift 的來源、觀測期間、溫度條件與適用範圍；沒有經驗證的最壞漂移上限 就不能把 0.082 當保證值。

故障先查：來源不可達、offset 超門檻、dispersion 超門檻、時鐘服務被停用、網路延遲不對稱、重啟 epoch 與資料來源時間。若只有 stratum 改變而本地 offset/age 未異常，不必立即把資料標無效；若 stratum 正常但 last_sync_age 過期，也不能照樣標 synchronized。

建立三組測試：同步正常、來源中斷 3600 秒、恢復時 step/slew。每筆資料同時記錄 source_timestamp、receive_time、quality、last_sync_age、offset、dispersion、epoch；故意送一筆 source quality unknown，預期保留原值並標 unknown，不改成零或現在時間。

| 測試 | 輸入 | 預期 |
| --- | --- | --- |
| 正常 | 近期sync/offset合格 | synchronized |
| 中斷 | age3600s/drift20ppm | holdover+bound |
| 無基準 | source unknown | 保留原時間/unknown |
| 恢復step | correction event | 記epoch/correction |
| 恢復slew | 逐步offset變化 | 持續驗證後升級 |

若重啟後沒有可信的 epoch 或同步證據，先標 unknown，再重新建立基準；不要把開機時間自動當 synchronized。驗收需包含重啟、網路中斷與來源更換，才能知道時間狀態機是否真的可追溯。

來源更換時要增加 source_id 或 epoch，避免新來源的時間直接接續舊來源而失去校正界線；跨來源比較前先核對各自 offset 與不確定度。

把每次狀態轉換與資料可用性寫進稽核紀錄，包含前一狀態、觸發證據、last_sync_age、offset、dispersion、epoch與操作者策略。如此恢復後若事件時間異常，可以區分來源失效、校時修正與資料排序問題，而不是只看到一個錯誤時間。

驗收結果要保留原始證據，不能只保存最後標籤。

## 五 驗收 FAQ 與來源

本題以 synchronized、holdover、unsynchronized/unknown 的本地證據定義時間品質；stratum 不是準確度保證。案例 20 ppm×3600 秒=0.072 秒，加 baseline 0.010 秒得 0.082 秒 bound，但只有在 drift最壞上限已驗證時才可使用。NTP恢復可能 step 或 slew，需記 epoch、correction、source/receive/sampling time。

若20 ppm只是平均量測或估計值，算出的0.082秒也只能標估計，不能稱保證界限。需要上界時，還需涵蓋溫度、老化、頻率修正與基準不確定度等適用條件，並依工程規格決定何時停止接受holdover資料。

本文的 20 ppm 與 0.082 秒是自訂算例，不能套用所有 PLC、NTP daemon、RTC 或網路設備。實際可用門檻須由設備手冊、校準資料與製程需求決定。

FAQ1：NTP unavailable 是否代表時鐘立刻跳掉？答：不一定，可能 holdover；要看本地 last_sync_age、drift、offset、dispersion 與實際校正事件。

FAQ2：stratum=2 就一定比 stratum=3 準嗎？答：不能直接這樣推論。stratum 是來源層級，當前準確度要看本地證據。

FAQ3：來源時間 unknown 可以填 0 避免空值嗎？答：不可以。保留原始時間或未定義狀態，並記錄 unknown reason。

FAQ4：UTC 時間較早就代表事件先發生嗎？答：不一定。接收順序只代表抵達順序；跨設備因果需有請求回覆等關聯，同來源sequence則只證明該來源次序。

參考：[RFC 5905：NTPv4 協定與時間同步背景，非特定PLC時間品質門檻。](https://www.rfc-editor.org/rfc/rfc5905)

參考：[Python time.monotonic 官方文件：單調時間與經過時間計算參考，非PLC API。](https://docs.python.org/3/library/time.html#time.monotonic)

## 延伸閱讀

- [廣播探索如何維護受控設備清單](/articles/controlled-broadcast-discovery-inventory)
- [連線池大小如何依設備數與回應時間估算](/articles/connection-pool-capacity-device-latency)
