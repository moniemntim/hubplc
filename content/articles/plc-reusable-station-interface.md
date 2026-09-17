---
title: 多個相似工站怎麼共用程式 建立可重用的工站介面
description: 以 A、B 兩個虛擬檢測工站示範獨立實例、100 ms 呼叫時序、命令優先級、外層 I/O 映射與可追溯結果。
date: 2026-09-17
author: 站長
draft: false
---

## 先定義共同模組與兩個獨立實例

本篇建立兩個虛構檢測工站。Station A 的等待時間是 300 ms，合格範圍是 40 到 60；Station B 等待 500 ms，合格範圍是 70 到 90。兩站使用同一個功能塊型別，但必須宣告 fbInspectA 與 fbInspectB 兩個獨立實例。獨立的不只是最後結果，還包括 ActiveStep、Start 已接受狀態、開始時間、Cancel 狀態與計時中的資料。

介面分成五組。Command 放 Start、Cancel、Reset；Config 放 WaitMs、MinValue、MaxValue；Status放Idle、Busy、Step、ElapsedMs與單次完成事件Done；Result 放 Value、Pass、ResultValid；Diag 放 ErrorCode、ConfigVersion、CycleId。這些是設計欄位，不是可直接貼進任何 PLC 的宣告。分組的目的，是讓「命令」「設定」「目前狀態」「上一筆結果」不會混在一個模糊的 Done 位元裡。

A 與 B 可同時工作，A 的完成不能讓 B 的 Done 變真。若兩站共用同一計時器或同一個 Start記憶位，第一站的呼叫就會改寫第二站的上下文。實例隔離要用不同的輸入、不同的設定結構和不同的輸出欄位驗證，而不是只把同一段程式複製兩次後相信它們自然獨立。

以下偽碼和時間表是教學用，不能直接編譯。功能塊語法、輸入輸出宣告、結構型別與任務時間來源，須依目標 PLC 工程軟體核對。這個檢測模組只示範流程和資料契約，不是安全控制、品質認證或機械互鎖。

兩個實例的所有權要在程式結構中看得見。fbInspectA 只能讀 A 的映射與 A 的設定，fbInspectB 只能讀 B 的資料；不要用一個全域 CurrentStation 讓呼叫端輪流覆寫。若未來增加第三站，新增的是實例、映射和測試案例，不是再複製一份帶有隱藏狀態的程式。

## 每 100 ms 呼叫一次 但用可信經過時間

假設主程式每約 100 ms 呼叫一次功能塊，但「呼叫次數乘以100」不能直接當作經過時間。實作應在 Start 被接受時保存可信的開始時間，之後以同一時間來源取得 Now，計算 ElapsedMs=Now-StartTime。若實際週期變成 120 ms，ElapsedMs 應反映 120 ms，而不是假裝仍是100。時間來源的解析度、回捲和任務排程要依平台確認。

| 呼叫時刻 ms | A ElapsedMs / Step | A Busy/Done | B ElapsedMs / Step | B Busy/Done |
| --- | --- | --- | --- | --- |
| 0 | 0 / WAIT | TRUE/FALSE | 0 / WAIT | TRUE/FALSE |
| 100 | 100 / WAIT | TRUE/FALSE | 100 / WAIT | TRUE/FALSE |
| 200 | 200 / WAIT | TRUE/FALSE | 200 / WAIT | TRUE/FALSE |
| 300 | 300 / IDLE | FALSE/TRUE | 300 / WAIT | TRUE/FALSE |
| 400 | — / IDLE | FALSE/FALSE | 400 / WAIT | TRUE/FALSE |
| 500 | — / IDLE | FALSE/FALSE | 500 / IDLE | FALSE/TRUE |

在本表中，A在可信經過時間首次達到或超過300毫秒時，於同次呼叫完成判定並回到IDLE，產生ResultValid；B 到 500 ms 才完成。Done 是一次事件，只在完成轉移的那次呼叫為 TRUE，下一次應回到 FALSE。若流程要求完成後保持結果，使用 ResultValid 和 Result，而不是讓 Done 長時間維持。

若時間讀取失敗或時間戳品質不佳，不能把掃描次數當成替代時鐘後仍宣稱精確等待。本例回報TIME_INVALID、Busy為FALSE、Step為ERROR，保留Result數值但ResultValid為FALSE，須Reset後才接受新工作。這種退化行為要在介面契約中寫出，不能由維護人員猜測。

時間表中的 0、100、200 等是可信時間的觀察點，不是保證每個任務剛好在該毫秒執行。若 Now 在一次呼叫中跳到 315 ms，A 應依已經過時間完成，並把實際 Now 與完成事件記錄下來；不應為了湊整數掃描而延到下一個人造刻度。

若任務實際週期不固定，還要保存每次 Now 和 ElapsedMs，才能在事後分辨排程延遲、時間來源跳動與功能塊判定錯誤。這些欄位是診斷證據，不是把掃描計數包裝成精確時鐘。

## Start Busy Cancel 與 Reset 的優先規則

Start 是事件，不是長期許可。只有在 Idle 且偵測到 Start 上升事件時接受新工作，接受後建立新的 CycleId、保存當下 Config 快照並把 Busy 設為 TRUE。Busy 期間再次來的 Start 應依本例政策拒絕，回報 BUSY_REJECTED；不能默默覆蓋目前工作的開始時間或設定。

Cancel 優先於完成。若同一次呼叫中 ElapsedMs 已達 WaitMs 且 Cancel 也為 TRUE，本例先取消：Busy 變 FALSE、Done 保持 FALSE、ResultValid 變 FALSE、ErrorCode= CANCELLED。這避免畫面同時看到「完成」和「已取消」。Cancel 只取消目前 CycleId，不會自動清掉上一筆 Result 的數值；是否清值由 ResultValid 表示。

Reset 是明確的復歸命令。收到 Reset 時，清除 Busy、Done、ErrorCode、ResultValid 和目前工作上下文；本例保留Result數值作最後顯示值，但ResultValid為FALSE，Step回IDLE。所有優先順序為Reset、Cancel、時間或來源錯誤、到時完成、接受新Start。若 Reset 與 Start 同時出現，本例採 Reset 優先，該次不接受新工作，必須先觀察Start為FALSE，再出現新的上升事件才建立CycleId；每次呼叫都更新Start前值，Reset不把它強制清零。

| 情境 | Busy前提 | 命令 | 預期結果 | ErrorCode |
| --- | --- | --- | --- | --- |
| Idle | FALSE | Start上升 | 接受、Busy TRUE | NONE |
| Busy | TRUE | Start上升 | 拒絕、不改StartTime | BUSY_REJECTED |
| Busy | TRUE | Cancel與到時同掃描 | 取消、不Done | CANCELLED |
| Busy | TRUE | 到時且無Cancel | 判定並Done一次 | NONE |
| 任意 | 任意 | Reset | 清除工作與Valid | NONE |

不要把檢測結果的 Pass 位元當成安全允許。Pass 只代表本案例的數值落在 Config 範圍，ActualOutput 是否可動仍要由外層模式、互鎖、急停與設備安全設計決定。

Start 事件的邊緣記憶也屬於每個實例的狀態。若 HMI 長時間保持 Start 為真，A 完成後不能因同一個電位又自動建立第二個 CycleId；必須先看到 FALSE，再看到下一個上升事件，或由規格明確採用脈衝命令。

## 把實體 I/O 映射放在功能塊外層

功能塊不直接讀取 X0、寫入 Y10 或假定某個遠端站位址。外層先讀取每站的 SensorReady、MeasureValue、SensorValid，再把它們轉成共同介面；功能塊只回傳Pass、ResultValid與診斷，本例不產生實體輸出命令。這樣換端子、換遠端 I/O 或做離線測試時，不必改流程核心。

若 A 的感測器是高有效、B 的感測器是低有效，映射層先統一成 Ready。若 B 的工程單位不同，先在映射層完成單位轉換，再把同一種單位交給功能塊判定。不要把極性反相和單位倍率散在共享模組內，否則看似相同的工站會依隱藏條件產生不同結果。

每站的 Config 也應由外層保存並在 Start 接受時複製。A 的 WaitMs=300、Min=40、Max=60；B 的 WaitMs=500、Min=70、Max=90。若 HMI 修改 B 的 MaxValue，不應改變 A 正在執行的快照。ConfigVersion 和 CycleId 隨結果輸出，讓報表能追溯使用的設定。

失敗先查外層映射是否真的把 SensorValid 傳進正確實例，再查 Start 是否只對應一站，接著查 Config 快照和時間戳。不要先把兩站差異歸因於功能塊本身；多數錯誤是在共用變數、錯誤映射或兩站使用同一個實例。

判定時取該次呼叫的MeasureValue與SensorValid一致快照，含上下界：A取50應Pass為真，B取65應Pass為假，但兩者ResultValid皆為真，因為不合格不等於資料無效。SensorValid為假則進入ERROR並回報MEAS_INVALID。開始新工作時清除ResultValid，避免等待期間沿用上一筆結果。

## 完成預期 驗收與 FAQ

完成預期是：A 在可信經過時間 300 ms 完成，B 在 500 ms 完成；兩站可同時 Busy，互不改寫狀態；Busy 期間新 Start 被拒絕；Cancel 與完成同時出現時 Cancel 優先；完成後 Done 只脈衝一次，ResultValid 才表示 Result 可用；Reset 清除工作狀態與 ResultValid。

驗收時記錄每次呼叫的可信 Now、CycleId、ConfigVersion、Command、Busy、Step、ElapsedMs、Done、ResultValid、Pass 和 ErrorCode。若只看畫面最後的 Pass，無法知道結果屬於哪一批設定，也無法判斷 Done 是否漏接。測試資料可以是合成輸入，但紀錄要標註離線推算，不能寫成已在 PLC 執行。

問：為何不能用掃描次數乘100？答：實際週期會抖動或延遲，可信經過時間才反映真實等待。問：Busy時可接受新Start排隊嗎？答：本案例採拒絕並回報 BUSY_REJECTED，排隊需另設佇列契約。問：Cancel後能直接重送Start嗎？答：先讓取消狀態完成，再依邊緣規則送新Start。問：Pass為真就能開設備嗎？答：不能，這個模組不是安全控制，外層仍需互鎖與安全功能。

適用限制：CODESYS 與 Beckhoff 官方文件可用於查閱 IEC POU、功能塊實例和任務時間概念；三菱 Q 系列則需依 CPU、工程軟體和時間指令手冊核對。下列來源只支持查閱方向。

參考：[CODESYS Function Block 官方說明](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_obj_function_block.html)

## 延伸閱讀

- [PLC 功能塊輸入怎麼檢查 無效參數的回報與替代行為](/articles/plc-function-block-input-validation)
- [區域變數 全域變數與保持變數 PLC 資料生命週期](/articles/plc-variable-scope-lifetime-retain)
