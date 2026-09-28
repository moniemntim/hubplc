---
title: PLC 重複線圈與多處賦值：找出誰把輸出改回 OFF
description: 重播兩個寫入點的覆寫過程，再用固定優先規則與 16 組輸入測試改成單一輸出決策，附可執行離線案例。
date: 2026-09-17
author: 茂伯
draft: false
---

## 症狀：前面寫 ON，掃描結束卻是 OFF

先追同一個變數的所有寫入。本例 A 把 AutoRequest 寫入 Out，B 無條件把 Out 寫成 0；同一個循環裡 A 先、B 後，最後留下的就是 0。把段落對調會變成 1，卻沒有解決「誰負責決定輸出」的問題。

**案例範圍：**這是已執行驗證的 JavaScript 離線教學模型，只有單一執行順序與普通記憶變數。不連 PLC，也不驗證任何品牌是否允許重複線圈、如何警告，或實體輸出何時更新。

## 下載並重播覆寫過程

將 [scan-model.mjs](/examples/plc-scan/scan-model.mjs) 與 [writers-demo.mjs](/examples/plc-scan/writers-demo.mjs) 存在同一個資料夾，使用 Node.js 22.13.0 以上執行：

```powershell
node writers-demo.mjs
```

前兩列為 JSON，列出每次寫入與最後結果。固定 AutoRequest=true，預期如下；AB 與 BA 都各自從 Out=false 開始：

| 執行順序 | 第一次寫入 | 第二次寫入 | 最後 Out |
| --- | --- | --- | --- |
| AB | A：true | B：false | false |
| BA | B：false | A：true | true |

對應的問題程式為：

```text
A：Out := AutoRequest;
B：Out := FALSE;
```

Out 中途曾為 1，不代表端子一定出現脈衝；若輸出更新只拿最後留下的值，可能只送出 0。更新時點的完整案例見[掃描週期與 I/O 更新](/articles/plc-scan-cycle-io-refresh)。這裡先專注在「哪一次寫入改掉了資料」。

## 在自己的專案找到同樣問題

開啟交叉參照，以輸出符號、實際位址與別名查詢。把讀取與寫入分開，只將會修改資料的位置填入下表：

| 執行位置 | 本輪有執行嗎 | 寫入方式 | 寫入前 → 後 | 原因 |
| --- | --- | --- | --- | --- |
| 本例 A | 是 | 一般賦值 | 0 → 1 | AutoRequest=1 |
| 本例 B | 是 | 一般賦值 | 1 → 0 | 無條件預設值 |
| 你的其他位置 | 待確認 | 線圈／SET／RESET／MOV 等 | 待記錄 | 待確認 |

不要只搜尋兩個外觀相同的線圈。功能塊輸出、IN_OUT／參照參數、陣列或間接位址也可能修改同一資料；HMI 寫入、通訊與強制值要另列來源。若跨任務或中斷，就必須依實際排程取證，不能套用本例固定的 AB 順序。

## 修正：每個來源有自己的變數，最後只決策一次

本案例訂死一條規則：AutoRequest 或 ManualRequest 任一成立即可要求 ON；Stop 或 Alarm 任一成立便阻擋。兩個請求同時為 1 且無阻擋時，答案就是 1。這裡的 Stop、Alarm 都是一般邏輯輸入，不能代替急停或經驗證的安全控制。

```text
AutoRequest := AutoRun AND StepReady;
ManualRequest := ManualMode AND JogButton;
Block := Stop OR Alarm;
Out := (AutoRequest OR ManualRequest) AND NOT Block;
```

這段是供 PLC 移植的邏輯示意，附件 decideOutput 函式提供可執行版本。附件直接輸入已形成的 AutoRequest、ManualRequest、Stop、Alarm，沒有替你實作上游流程。

每個請求也應有明確的產生位置，不要把原本散落的 Out 改名成散落的 AutoRequest。警報來源若很多，先各保留 AlarmA、AlarmB 等來源，再在固定位置組合。輸出決策層讀取同一輪的請求，最後只有它寫 Out。

## 驗收：核對 16 組，而不是只看一次 ON

程式接著印出 `auto,manual,stop,alarm,block,out`。它窮舉四個布林輸入的全部 16 組。以下表格將 Stop 或 Alarm 為 1 的三種組合合併表示，兩者分開測試仍在附件中：

| AutoRequest | ManualRequest | Stop=0 且 Alarm=0 時 Out | Stop 或 Alarm=1 時 Out |
| --- | --- | --- | --- |
| 0 | 0 | 0 | 0 |
| 0 | 1 | 1 | 0 |
| 1 | 0 | 1 | 0 |
| 1 | 1 | 1 | 0 |

可以從輸出找三列交叉核對：`1,0,0,0,0,1` 是自動請求；`1,1,0,0,0,1` 是兩個請求；`1,1,1,0,1,0` 是 Stop 阻擋。若後兩者得到不同答案，先檢查是否擅自加入了互斥或優先規則，而非修改預期表來配合程式。

**這個範例沒有故障保持或復歸鎖定。**當 AutoRequest 一直為 1，Alarm 從 1 變 0，Out 就會從 0 回到 1。它適合說明組合邏輯，不能直接當作設備啟動政策。需要解除警報後仍等待人工重新啟動時，必須另有明確的狀態與復歸規則；參考[故障復歸只接受一次](/articles/plc-fault-reset-single-acceptance)，不要靠線圈排列碰運氣。

## 怎樣才算改完

完成條件包括：Out 有唯一負責的寫入位置、各請求可追到來源、阻擋有明確理由、16 組結果符合本例規則。若實際需求改成手自動互斥，先修改規格與預期表，再改程式；不能保留「1 或依規格」這種無法判定通過的答案。

設備專案仍須另外編譯、確認任務順序、追蹤完整程式的寫入及量測輸出。刪掉第二個線圈，只解決其中一種覆寫來源；不代表模式切換、重新 RUN 或安全控制已驗證。

## 延伸閱讀

- [子程式沒有每掃描執行：前值與輸出會保留什麼](/articles/plc-subprogram-call-frequency-edge-timer)
- [強制值與模擬輸入：區分工具覆寫和程式資料](/articles/plc-forcing-vs-simulated-input)
