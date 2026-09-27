---
title: MQTT保留訊息與陳舊命令
description: 以虛構泵浦契約說明 retained state、metadata、Message Expiry與Retain Handling，並用空payload清除流程避免陳舊命令重放。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先分清 retained 與命令

MQTT retained 是 PUBLISH 的旗標與 broker 儲存規則。broker 為一個 topic 保存最新一筆 retained message，符合訂閱的 client 可能在訂閱時先收到它。它不是歷史資料庫，也不是命令已執行的證明。本文用虛構泵浦 P-01 建立離線契約，先把狀態、metadata、命令與事件分流。

狀態 topic 適合 retained，因為新加入的監看者需要知道最後一次發布的狀態；例如 plant/pump/P-01/state。start、stop、reset 這類瞬時命令不可 retained，否則晚加入的 client 可能把舊請求誤當現在的動作。事件也應以 eventId 保存於事件系統，而不是用 retained 假裝歷史。

Retain Handling 會改變新訂閱者的第一筆結果：0 可要求送符合的 retained，1 只在新 subscription 送，2 訂閱時不送。ACL、broker 是否支援及訂閱時機同樣重要。訂閱後沒看到 retained，不足以推出設備沒有狀態。

另做版本變更案例：來源先發布RUNNING，再發布STOP並帶新的schemaVersion。接收端先驗證版本及來源序號，才更新狀態；若晚到一筆舊RUNNING，依世代與序號契約避免畫面回退。這是獨立於下一頁單次發布過期案例的測試，不把兩組時間線混在一起。

| 主題 | 用途 | RETAIN | 驗收重點 |
| --- | --- | --- | --- |
| .../state | 目前狀態 | 1 | 查observedAt與quality |
| .../metadata | 單位與schema | 1 | 查版本相容 |
| .../command | 瞬時命令 | 0 | 不得因訂閱重放 |
| .../event | 一次性事件 | 0 | eventId去重 |

## 狀態payload與新鮮度

狀態 payload 應有 schemaVersion、source、observedAt、quality、value。假設 P-01 在10:00發布 RUNNING，observedAt 是來源觀察時間；subscriber 在10:02收到時，receivedAt 是本機接收時間。兩者要分開保存，否則看板會把兩分鐘延遲誤當設備剛更新。

MQTT 5 Message Expiry Interval 是 broker 轉送壽命，單位為秒，不能取代 payload 的 observedAt。假設來源時鐘與接收端同步、broker於10:00收到，之後沒有再發布，expiry=300秒，10:02的新訂閱者收到 retained，應顯示 RUNNING 並計算 age=120秒；10:06再次訂閱若沒有 retained，應確認這次沒有取得可用保留值，不能說泵浦停止。

metadata 可 retained，但 schemaVersion 必須有相容規則。v2 新增 quality 時，舊 consumer 應明確允許或拒收；schemaVersion 超過支援上限時顯示 unsupported 並記錄，不能靜默填安全值。單位、來源識別、有效期限與版本應一起記錄。

新訂閱者的首次畫面要有三種可見結果：收到新鮮 retained、收到但已陳舊的 retained、沒有 retained。第三種不能用0、OFF或空字串代替，應顯示 UNKNOWN並標原因。若 broker回傳 retained bit，保存它；若 client library不暴露該旗標，需用測試topic和官方文件確認，不能從payload猜。

驗收時可建立四個獨立subscriber：一個使用Retain Handling 0、一個使用1、一個使用2、一個先訂閱再斷線重連。對每個subscriber記錄subscription建立時間、第一筆訊息的retain bit、payload、receivedAt與broker回應。這樣才能分辨規範選項、ACL、過期與client快取造成的差異。

對於多個broker或bridge，retained值可能在拓撲中被重新發布。驗收表要標示原始來源、轉送broker、retain bit與收到時間，並定義橋接端是否保留原本的RETAIN語意。沒有產品文件時只寫待確認，不假定bridge會同步清除、同步expiry或保證順序。

| 時間 | 事件 | 預期 |
| --- | --- | --- |
| 10:00 | 發布RUNNING，expiry=300 | broker保存 |
| 10:02 | 新訂閱收到 | state age=120 s |
| 10:05 | 300秒期滿 | 過期值不得再送給新訂閱者 |
| 10:06 | 新訂閱無值 | 不可推論STOP |

## 空payload清除與審核

對相同topic發布RETAIN=1且payload為零位元組，會刪除broker保存的retained message；這次PUBLISH仍按一般規則轉送給符合條件的現有訂閱者。因此接收端要明確處理空payload，不能說清除只影響未來訂閱，也不能把空內容當有效RUNNING或STOP狀態。

清除前鎖定完整 topic，保存 old schemaVersion、最後 observedAt、操作者、原因與時間，再送 zero-length retained PUBLISH。清除後以獨立訂閱或 broker 管理查詢確認 retained tree 沒有該 topic。audit 不應只寫清掉了，因為要分辨誤刪、過期與 publisher 停止更新。

案例：10:07 P-01退役。先記錄 topic=.../state、lastObservedValue=RUNNING（10:00紀錄，已過期）、operator=eng-2、reason=retired，查無現存retained則記錄already-absent；若仍有新值則按程序清除。10:08新監看者沒有 retained state；這不代表 OFFLINE。若要告知退役，另發布 lifecycle event 或新的 metadata。

空payload清除後，現有訂閱者可能仍保留本地快取。應用畫面要把 broker retained 清除、收到狀態事件、清空本地快取三件事分開記錄。若需要立即讓所有看板移除畫面，另發布帶有明確 schema的撤銷事件，並定義重連後如何重建畫面，不要把零長payload當通用UI命令。

若 broker管理畫面顯示 retained tree仍有項目，先確認查詢的是同一broker與同一部署實例，再比對 topic大小寫、斜線、UTF-8與publisher ACL。清除操作不可依畫面沒有值就宣稱成功；應保存清除PUBLISH的封包摘要及後續新訂閱結果。

schema升版時先發布metadata再發布state，讓新subscriber取得解碼規則；若metadata與state的retained更新不是同一交易，consumer要處理先看到新state後才拿到metadata的短暫窗口。可暫存未知state並在metadata到達後重新驗證，不能把未知欄位直接丟掉。

失敗排查依序查看 topic 是否完全相同、PUBLISH 是否帶 RETAIN、payload 是否零長度、ACL 是否允許、broker 是否套用 expiry，以及訂閱的 Retain Handling。Mosquitto 的 retain_expiry_interval 與 persistence 是產品設定，不能泛稱所有 broker 都相同。

## 命令契約與離線驗收

命令應有 commandId、issuedAt、target、action、expiry 與回覆狀態，由 consumer 做授權、去重與過期檢查。QoS 1可能重送，仍不能讓非冪等動作執行兩次。retained state只提供最後狀態，不能表示命令尚未執行或必須補做。

假設有人誤把 stop retained 到 command topic，10:20新HMI訂閱可能先收到 stop。在隔離測試環境先停用模擬命令消費、保存audit、清除retained，核對沒有重放，再修正publisher設定及適用的broker保留訊息限制。一般topic ACL未必能限制RETAIN旗標，需查產品能力；正式系統停用控制前依既定變更及操作程序。重發該訊息不是修復。

驗收表固定記錄 topic、retain bit、payload長度、schemaVersion、observedAt、broker回應與收到順序；覆蓋 state 到達、state過期、command不重放及清除後無 retained。若要測重啟、QoS 0儲存或磁碟持久化，另按指定broker版本文件設計。

Message Expiry與應用freshness要雙重設計。broker expiry=300秒只限制轉送；consumer可要求 observedAt距現在不超過90秒才顯示GOOD，90至300秒顯示STALE，超過300秒顯示UNKNOWN。這些門檻是案例策略，應寫入需求並和時鐘來源、時區、時間回撥處理一起驗證。

未指定 broker 與 client library 時，只描述 MQTT 5協定語意。QoS 0 retained 是否保存、重啟後是否存在、過期資料實體儲存何時清理及管理介面，不能由OASIS替產品保證。

## FAQ 來源

FAQ1：retained 是歷史訊息嗎？不是，通常只保留每個 topic 的最新 retained 值；歷史要由資料庫或事件服務保存。

FAQ2：沒有 retained 是否等於泵浦停止？不等於，可能尚未發布、已過期、被清除、ACL拒絕或訂閱使用 Retain Handling 2。

FAQ3：零長payload retained會送給現有訂閱者嗎？會按正常轉送條件處理，同時刪除保留值。接收端要定義空payload處置；退役等業務意思仍應使用明確事件。

FAQ4：command 能否 retained 來保證新client收到？不應如此，舊命令重放可能造成危險；應使用請求、過期與去重契約。

實作前先畫 topic 權限矩陣：state publisher可寫state，metadata publisher可寫metadata，command publisher只能寫request，monitor只能讀。再把每個 topic 的 retained、expiry、payload schema與清除責任列成版本化文件。ACL通過不代表payload合法，consumer仍要檢查 schemaVersion、source、quality、observedAt與value型別。

狀態與命令的資料治理也不同。state可以用 retained作為快照，但每次更新仍應記錄來源序號與最後發布者；command則必須有請求者、授權結果、執行結果與完成時間。若只看到state變成RUNNING，不能回推是哪一個command造成，也不能把狀態快照當成稽核紀錄。

這是教學案例，數值與時間為明確假設。

參考：[OASIS MQTT 5.0：RETAIN、訂閱Retain Handling及Message Expiry規則。](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html)

參考：[Eclipse Mosquitto mosquitto.conf，persistence、retain_expiry_interval與retain來源檢查。](https://mosquitto.org/man/mosquitto-conf-5.html)

參考：[Eclipse Mosquitto mosquitto_sub，retain-handling與retain-as-published選項。](https://www.mosquitto.org/man/mosquitto_sub-1.html)

## 延伸閱讀

- [MQTT QoS交付語意與應用資料去重](/articles/mqtt-qos-delivery-deduplication-event-id)
- [MQTT遺囑訊息與離線狀態](/articles/mqtt-last-will-session-state-model)
