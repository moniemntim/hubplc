---
title: HMI 確認警報的流程怎麼避免只按掉提示
description: 以虛構壓縮空氣偏低事件建立 Active、Acknowledged、Clear、InProgress、Resolved 與 Reset 的分離流程，處理備註、來源時間、重發與重新發生。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先分清 Ack Clear Reset

警報畫面上的「按掉」不是一個狀態。acknowledge 表示某人看見並確認事件；clear 表示觸發條件恢復；reset 是另外設計的復歸或重新武裝動作；處理中、已排除、待主管確認則是本案例的工作流欄位。Ignition Alarm Journal 公開 eventtype 可分 Active、Clear、Acknowledgement，但畫面上的處理流程仍需依專案契約設計，不能把產品欄位擴張成 ISA-18.2 全部要求。

| 狀態 | 意義 | 可否取代其他狀態 |
| --- | --- | --- |
| Active | 條件目前成立 | 不能代表未確認或已處理 |
| Acknowledged | 有人確認並可有備註 | 不代表 Clear |
| Clear | 條件已恢復 | 不代表有人處理 |
| InProgress | 自訂工作流，正在巡檢 | 不代表 acknowledged/clear |
| Resolved | 自訂業務結案 | 需有證據/角色 |
| Reset | 自訂復歸命令或狀態 | 不等於條件恢復 |

完成本頁後，事件時間線應能同時容納 Active、Ack、Clear 與工作流狀態。例如壓縮空氣偏低在 22:14 Active，22:15 Operator Ack 並選「巡檢中」，22:20 壓力仍低，所以不能顯示已排除；22:27 條件 Clear，22:30 Supervisor 核對後才把工作流標 Resolved。

事件狀態的顯示文字要與資料欄位對齊。若畫面寫「已處理」，就要指向自訂工作流欄位和備註；若只收到 Acknowledgement event，文字應寫「已確認」而非「已排除」。這個字詞契約要放在欄位表和驗收表中，避免不同畫面各自翻譯。

來源時間、server 收到時間和操作時間可以不同。若網路延遲使 22:14:00 的 Active 在 22:14:03 才顯示，在來源時鐘可比較的前提下按source event排序；不同時鐘需標示偏差，並保留 receive delay；操作人 22:15:10 的 Ack 不能被畫成事件發生時間。

流程設計還要寫清楚誰可以改哪個欄位。Operator 可新增巡檢備註，但不應改 source event time、priority 或 eventid；Supervisor 可把工作流標為 Resolved，但不能把 Clear 時間改成核准時間。這樣事件來源與人工處置各自保真。

## 壓縮空氣事件的操作流程

案例以虛構壓縮空氣偏低 alarm 為例，來源時間和接收時間分開保存。22:14:00 PLC 條件成立，source timestamp 是 22:14:00；22:14:03 Gateway/SCADA 收到，HMI 顯示 Active。22:15:10 Operator 點 Acknowledge，輸入「巡檢中」；這只改變確認事件與備註，不改變壓力條件。22:27:20 source 條件恢復，事件 Clear；Supervisor 看到巡檢記錄與恢復時間後，22:30:00 將自訂工作流設為 Resolved。 本例假設事件來源另外提供PLC事件時間；Ignition Journal的eventtime不可在未核對來源時直接當作PLC掃描發生時刻。

| 時間 | 事件 | 狀態分離 | 記錄 |
| --- | --- | --- | --- |
| 22:14:00 | 條件成立 | Active、Unacked、Work=Open | source time、eventid |
| 22:14:03 | HMI 收到 | 仍 Active | receive/server time |
| 22:15:10 | Operator Ack | Active、Acked、Work=InProgress | user、note |
| 22:27:20 | 條件恢復 | Clear、Acked、Work=InProgress | clear time |
| 22:30:00 | 主管核對 | Clear、Resolved | approver、evidence |

若 Operator 在 22:15 直接按 Reset，產品若支援 reset 也只能依明確契約處理，不能把 reset 當成壓力恢復。若 reset 是 PLC 需要的命令，HMI 還要走 session、角色、模式、互鎖與 readback 驗證；若只是 UI 清單動作，則不得改寫 alarm source state。

Ignition Perspective Alarm Status Table 可分 activeUnacked、activeAcked、clearUnacked、clearAcked，並提供 acknowledge、shelve、unshelve。這些元件操作不會自動替專案定義巡檢或主管結案；工作流欄位要另行保存並與 eventid 關聯。

恢復判斷要以來源資料或產品明確事件為準。HMI 收到 Clear 之前，即使操作員說已修好，也只能把工作欄位改為待觀察，不能自行改寫 Clear。若來源 quality Bad，畫面應把恢復判斷標為未知，並保存最後有效值與時間。

## 重發事件與重新發生要分辨

先區分警報生命週期ID與每筆狀態轉換ID。Ignition Journal的eventid關聯同一active/clear/ack cycle，資料列id則識別個別轉換紀錄；同一eventid的Active、Ack及Clear都要保留。匯入重送時應用來源與穩定轉換ID去重，不能只以eventid刪掉後續轉換。若22:27 Clear後22:35再Active，才是新的生命週期。

| 情境 | eventid | HMI 呈現 | 排錯證據 |
| --- | --- | --- | --- |
| 同一Active轉換重送 | 相同cycle及轉換ID | 不新增重複轉換 | 來源＋轉換ID |
| Clear 後再 Active | 新 id | 新列、新時間線 | 前一 cycle clear |
| 同時多來源 | 各自 id | 可分組但保留原列 | source/condition |
| 洪水摘要 | 摘要 id（自訂） | 顯示 count/first/last | 展開原始事件 |

註解要寫在事件上而不是只寫在畫面文字。至少保存 comment、author、role、createdAt、sourceEventTime、serverReceivedAt 與 comment type；若操作員填「巡檢中」，要能知道它是對哪個 eventid、condition 和 cycle。時間顯示可轉成本地值，但資料庫和匯出檔保留 UTC。

排錯先查事件來源、eventid、condition、Active/Clear/Ack eventtype、接收時間和 HMI 操作時間。若 HMI 顯示已清除但 PLC 條件仍成立，先查來源品質、時鐘、tag binding、clear 邏輯和 cache，不要用 UI reset 製造假恢復。

重發與重新發生的判斷要依產品事件資料和來源契約，不應只比較顯示文字。保存 eventid、condition/source、sequence、Active/Clear cycle 和接收時間；若來源沒有穩定識別，就把去重能力標為待確認，不能把相同文字自動合併。

練習用cycle C1的三筆轉換：id101 Active、id102 Ack、id103 Clear。重送id101時仍只有三筆；新增C2的id104 Active後共有四筆、兩個cycle。若你的程式只留下C1第一筆，表示錯把生命週期去重用在轉換紀錄，會丟失確認與恢復證據。

若來源沒有穩定 eventid，先把限制寫入驗證狀態，不能用文字和秒數硬猜同一事件。對同一來源的重送，可保存 payload digest 與接收序號作輔助；對 Clear 後的新 Active，仍應要求來源提供新的 cycle 或人工確認。

## 重複提醒與洪水限制

重複提醒是 UX 和事件模型的交界。可以在同一 active cycle 顯示「已確認，仍未恢復」並按自訂時間重新提醒，但重新提醒不能自動產生新的 active eventid，也不能自動 acknowledge。若要抑制一段時間，使用產品的 shelving/抑制功能時要記錄期限、操作者與原因；shelve 不等於條件清除，也不等於安全功能。 要保留暫擱期間歷史，需另核對Journal的Store Shelved Events與篩選設定，不能以為預設必定儲存。

| 情境 | 正確做法 | 不應做 |
| --- | --- | --- |
| 已 Ack 仍 Active | 顯示持續時間/重新提醒 | 改成 Clear |
| 同 event 重發 | 以來源＋穩定轉換ID去重 | 新增第二筆告警 |
| 50 筆連鎖 | 摘要母事件、保留原始 | 刪除衍生事件 |
| 無權限 Ack | 顯示申請路徑 | 前端隱藏後當已處理 |
| 條件恢復 | 保存 Clear event | 用 Reset 假造恢復 |

本篇不把洪水自動 ack。Ignition Alarm Journal 文件提到 live event limit 超過時可能出現 system acknowledgement flag，這是產品設定的行為，必須查實際設定和版本；不能把它寫成所有系統都應該自動確認。對公用系統停機造成的連鎖警報，應先保留原始事件，再另外產生摘要與事後檢討欄位。

驗收要做同一 event 重送、Clear 後再發生、Ack 後仍 Active、無權限 Ack、shelve 到期和洪水六組，逐一比對 eventid、eventtype、備註、source time、操作人與畫面狀態。

洪水摘要的母事件只是導覽與統計，不是刪除或改寫子事件。摘要可以顯示 firstAt、lastAt、count、activeCount、unackedCount 和 candidateCause，但 candidateCause 必須標示為推論。恢復後檢討要能展開原始 eventid，否則無法檢查哪一筆先發生、哪一筆只是連鎖結果。

洪水期間仍要保留人工決策。可以提供批次選取、篩選和檢視，但每次 acknowledge 或 shelve 都要依角色、備註與期限記錄；不能把方便操作當成自動處置。

## FAQ 來源與限制

FAQ1：Ack 後警報會消失嗎？不一定；若條件仍 Active，應可顯示 Active+Acked，直到 Clear。

FAQ2：Clear 是否代表問題已處理？不代表，只表示觸發條件恢復；工作流可另設 Resolved 並要求備註或核對。

FAQ3：同一警報再次通知要新 eventid 嗎？若只是同一事件重送不應新增；若 Clear 後重新成立，應是新的 cycle/id。

FAQ4：洪水時可自動 Ack 省畫面嗎？不能直接這樣設計；需依產品設定、事件來源與審核政策，保留原始事件和可追溯旗標。

案例是離線時間線與工作流設計，未連接壓縮空氣設備。Ignition 官方元件可核對 acknowledge/shelve/filter，Alarm Journal 可核對 Active/Clear/Acknowledgement eventtype 與 eventid；ISA-18.2 全文未取得，不宣稱具體標準條文。

參考：[Ignition Perspective Alarm Status Table。](https://docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-display-palette/perspective-alarm-status-table)

參考：[Ignition Alarm Journal。](https://docs.inductiveautomation.com/docs/8.1/platform/alarming/alarm-journal)

交付前逐項核對 Active、Ack、Clear、Reset、InProgress、Resolved 的顯示文字和資料欄位；再測來源時間、接收時間、操作時間、重發、重發生、shelve 到期與無權限操作。若結果未能由官方元件或專案契約證明，標成待確認。

參考：[Ignition Vision Alarm Status Table。](https://docs.inductiveautomation.com/docs/8.1/appendix/components/vision-components/alarming/alarm-status-table)

## 延伸閱讀

- [HMI 操作權限頁面如何讓使用者知道自己能做什麼](/articles/hmi-operation-permission-execution-authorization)
- [HMI 警報優先級如何轉成值班人員看得懂的顯示規則](/articles/hmi-alarm-priority-display-rules)
