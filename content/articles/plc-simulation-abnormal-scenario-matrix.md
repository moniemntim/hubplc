---
title: PLC 模擬測試不只看正常流程 建立異常情境矩陣
description: 以 WAIT、RUN、DONE、ERROR、CANCELLED 五狀態與 300 ms 固定逾時，驗證正常、缺回饋、重複 Request 與 Cancel 四條獨立時間線。
date: 2026-09-17
author: 站長
draft: false
---

## 先把流程狀態與識別碼定死

本例是沒有連接實體設備的虛擬工作流程。狀態只有 WAIT、RUN、DONE、ERROR、CANCELLED 五種；所有其他文字都不是狀態。WAIT 表示沒有現行工作且可以接受新請求，RUN 表示已接受一個工作並等待回饋，DONE 表示結果已保存但尚未完成確認，ERROR 表示 300 ms 內未收到合格回饋，CANCELLED 表示外部取消已被接受。ERROR 和 CANCELLED 都必須先復歸才可回到 WAIT。

每個工作有 RequestId 和 FeedbackId。接受 RequestId=17 時，CurrentRequestId 設為 17；只有 FeedbackId=17 才能完成，FeedbackId=16 或 18 都記錄為 LATE_OR_WRONG_FEEDBACK，不能改變終態。工作者完成後發布帶RequestId的結果，呼叫端保存結果後回送AckId。工作者收到匹配的AckId後，控制器清除 CurrentRequestId、結果快照與計時器，狀態才回 WAIT。

| 狀態 | 可接受事件 | 固定離開條件 | 禁止事項 |
| --- | --- | --- | --- |
| WAIT | 新Request | 接受後→RUN | 不能處理無主Feedback |
| RUN | 匹配Feedback、Cancel、到時 | DONE、CANCELLED、ERROR | Busy新Request拒收 |
| DONE | Ack | Ack確認→WAIT | 晚到Feedback不改結果 |
| ERROR | 復歸 | 復歸→WAIT | 不自動接續舊工作 |
| CANCELLED | 復歸 | 清理後→WAIT | 晚到Feedback不改終態 |

Busy 時收到新 Request，一律回覆 BUSY_REJECT，不佇列、不覆蓋現行工作，也不增加現行工作的重試次數。這個規格讓四條時間線可以互相比較；若產品真的需要佇列，必須另寫資料結構和驗收，不能把拒收案例解讀成排隊。

狀態名稱也要作為介面契約的一部分。HMI 顯示 DONE 時，使用者應知道它仍等待 Ack；顯示 ERROR 時，應看到 TIMEOUT 而不是泛稱故障。這些文字不改變控制邏輯，卻能防止操作員在錯誤狀態重送同一 Request。

## 300 ms 到時與同掃描事件的規則

本例的 Timeout 固定為 300 ms，從接受 Request 的時間戳 t_accept 開始計算。當 elapsed>=300 ms 且仍在 RUN，產生 ERROR、Reason=TIMEOUT、保存 RequestId，停止等待並清除工作輸出。到時優先於正常 Feedback：如果在同一個掃描同時觀察到elapsed>=300 ms和匹配Feedback，先寫入 ERROR，再把該 Feedback 記為 LATE_FEEDBACK；不能回到 DONE。選擇這個規則是為了讓已超過服務期限的回饋不被誤算為及時完成。

Cancel 的優先級高於到時，也高於正常回饋。若同一掃描同時有 Cancel、elapsed>=300 ms 和 FeedbackId=CurrentRequestId，結果固定為 CANCELLED，Reason=CANCEL，晚到或同掃描回饋只記錄事件，不改終態。這個規則必須在程式和測試表中寫出，否則不同任務順序可能產生不同答案。

| 同掃描事件 | 先後規則 | 終態 | 記錄 |
| --- | --- | --- | --- |
| Cancel+Timeout+匹配Feedback | Cancel最高 | CANCELLED | 取消、回饋、到時均留痕 |
| Timeout+匹配Feedback | Timeout優先 | ERROR | LATE_FEEDBACK |
| Cancel+錯誤Feedback | Cancel最高 | CANCELLED | 錯誤回饋另記 |
| 只匹配Feedback且<300ms | 正常回饋 | DONE | FeedbackId相符 |

每個掃描只選一個終態轉移。實作可先把輸入事件取成快照，再按照 Cancel、Timeout、匹配 Feedback 的順序判斷；這是本案例的明確優先序，不是依平台碰巧的程式排列。若平台的時間來源解析度低於 1 ms，測試資料要使用可表示的時間點，不能宣稱比時間來源更精確。

時間邊界測試固定三個點：299 ms 仍在 RUN，300 ms 進 ERROR，301 ms 已是 ERROR。正常Feedback在小於300毫秒時可進DONE，因此299毫秒可完成；300 ms 同掃描依本例的逾時優先規則進 ERROR。若平台時間單位不是毫秒，先將腳本換算成平台可表示的 tick，再在報告中註明換算誤差。

## 四條獨立時間線從同一初始條件開始

四條案例都從 t=0、狀態 WAIT、CurrentRequestId=0、計時器清零、結果快照空白開始。每條只改變指定事件，其他輸入保持為 0。這樣正常、缺回饋、重複 Request 和 Cancel 的差異可以歸因於單一事件，而不是前一條測試遺留的狀態。

| 案例 | 事件時間 | 狀態序列 | 最終證據 |
| --- | --- | --- | --- |
| 正常 | 0 Request17；120 ms Feedback17；180 ms Ack | WAIT→RUN→DONE→WAIT | 結果17、Ack17 |
| 缺回饋 | 0 Request17；300 ms到時 | WAIT→RUN→ERROR | TIMEOUT、無Done |
| 重複Request | 0 Request17；100 ms Request18；150 ms Feedback17 | WAIT→RUN；拒收18；DONE | BUSY_REJECT18 |
| Cancel | 0 Request17；120 ms Cancel；350 ms Feedback17 | WAIT→RUN→CANCELLED | Cancel優先、晚到丟棄 |

正常線在 120 ms 收到相同 FeedbackId，進 DONE；180 ms Ack 被確認後回 WAIT。缺回饋線在 elapsed=300 ms 的掃描進 ERROR，即使 301 ms 才到 Feedback17，也只留下 LATE_FEEDBACK。重複線的 Request18 不影響 Request17，不能把 CurrentRequestId 改成 18；150 ms 的 Feedback17 仍可正常完成。取消線在 120 ms 進 CANCELLED，350 ms 的 Feedback17 不得把它改回 DONE。

1. 每條測試先寫入同一份初始快照與測試編號。

2. 以單調時間戳注入事件，不用畫面操作時間代替事件時間。

3. 每個掃描記錄 State、RequestId、FeedbackId、elapsed、Ack與Reason。

4. 完成後檢查晚到事件是否只增加診斷紀錄，沒有重寫終態。

5. 清理後重新從 WAIT 開始下一條，確認沒有沿用舊 ID。

每一條時間線的初始條件都要包含輸出命令為 0、結果快照無效、Ack 狀態為未送出，以及診斷計數歸零。若只把 State 設為 WAIT 而保留上一個 CurrentRequestId，下一個 Feedback 可能被錯誤配對。測試報告要把初值列出來，讓第二個人能在相同條件重播。

## 復歸 Ack 與晚到回饋

DONE 不是立即 WAIT。DONE 保留結果和 RequestId，等待對應 Ack；AckId 或 AckRequestId 不相符時回覆 BAD_ACK，狀態仍留在 DONE。收到 Ack17 後才清除工作資料並回 WAIT，下一個 Request 才能接受。ERROR 與 CANCELLED 也不自動回 WAIT，必須收到明確 Reset，先清除輸出命令、計時器、Feedback 暫存和 CurrentRequestId，再回 WAIT。

晚到 Feedback 的處理固定為記錄後丟棄。若 Request17 在 300 ms 到時進 ERROR，301 ms 的 Feedback17 不可重新開啟工作；若 Cancel 在 120 ms 先成立，350 ms 的 Feedback17 同樣不改 CANCELLED。記錄至少包含 FeedbackId、收到時間、當時終態與丟棄原因，供日後查出通訊延遲。

| 事件 | 當時狀態 | 狀態是否改變 | 回覆或紀錄 |
| --- | --- | --- | --- |
| Ack16 | DONE(Request17) | 否 | BAD_ACK |
| Ack17 | DONE(Request17) | 是→WAIT | 完成確認 |
| Reset | ERROR(Request17) | 是→WAIT | 清理完成 |
| Feedback17晚到 | ERROR或CANCELLED | 否 | LATE_FEEDBACK |
| Request18於RUN | RUN(Request17) | 否 | BUSY_REJECT |

復歸測試要再確認輸入仍為 1 的情況。例如 Reset 只是一個掃描脈衝，回 WAIT 後同一個 Request 訊號若仍維持為 1，是否會被視為新請求，必須在介面定義中決定。本例要求 Request 必須有新的上升緣與新的 RequestId；保持舊值不會自動重新接受。

清理完成的驗收不是只看狀態名稱。要逐項確認輸出命令已撤除、計時器已停、結果快照的 Valid 位元已清除、CurrentRequestId 回到 0、晚到事件只增加診斷紀錄。若其中一項仍保留，下一個工作可能讀到上一個工作的資料，即使畫面已顯示 WAIT。

每次呼叫都更新Request邊緣記憶，Reset不得把持續為TRUE的輸入偽裝成新上升緣。新的工作識別碼須避免與仍可能晚到的舊回饋重用；實際系統可搭配啟動世代和序號。四條教學線各自重設17只適用彼此完全隔離的測試，不代表正式流程可每次都重用17。

## FAQ 模擬範圍與驗收

問：300 ms 同掃描收到 Feedback，為什麼選 ERROR？本例把到時優先，因為服務期限已到；Feedback 只保留為 LATE_FEEDBACK。問：Cancel 和 Timeout 同掃描呢？Cancel 優先，終態固定 CANCELLED。問：Busy 的 Request 會排隊嗎？不會，本例直接 BUSY_REJECT 且不影響現行工作。問：Ack 何時回 WAIT？只有 DONE 收到匹配 Ack，或 ERROR/CANCELLED 收到明確 Reset 並完成清理後，才回 WAIT。

驗收資料要保存每個掃描的狀態與事件，不能只保存四條時間線的最後一列。若同一個掃描含有多個事件，依本例優先序逐項列出判定，讓審查者能重算為何是 CANCELLED 或 ERROR。

1. 四條時間線各執行三次，核對狀態序列與 RequestId。

2. 在 299 ms、300 ms、301 ms 各測一次回饋，確認到時邊界。

3. 在同一掃描注入 Cancel、Timeout與匹配回饋，確認 Cancel 優先。

4. 測試晚到 Feedback、錯誤 Ack與 Busy Request，確認終態不被改寫。

5. 保存模擬器設定、輸入腳本、每掃描紀錄與未測項目。

適用限制：本文是虛擬狀態機與合成時間線，沒有指定 PLC 型號、任務週期、I/O 更新或實體通訊延遲。CODESYS Simulation Mode 官方頁面所描述的模擬能力與實際目標平台並不等價；狀態轉移、時間解析度、通訊逾時和安全停機仍須在目標工程環境補測。

參考：[CODESYS Testing in Simulation Mode](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_testing_in_simulation_mode.html)

參考：[CODESYS ST Statement: CASE](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_st_instruction_case.html)

## 延伸閱讀

- [強制值與模擬輸入有什麼不同 PLC 測試資料的使用範圍](/articles/plc-forcing-vs-simulated-input)
- [PLC 最小可重現專案 保留兩模組資料偏移案例](/articles/plc-minimal-reproduction-module-offset)
