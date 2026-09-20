---
title: 通訊服務停止後怎麼保持資料品質與時間可信
description: 分開connection state與data quality，說明停止、watchdog、last value、OPC UA StatusCode及普通自動寫入閘門。
date: 2026-09-21
author: 站長
draft: false
category: 工業通訊與網路
---

## 一 把通訊狀態與資料品質分開

通訊服務停止時，先分成connection_state與data_quality兩個欄位。connection_state可自訂Running、Stopping、Stopped、WatchdogExpired；data_quality可自訂Good、Uncertain、Bad，或在確實使用OPC UA時採用其StatusCode。服務停止不等於最後一個數值變成零，品質變壞也不必然表示程序已停止。

每筆資料保存value、quality、source_timestamp、receive_timestamp、last_good_value、last_good_time、reason與service_epoch。停止後若沒有新值，value可保留最後值供顯示，但必須帶上Uncertain或Bad與時間；禁止用0填補，因為0可能是有效製程值。一般自動寫入、計算與告警應先檢查品質政策。

若是OPC UA DataValue，Part 4規定Good、Uncertain、Bad的嚴重度；Bad值不可使用，Uncertain要依子碼謹慎處理。Part 8另有Bad_NoCommunication、Uncertain_NoCommunicationLastUsable等資料存取語意。自訂系統若不用OPC UA，應明確寫出自己的enum和轉換規則，不要把自訂Bad宣稱成OPC UA StatusCode。

品質欄位要有可追溯的更新規則。例：最後一筆Good為23.4，source_timestamp是09:59:59.800，receive_timestamp是10:00:00.020；若10:00:00.120服務停止，這筆值仍可顯示，但quality應立即改成Uncertain或自訂Bad_ServiceStopped，並保留last_good_time。畫面顯示23.4不代表它仍是即時量，資料表也不應把空值改成0。

| 欄位 | Good | Uncertain | Bad |
| --- | --- | --- | --- |
| value | 可供一般計算 | 依政策限制 | 不可普通自動寫入 |
| last_good | 同步更新 | 保留 | 保留但標舊 |
| timestamp | 新來源時間 | 最後確認時間 | 不填現在時間 |
| reason | None/來源 | holdover或暫態 | 停止/無通訊 |

## 二 graceful與abrupt停止

graceful停止先停止新請求，再讓目前交易完成或到deadline，寫入Stopped、service_epoch與原因，最後發布品質轉為Uncertain或Bad。abrupt停止可能沒有收尾機會，watchdog或監控程序需在下一個可執行點標記Stopped與品質失效。兩種流程都不可把最後畫面數值改成零。

案例中服務在10:00:00收到停止命令，最後Good值23.4、source_timestamp 09:59:59.800。若交易在10:00:00.120完成，可保存最後Good與停止事件；若超過deadline未完成，標OutcomeUnknown，品質依政策轉Bad_NoCommunication或自訂Bad_ServiceStopped。receive_timestamp記錄實際收到時間，不冒充來源時間。

watchdog應監看心跳、服務epoch、最後成功交易和queue，不只看process存在。若process仍在但心跳停止，設WatchdogExpired；若服務正常停止且留下結束事件，設Stopped。重啟後建立新epoch，先恢復連線並取得一筆有效資料，並確認符合來源採樣與新鮮度政策，再把品質升回Good。

graceful與abrupt要在事件時間線中區分。graceful例中，服務在10:00:00.100收到停止要求，完成最後一次解析後於10:00:00.120寫Stopped，再把品質降級；abrupt例中，程序在10:00:00.100消失，監視器最後心跳在10:00:00.000，到10:00:00.600才因600毫秒watchdog逾時寫WatchdogExpired。兩者的last_good_value可以相同，但原因、偵測時間和service_epoch不同，不能只靠一個Bad旗標還原。

重連時先進入Starting或Connecting，建立新service_epoch並封存舊epoch未完成請求的取消或結果不明狀態，再移出活動佇列；收到第一個格式正確且來源可辨識的資料後才轉為Running/Good。若只建立TCP連線就直接恢復Good，斷線期間延遲的舊封包可能被誤當成新值。恢復策略應把「連線已建立」與「資料已驗證」分成兩個事件，並在日誌記錄各自的時間。

| 事件 | connection_state | quality | value處理 |
| --- | --- | --- | --- |
| 停止命令 | Stopping→Stopped | Uncertain/Bad | 保留last value |
| 交易完成 | Stopping | 依結果 | 保存新值或unknown |
| watchdog逾時 | WatchdogExpired | Bad | 不填0 |
| 重啟未取值 | Running/WaitingValid | Bad/Uncertain | 等待新Good |

## 三 自動寫入與品質閘門

普通自動寫入必須先檢查quality、age、reason與服務狀態。例如控制計算需要Good且age≤2秒；Uncertain可只更新畫面並告警；Bad直接停止該普通寫入或轉人工流程。這是資料品質閘門，不是安全控制、急停或功能安全保證，安全功能仍須獨立設計與驗證。

last_good_value可用於趨勢顯示，但顯示文字要標明last_good_time與stale age。若畫面只顯示23.4而不顯示品質，操作員可能把舊值當即時值。報表可以保存Bad事件與最後值，但報表查詢不能把Bad資料無條件平均進入生產KPI。

若品質恢復，先確認新資料的source_timestamp、接收時間、服務epoch、來源身份與範圍，再由Good狀態取代Uncertain。只收到一個格式正確但來源未確認的封包，不應直接恢復。若OPC UA客戶端讀到Bad，應忽略該DataValue的Value；若需顯示歷史值，另取先前保存的last_good_value並明標舊資料；自訂介面也應有同等明確規則。

若採用OPC UA，直接保存標準StatusCode與Value、SourceTimestamp、ServerTimestamp；Bad_NoCommunication與Uncertain_NoCommunicationLastUsable的語意不能隨意互換。若產品內部另有ServiceStopped、WatchdogExpired等枚舉，應在介面文件中列出它們如何映射到Good、Uncertain或Bad，並保留原始碼。自訂枚舉不能宣稱就是OPC UA標準碼。

自動寫入閘門可用測試案例驗證：Good且age=0.8秒通過；Uncertain且age=0.8秒只供顯示；Good但age=2.1秒拒絕；Bad即使數值看似合理也拒絕。每次拒絕保存tag、quality、age、connection_state、epoch與原因，讓人能分辨通訊停止、資料過期、格式錯誤及權限問題。

| 使用情境 | quality | 允許動作 | 必保存 |
| --- | --- | --- | --- |
| 畫面顯示 | Uncertain | 顯示last value+警示 | last_good_time |
| 自動閉迴路計算 | Bad | 禁止普通寫入 | reason/epoch |
| 報表回溯 | Uncertain | 分欄統計 | quality分布 |
| 恢復首筆 | 待確認 | 不上Good | 來源/時間/狀態 |

## 四 排查與驗收限制

排查先問服務是否graceful或abrupt，再查最後Good時間、心跳、epoch、watchdog、queue、連線錯誤與來源時間。若數值變0，查是否有初始化、錯誤分支或畫面格式化把Bad轉0；若品質仍Good但服務已停止，查狀態更新是否遺失。每個事件保留原始reason，不只記「通訊錯」。

驗收案例包含：正常停止後品質變Uncertain且last value保留；交易中斷後標OutcomeUnknown；watchdog逾時轉Bad；重啟連線但尚未有有效值仍為Bad/WaitingValid；重新取得Good資料後才恢復。若採OPC UA，核對標準StatusCode及DataValue timestamp；若採自訂enum，核對文件中enum與客戶端行為。

型號限制很重要：某些PLC、OPC UA server或通訊模組可能只提供錯誤碼，不提供last value或品質欄位；不要自行宣稱存在原生quality。可以在外層收集器建立資料模型，但要標明轉換來源與不確定性。安全聯鎖應由設備設計與安全規格處理。

| 症狀 | 先查 | 預期判斷 | 避免 |
| --- | --- | --- | --- |
| 停止後變0 | 初始化/顯示層 | 保留值並標品質 | 0當錯誤 |
| 心跳停但process在 | watchdog/epoch | Expired→Bad | Good不變 |
| OPC UA Bad | StatusCode/Value | 不可使用 | 只看Value |
| 重啟後立刻Good | 首筆來源/時間 | 等待有效值 | 程序活著即Good |

## 五 FAQ與官方來源

把「值是否存在」與「值能否用於決策」分開。保存last_good_value=23.4是為了診斷；趨勢應標斷線缺口，不畫成連續有效量測，寫入控制命令前卻必須檢查quality、資料年齡、connection_state及service_epoch。若規則是Good且age不超過2秒才允許普通自動寫入，10:00:02.021之後即使畫面仍顯示23.4，也只能拒絕寫入並留下reason=Stale。這是一般資料保護規則，不是安全功能。

FAQ1：通訊停止時可以把值設0嗎？答：不可以直接這樣做。0可能是有效值；保留last value並附quality、時間和reason，或明確回傳無值。

FAQ2：自訂Bad等於OPC UA Bad嗎？答：不等於。OPC UA有標準StatusCode與子碼；自訂enum要明確標示，不能冒充標準。

FAQ3：Uncertain的值能否自動寫入？答：依資料用途制定閘門。普通自動寫入通常禁止或需人工確認，安全功能另行設計。

FAQ4：服務重啟就能把品質改Good嗎？答：不能。先建立新epoch、完成連線並取得通過來源與時間檢查的有效資料。

參考：[OPC Foundation Part 4 §7.11.5與§7.38：StatusCode的Good/Uncertain/Bad語意及使用前檢查要求。](https://reference.opcfoundation.org/specs/OPC-10000-4/7.11.5)

參考：[OPC Foundation Part 8 §7.3：資料存取Bad/Uncertain狀態，包括Bad_NoCommunication與Uncertain_NoCommunicationLastUsable。](https://reference.opcfoundation.org/specs/OPC-10000-8/7.3)

## 延伸閱讀

- [多站輪詢如何隔離單站故障仍服務其他站](/articles/serial-multi-station-polling-isolation)
- [HMI數值輸入範圍步距雙層驗證](/articles/hmi-numeric-range-step-validation)
