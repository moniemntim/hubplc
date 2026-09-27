---
title: MQTT遺囑訊息與離線狀態
description: 以虛構gateway時間線拆分Will、Will Delay、Session Expiry、Message Expiry、正常DISCONNECT與reason 4，並分開連線、來源健康、資料新鮮度與製程警報。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先拆開四種狀態

Last Will是Client在CONNECT預先交給broker的訊息。非正常連線結束或DISCONNECT reason 0x04等條件可觸發Will流程，實際發布還受Will Delay與Session結束控制。它不是設備診斷；本篇分開gatewayConnectionState、sourceHealth、lastDataAt與processAlarm。

本文以虛構 gateway G-01 建立 MQTT 5契約：connection topic回報 ONLINE/OFFLINE，資料 topic另帶來源時間與quality。Will payload只表達連線異常，例如 state=OFFLINE、reason=will-triggered；sourceHealth由資料與診斷決定，processAlarm由控制需求決定。

正常 DISCONNECT reason 0x00會取消尚未發布的Will。若應用希望留下維護狀態，可在關閉前主動發布 SHUTDOWN，但那是應用訊息，不是Will。reason 4則是明確要求 broker 帶Will關閉，必須獨立測試。

Will payload在CONNECT時已確定，broker不會按MQTT規範自動把其中時間改成斷線時刻。本例只放willConfiguredAt及connectionEpoch，subscriber另存receivedAt；需要實際發布或斷線偵測時間時，另外取可信broker事件紀錄，不把設定時間命名成publishedAt。

| 欄位 | 回答問題 | 範例 | 不能推論 |
| --- | --- | --- | --- |
| gatewayConnectionState | broker視為連線嗎 | ONLINE/OFFLINE | 不等於健康 |
| sourceHealth | 來源資料正常嗎 | GOOD/STALE/BAD | 不等於網路狀態 |
| lastDataAt | 最後來源資料何時 | 09:59:40Z | 不等於發布時間 |
| processAlarm | 製程是否警報 | HIGH_LEVEL | 不等於Will原因 |

## 三個時間設定的差別

假設 G-01在09:00 CONNECT，Will Delay=10秒，Session Expiry=60秒，Will Message Expiry=120秒。Will Delay控制延後發布；Session Expiry控制斷線後session state保存；Will Message Expiry控制Will發布後的轉送壽命。三個計時器不能合併為一個離線逾時。

假設broker在10:00:00偵測連線關閉，從此計算Will Delay十秒；如果沒有恢復同一Session且Session尚未結束，10:00:10發布Will。若10:00:05以Clean Start=0恢復同一Session，尚未發布的Will取消；10:00:20才回來則不能撤回已發布訊息。實體斷線到broker偵測之間可能另有Keep Alive等延遲。

Will Delay到期或Session結束，兩者先到者觸發發布。例如Delay十秒但Session Expiry五秒，應在Session結束時處理Will；Expiry為零會使Session在連線結束時終止，不能期待仍等滿十秒。這是規範規則，broker故障造成的實際排程延遲另行記錄。

同一clientId重連會造成狀態競態。舊連線的Will、重連的ONLINE與資料topic可能以不同順序抵達，consumer應以session代號、連線epoch或broker收到時間建立排序策略。不可只看到最後一筆字串就宣稱它代表目前物理設備狀態；這需要應用契約定義。

重連恢復要先處理身份與訂閱，再處理資料補送。client應以CONNACK的Session Present、重新訂閱結果、queue depth與每筆eventId建立恢復報告；收到ONLINE後仍要等待來源資料更新，才將sourceHealth由STALE改為GOOD。這能避免設備剛連線但感測資料仍停滯時被誤標正常。

來源品質BAD而連線仍ONLINE時，資料topic要保留BAD與來源診斷，不能等Will才呈現異常。相反地，Will發布也不代表來源感測器壞掉；先把連線中斷與來源量測不可用分成兩條事件，維護者才知道該查哪一段。

| 時間 | 事件 | 預期 connection state | 其他欄位 |
| --- | --- | --- | --- |
| 09:00 | CONNECT完成 | 發布ONLINE | sourceHealth另判 |
| 10:00:00 | broker偵測連線關閉 | 開始Will Delay | lastDataAt不變 |
| 10:00:10 | Delay到期且未恢復 | 發布OFFLINE | reason=will-triggered |
| 10:00:20 | 恢復原Session的分支 | 重發ONLINE | 原Will已發布，另驗來源資料 |

## 正常關閉 reason 4與sessionPresent

正常關閉的測試列要送 DISCONNECT reason 0x00，預期不發布Will。若使用 DISCONNECT reason 4，規範語意是 Disconnect with Will Message，broker仍應發布Will。看到DISCONNECT封包不能一律取消警報，必須讀 reason code。

重連後讀 CONNACK 的 Session Present。true只表示broker找到可恢復的既有session，不能回答設備健康，也不表示離線期間每筆資料完整。false時要重新建立訂閱、報告可能遺失的時間窗，並初始化應用狀態。

案例A：09:30維護前送0x00，沒有OFFLINE Will；看板可由應用訊息顯示SHUTDOWN。案例B：09:40送reason 4，即使有DISCONNECT封包仍預期出現OFFLINE。兩列的 connectionState、sourceHealth與processAlarm都要分開記錄。

正常維護的流程可先發布SHUTDOWN，等待subscriber記錄，再送DISCONNECT 0x00；若流程中途失去網路，Will仍可能在Delay後出現。看板應保留 planned shutdown 與 will-triggered 兩種原因，並以收到的reason、session與資料新鮮度呈現，而不是把兩者合併成同一個OFFLINE。

當資料流長時間沒有更新而connection仍ONLINE，應用可依lastDataAt產生STALE，但不能發布一個偽造的OFFLINE Will。當收到OFFLINE而資料剛在數秒前更新，則連線狀態是OFFLINE、sourceHealth可能仍GOOD；值班流程要按狀態矩陣決定是否告警，不能只靠一個總狀態字串。

時鐘校正也會影響判讀。observedAt、willConfiguredAt與receivedAt應帶時區或UTC表示，並記錄時鐘來源；若設備時間回撥，consumer不可用負的age直接判定新鮮。可暫標clock-invalid並依序號或broker時間排序，待工程規格決定是否告警。

Session expiry到期後，舊訂閱與未送資料可能不存在；client重連收到Session Present=false時，應把缺口起訖時間寫入恢復事件。恢復事件與OFFLINE Will是不同topic或不同event type，避免報表把一次斷線與每筆遺失資料重複計算。

排查保存 clientId、clean start、session expiry、Will delay、Will properties、DISCONNECT reason、CONNACK sessionPresent、broker時間與subscriber receivedAt。少了這些證據，無法分辨網路中斷、程式要求Will或broker重啟。

## 新鮮度與broker重啟驗收

假設lastDataAt=09:59:40，broker於10:00:00偵測斷線，subscriber於10:00:10收到Will。在時鐘可比較的前提下，來源資料年齡三十秒、從broker偵測到收到Will十秒、從subscriber收到Will起算的離線顯示時間則為零。三種起點不能混成同一個offline age。

broker重啟是另一個情境。OASIS定義協定語意，但session、queued messages與Will是否落盤及何時恢復，要看產品版本與persistence。Mosquitto的persistence與autosave_interval也不等於每封訊息已同步磁碟。驗收需記錄重啟前後sessionPresent、訂閱、Will時間與資料缺口。

測試矩陣至少包含正常0x00、reason 4、TCP突然斷線、Delay內重連、Delay後重連、broker重啟及Session Expiry到期。每列記 connectionState、sourceHealth、lastDataAt、processAlarm與receivedAt。未做的列標待驗證，不寫成通過。

離線資料補送與connection Will是兩條線。重連後即使Session Present=true，client仍要依每個資料topic的expiry、queue與eventId決定補送或報缺口；connection ONLINE也不能把先前STALE資料自動變GOOD。驗收報告應把連線時序、資料時序及警報時序分欄。

broker版本升級前，先在測試環境逐列重跑正常關閉、reason 4、突然斷線、Will Delay競態與重啟案例，對照規範與產品文件。若結果差異只在重啟時序或持久化，報告應列為產品行為與版本條件，不能改寫成通用MQTT語意。

監看端不應只訂閱connection topic。另訂資料quality與lastDataAt規則，例如超過120秒才標STALE；120秒是本案例策略，不是MQTT標準。

## FAQ 來源

FAQ1：Will代表設備壞掉嗎？不代表。非正常連線終止或明確要求帶Will的關閉都可能觸發，健康與製程警報另判。

FAQ2：正常DISCONNECT會發布Will嗎？reason 0x00取消未發布Will；reason 4要求帶Will，兩者必須分開驗收。

FAQ3：Will Delay、Session Expiry與Message Expiry是一回事嗎？不是，分別控制發布延遲、session保存與訊息轉送壽命。

FAQ4：Session Present=true代表離線資料完整嗎？不代表，queue、persistence、expiry與容量仍須查證。

驗收每列要有「規範預期」與「產品待驗證」兩欄。OASIS可支持Will取消、Will Delay、Session Present等協定語意；broker持久化、重啟排程、queue容量與log欄位則屬產品行為。兩欄分開後，故障報告才不會把尚未測量的延遲寫成精確數字。

Will固定reason=will-triggered，表示預設Will流程被觸發，不聲稱網路、程式或設備哪個故障。真正原因從broker日誌和DISCONNECT封包調查；即使reason 0x04觸發，原本預先設定的Will payload也不會自動改字，不能要求它自行變成另一個原因。

connection topic的QoS、retain與Will retain也要分別寫入契約。即使Will本身設定retain，後來訂閱者拿到的是最後保留的OFFLINE快照，仍需查看willConfiguredAt、reason及另存的receivedAt；它不表示目前連線一定仍中斷。若不需要新訂閱者看到歷史離線，便不要把connection Will當永久狀態保存。

若同一gateway的兩次連線使用相同ClientID，broker可能先終止舊連線，再建立新session；subscriber看到的OFFLINE與ONLINE順序要以實際broker事件記錄核對。應用可使用連線epoch或session識別避免舊Will覆蓋新連線，但這是應用設計，MQTT不會替你判定設備健康。

這是教學案例，數值與時間為明確假設。

參考：[OASIS MQTT Version 5.0，§3.1.2.7、§3.1.3.2.2 Will Retain與Will Delay；§3.1.2.11.2 Session Expiry。](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html)

參考：[OASIS MQTT Version 5.0，§3.14.2.2 DISCONNECT Reason Code與正常/帶Will關閉語意。](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html)

參考：[Eclipse Mosquitto mosquitto.conf，persistence、autosave_interval與session設定。](https://mosquitto.org/man/mosquitto-conf-5.html)

## 延伸閱讀

- [MQTT保留訊息與陳舊命令](/articles/mqtt-retained-message-stale-command)
- [MQTT命令與回覆的關聯追蹤](/articles/mqtt5-user-properties-correlation-data-command-tracing)
