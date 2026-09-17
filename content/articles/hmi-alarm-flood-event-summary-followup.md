---
title: HMI 警報洪水時怎麼設計事件摘要與後續處理
description: 以公用系統停機造成50筆連鎖警報的離線案例，設計原始事件保留、摘要聚合、候選root cause、ACK/Clear/Shelved狀態與洪水後檢討。
date: 2026-09-17
author: 站長
draft: false
---

## 先定義洪水而非刪訊息

先區分警報洪水的管理定義與本篇練習。本文以公用系統擾動後的50個警報生命週期，設計15分鐘摘要視圖；沒有以此判定符合任何ISA標準門檻。站點應依警報理念、操作能力與採用版本訂定判準，不能直接複製教學數字。

聚合摘要的目的，是讓值班人員先看到時間線、來源區域、目前Active數、已Clear數、未Ack數與可能的共同前件，同時保留50筆原始event。root cause只能是候選，因為同時發生不代表因果；最後判斷要靠SOE時間、設備診斷、控制邏輯與現場證據。

不要用聚合把事件靜默丟掉、自動ACK或直接清除。摘要是另一個視圖，原始journal、eventId、source、priority、active/clear/ack時間與操作者動作都要可回查。

摘要定義window=[14:00:00,14:15:00)，以本地UTC+8顯示，資料保留UTC。eventCount只計此窗新開始的唯一生命週期；14:15:00開始的事件歸下一窗。上一窗仍Active者另列carryIn，不能再算新發生。跨窗顯示可引用原eventid，總數則使用相同口徑去重。

| 欄位 | 案例值 | 用途 | 限制 |
| --- | --- | --- | --- |
| windowStart | 14:00:00 | 定義觀察窗 | 不是標準門檻 |
| windowEnd | 14:15:00 | 計算洪水量 | 需固定時區 |
| eventCount | 50 | 摘要量級 | 不代表根因 |
| candidateRoot | Utility-Trip | 供人工查證 | 不是自動結論 |

## 五十筆事件的保留與摘要

案例50筆事件中，第一筆U-01公用電源失效在14:00:00，接著泵浦、溫度、流量與通訊警報在14:00:01至14:00:40出現。摘要可依source area與時間聚合成一個「公用系統擾動候選群」，但每筆仍保留自己的eventId與狀態。

| 週期ID範圍 | 來源類型 | 新發生數 | 已Clear數 | 仍Active數 |
| --- | --- | --- | --- | --- |
| E001 | Utility | 1 | 0 | 1 |
| E002—E015 | Pump | 14 | 12 | 2 |
| E016—E035 | Temperature/Flow | 20 | 18 | 2 |
| E036—E050 | Communication | 15 | 10 | 5 |
| 合計（14:15前快照） | 所有群組 | 50 | 40 | 10 |

表格的新發生數1+14+20+15=50；同一快照已Clear為0+12+18+10=40，仍Active為10。再假設未Ack共8個，其中3個仍Active、5個已Clear；未Ack與Active可以重疊，不能相加成18筆。這些是離線狀態假設，不是設備量測，也不表示哪一群已確認因果。

洪水摘要可計算峰值active、峰值unacked、每分鐘新增、clear延遲中位數與priority分布，但統計不能取代事件。把三個告警同時清除只算一個恢復點會掩蓋每個設備的不同clearAt，故摘要必須能回到單筆時間。

若公用系統停機的第一筆事件本身也可能是感測器故障，候選root仍需保留不確定性。用同時性、來源可靠度與歷史模式排序候選，不用演算法分數冒充物理因果。

ACK操作要要求操作者、時間與可選備註，並保留原事件狀態。Clear是來源條件不再成立，不能因摘要關閉就發生；Shelved只是在指定期間抑制顯示或通知，期間仍要保存事件與shelve原因。 在Ignition中必須啟用適當Journal儲存與Store Shelved Events，並檢查篩選、修剪和容量，才能符合本案保留要求；預設不能視為完整保存。

生命週期數與Journal資料列數不同。50個cycle會產生50筆Active，40個已恢復者另有40筆Clear；若42個cycle各確認一次，還有42筆Ack，合計132筆轉換紀錄。重送不再新增轉換。eventid關聯cycle，資料列id識別轉換，展開清單必須保留這兩層。

## 候選root cause與時間證據

建立候選根因表：Utility-Trip在14:00:00最早、PLC失去通訊在14:00:02、泵浦低流量在14:00:05。這只代表時間先後，不代表Utility-Trip造成所有警報。要查utility電源事件、交換器link、控制器診斷、現場量測與因果模型，並標示證據支持或反駁。

同時發生也可能是共享時鐘、批次更新或單一網關重啟造成的共同觀測，不代表物理因果。若50筆事件的event time只精確到秒，14:00:00的多筆先後甚至不可判斷。摘要應保留source timestamp、gateway receivedAt與sequence，並顯示時間精度。

| 證據 | 可支持的說法 | 不能說 |
| --- | --- | --- |
| 最早event | Utility可能是候選起點 | 已證明root cause |
| 共同時間 | 可能共享觸發/更新 | 同時即因果 |
| Clear順序 | 恢復時間線 | 故障已修復 |
| ACK紀錄 | 有人接手 | 有人完成處置 |

候選root可由工程師確認為已證實、排除或未知三種結果，並保存依據。若只在摘要中寫root cause而原始事件沒有審核紀錄，後續人員會把假設當結論。任何自動關聯規則都應以版本號記錄。

洪水復盤可把每筆event對應到流程步驟、設備、控制器診斷與值班動作，形成可審查的時間軸。若五十筆中有一筆在首發前已active，便要修正候選排序，而不是為了符合故事刪掉它。

若要自動建議候選，規則只能輸出候選與信心依據，例如時間距離、拓撲關係、歷史同現模式；不得自動ACK、刪除原始事件或下控制命令。操作員確認後另記錄reviewer、理由與證據連結。

## 洪水結束後的檢討

15分鐘窗關閉時產生review包：新發生50、已Clear40、仍Active10、未Ack8、各priority分布，以及首發與最後事件。最高同時Active與未Ack峰值必須依完整狀態時間線計算，不能拿結束快照替代。若有晚到事件，記錄摘要版本與重算時間，原始紀錄仍保留。

檢討要問哪些警報可由單一母警報暫時壓低視覺噪聲、哪些其實是無操作價值的事件、哪些衍生警報仍需保留、事件時間是否同步、告警priority是否誤標、通知管線是否重複。任何抑制或重設要經變更管理，不用事後刪事件來讓統計好看。

Ignition官方文件可支持Alarm Journal保存eventid、source、priority、eventtype與eventflags，也說明pipeline可針對Active、Clear、Acknowledge事件處理。產品是否提供特定聚合元件或腳本介面，要依8.1版本文件查核；本文不造API。

事件處理管線若在洪水時限流，需另記queued、dropped、failed與retried；不能把通知沒送出當成警報未發生。歷史journal、HMI列表與通知結果是三種證據，需分開核對。

ISA公開資料描述警報生命週期與合理化方向；本文的15分鐘與50筆是站點自訂檢視參數，應由操作能力、歷史事件與需求審查，不引用成標準門檻。

驗收先確認50個唯一cycle和132筆案例轉換能一一關聯，再查10個Active及8個Unacked的集合。加入一次重送應不改數字；加入14:15:00的新Active應歸下一窗；補入14:14:59發生的晚到事件則依重算政策更新舊窗版本。

洪水結束後要檢查是否有大量同值、chattering或無操作價值警報，提出停用、延遲、deadband或改成事件的候選變更。這些變更要經合理化與管理流程，不在事後用自動ack掩蓋。

## FAQ 來源與驗證

FAQ1：50筆同時出現就能判定一個root cause嗎？不能，同時性只是線索；需用時間、拓撲、診斷與現場證據確認。

FAQ2：摘要後可刪掉衍生警報嗎？不可以，摘要應是視圖，原始event要保留並可展開。

FAQ3：本文15分鐘與50筆是ISA規定嗎？不是本文引用的標準判準，只是摘要練習；實際站點要查採用標準版本及警報理念。

FAQ4：洪水時可自動ACK或清除嗎？不應默認。ACK、Clear與Shelved各有不同語意，應保留操作者、原因與時間。

摘要的群組標題要顯示「候選」與建立時間，不要用Root Cause作為已確定標籤。操作員展開後先看最早事件與仍Active事件，再查看每筆priority、source、ack與clear；若資料不足，摘要直接標記待調查。

本文50筆事件、時間、候選root與15分鐘窗口為案例資料。

參考：[Inductive Automation Ignition 8.1 Alarming overview：Active、Cleared、Acknowledged、Shelved與通知流程。](https://www.docs.inductiveautomation.com/docs/8.1/platform/alarming)

參考：[Inductive Automation Ignition 8.1 Alarm Journal：eventid、source、priority、eventtype與eventflags。](https://docs.inductiveautomation.com/docs/8.1/platform/alarming/alarm-journal)

參考：[ISA-18 Series公開overview：警報生命週期、合理化、操作與持續管理；未宣稱讀到付費全文。](https://www.isa.org/standards-and-publications/isa-standards/isa-18-series-of-standards)

## 延伸閱讀

- [HMI 警報優先級如何轉成值班人員看得懂的顯示規則](/articles/hmi-alarm-priority-display-rules)
- [HMI 趨勢圖怎麼選時間範圍才能支援值班判斷](/articles/hmi-trend-time-range-sampling-aggregation)
