---
title: OPC UA品質碼與最後可用值
description: StatusCode品質分層與最後可用值驗收。
date: 2026-09-17
author: 站長
draft: false
---

## 概念與案例

OPC UA DataValue可包含Value、StatusCode、SourceTimestamp與ServerTimestamp。Good、Uncertain、Bad是嚴重度，不是HMI顏色或控制命令。Good表示相關作業成功及結果可用，應用仍要另外檢查工程條件，Uncertain定義為值存在但來源或條件有限，Bad定義為不可當有效製程資料。資料庫保存原始StatusCode、可核對名稱、NodeId、Value、兩個時間戳及接收時間，不能只存Good布林或自造十六進位碼。

同一個23.4可能是Good或Uncertain_LastUsableValue，語意完全不同。本文分開displayValue與valueForControl；本例Uncertain_LastUsableValue顯示最後值並標來源無法更新，控制路徑仍不可用；Bad值不採用但保留診斷。目標Server是否送SourceTimestamp、InfoBits及歷史品質，要依文件和測試確認，不能由規範名稱推定產品行為。

| 狀態 | Value | 控制 |
| --- | --- | --- |
| Good | 23.4 | 依規則可用 |
| Uncertain_LastUsableValue | 23.4 | 顯示、禁控制 |
| Bad_NotConnected | 不可用 | 禁控制 |

單調時鐘只能計算本機收到資料後經過的時間，不能直接當作SourceTimestamp age。SourceTimestamp不前進可能只是值未變，不能單獨判定異常；DataValue的欄位也可能缺省，程式要先檢查是否存在再解讀。

開始前先在SDK查看完整StatusCode與符號名稱，關閉只顯示Good布林的簡化欄位。把同一筆原始回覆和HMI顯示放在一起比對；若Server提供Uncertain而HMI仍顯示正常，先查映射表，不要先重啟網路。未知碼保留原數字，依所用規格版本查證，不能自造標準StatusCode。

## 品質時間線

建立Line1.Temp虛構Node，範圍零至八十攝氏度。t=0收到23.4 Good，t=5收到23.6 Good，t=10收到23.6 Uncertain_LastUsableValue，t=15收到Bad_NotConnected；t=18收到23.8 Good。驗收要求t=10及t=15兩筆仍可顯示舊值，但valueForControl不可用；恢復時先驗證型別、單位、範圍與新鮮度。

| 收到時刻 | 顯示 | 本例資料准入 |
| --- | --- | --- |
| t=0 | 23.4 正常 | 通過工程檢查後可用 |
| t=5 | 23.6 正常 | 更新最後有效值 |
| t=10 | 23.6 最後可用值 | 停用目前資料准入 |
| t=15 | 23.6 舊值／通訊未連接 | 不採用Bad附帶值 |
| t=18 | 23.8 待核對恢復 | 檢查通過後恢復准入 |

Good不代表製程安全，仍須檢查模式、聯鎖與資料年齡；Uncertain不代表數值一定錯，而是條件不足；Bad不可用零代替，否則通訊故障會變成假零。收到Good但帶SemanticsChanged，先重讀資料型別、工程單位與範圍，完成核對才更新解碼，不可自動套用倍率。

時間檢查要分兩種：單調時鐘量出接收後經過多久；來源時間與接收端UTC比較則需要已知的時鐘同步誤差。SourceTimestamp沒變可能只是來源值沒變，應配合ServerTimestamp、服務回覆與產品更新契約判斷。若時間跳回或超前，保留clockAnomaly等自訂旗標，不能直接改寫Server原始StatusCode。

適用限制要寫在驗收表：本文只討論核心StatusCode與離線應用層映射，不指定PLC、SCADA、HMI或控制器的安全動作；Bad值是否觸發停機、替代量或人工確認，需依製程風險與產品文件決定。測試時將五種StatusCode逐筆注入隔離資料源，保存原始碼、時間戳、應用品質、畫面文字與控制准入，重新載入後比較前後快照，確保沒有因重啟而把Uncertain或Bad誤清成Good。

在t=15看到23.6，是HMI另外保存的t=5最後有效值，絕不是把Bad回覆附帶的Value當作有效量測。畫面應同時標最後有效時刻；若使用者匯出報表，匯出欄位也要攜帶品質，不能只在螢幕上加一個紅色圖示。

## 資訊位元

Severity分大類，SubCode再說明原因。StructureChanged與SemanticsChanged是StatusCode各自的旗標；它們不屬於位元0至9的InfoBits。Overflow則是InfoType表示DataValue時的InfoBits內容。實作應使用SDK支援的遮罩與解析方法，避免把附加旗標當成整個狀態名稱。

測試五筆輸入：Good加23.4、Uncertain_LastUsableValue加23.4、Bad_NotConnected、Good加SemanticsChanged、Good加Overflow。逐筆核對資料庫、HMI、控制准入與告警時間；歷史插值或前值保持另標derived，不能覆蓋原始品質。相同Value仍可能因品質不同而有不同准入結果；兩個不同Bad原因則可同樣拒用，但排查方向不同。

| 附加旗標 | 保存 | 驗收 |
| --- | --- | --- |
| Overflow | 原碼與序號 | 查遺失 |
| StructureChanged | 版本 | 重讀結構 |
| SemanticsChanged | 新舊狀態 | 重讀語意 |

資訊位元不是可忽略的裝飾。當StructureChanged出現，舊資料解碼器可能仍能讀出數字，卻不能保證欄位意義相同；當SemanticsChanged出現，應保留前後元資料版本、變更時間和重新核對結果。驗收不能只看程式沒有例外。

若最後有效值只供顯示，欄位名稱應明確加上display或lastUsable，避免下游把它當即時值。

Overflow說明MonitoredItem佇列曾捨棄偵測到的變化，不能從這一個旗標算出丟失筆數。佇列大小為一時，不用這個旗標標示覆蓋，因此沒有Overflow也不能證明每筆採樣都保存。驗收報告分開寫目前值可否用，以及歷史是否完整，避免把兩件事混成一個Good指示燈。

## 流程排查

每筆資料先驗證NodeId與型別，再保存原StatusCode及時間，接著判斷severity、subcode、InfoBits，最後檢查工程範圍與新鮮度。TCP恢復不等於DataValue恢復Good，要等新的有效通知；首筆仍Uncertain時保持標籤，Bad_OutOfService時顯示設備狀態。

Subscription要保存通知序號，Read要保存請求與回覆時間；兩者都不能自行把遺失通知補成Good。若畫面顯示23.6而控制停用，快照應查到Uncertain與最後有效時間。控制互鎖與替代量由製程規格決定，本文不冒充廠商控制程式。

建立驗收表時先記錄測點NodeId、資料型別、工程單位、允許範圍與來源時間規則，再逐筆輸入Good、Uncertain和Bad。每筆保存原始StatusCode、解析結果、HMI文字、控制准入、接收時間與操作員判斷。若只有畫面截圖沒有原始碼，後續無法區分Server品質、SDK轉譯或應用層誤判。

反例是把Uncertain_LastUsableValue直接當成Good，因為數值仍是23.6。這會使斷線時閉迴路繼續使用過期值。另一反例是收到Bad_NotConnected後寫入零，畫面看似回到安全值，實際卻把設備故障偽裝成真實量測。正確流程是保留最後值供診斷，另外設不可用旗標並讓控制規格決定後續動作。

讀取時要把StatusCode檢查放在縮放和工程計算之前。若原始值是253、倍率0.1，先確認品質再算25.3；若StatusCode是Bad，不能因數學換算成功就更新最後有效值。SemanticsChanged出現時，舊倍率只能保留作比較，不能默認套用到新資料。

若應用層另設Fresh、Stale、Bad，必須把它放在StatusCode旁邊而非取代StatusCode。Fresh可要求Good和年齡門檻，Stale可保留最後顯示值，Bad可禁止控制。每個門檻都是工程設定，需在設定版本中保存，避免換機後沿用錯誤門檻。

## FAQ與來源

FAQ1：非Good要清零嗎？答：不應以清零掩蓋品質，Bad不可作有效製程值。

FAQ2：Uncertain_LastUsableValue可當目前量測嗎？答：本文控制路徑禁止。

FAQ3：SemanticsChanged要立刻改倍率嗎？答：不要猜，先重讀型別單位範圍。

FAQ4：Stale能寫入StatusCode嗎？答：不能冒充標準碼，放應用層並保留原碼。

練習時把同一筆23.6依次配上三種品質，寫下你預期的畫面文字和准入狀態，再與隔離測試程式比較。接著模擬應用重新啟動：尚未收到新資料之前只能顯示已保存的舊值及舊時刻，不能因初始化預設值而把品質清成Good。這項檢查能找出平常連線正常時看不到的啟動錯誤。

請用表格核對各狀態的處理結果。正式失效處置需與現有控制規格整合，尤其不能由資料品質文章自行決定停機、保持輸出或替代量。HMI是否支援完整原碼、歷史是否保留旗標，需按產品型號與版本逐項確認。

品質欄位與控制欄位分開，保存事件時間、接收時間與最後有效時間。Good值若超範圍仍由應用層拒收；Bad前最後值可供趨勢診斷，歷史資料保留原StatusCode。OPC UA Part 4 §7.11.5、§7.38.1、§7.38.2為官方依據；特定SDK映射、HMI映射與控制失效動作仍須查產品文件。

參考：[OPC UA Part 4 §7.11.5](https://reference.opcfoundation.org/specs/OPC-10000-4/7.11.5)

參考：[OPC UA Part 4 §7.38.1](https://reference.opcfoundation.org/specs/OPC-10000-4/7.38.1)

## 延伸閱讀

- [OPC UA資料分發架構選型](/articles/opcua-pubsub-client-server-data-distribution-selection)
- [OPC UA斷線後如何恢復資料](/articles/opcua-reconnect-lifecycle)
