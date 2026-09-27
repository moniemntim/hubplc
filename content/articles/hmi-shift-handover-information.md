---
title: HMI 班次交接頁應該留下哪些現場資訊
description: 以早班07:00接手夜班案例，設計未結警報、旁路、手動模式、待辦、作者時間設備範圍與責任移轉，並分開交接與Ack/Clear。
date: 2026-09-17
author: 茂伯
draft: false
---

## 交接是責任移轉 不是ACK

班次交接頁的目標是讓下一班知道目前狀態、未完成工作與責任人，不是把警報按Ack或Clear。Ack表示有人確認事件，Clear表示條件不再成立；交接備註要另外保存作者、時間、設備範圍、現況、下一步與截止時間。

虛構早班07:00接手夜班。夜班留下P-01低流量仍Active Acked、P-02已Clear但待檢查、手動模式與一項旁路。交接頁先列現在仍Active的風險，再列已Clear但未完成的檢查，並要求早班逐項確認。

不要只寫「已交接」。每項必須有狀態、證據、owner與下一動作；若資料品質或設備連線不確定，標Unknown並交給指定人員，不用文字掩蓋。

交接頁可將事項分為Active risk、待確認、維護中、旁路與一般備註，但分類不能隱藏未結警報。每列仍保留eventId、設備、作者、時間、owner與下一步，篩選只改視圖。

| 項目 | 目前狀態 | 證據 | 下一步 |
| --- | --- | --- | --- |
| P-01低流量 | Active Acked | alarm event與趨勢 | 檢查入口壓力，07:30回報 |
| P-02高溫 | Cleared，待檢 | clearAt與巡檢單 | 08:00目視 |
| 輸送線 | Manual | modeConfirmed | 恢復前核對 |
| 旁路B-07 | Active bypass | 許可單A-12 | 09:00前移除或續批 |

## 交接欄位與時間

每筆備註保存handoverId、shiftFrom、shiftTo、author、createdAt、site/area、asset、currentState、lastEventId、operator action、dueAt、owner、evidence link與acknowledgedBy。createdAt是備註建立時間，事件本身的activeAt/clearAt要另列，不能用交接時間代替。

案例中P-01低流量在06:42 Active，夜班於06:50完成Ack與濾網檢查，但問題尚未排除，早班07:00接手。交接文字應寫「06:42 active，06:50夜班已確認並檢查濾網，07:00仍active，早班續查入口壓力」，不能寫成「06:50已清除」。

備註可連到警報eventId、維護工單或趨勢截圖，但連結失效時仍要保留文字摘要。交接頁的完成勾選表示下一班已閱讀與接受責任，不表示設備或警報已恢復。

| 時間 | 事件 | 交接語意 | 不能改寫成 |
| --- | --- | --- | --- |
| 06:42 | P-01 Active | 事件開始 | 交接開始 |
| 06:50 | 夜班Ack | 已確認/未必處置 | Clear |
| 07:00 | 早班接手 | 責任移轉 | 設備正常 |
| 07:30 | 檢查完成 | 有證據的完成 | 只按完成 |

夜班在06:50寫P-01「已檢查濾網但低流量仍存在」，早班07:00接手，07:05可新增「檢查泵入口壓力」；不要覆蓋原備註。新紀錄引用同一handoverId與eventId，形成時間序列。

若HMI失聯，交接頁不可用最後快取冒充目前狀態；要標示資料時間、連線與待人工核對，並保留離線期間的責任交接。

交接清單要支援搜尋設備與區域，但搜尋不應改變原始時間或狀態。接班人可在同一畫面查看active、cleared待辦、旁路與manual mode，再逐項產生自己的確認紀錄。

若上一班留下的狀態與現場觀察衝突，新增discrepancy紀錄並通知責任人，不直接修改歷史事件。

若兩班同時登入，最後修改不應覆蓋前一筆。每次更新建立新版本，保存作者與修改原因；未完成項目到期時產生提醒，但不自動Ack或Clear原警報。

## 操作與成功/失敗

建立交接的步驟：先選班次與區域，再載入未結警報、旁路、手動模式、維護中與待辦，人工確認每筆目前狀態，填入owner與dueAt，附事件或工單證據，最後由接班人完成閱讀確認。系統顯示缺少必填欄位時不可提交。

成功結果是交接清單能回答誰、何時、哪台設備、現在怎樣、下一步與期限。失敗結果包括清單只剩Ack過的警報、把Clear誤當修復、沒有時區、沒有設備範圍、owner空白或資料載入失敗仍顯示已完成。

排錯先查資料來源是否包含歷史與目前狀態、時間是否同一時區、警報journal是否被篩選、備註版本是否衝突。Ignition Audit Log可保存Tag writes、登入與專案動作，但不是自動生成完整班次交接；交接資料要另設欄位與責任。

交接期限dueAt要含時區，逾期只產生待辦提示，不自動升級成警報或清除原事件。若owner換人，保存舊owner、新owner、原因與批准者。

交接頁與警報列表的資料可能不同步，頁面要顯示snapshotAt並提供Refresh。刷新失敗時保留舊清單並標示時間，不顯示看似即時的綠色完成。

交接完成後，上一班紀錄保持只讀，下一班新增追蹤列。若事件Clear，交接仍可保留完成證據與clearAt，避免歷史責任被覆寫。

未指定HMI產品時，不假定PLC能讀取登入session、班次人員或交接完成旗標。身份、班次與備註由HMI/SCADA資料模型管理，控制器只提供可驗證的設備狀態。

## 交接清單驗收補充

把夜班兩筆事件做成可重現流程：06:42 P-01 Active、06:50 Ack、07:00交接、07:05早班新增檢查、07:30回報。每一步保存author、eventId、handoverId與狀態，確認交接完成不會改變原警報Active或Ack/Clear狀態。

交接頁若資料源暫停，顯示snapshotAt與待人工確認；接班人可提交Needs clarification，待資料恢復後再更新。這避免把過期清單當成現場目前狀態。

接班人閱讀後若發現資料品質Bad，交接狀態應為Needs clarification而不是Complete。完成交接的判斷是必填欄位與確認動作，不是所有現場問題都已解決。

若交接包含安全或品質事項，需連到核准程序與責任人，不能靠HMI勾選取代現場簽核、鎖定或設備驗證。

交接頁可顯示目前狀態快照，但每次操作都需在資料庫或事件服務保存時間與作者，不能只存在瀏覽器session。

交接表的完成條件可以是每項有owner、dueAt、狀態與下一動作，並由接班人提交確認；沒有owner的備註不可算完成。

班次交接不自動改變設備模式、旁路或警報狀態，所有改變都要經原本的控制與授權流程。

交接內容的完整性與設備正常是兩個不同結論，畫面要各自呈現。

## 驗收 FAQ與來源

測試夜班兩筆待追蹤事項、早班接手、其中一筆在交接後Clear、另一筆仍Active、owner更換、逾時、HMI重開與兩人同時修改。每列保存handoverId、eventId、author、時間、狀態與下一步。

FAQ1：Ack過就不用列交接嗎？要列，Ack不等於Clear或完成處置。

FAQ2：Clear後可以刪掉交接項嗎？不可直接刪，應保留已Clear但待檢查或已完成的證據。

FAQ3：交接完成勾選代表設備正常嗎？不代表，只代表責任移轉或已閱讀，必須另看設備狀態。

FAQ4：一般PLC能提供登入者與交接資料嗎？不能假定，需由HMI/SCADA身份與資料模型提供。

本文班次、設備、時間與事件為離線案例。

參考：[Ignition 8.1 Audit Log and Profiles：Tag writes、登入與Gateway/Project actions的稽核範圍。](https://www.docs.inductiveautomation.com/docs/8.1/platform/audit-log-and-profiles)

參考：[Ignition 8.1 Alarm Journal：事件source、timestamp、資料與目前/歷史保存。](https://www.docs.inductiveautomation.com/docs/8.1/platform/alarming/alarm-journal)

旁路資料要記bypassId、設備、開始、預計結束、核准者與復原條件。旁路存在不等於警報Ack，也不表示保護功能已被安全替代。

備註內容避免寫模糊詞如已處理，改寫為觀察值、動作、結果與下一步，例如「06:50流量18 L/min，檢查濾網後仍低，07:30前依巡檢程序量入口壓力」。

班次邊界跨午夜時，shiftStart與shiftEnd使用含offset時間；不要用日期字串比較。例如夜班2026-09-16T22:00:00+08:00至2026-09-17T06:00:00+08:00，直接保存完整起訖日期，不只存跨日旗標。

交接資料可引用Alarm Journal與Audit Log，但兩者來源不同；警報事件描述狀態，Audit描述使用者動作，不能互相替代。

參考：[Ignition 8.1 Alarming：Active、Cleared、Acknowledged狀態語意。](https://www.docs.inductiveautomation.com/docs/8.1/platform/alarming)

## 延伸閱讀

- [HMI 斷線與資料暫停的顯示及驗收](/articles/hmi-disconnected-data-paused-display)
- [HMI 報表篩選與警報歷史查詢](/articles/hmi-report-filter-time-window-alarm-state)
