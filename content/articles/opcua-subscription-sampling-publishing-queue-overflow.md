---
title: OPC UA取樣發布間隔與通知佇列設計
description: 用100ms取樣、1秒發布、queue size 2與discardOldest案例分清OPC UA Subscription的取樣、發布、Client處理、Overflow與KeepAlive，建立可觀察的新鮮度契約。
date: 2026-09-17
author: 站長
draft: false
---

## 三種時間不要混成一個週期

OPC UA Subscription設計先分清資料來源更新、Server sampling、Subscription publishing和Client processing。SamplingInterval是Server對被監看的資料取樣請求，PublishingInterval是Subscription整理通知並送給Client的週期；Client收到後還有解析、排程與寫入時間。資料值自己的SourceTimestamp也可能早於ServerTimestamp，不能用Publish到達時間代替來源時間。

| 時間概念 | 例子 | 驗收要看 |
| --- | --- | --- |
| 來源更新 | 感測器每100ms改值 | 來源是否真的有新值 |
| SamplingInterval | 請求100ms | Server回傳revised值 |
| PublishingInterval | 請求1s | 通知批次與延遲 |
| Client processing | 收到後20ms寫入 | 解析與佇列是否塞住 |
| Timestamp | Source／Server | 品質與排序依據 |

本篇請求samplingInterval=100ms、publishingInterval=1s、queueSize=2、discardOldest=true。CreateSubscription回覆revisedPublishingInterval；CreateMonitoredItems則回覆每個項目的revisedSamplingInterval及revisedQueueSize。要保存各自的回覆，不能宣稱一個MonitoredItem建立結果同時回傳發布間隔。

完成本頁後，應能在監看契約中分開寫取樣、發布、處理和來源時間，並知道一秒發布不等於Server一秒才取樣。若畫面延遲，先查哪一層耗時，不要直接把PublishingInterval調到極小。

設定表也要保存建立請求和Server回覆。請求100ms但revised為200ms時，資料新鮮度估算應採200ms；請求1秒但Server改成1.5秒時，通知延遲門檻也要跟著調整。若程式只保存原始請求值，日後看到慢通知會誤判網路故障。

## 100ms取樣 1秒發布 queue size 2的時序

固定本次離線排程：t=0取得初始值，之後每100ms一個不同數值，至t=0.9共十筆；期間不移出通知，t=1.0發布先執行，之後才做1.0秒採樣。所有值皆通過篩選，發布請求及容量足夠，佇列從舊到新排列。這樣才能確定首批會保留0.8與0.9，而不把同時刻排程當成保證。

| 時間 | 入列後內容 | 溢位處理 |
| --- | --- | --- |
| 0.0s | [0.0] | 未滿 |
| 0.1s | [0.0,0.1] | 未丟棄 |
| 0.2s | [0.1*,0.2] | 刪0.0，0.1標Overflow |
| 0.8s | [0.7*,0.8] | 保留尾端兩筆 |
| 0.9s | [0.8*,0.9] | 0.8帶Overflow |
| 1.0s發布 | 依序交付0.8及0.9 | 十筆中八筆已淘汰 |

星號表示該DataValue的StatusCode帶Overflow資訊位。本例discardOldest=true淘汰最舊後，旗標設在剩下的下一筆，因此最後是0.8有旗標。它表示有通知遺失，不攜帶遺失筆數；本例能算出八筆，是因已知十次入列及兩筆保留，現場不能只憑旗標算出精確缺口。

本例若把1.0秒採樣安排在發布之前，就會保留0.9與1.0，與表格不同。這是排程邊界差異；實際SDK、伺服器及來源週期必須用日誌確認。來源500ms才更新、deadband擋下部分變化或revised interval變慢，都會改變入列數。

Client處理也可能造成下一個Publish週期錯過。收到通知時先保存原始DataValue與StatusCode，再做轉換或寫入畫面；不要在回呼中執行長時間資料庫工作。若必須排隊，另記clientQueueDepth與processingDuration，才能區分Server佇列Overflow和Client自己的積壓。

## discardOldest Overflow與burst資料

QueueSize大於一時，discardOldest=false並非永遠保留原來所有舊值：滿列時用新通知替換最後入列值，並在新值標Overflow。例如[0.0,0.1]再入0.2，結果為[0.0,0.2*]。兩種策略都可能漏掉中間變化，選擇前先說明要最新狀態還是較早的變化。

| 設計 | 可觀察結果 | 適用判斷 |
| --- | --- | --- |
| queue 1 | 最新一筆；忽略discard策略 | 畫面狀態，不要追歷史 |
| queue 2+ discardOldest | 新值進來會淘汰最舊，可能Overflow | 保留短尾端 |
| 大queue | 可承受較長burst但仍有上限 | 需估算記憶體與延遲 |
| revised sampling | 取樣比請求慢 | 以回覆值重算新鮮度 |
| filter未通過 | 沒有新通知入queue | 不能用通知數推算來源無更新 |

不要把keepalive當成資料更新。Subscription可能在沒有DataChange時送KeepAlive，表示Publish流程仍有回應或需要維持生命週期；它不表示來源值剛剛取樣，也不會清除Overflow。Client應分別保存lastDataChangeAt、lastPublishAt、lastKeepAliveAt和sequence number。

若使用者要求完整事件，應改採適合的歷史或批次機制，而不是只把queue從2盲目放大。Queue大小還受Server資源、監看項目數、取樣速率和資料型別影響。正式設定先查目標Server的最小、最大與revised interval限制。

QueueSize=1是特例，只保留最新通知並忽略discard策略，這種覆蓋不使用大於一佇列的Overflow標記。沒有Overflow不能證明一筆都沒漏；短脈衝可能在下一次發布前被替換。對脈衝計數或完整歷史應另外設計來源累計或歷史保存，不靠畫面刷新保證完整。

## 監看契約與失敗先查順序

sampling、queue及filter屬於MonitoredItem，publishingInterval屬於Subscription。同一Subscription中的項目共享發布間隔；若兩組資料需要不同發布節奏，就評估分成不同Subscription，並核對伺服器的數量與資源限制。監看表要分清每項取樣設定與所屬訂閱，不能只寫一個通訊週期。

案例：一個100ms來源在一秒發布時收到兩筆尾端通知，其中一筆StatusCode有Overflow。正確報告是「最新值可用，但中間至少有變更被淘汰」，不能把兩筆當完整十筆歷史。若沒有Overflow卻只收到一筆，要查來源是否只變一次、filter是否擋下其餘樣本、或Server實際sampling被revised。

失敗先查順序是：讀建立結果的revised parameters；確認Subscription與MonitoredItem狀態；保存每筆Notification的Value、StatusCode、SourceTimestamp、ServerTimestamp與sequence；再查Client processing和網路。不要先把Publish頻率加快，因為問題可能是來源沒有更新或queue已經溢位。

規範不會替所有廠牌定義最小interval、UI名稱或資料庫保存欄位。本文示例沒有指定PLC函式、Client API或Server產品，所有100ms、1秒與queue2都是教學設定。實機需以目標Server回覆的revised值、能力文件和監看日誌驗證。

如果重連後Subscription被重新建立，應把新的SubscriptionId、MonitoredItemId與建立時間寫入日誌，並清楚標示序號重新開始。舊通知晚到時不能併入新世代；以連線世代、通知序號和時間戳一起判斷，避免重連造成假資料新鮮度。

Publish需要Client持續提供可用請求。即使發布間隔設定很短，請求耗盡或回呼阻塞仍會影響交付。檢查SDK的Publish管線與待處理請求數，將連線活著、通知仍流動及來源仍更新分開觀察，才能正確定位延遲。

## FAQ 驗收與官方依據

FAQ1：PublishingInterval=1秒代表每秒取樣一次嗎？答：不代表，取樣與發布是兩個參數。

FAQ2：QueueSize=2代表保留兩秒嗎？答：不代表，是最多兩筆已取樣且通過篩選的通知。

FAQ3：看到KeepAlive就代表資料新鮮嗎？答：不代表，只能說Publish生命週期仍有回應。

FAQ4：Overflow在哪裡讀？答：讀DataValue的StatusCode InfoBits，不是猜一個額外的Overflow點位。

練習依本篇固定時序列出0.0至0.9秒十筆樣本，逐筆維護兩格佇列，確認最終[0.8*,0.9]。再改成queue1與discardOldest=false各算一次，比較旗標及保留結果。這些是可重算的對應結果，不是已執行伺服器模擬；實際連線還需核對建立回覆及通知日誌。

參考：[OPC UA Part 4 §5.13.1.2 Sampling interval](https://reference.opcfoundation.org/specs/OPC-10000-4/5.13.1.2)

參考：[OPC UA Part 4 §5.13.1.5 Queue parameters](https://reference.opcfoundation.org/specs/OPC-10000-4/5.13.1.5)

參考：[OPC UA Part 4 §7.25.2 DataChangeNotification](https://reference.opcfoundation.org/specs/OPC-10000-4/7.25.2)

官方規範說明SamplingInterval、佇列規則與DataChangeNotification的StatusCode Overflow；實際Server能否接受請求、revised值、排程抖動與Client處理方式仍要由產品文件和日誌確認。本文是離線資料模型。

交付報告應把每次Publish的通知數、Overflow次數、最後資料時間、最後KeepAlive時間和Client處理耗時列出。只有這些欄位同時存在，才可分辨來源不更新、取樣被revised、Server丟棄、網路延遲與Client塞車。

## 延伸閱讀

- [從OPC UA瀏覽結果建立可重連的點位清單](/articles/opcua-browse-nodeid-namespace-uri-persistent-point-list)
- [OPC UA Deadband門檻與工程單位核對](/articles/opcua-datachange-filter-deadband-engineering-units)
