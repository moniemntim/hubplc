---
title: MQTT會話保存與離線佇列
description: 以 edge-07 離線 20 分鐘案例，拆分 MQTT 5 Clean Start、Session Expiry、subscription、inflight、queued 與 Message Expiry，為 telemetry、event、command response 設計保留、過期與去重策略。
date: 2026-09-17
author: 站長
draft: false
---

## 先分清五種狀態與時間

MQTT 5 的 Clean Start、Session Expiry、subscription persistence、inflight 與 queued message 常被寫成同一個「離線保存」。實際上它們回答不同問題：Clean Start 決定連線建立時是否放棄舊 session；Session Expiry 決定斷線後 session state 保存多久；subscription persistence 是該 session 的訂閱狀態；inflight 是 QoS 1/2 尚未完成確認的傳輸；queued 是 broker 為離線 client 暫存、等待往後送出的訊息。

| 概念 | 時間/範圍 | 查證據 | 不能直接推論 |
| --- | --- | --- | --- |
| Clean Start | CONNECT 建立時 | CONNECT/CONNACK | 不等於 queue |
| Session Expiry | 斷線後秒數 | 設定/Session Present | 不保證無限容量 |
| Subscription | session state 訂閱 | 重連 filter | 不等於 retained |
| Inflight | QoS 1/2 未完成 | PUBACK/PUBREC log | 不是全部離線資料 |
| Queued | 等待送出的暫存 | depth/oldest age | QoS 0 不必然保存 |

OASIS 規範中，Session Expiry 缺省或設為 0 時，連線關閉後 session 結束；大於 0 時 client 與 server 必須保存 session state，但實作仍有容量與管理政策。retained message 不屬於 session state，所以 session 過期不會自動清掉 retained state。完成本頁後，應能為每類訊息填入保存機制，而不是只寫「QoS 1 比較可靠」。

Session state 也不等於資料庫歷史。它主要保存讓同一 client 後續繼續通訊所需的協定狀態，例如訂閱與可靠傳輸狀態；歷史資料、報表與 retained state 應有各自的保存契約。若需求是「重連後補齊兩小時量測」，不能只把 Session Expiry 調成兩小時，還要設計來源資料庫或專用補送流程。

因此驗收表必須分列 session 是否存在、訂閱是否存在、每類 queue 是否存在，以及資料是否已過期。只查一個連線成功事件會把四個問題混成一個錯誤結論。

## 用 20 分鐘離線案例決定策略

案例中的edge-07是訂閱Client，其他publisher保持連線並向broker送資料；討論broker到這個離線訂閱者的方向：Clean Start=0，Session Expiry=1800 秒，既有訂閱已建立，broker於10:00偵測斷線，10:20 嘗試重連。三類訊息各有不同新鮮度。telemetry 只對顯示有用，event 需要保留缺口，command response 要避免把過期結果當現況。下表的 QoS、expiry 和去重規則是離線設計值，不是 broker 預設值。

| 類別 | QoS/Expiry | 20 分鐘後策略 | 監測欄位 |
| --- | --- | --- | --- |
| telemetry | QoS 1 / 60 s | 超時丟棄，記 expired | oldestAge、expiredCount |
| event | QoS 1 / 900 s | 超時不重播，記 gap | eventId、duplicateCount |
| command response | QoS 1 / 120 s | pending 才接受並去重 | pending、lateCount |
| QoS 0 telemetry | QoS 0 / 60 s | 除非產品明示，不假設保存 | queueQos0Policy |

用數字重算：10:01 的 telemetry 到 10:20 已等待 19 分鐘，遠超 60 秒，視為 expired；10:05的event已滿15分鐘，正好到900秒到期邊界，報缺口而非補造事件；10:19:30 的 response 等待 30 秒，尚未超過 120 秒，但只有在 session、queue 容量和 ACL 都有效時才可能送達。收到時還要檢查 commandId 是否 pending。

Message Expiry 與 Session Expiry 不能互換。前者限制某一筆 application message 的生命；後者限制 session state、訂閱與可恢復傳輸的保存。即使 session在本例還有十分鐘，過期 telemetry 仍應刪除；即使 message 未過期，session 過期也可能使 queue 所屬 client 不再存在。

離線策略不是由 QoS 數字單獨決定。telemetry 即使使用 QoS 1，也可能因 Message Expiry 很短而在重連前被刪；event 即使有較長 expiry，也可能因 queue 上限、ACL 或 broker persistence 不足而缺口。設計時先回答資料晚到仍有沒有價值，再選 QoS、expiry、session 與去重組合。

本案例的時間計算用 elapsed age：10:20 重連時，10:01 telemetry age=19 分鐘，10:05 event age=15 分鐘，10:19:30 response age=30 秒。若 broker 在 10:20:20 才開始轉送 response，age 變 50 秒仍未超過 120 秒；但若重新連線協商耗時到 10:22，該 response 已 age 150 秒，應按 expiry 丟棄。

## 重連時讀懂 Session Present 與順序

重連後先看 CONNACK 的 Session Present，而不是直接假設訂閱仍在。若 Session Present=true，代表 broker 有對應 session state，但仍要查產品對 queued、inflight、重複與順序的規則；若為 false，client 應重新 SUBSCRIBE、建立缺口窗口並告警。新Client ID不會自動接手原會話；Clean Start=1則捨棄同ID的舊會話並建立新會話。

| 時間 | 連線事件 | 預期判讀 | 證據 |
| --- | --- | --- | --- |
| 10:00 | edge-07 斷線 | session 倒數 1800 s | clientId、expiryAt |
| 10:20 | 相同 ID 重連 | 檢查 Session Present | CONNACK |
| 10:20+ | 收到 queued QoS1 | 驗 expiry、eventId | PUBLISH properties |
| 10:20+ | 僅Session Present=false時重訂閱 | retained與queue分別記錄 | SUBACK及訊息來源 |
| 10:30 | 另一分支：始終未重連 | 1800秒期滿 | 與10:20重連案例分開 |

inflight 不是普通 queue 的同義詞。QoS 1/2 在傳輸中有 protocol state，重連可能恢復尚未完成的交換；queued 是 broker 尚未開始向離線 client 交付的暫存。分析重複時要保留 packet identifier、QoS、DUP、message ID 或應用 eventId，不能只數 payload。QoS 0 的離線保存依 broker/產品政策，不能寫成 MQTT 必然保存。

broker 重啟要獨立驗收：確認是否啟用持久化、最後同步點、恢復後 retained/session/queue 範圍，以及資料庫或容量政策。Mosquitto 的 persistence 是產品選項，autosave_interval 是快照週期；這些只能描述為 Mosquitto 行為，不能泛稱所有 broker。

Client ID 是 session 的索引，不是設備永久身分的充分證明。若 edge-07 換成 edge-07-new，broker 可能建立全新 session；原 session 即使尚未到期也不會自動搬移。更換 ID 的部署流程要把舊 session 的 expiry、最後 queue depth 與新 ID 的重新訂閱時間寫進交接記錄，否則報表會把缺口誤算成來源停止。

重連後的 replay 順序也要以實際 packet log 驗收。QoS 1 redelivery 的 DUP 位元、應用 eventId 和 broker queue 排序都可能影響觀察；不要只用接收時間重排後就宣稱原始順序。對不能重排的事件，保留 source sequence 與 gap range，讓下游知道缺了哪些編號。

## Queue 監控與資料缺口處理

要讓重連結果可判讀，監測設計可彙整 sessionExpiryAt、sessionPresent、queueDepth、oldestAge、inflightCount、droppedExpired、duplicateCount、redeliveryCount、lastReconnectAt。上述名稱是本例監測欄位，不是MQTT標準屬性，也不保證broker直接提供。queueDepth只有一個數字不夠，應按 telemetry、event、command response 分類，否則管理者看不到哪一類訊息正在堆積。

| 症狀 | 先查 | 處置 | 不要做 |
| --- | --- | --- | --- |
| 重連沒舊訊息 | Session Present、Expiry、QoS | 先判會話與資料過期，再決定是否重訂閱及報缺口 | 說 broker 一定丟 |
| 過期 telemetry | Message Expiry、oldestAge | 丟棄記統計 | 舊值當目前值 |
| event 重複 | QoS/DUP、eventId | 去重保存一次 | 只用 timestamp 刪 |
| queue 爆滿 | depth、max queued、expiry | 調策略或丟低價值類 | 無限提高上限 |
| Session Present=false | Client ID/Clean Start | 重建訂閱與基準 | 假定 retained 補缺口 |

事件資料要有 eventId、sourceTime、sequence 或 generation，才能在 QoS 1 重送時去重。若來源允許同一秒多事件，不能只用 timestamp 作唯一鍵。command response 保存 commandId 與結果版本，收到 late response 時交由政策處理，不要自動以過期結果覆蓋目前狀態。

若 broker 有 queue 上限，測試要逐步增加離線期間與訊息速率，找出第一個丟棄點，記錄 broker log。Mosquitto 的 max_queued_messages 主要限制 QoS 1/2，每 client 還可能受 max_queued_bytes、persistence 與 plugin 政策影響。測試結果只能寫產品版本與設定。

監測告警要區分 queue 壓力與資料品質：queueDepth 上升表示待送資料增加，並不等於來源值錯誤；droppedExpired 表示 freshness policy 生效，也不等於 broker 故障。可設定例如 oldestAge 接近 expiry 的預警，讓維運在真正丟棄前處理容量或下調低價值資料頻率。

測試報告要列 broker 版本、設定快照、Client ID、Clean Start、Session Expiry、每類 QoS/expiry、離線開始與重連時間。若只記錄「收到三筆」，無法知道是 retained、queued、inflight redelivery 還是重建訂閱後的新資料。

## 驗收 FAQ 與官方依據

離線驗收至少做五組：相同 Client ID 且 Session Present=true、session 已過期、Clean Start=1、Client ID 更換、broker 重啟後再連線。每組記錄三類訊息的送達、expired、duplicate、gap；不能用一個「重連成功」覆蓋資料完整性結論。

FAQ1：Session Expiry 設 1800 秒，就保證 broker 保存所有離線訊息 30 分鐘嗎？不保證。訊息仍受 Message Expiry、QoS、queue 容量、ACL、持久化與 broker 政策影響。

FAQ2：QoS 0 離線一定保存嗎？不一定。是否排隊常是產品選項，必須查 broker 文件。

FAQ3：Session Present=true 代表所有舊資料按原順序重播嗎？不代表，仍須看 queued/inflight、expiry、重複與產品限制。

這些age從broker收到訊息開始算，假設publisher到broker的延遲可忽略且沒有更早的轉送等待。轉送時Message Expiry應反映扣除等待後的剩餘秒數；payload來源時間仍另外保存。若感測器早已緩存一小時才發布，broker剛收到不代表量測新鮮。

FAQ4：broker 重啟後 queue 還在嗎？只能依 persistence 設定、版本與最後同步證據判斷，不能以 Session Expiry 單獨保證。

參考：[OASIS MQTT Version 5.0 §3.1.2.11.2、§4.1、§4.1.1 與 §3.3.2.3.3；Mosquitto persistence/queue/expiry 產品行為。案例為離線手算，](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html)

交付時要把「可恢復」寫成有條件的結論：相同 Client ID、session 尚未過期、broker 仍有保存、訊息未過期且 queue 未超限。任何條件不成立，都應回報缺口並讓下游決定是否重新同步；不要用沉默丟棄掩蓋資料不完整。

參考：[Eclipse Mosquitto mosquitto.conf 官方手冊。](https://mosquitto.org/man/mosquitto-conf-5.html)

## 延伸閱讀

- [MQTT命令與回覆的關聯追蹤](/articles/mqtt5-user-properties-correlation-data-command-tracing)
- [MQTT Payload格式與版本相容](/articles/mqtt-payload-schema-version-json-cbor-protobuf)
