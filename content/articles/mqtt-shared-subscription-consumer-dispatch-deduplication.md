---
title: MQTT共享訂閱的分工與去重
description: 以三個analytics consumer的離線案例說明$share群組、分派不確定性、QoS重送、eventId去重、DB commit與consumer失聯監測。
date: 2026-09-17
author: 茂伯
draft: false
---

## Shared group到底分送什麼

一般訂閱中，同一個topic的每個符合條件的一般訂閱Session各自接收訊息；shared subscription則把一個Topic Filter與多個Session綁成群組，符合的每筆Application Message只送給群組中的一個Session。格式是 $share/{ShareName}/{filter}，ShareName不可含斜線、加號或井號。本文用三個虛構consumer離線設計，不連接broker，也不把分派結果寫成實測。

案例群組使用 $share/analytics/site/+/telemetry，三個consumer為 C1、C2、C3。OASIS只規定伺服器可逐訊息選擇其中一個Session，沒有承諾round-robin、資產順序、平均負載或固定consumer。EMQX Enterprise官方文件列出random、round_robin、sticky、local與hash等策略；這是產品設定行為，不能推廣成MQTT標準。

shared group是消費負載分工，不是控制唯一執行保證。收到訊息的consumer若要寫資料庫，必須先檢查eventId、assetId、schemaVersion與source timestamp；更不能收到 telemetry 就直接操作機械。控制命令應有獨立授權、冪等鍵與回饋。

建立topic契約時要固定assetId的格式、大小寫、編碼與允許字元，並把它放在payload中重複保存。本例topic為site/P-01/telemetry等，第二層是assetId，與payload的assetId核對。topic用於路由，payload中的值用於驗證；兩者不一致時標記CONFLICT而不是選一邊。schemaVersion升級要有舊consumer的相容規則，未知版本不可靜默當成目前版本。

| 訂閱型態 | 同一訊息的接收者 | 適合用途 | 不可推論 |
| --- | --- | --- | --- |
| 一般訂閱 | 每個匹配Session各一份 | 多畫面監看 | 不是負載平衡 |
| Shared group | 群組內一個Session | 平行分析 | 不是固定輪詢 |
| 兩個不同ShareName | 各群組各一份 | 兩種獨立處理管線 | 不是全系統只一份 |
| 重疊filter | 可能同時匹配多組 | 需明確資料流 | 不是自動去重 |

## 三consumer離線分工表

三個consumer都訂閱同一完整filter，payload固定包含 assetId、eventId、sourceTimestamp、schemaVersion、quality、value。假設共有六筆 telemetry，資產P-01三筆、P-02兩筆、P-03一筆。下表只是一種測試假設，不是broker預測；若產品選擇不同策略，分派列可以完全不同。

| 訊息 | assetId | eventId | 假設接收者 | DB處理 |
| --- | --- | --- | --- | --- |
| m1 | P-01 | E101 | C2 | 插入 |
| m2 | P-02 | E102 | C1 | 插入 |
| m3 | P-01 | E103 | C3 | 插入 |
| m4 | P-02 | E104 | C2 | 插入 |
| m5 | P-03 | E105 | C1 | 插入 |
| m6 | P-01 | E106 | C2 | 插入 |

六筆分工不能推論P-01固定交給C2。EMQX的hash_topic依發布topic分派，hash_clientid依發布者的Client ID，不是consumer ID，也不讀payload的assetId。如果同一publisher或topic混多個資產，分區邊界就不等於單一資產。需要順序時先設計資產分區及序號契約，再驗證消費者變動與重連；固定分派也不自動保證資料庫提交順序。

每筆payload都要帶完整資產上下文。只把 assetId 放在topic而省略 payload，轉送、落庫或重送時容易丟失原始來源；只保存consumer名稱也不能回答資料屬於哪一台設備。sourceTimestamp描述來源觀察時間，receivedAt描述consumer收到時間，兩者不要混寫。

三個consumer處理速度不同時，要確認所選策略是否考慮負載，不能從shared名稱推論broker知道每個資料庫交易何時完成。監測每端queue及commit延遲；若C1積壓，先查它的資料庫或處理能力，再評估策略和部署，不靠期待下一筆必分給C3解決。

retained message不會在 shared subscription 初次訂閱時送給Session；因此不能用 shared group 啟動時取得最新狀態。若需要初始狀態，另設非shared state訂閱或歷史讀取流程，再把後續telemetry放入shared group。

## QoS 重送與DB commit

shared subscription只決定伺服器選哪個Session，QoS仍決定該Session的交付流程。QoS 0可遺失；QoS 1可能重送；QoS 2依協定完成一次MQTT傳送，但不等於資料庫或控制動作只提交一次。consumer必須以eventId建立唯一鍵，並把去重判斷與DB commit放進可核對的交易設計。

假設三consumer共用同一資料庫唯一約束，eventId在來源範圍唯一；m4由C2收到QoS 1，C2寫入eventId E104後在PUBACK前斷線，broker可能重送給C2，或在Session終止條件下依規範策略交給另一Session。C3若收到E104，在資料庫交易及唯一約束保護下判斷；若已commit就記duplicate並回報，不再新增資料。若兩筆E104 payload不同，標CONFLICT，不能以最後到達值覆蓋。

DB流程可分為received、validated、committed、duplicate、conflict、failed六種結果。只有payload schema、assetId、eventId、時間格式與品質通過後才進資料表；錯誤資料另入隔離佇列。commit成功後才回應應用層已處理，不能以收到PUBLISH就宣稱落庫。

| 階段 | 必要欄位 | 失敗結果 |
| --- | --- | --- |
| 收到 | topic、QoS、eventId、receivedAt | 保存原始摘要 |
| 驗證 | assetId、schemaVersion、quality | invalid隔離 |
| 去重 | eventId與payload hash | duplicate或CONFLICT |
| 交易 | DB key、commit時間 | failed可重試 |
| 完成 | consumer、attempt、結果 | 供監測查詢 |

同一asset的telemetry可平行分析，但事件、命令回覆或累計值更新常需要順序。若不能使用hash_topic等產品策略，將每個asset送入應用層分區佇列，依sourceTimestamp與sequence排序；設定最大等待時間，超過就標遲到並保留原始資料。這是應用設計，不是shared group自動提供的順序。

若訊息是命令回覆或會引發設備動作，shared group不應直接把任意consumer當執行器。應先寫入command inbox，再由單一授權流程根據commandId、target、期限與目前狀態決定是否執行；執行結果另發布ack。這能把資料分析的負載分工和機械控制的唯一責任分開。

## 增減consumer與監測

新增C4後，符合群組的後續訊息可能被任何一個Session選中；不能要求它接手某個asset的完整歷史。移除C2時，正在傳送的訊息要按QoS與交換階段判斷：QoS1在規範條件下可能改派；QoS2不能泛稱中途可換一個Session續完同一次交換，必須查OASIS條件與broker版本。未完成訊息可能在沒有任何Session時被刪除，故需監測缺口。

以下為自訂監測欄位，需依產品能力取得或自行彙整：三個consumer各自記錄 connected、subscribed、lastReceivedAt、inflight、queueDepth、commitRate、duplicateCount、conflictCount、failedCount與oldestAge。群組層再計算 publishedCount、deliveredCount、committedCount與missingCandidates。不能以三台client都ONLINE就宣稱資料沒有遺失。

這個時序假設Client函式庫允許應用提交後才確認；有些SDK會提早自動送PUBACK，必須核對。若確認已送而尚未保存就崩潰，broker可能不再重送，應以持久化收件佇列或經驗證的確認機制補足。協定確認與業務完成回覆分開記錄。

測試先讓C1、C2、C3都成功SUBSCRIBE，再發布固定六筆含eventId資料；第二階段中斷C2，觀察重送與接手；第三階段讓C4加入，檢查分派不必平均；第四階段重送E104與改payload的E104，核對duplicate和CONFLICT。所有結果標明對應結果或實測。

QoS與DB的重試要有attempt欄位。E104第一次由C2驗證成功但commit超時，第二次由C3收到時，先查唯一鍵與payload hash；若第一筆已commit，回傳duplicate；若只存在pending記錄，按交易鎖或狀態機恢復。payload hash不同時必須停在CONFLICT，交人工或明確修復流程。

同一ShareName但不同filter是不同shared subscription，不應假定它們共享同一輪詢游標。若同一訊息同時匹配shared與非shared subscription，可能各得一份；應在拓撲表列出每個filter、ShareName、用途與資料去向，避免報表重複計數。

## EMQX行為範圍 FAQ與來源

EMQX Enterprise官方latest文件（查核日2026-09-17）說明 shared_subscription_strategy 可選 random、round_robin、round_robin_per_group、sticky、local、hash_clientid與hash_topic，且文件標示round_robin為預設。這是EMQX產品文件所描述的設定範圍，部署版本、叢集拓撲與設定覆蓋仍須核對；不可把它當OASIS保證，也不能在未指定版本時杜撰設定命令。

共享訂閱的監測窗口應同時保存publisher、topic、ShareName、consumer clientId、packet QoS、eventId、receivedAt、commitAt與結果。這些欄位可以回答訊息是否只被分派一次、是否曾重送、是否已落庫。沒有packet與DB證據時，不能把「看板數量少」直接認定為broker遺失。

FAQ1：三個consumer會輪流收到嗎？不一定。MQTT讓Server逐筆選擇，round-robin只是某些broker的產品策略。

FAQ2：shared group能保證同一asset事件順序嗎？不能。若需要順序，要選有文件支持的分區策略或由應用重排，並驗證失聯與重連。

FAQ3：QoS 2能保證DB只寫一次嗎？不能，MQTT交付語意不等於外部DB交易；仍需eventId唯一鍵與commit判斷。

FAQ4：收到shared message就能控制設備嗎？不能。shared group是負載分工，控制需授權、冪等命令、回饋與安全互鎖。

本文三consumer、六筆訊息與失聯結果為離線設計，正式驗證應固定broker版本、strategy、QoS、Session、持久化、ACL與DB交易證據。

參考：[OASIS MQTT Version 5.0，§4.8.2 Shared Subscriptions：$share格式、單一Session選擇、無retained初始訊息、QoS與失聯分支。](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html)

參考：[EMQX Enterprise MQTT Shared Subscription官方文件：strategy選項、round_robin預設及publisher connection狀態範圍。](https://docs.emqx.com/en/emqx/latest/messaging/mqtt-shared-subscription.html)

## 延伸閱讀

- [MQTT憑證與TLS連線排查](/articles/mqtt-tls-mtls-sni-ca-chain-troubleshooting)
- [交換器鏡像埠的封包擷取準備](/articles/industrial-switch-port-mirroring-capture-direction-capacity)
