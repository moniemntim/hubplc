---
title: NTP閘道時間同步與事件追溯
description: 以NTP同步UTC為基礎，分清source、received與display時間，計算offset並設計斷線漂移、重新校時跳變與資料品質追溯。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先定義三種時間與offset符號

時間同步問題先不要從時區下手。本文把來源設備產生事件的時間叫sourceTime，把閘道收到封包的本地時間叫receivedTime，把顯示給操作員的時間叫displayTime。UTC是儲存與交換的基準；台北時間是UTC加八小時的顯示規則。NTP只協助主機把UTC時鐘校準，不會替應用程式選擇時區，也不會把資料庫中既有字串自動改成台北時間。每筆資料要保留原始來源時間、接收時間、時區標記與品質。

| 欄位 | 定義 | 用途 |
| --- | --- | --- |
| sourceTime | 設備產生事件時的UTC | 排序與追溯來源 |
| receivedTime | 閘道收到封包時的UTC | 量測傳輸延遲 |
| displayTime | UTC依時區轉出的畫面值 | 操作員閱讀 |
| offset | server UTC−本機UTC | 判斷需向前或向後修正 |

為避免正負號混亂，本篇固定offset等於NTP server的UTC減去閘道本機UTC。若server是12:00:00.400、閘道是12:00:00.000，offset為+400毫秒，代表閘道落後；若閘道是12:00:00.700，offset為−300毫秒，代表閘道超前。工程表單要把定義寫在欄位旁，不能只寫offset=0.4。

設定前先列出所有會產生時間的元件：PLC、閘道、資料庫、HMI與稽核主機。每個元件都要標示時鐘來源、儲存格式、顯示時區與重開機後的初始狀態。若只有閘道對NTP、下游設備仍使用自由運行時鐘，資料品質只能描述閘道本身，不能宣稱整條資料鏈同步。

完成本頁後，讀者應能在設定表分開填NTP server、UTC儲存、Asia/Taipei顯示和offset符號。若產品只提供一個日期欄位，先查手冊是否是UTC或本地時間，再決定轉換，不要靠畫面看起來像正確來推定。

## 三筆事件說明來源時間不能被接收時間取代

本頁假設各來源在事件附近量得offset，定義均為參考server UTC減來源時鐘讀值。要把原始來源時間換算成估計UTC，應計算sourceTime加offset；不是從server再減一次offset。閘道接收時鐘已校準，receivedTime減估計UTC才是延遲估計。所有量測都有誤差，原始時間不可覆寫。

| 事件 | 原source及offset | 估計UTC及received | 延遲估計 |
| --- | --- | --- | --- |
| A開始 | 10:00:00.100／+400ms | 估計00.500／收到00.700 | 200ms |
| B告警 | 10:00:00.220／−300ms | 估計09:59:59.920／收到10:00:00.180 | 260ms |
| A完成 | 10:00:01.100／+100ms | 估計01.200／收到01.350 | 150ms |

表中A開始原始值加400ms得到10:00:00.500，B告警減300ms得到09:59:59.920，因此B估計先發生，與直接排序原始字串得到的結果相反。A完成同理得到10:00:01.200。假設來源offset誤差各±20ms、接收時計時誤差±10ms，延遲誤差保守取±30ms；實際誤差必須由量測依據建立，不能照抄假設。

同一來源可用開機世代與序號保留事件先後；跨來源沒有共同序號，就比較校正時間及誤差區間。兩事件的可能時間重疊時，只能說先後未定，不能拿來源ID字母排序當真實製程因果。若為報表穩定排序而加上ID與接收順序，欄位必須標示那是呈現規則。

趨勢資料也要用同一規則。畫圖可以用轉成台北時間的displayTime，但匯出CSV應保留UTC與原始時區。跨日事件若只存2026/9/17 00:10，讀者無法知道是UTC還是台北時間；改存2026-09-16T16:10:00Z並在畫面轉換，排序和跨系統交換才一致。

## offset 漂移與重新校時的狀態欄位

不要只存最後一次校時結果。可以自訂timeSyncState、lastSyncAt、offsetMillis、serverId、clockStepDetected及clockQuality。UNSYNCED、SYNCING、SYNCED、STALE是本文應用狀態，不是NTP標準回傳列舉。只有本機通過校時條件，不能宣稱下游PLC也同步；age應使用同一主機的monotonic clock，跨重啟則需要另訂恢復規則。

| 狀態 | 判定例 | 資料處理 |
| --- | --- | --- |
| UNSYNCED | 尚無成功校時 | 時間可顯示但禁止高可信排序 |
| SYNCING | 已送出請求，等待樣本 | 保留舊品質並記錄嘗試 |
| SYNCED | offset與延遲在門檻內 | 允許標準時間戳 |
| STALE | 超過規定時間未更新 | 保留值但標記時鐘可能漂移 |

重新同步可能讓時鐘向前跳，也可能向後調整。應用程式不要用校正後的wall clock計算資料age，因為倒退會讓age變成負值；另用單調遞增的monotonic clock計算收到多久。事件時間仍記錄UTC wall clock，但在校時前後加上clockStepDetected與syncSequence，讓歷史查詢知道排序可能受跳變影響。

offset紀錄應保存樣本時間和量測延遲，而不是只存一個目前值。若連續樣本是+400、+420、+415毫秒，可把平均與最大值分開保存；若突然出現−3秒，只能標記offsetAnomaly並要求複核，不能只憑offset突變推論本機真的發生clock step。只有作業系統或NTP客戶端明確回報校正事件，或前後wall clock與monotonic對照證明跳變，才標記clockStepDetected。

偏移門檻必須依設備用途訂定。憑證驗證可能只在有效期邊界附近失敗，historian則可能在數秒漂移後才造成排序疑問。若觀察到offset忽大忽小，先查網路延遲、NTP server選擇、虛擬機時間服務與主機電池，再調整輪詢，不要只把門檻放寬。

## 斷線漂移與三個實際排查步驟

離線時保留最後成功同步時間與offset。假設最後成功校時在08:00，之後沒有成功樣本；08:30網路斷線，10:00收到事件。此時距最後同步7200秒，距斷網5400秒，兩個數字意義不同。本例自訂政策把超過一小時未同步標STALE，恢復後要求兩筆合格樣本才回SYNCED；這些門檻是案例條件，正式配置依產品及用途訂定。

失敗先查第一步是確認UTC與時區：把同一事件以ISO 8601含Z輸出，再與作業系統命令或產品診斷頁比對。第二步是確認offset符號和server來源：用一筆已知時間算server減本機，並記錄serverId，不要只看畫面顯示。第三步是確認資料管線：檢查sourceTime、receivedTime、displayTime是否在轉換器、資料庫和HMI各被改寫。

時鐘問題常與憑證一起出現。若TLS或其他憑證驗證突然失敗，先查本機UTC、Not Before、Not After和時區顯示，再查信任鏈；不要把重新簽發憑證當成校時方法。NTP只同步UTC，憑證是否接受仍依產品的驗證程序和系統時間。

斷線策略要先決定哪些功能可以繼續。非控制用途的畫面可顯示最後值與STALE；需要稽核的交易則應拒絕使用未同步時間建立新紀錄，或在紀錄中明確標註UNTRUSTED_CLOCK。重連後不要一次把離線期間的所有資料改成同步時間，而要保留每筆原始時間與校時前後的序號。

本教學沒有指定某一PLC、閘道或作業系統的設定命令。NTP支援、校正方式、是否允許step、時區資料庫與日誌欄位都要依目標產品手冊核對；不要把Linux、Windows或PLC的參數名稱直接套到另一平台。

## FAQ 驗收與官方依據

FAQ1：NTP同步UTC後會自動變成台北時間嗎？答：不會，時區是顯示與格式化規則。

FAQ2：收到時間能取代來源時間嗎？答：只能在來源時間缺失時作為明示的替代欄位，不能覆蓋原始欄位。

FAQ3：校時倒退時age會變負數嗎？答：不應該，age要用monotonic clock計算。

FAQ4：offset正數代表什麼？答：依本文定義server UTC減本機UTC為正，表示本機落後；專案若採別的定義必須明寫。

驗收表至少包含三筆不同offset事件、跨午夜顯示、NTP斷線後STALE、重新同步跳變、憑證有效期邊界和資料庫UTC匯出。每筆測試保存sourceTime、receivedTime、displayTime、offset、serverId、syncSequence與quality。完成結果是能解釋事件順序和品質來源，不能只看畫面日期正確。

參考：[RFC 5905 Network Time Protocol Version 4: Protocol and Algorithms Specification](https://www.rfc-editor.org/rfc/rfc5905)

參考：[RFC 5280 Internet X.509 Public Key Infrastructure Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280)

驗收報告可用三個時間軸分欄：來源設備的UTC、閘道收到的UTC、畫面顯示的台北時間。另列出時鐘狀態變更和NTP回應。若操作員只看到台北時間，仍能從報告回推原始UTC、offset與傳輸延遲，這才算達到可追溯，而不是只把字串格式化得一致。

RFC 5905是NTPv4協定與演算法的官方規格；RFC 5280說明X.509憑證與有效期等PKI資料。兩者都不會替特定PLC或閘道決定時區欄位、資料庫格式或校時跳變策略，這些仍是產品與企業規範要核對的工程設定。

## 延伸閱讀

- [閘道斷線暫存的容量計算與重送去重](/articles/gateway-store-forward-queue-dedup-timestamps)
- [閘道韌體升級前後的通訊回歸測試](/articles/gateway-firmware-upgrade-modbus-mqtt-regression)
