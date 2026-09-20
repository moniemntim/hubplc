---
title: HMI品質Bad如何避免把舊值誤認新值
description: 以 value、quality、source/receive timestamp 與 age 分離新鮮度，避免 HMI 把 Bad 狀態的舊值當成新測量。
date: 2026-09-21
author: 站長
draft: false
category: HMI 畫面與操作
---

## 數值 品質與時間必須一起看

HMI 顯示 25.3 並不代表這個數值剛由設備可靠量到。通訊中斷時，系統可能暫時保留 last good；若畫面只顯示數字，操作員會把舊值誤認為新測量。每個資料點至少要一起處理 value、quality、source timestamp、receive timestamp 與 age。

OPC UA DataValue 的 Bad 狀態不是正常 measurement；依資料品質規則，Bad DataValue 內的 Value 不應當成本次有效量測。Bad 可能包含伺服器錯誤、感測器失聯、資料不可用或轉換失敗等不同原因；顯示層應保留原始 StatusCode，另存 lastgood 值與時間，不能把所有 Bad 改寫成零，也不能因 value 欄仍有數字就標成 Good。

last good 是暫存的最近一次可用值，不是本次新值。介面要明示它的取得時間與目前 age，例如「25.3，Good 於 10:00:00；目前 Bad，已 18 秒」。來源時間反映設備採樣，接收時間反映主機收到；兩者混用會造成錯誤新鮮度判斷。

本文採通用資料設計，不聲稱 Q 系列 PLC、HMI 或 OPC UA 客戶端一定有相同 API。品質名稱、status code 與失效策略要依實際產品文件確認；以下畫面規則用來教學和離線驗收，不替代安全聯鎖、警報或製程風險評估。

控制邏輯與顯示邏輯要分開。畫面可以保留 last good 供人員比較，但啟動、停機或限值判斷只接受符合品質、年齡與來源條件的新資料。若需求允許短時間 hold，必須寫出最長秒數、顯示方式與逾時後動作，不能由操作員自行猜測。

年齡門檻應按資料用途分開設定。控制用溫度可能只接受兩秒內的 Good，趨勢檢視則可保留更久的 last good 但明確標示過期。不能用一個全域 timeout 套用所有點位；設定改變時也要記錄版本，讓日後知道畫面何時開始判定資料過期。

交班時也要保留狀態轉換時間，避免只抄最後一個數字。

## 把 Bad 原因分層而不是覆寫數值

可將資料狀態分為 Good、Uncertain、Bad，並另存自訂原因 ServerUnavailable、SensorFailure、TypeMismatch 與原始 StatusCode。ServerUnavailable 只是本案例的分類，不是假造的 OPC UA 標準碼；來源斷線時保存原始 Bad StatusCode，再映射到這個原因供畫面與排查使用。

失敗時不要把 Bad DataValue 的 Value 寫入正常值欄；畫面若要顯示最近可見值，應從另外保存的 lastgood 與 last_good_time 讀取，並伴隨 quality=Bad 或 Uncertain 與抵達後經過時間。若需求是完全不顯示舊值，可在 Bad 時顯示「不可用」，但不可把空白、零或固定替代值當成新測量寫回資料源。原始狀態仍要留在記錄。

例：10:00:00 收到 25.3、Good；10:00:05 伺服器失聯；10:00:12 HMI 仍畫出 25.3。正確結果是數字旁出現 Bad、抵達後經過 7 秒與斷線原因；只有來源時間也明定、時鐘可信時，才可宣稱 source age。控制邏輯不得把它當作 10:00:12 的溫度。恢復時要等新鮮且品質良好的更新，再轉回 Good。

不同 Bad 原因會影響排查方向。若自訂原因是 ServerUnavailable，先查伺服器連線與狀態；若是 SensorFailure，查設備與配線；若是 TypeMismatch，查資料型別與轉換。三者都要另存原始 StatusCode。把所有原因合成一個紅色錯誤，會失去修復線索。

驗收時故意讓伺服器先送 Good，再送 Bad，最後送一筆時間較舊但數值不同的 Good。不能一律拒絕舊 timestamp：先確認同一可信 epoch、來源時鐘與 sequence；若三者可判定為舊資料才拒絕，若校時或重啟造成時間倒退則標為待判定。這個案例能抓到單看數值而忽略品質與時間的錯誤。

批次匯出也要帶 quality 與時間欄位，不能只存顯示過的 value。若報表只剩 25.3 而沒有 Bad 記號，事後無法分辨設備穩定或通訊中斷。匯出格式應保留原始 status、來源識別與收取時間，並對未知時間明確留空。

## 以灰階 文字與趨勢缺口表達品質

顏色只能作輔助，不能是唯一品質訊號。Good 可用正常文字與數值；Uncertain 可用斜線或警示圖示加文字；Bad 應以灰階、斜線、狀態文字與原因同時表示。色盲、黑白列印或告警燈故障時，使用者仍要看出資料不可用與最後更新時間。

趨勢圖對 Bad 區段應形成 gap，不要插入零，也不要用前一筆值延長成水平線，除非圖例清楚標為 hold-last-good。零可能是合法量測，插零會製造假的下降；延長舊值則會製造設備仍穩定的假象。每個點可攜帶 quality 供游標檢視。

恢復案例：25.3 Good 後連續五秒 Bad，再收到 25.7、Good。趨勢應在五秒處留缺口，恢復點從 25.7 接續；不應把缺口補成 0 或五個 25.3。正常結果是操作員能分辨來源停止、舊值保留與新值恢復，失敗結果則是曲線看起來無縫而掩蓋斷線。

顯示 age 時使用單調時間計算等待多久，外部報告再附 wall-clock。若來源 timestamp 倒退、時鐘未同步或 age 無法可信，顯示「年齡未知」與原因，不應顯示一個看似精確的負數或零。

## 驗收與適用限制

離線測試至少包含 Good 初值、原始 StatusCode 映射為 ServerUnavailable、SensorFailure、TypeMismatch、Uncertain、恢復 Good、來源時間缺失與合法零值。檢查數字旁是否有品質文字、last good 時間與抵達後經過時間；檢查趨勢是否留缺口；檢查 Bad 是否阻止下游把舊值當新命令。

每次品質轉換都要記錄 source timestamp、receive timestamp、原始 StatusCode 與自訂原因。限制在於不同伺服器對 Bad substatus、伺服器狀態與時間語意可能不同，必須依官方文件映射。產品行為依官方文件與目標環境核對。

若畫面需要顯示 last good，應把它與目前接收狀態放在同一個元件內，例如「25.3（舊值）」和「Bad，來源 18 秒前」。不要讓數字留在正常輸入框而把品質藏在另一個頁籤；使用者在快速操作時只看得到數字，仍會把它當成可控制資料。

操作員確認告警不等於資料恢復 Good。ack 只表示人看過原因，品質仍由來源狀態與新鮮度決定。畫面可分別顯示已確認的 Bad、尚未確認的 Bad，以及已恢復的 Good，避免人工確認動作意外改寫資料品質。

## 常見問題與官方參考

FAQ1：Bad DataValue 的 value 可以當作最新值嗎？答：不可以；Bad 時忽略該 Value，另讀保存的 lastgood 並標示品質、時間與原因。零也不能當通用錯誤替代值。

FAQ2：last good 可以繼續畫成水平線嗎？答：只有在圖例明確標示 hold-last-good 且不供控制使用；一般趨勢應用缺口表達未知。

FAQ3：只有畫面變灰就足夠嗎？答：不夠，還要有文字、原因、更新時間或 age，避免只靠顏色判斷。

FAQ4：收到新數字就能恢復 Good 嗎？答：不能，還要確認來源品質、狀態代碼、時間與資料點對應正確。

參考：[OPC Foundation OPC UA Part 4 Services，DataValue 的 StatusCode、SourceTimestamp 與 ServerTimestamp 官方參考。](https://reference.opcfoundation.org/specs/OPC-10000-4/7.11.5)

參考：[OPC Foundation OPC UA Part 8 Data Access，資料品質與狀態語意的官方參考。](https://reference.opcfoundation.org/specs/OPC-10000-8/7.3)

重連後第一筆資料也不能只因格式正確就轉 Good。要核對資料點名稱、來源識別、epoch、sequence、時間是否合理、品質是否明確以及是否超過允許年齡。若原始 StatusCode 表示伺服器不可用，映射原因寫 ServerUnavailable；畫面可顯示最近數值供診斷，但控制流程必須拒絕這筆資料，直到有效更新完成。

報表與趨勢游標也應顯示品質，不要只在即時畫面加註。這樣交班或事故回放時，工程師仍能知道哪一段是實測、哪一段只是暫存舊值。

## 延伸閱讀

- [多警報如何按嚴重度與時間穩定排序](/articles/alarm-severity-time-stable-order)
- [趨勢游標插值與原始點](/articles/trend-cursor-interpolation-raw-points)
