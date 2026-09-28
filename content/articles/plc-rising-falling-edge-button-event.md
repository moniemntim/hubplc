---
title: PLC 上升緣與下降緣：用逐掃描模型確認長按只送一次命令
description: 下載並執行離線邊沿模型，從明確初值看 12 次掃描的長按、放開與重新按下，分清一次命令和持續電平。
date: 2026-09-28
author: 茂伯
draft: false
---

## 先做一個不接設備的按鈕試驗

假設按鈕 `Button` 的 1 表示已按下。這個練習要在「剛按下」時把
`CommandCount` 加一；按住時不能再加，放開只留下 `Fall` 記錄。它沒有馬達、
HMI、實體輸入或 PLC 輸出，純粹把每次取樣後的記憶和結果列出來。

把以下兩個檔案放在同一資料夾後，以 Node.js 22 以上執行。這是本站的 JavaScript
**離線模型**，不是原廠 PLC 模擬器，也沒有在任何 PLC 或安全迴路上執行。

- [edge-model.mjs：逐掃描邊沿邏輯](/examples/plc-edges/edge-model.mjs)
- [demo.mjs：12 次掃描的可重現案例](/examples/plc-edges/demo.mjs)

```powershell
node demo.mjs
```

它會輸出 CSV。第 2 掃描應是
`2,1,0,1,0,1`，第 12 掃描應是 `12,0,1,0,1,1`。其中欄位依序為
`scan,button,previous,rising,falling,commandCount`。若輸出不同，先確認兩個檔案
來自同一個資料夾，且副檔名沒有被 Windows 另存成 `.mjs.txt`。

## 變數、初值和模型的固定規則

| 名稱 | 初值 | 本例的意義 |
| --- | --- | --- |
| `Button` | 由每次掃描輸入 | 1 是按下；不是特定端子的接線定義 |
| `Previous` | 0 | 上一次已取樣的 Button |
| `Rise` | 每次先為 0 | `Button=1` 且 `Previous=0` 時為 1 |
| `Fall` | 每次先為 0 | `Button=0` 且 `Previous=1` 時為 1 |
| `CommandCount` | 0 | 每次 `Rise=1` 才加一的教學計數 |

計算順序不能交換：先用**更新前**的 `Previous` 同時計算 Rise 和 Fall，再把
`Previous` 改成 Button。若先更新 Previous，兩個事件都會消失；若根本不更新，長按
會被當成多次按下。

```text
Rise := Button AND NOT Previous
Fall := NOT Button AND Previous
IF Rise THEN CommandCount := CommandCount + 1 END_IF
Previous := Button
```

此模型把 `Previous` 的初值定為 0，因此第一個已取樣到的 `Button=1` 會產生 Rise。
這是可重現的教材選擇，不可直接假設為目標 PLC 的開機行為。以 Siemens S7 的
R_TRIG/F_TRIG 為例，原廠文件明確說明它會以記憶位元或執行個體保存前一狀態，並要求
程式設計處理第一次執行的初始狀態；不同平台或保持設定可能採不同策略。

## 逐掃描核對：十掃描長按只產生一次命令

`demo.mjs` 的初值是 `Previous=0`、`CommandCount=0`。第 1 掃描不按，第 2 到
第 11 掃描持續按住，第 12 掃描放開。表內 Previous 是本次計算**前**的值，輸出可與
實際執行的 CSV 一列一列比對。

| 掃描 | Button | Previous | Rise | Fall | CommandCount | 現場判讀 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 0 | 0 | 0 | 0 | 待機 |
| 2 | 1 | 0 | 1 | 0 | 1 | 接受一次開始命令 |
| 3–11 | 1 | 1 | 0 | 0 | 1 | 長按仍是同一個請求 |
| 12 | 0 | 1 | 0 | 1 | 1 | 已放開，可準備下一次 Rise |

接著在 `buttons` 陣列尾端追加 `true, true, false, true`，再執行。第 13、14、15、16
掃描的 CommandCount 依序應是 `2,2,2,3`：第 13 次重新按下加到 2，第 14 次長按不加，
第 15 次放開不加，第 16 次再按才加到 3。這比只看監看畫面短暫閃過的 Rise 更容易判定
邏輯是否真的只接受一次。

## 什麼要接事件，什麼要接目前電平

| 需求 | 應使用 | 不能只用 Rise 的原因 |
| --- | --- | --- |
| 建一筆批次、送一次通訊請求、切換模式 | Rise | 動作只應被每次完整按壓啟動一次 |
| 記錄放開、在放開時提交一段輸入 | Fall | 需要的是 1→0 的瞬間 |
| 手按才允許點動、持續使能 | Button 電平 | 按住期間必須持續成立 |
| 停止或安全輸出遮罩 | 設備的安全設計與電平條件 | 單掃描脈衝不能保證持續安全狀態 |

把 `Rise` 當成一次命令並不表示命令已完成。若命令需等待驅動器、通訊或另一個工作週期，
還要另設「已接受、處理中、成功、失敗、逾時」的狀態與回覆。本站的
[三步驟順序控制](/articles/plc-state-machine-three-step-sequence) 範例正是把 Start 的
上升緣和 RUN/DONE/FAULT 分開；不要在同一個 Rise 上直接宣稱設備已完成。

[故障復歸離線練習](/articles/plc-fault-reset-single-acceptance) 刻意採用不同的開機規則：
`armed` 初值是 0，必須先取樣到可信的 `button=0`，下一次按下才接受。那是為了避免「啟動時
已按住、或通訊恢復時仍為 1」自動清除故障；不能把它和本文 `Previous=0`、首次 1 會產生
Rise 的教材規則混為一談。兩者都只是明確定義的離線政策，實機需依設備風險與目標平台驗證。

## 三個常見結果，先查取樣和呼叫位置

| 看到的結果 | 先檢查 | 能確定的結論 |
| --- | --- | --- |
| 長按每掃描都加一 | 動作是否直接接 Button；Previous 是否在每掃描後保存 | 邊沿記憶或動作接點有問題 |
| 短按完全沒有事件 | 脈衝是否在兩次程式取樣之間完成；輸入濾波與任務週期 | 邊沿公式無法補回未被取樣的變化 |
| 分支恢復時忽然出現舊按壓 | 邊沿函式是否只在某個步驟／允許條件內呼叫 | 要明訂分支外的記憶更新或忽略政策 |

若需求是「任何時候按下都要留下請求」，讓邊沿判斷在固定週期取樣，將事件寫入明確的
請求位元或佇列，再由狀態機消費。若需求是「只有 RUN 才接受」，則在規格上寫清楚其他
狀態的按壓會被忽略；不要讓功能塊偶然沒有被呼叫來決定行為。

同一個邊沿記憶也不應由兩段程式共用或在同一掃描重複呼叫。第一次呼叫可能已更新記憶，
第二段自然看不到同一個事件。請為每個被監看的輸入／用途保有唯一的實例或記憶位元，並以
目標平台手冊確認可用的保存區。

## 移植到 PLC 前的完成條件與限制

完成本離線練習，至少應能證明：長按十次取樣只令 CommandCount 增加一次；放開時只出現
一次 Fall；重新取樣到 0 後再次按下才有新的 Rise。這些結果只驗證 JavaScript 模型的
取樣規則，沒有驗證 I/O 更新、接點彈跳、輸入濾波、快速輸入、中斷任務或任何廠牌指令。

實機實作前，請在目標 CPU／工程版本的手冊核對邊沿指令名稱、執行個體或記憶位元、開機
初值、任務呼叫頻率和輸入模組最短可辨識脈寬。Siemens 對 S7-1200/1500 的文件說明
R_TRIG/F_TRIG 會保存在指定實例的前次狀態，並在符合方向的變化時令 Q 為 TRUE 一個週期；
Schneider Machine Expert 的 R_TRIG 文件也要求先宣告功能塊實例。這些文件支持管理前次
狀態的概念，不能當作任何其他 PLC 已編譯或測試的證據。

參考：[Siemens STEP 7：正、負邊沿指令](https://docs.tia.siemens.cloud/r/en-us/v21/fbd-s7-1200-s7-1500-s7-1200-g2/bit-logic-operations-s7-1200-s7-1500-s7-1200-g2/positive-and-negative-edge-instructions)；[Schneider Machine Expert：R_TRIG](https://product-help.schneider-electric.com/Machine%20Expert/V2.2/en/Standard/Standard/modules/r-trig.html)。

本文不取代急停、硬體互鎖、風險評估或經驗證的安全功能。需要持續維持的停止條件不能只靠
Rise 或 Fall 一個掃描的輸出。

## 延伸閱讀

- [PLC 掃描週期與輸入輸出更新](/articles/plc-scan-cycle-io-refresh)
- [子程式的呼叫頻率如何影響邊沿與計時](/articles/plc-subprogram-call-frequency-edge-timer)
