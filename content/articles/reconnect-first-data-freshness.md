---
title: 連線恢復後第一筆資料的新鮮度判斷
description: 以連線epoch、device sequence/version、fresh request與source/receive timestamp區分恢復後快取與新資料，證據不足維持Unknown/Uncertain。
date: 2026-09-21
author: 站長
draft: false
category: 工業通訊與網路
---

## 一 恢復後第一筆不等於新鮮資料

連線恢復後收到的第一筆資料，可能是設備重送、閘道快取或重新建立請求後才採樣的結果。不能看到第一筆就標 Fresh。本文用 epoch、device sequence/version 與 fresh request 建立證據；接收時間只說明主機何時收到，不能代替設備採樣時間。quality 名稱是本案例自訂，不冒充標準欄位。

每次連線建立新的 connection_epoch，例如 18。設備資料另帶 device_sequence=742 與 source_timestamp=10:00:03.200；主機在10:00:03.450收到。若資料回應的是本次 fresh request_id=R81，且序號與採樣條件符合，才可把狀態升為 Fresh。

| 證據 | 案例值 | 能證明什麼 | 不能證明 |
| --- | --- | --- | --- |
| epoch | 18 | 本次連線世代 | 不是新採樣 |
| device_sequence | 742 | 設備序號進度 | 不一定屬本次請求 |
| source_timestamp | 10:00:03.200 | 設備採樣時刻 | 不保證時鐘同步 |
| receive_timestamp | 10:00:03.450 | 主機收到時刻 | 不是採樣時間 |
| fresh_request | R81 | 請求關聯 | 需設備回應語意支持 |

若只看到 receive_timestamp，而沒有 request_id、設備序號或其他新鮮度證據，狀態應是 Unknown 或 Uncertain。舊快取值即使在新 TCP connection 上送出，也不能因 epoch 更新就變成新資料。

恢復流程先標 Disconnected，再建立新 epoch；在取得足夠證據前，主循環可保留 last usable value，但必須同時顯示 stale/uncertain 狀態。不能將保留值當成剛採樣值執行需要新鮮資料的操作。

恢復狀態表可另記 last_accepted_epoch、last_device_sequence 與 last_fresh_request。這些欄位不是控制命令，而是判斷證據；每次拒絕晚到資料都保留 reason，避免下一次重連把舊事件誤當新基準。

若 gateway 代替設備回覆，還要知道 sequence 是設備序號還是 gateway 序號。不同來源不可混用同一個 device_sequence 欄位，否則序號前進沒有可比較語意。

## 二 epoch 與設備序號的配對

epoch 用來隔離連線世代，device sequence/version 用來判斷資料在設備端的順序。兩者責任不同。連線從epoch17斷線後恢復為18，收到序號741的舊快取，再收到742的新資料；即使741是恢復後第一個 packet，也只能標 Uncertain 或 Stale，直到協定證明它是本次採樣。

若設備序號回到1，可能是設備重啟或計數器回捲，不能直接判定資料倒退。此時需要 boot_id、device_epoch 或重新同步程序。若只有序號，至少標 sequence_reset 並暫停 Fresh 判定，直到取得新的基準。

| 事件 | epoch | device sequence | 狀態 |
| --- | --- | --- | --- |
| 斷線前有效 | 17 | 740 | Fresh/自訂 |
| 恢復首筆快取 | 18 | 740 | Uncertain |
| 恢復回應舊值 | 18 | 741 | 仍需請求證據 |
| fresh request回覆 | 18 | 742 | 可依規格Fresh |
| 設備重啟後 | 18 | 1 | Unknown/sequence_reset |

收到晚到的epoch17資料時，不能更新epoch18的現行狀態；至少以 connection_epoch 作第一層隔離。若資料透過共享佇列跨連線傳遞，佇列項目也要帶 epoch，不能只帶 value。

device sequence 不等於 server receive order。網路重排、快取與重試都可能讓較小序號晚到。每次判定要記錄上一個已接受序號、目前epoch、來源時間與判定原因，讓排查者能看到為何拒絕或保留。

epoch 應在連線真正建立並通過身份確認後產生，不能每次收到任意封包就增加。若未完成身份確認的資料進來，先標 UnknownSource 並隔離，避免攻擊或錯接設備推進狀態。

重連的時間線要包含連線開始、身份確認、fresh request送出、回覆收到與品質轉移；只記錄 TCP established 無法證明資料新鮮。

## 三 fresh request 與時間戳限制

fresh request 的語意必須由協定定義。例如 R81 要求設備在收到後重新採樣並回傳 request_id=R81；若設備只回目前快取而沒有 request_id，則不能把它當成 Fresh。若設備支援「立即回報最近值」而非重新採樣，應另標 CacheReply。

source timestamp 與 receive timestamp 要同時保存。source_timestamp若依變值事件更新，不前進可能代表設備值沒有變、設備時鐘解析度不足或資料是重送，不能僅憑不前進就判斷斷線；receive_timestamp 則可計算主機側資料 age，但不能直接推出設備採樣 age。

| 情境 | 證據 | 本案例狀態 | 動作 |
| --- | --- | --- | --- |
| 新epoch無序號 | 只有receive time | Unknown | 保留但不宣稱Fresh |
| 有舊序號快取 | epoch18/seq740 | Uncertain | 等待fresh request |
| R81回覆/seq742 | request對得上 | Fresh | 更新可用狀態 |
| source時間舊 | 無法證明重採樣 | Stale/Uncertain | 記錄原因 |

資料 age 可拆成 receive_age 與 source_age_estimate。前者由 monotonic clock 計算主機收到後經過多久；後者還需要可信的時鐘關係與來源 timestamp。沒有時鐘同步證據時，不要把 source_timestamp 減本機現在時間當成精確 age。

quality 若使用 Good、Stale、Unknown、Uncertain 等名稱，必須在本系統文件定義其轉移條件。不能把自訂 Good 寫成某個標準協定的原生品質碼，也不能用「第一筆」這個事件自動升級品質。

若設備只提供遞增 version 而沒有 source timestamp，可用 version 判斷相對新舊，但不能由此算出精確 age。若 version 可能跨重啟回到0，需保存 boot_id或把回捲標為Unknown。

主機 receive time 可由 monotonic clock計算等待時間，wall clock則用於對外報表。兩者混用會在系統校時跳變時製造錯誤age；若另用當地牆上時間相減，夏令時間切換也會造成問題。

## 四 恢復時間線與驗收

時間線案例：10:00:00 epoch17最後接受seq740；10:00:02 TCP斷線；10:00:05建立epoch18；10:00:05.100收到快取seq740，標Uncertain；10:00:05.300送fresh request R81；10:00:05.420收到seq742、request_id=R81，才標Fresh。

第二案例在10:00:05.100收到seq741但沒有request_id，狀態仍Uncertain；10:00:06收到seq742但source timestamp仍是斷線前時間，狀態不自動升級，除非設備文件明確保證序號前進即代表新採樣。驗收要把「有新序號」和「有新鮮採樣證據」分開。

| 測試 | 輸入 | 預期狀態 | 驗收記錄 |
| --- | --- | --- | --- |
| 恢復首筆快取 | epoch18/seq740 | Uncertain | 保留raw與原因 |
| 無request關聯 | seq741 | Uncertain | 不宣稱Fresh |
| fresh回應 | R81/seq742 | Fresh | request與epoch匹配 |
| 晚到舊epoch | epoch17 | 拒絕更新 | 記錄late_epoch |
| 設備重啟 | seq回1 | Unknown | sequence_reset |

排查先看 epoch 是否正確隔離，再看 device sequence/version，再看 request_id 與 source timestamp，最後才看畫面顯示。若主循環只收到一個 value，應補強資料結構而非靠接收時間猜新鮮度。

本文不提供自動恢復機台或安全控制程式。實際恢復政策需依設備協定定義重新取樣、快取、序號回捲與身份驗證；在證據不足時保留 Unknown/Uncertain 是資料品質決策，不是網路成功的替代品。

fresh request 超時時，現有快取可繼續標 Uncertain，但不能自動升回Fresh。重試 request 應有 request_id 與 deadline；晚到的舊 request 回覆要以 request_id 過濾，不能只看 sequence。

如果設備文件明確說 response 是收到請求時的快照，而不是重新採樣，這個語意要寫入驗收；同一筆資料在不同設備上的 Fresh 判定不能只靠欄位名稱。

## 五 驗收 FAQ 與來源

恢復後第一筆資料要由 epoch、設備序號/版本、fresh request 與時間戳共同判讀。receive timestamp 只是主機收到時間；沒有足夠證據就維持 Unknown 或 Uncertain。Good、Stale、Unknown 等名稱均為本案例自訂。

FAQ1：新 TCP 連線收到第一筆就代表新資料嗎？答：不代表，可能是設備或閘道快取，需額外 freshness 證據。

FAQ2：device sequence 增加就一定是新採樣嗎？答：不一定，須看設備協定是否保證序號與採樣關係，否則只能作部分證據。

FAQ3：receive time 可以代替 source time 嗎？答：不行；前者是主機收件時間，後者才是設備提供的採樣時間，但兩者時鐘與語意仍需核對。

FAQ4：source timestamp 不變是否表示設備故障？答：不一定，若時間戳按變值事件更新，值未變可能保留原時刻；解析度或重送也可能造成不變；需結合序號、請求回應與設備狀態。

參考：[RFC 3339：時間戳格式與時區表示參考；不保證不同設備時鐘同步。](https://www.rfc-editor.org/rfc/rfc3339)

參考：[OPC UA Part 4 Services：DataValue/SourceTimestamp與ServerTimestamp概念參考，本文品質狀態仍為自訂。](https://reference.opcfoundation.org/Core/Part4/v105/docs/)

驗收報表要同時列「首筆收到」與「首筆可判Fresh」時間，兩者通常不同。若10:00:05.100收到快取、10:00:05.420收到R81，自連線建立到Fresh為420ms；首包等待100ms，首包至Fresh另等320ms，三個起點不能混用。

品質轉移的每個原因要可追溯，例如 CacheAfterReconnect、FreshRequestMatched、LateEpoch、SequenceReset；自訂名稱只在本系統使用，不能冒充標準協定碼。

若系統需要在恢復後允許顯示但禁止控制，應把顯示用 last usable value 與控制用 Fresh gate 分開；同一個 value 可以被畫面呈現，卻因 Uncertain 而不得進入需要新鮮證據的流程。這是資料品質策略，不是把 Uncertain 偽裝成 Good。

跨設備整合時也要保留來源 device_id 與 gateway_id，避免兩台設備序號相同造成錯配。freshness判定先驗證身份，再比較epoch與序號。

所有品質轉移都應留下原始證據與時間，讓恢復問題可以重演，而不是只保留最後狀態。

複核時須確認R81確實要求重新採樣；若只是查快取，即使request_id符合也不能通過本例Fresh條件。

## 延伸閱讀

- [背景通訊任務與主循環共享資料快照](/articles/background-task-main-loop-snapshot)
- [交換器埠錯誤計數如何對照應用層重試](/articles/switch-port-errors-application-retries)
