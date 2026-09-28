---
title: PLC 順序控制實作：WAIT、RUN、DONE 與故障復歸
description: 從明確的初始值、上升緣啟動與兩秒逾時，逐掃描操作正常完成、逾時、停止及復歸路徑。
date: 2026-09-28
author: 茂伯
draft: false
---

## 先把這個案例的規則定死

本例只有三個正常步驟：WAIT 等待新啟動、RUN 等待完成、DONE 保留結果直到確認；另外以 FAULT 保存失敗。它是虛擬工作，沒有汽缸、馬達或感測器接線。上方模型可直接執行，**不是任何廠牌 PLC 模擬器，也未做實機測試**。

規則如下，模型、下列表格與偽碼採同一套規則：

- 初始 State=WAIT、Busy=0，所有輸入為 0。第一次掃描是 0 ms，之後每掃描增加 100 ms。
- 只在 WAIT 接受 Start 的新上升緣。Start 已按住時，回到 WAIT 不會自動重做。
- 接受前 Stop 和 DoneInput 都必須是 0。DoneInput 尚未清除時拒絕新工作，避免把舊完成訊號當成新結果。
- RUN 內的優先順序為 **Stop → 2000 ms 逾時 → DoneInput**。同一掃描到期限又收到完成，本例判逾時。
- Ack 只在 DONE 有效。Reset 只在 FAULT 且 Stop=0、DoneInput=0 時有效。復歸只回 WAIT，不直接啟動。

這些是本案例的控制契約，不是所有設備都必須採用的政策。先前版本沒有把復歸與同時命令政策完整固定，容易讓讀者自行補出不同結果；本版以這組可操作規則取代。

## 變數表：每一個欄位由誰寫

| 欄位 | 模型初值 | 寫入者／用途 |
| --- | --- | --- |
| Start、Stop、DoneInput、Ack、Reset | 全部 0 | 讀者勾選，下一次掃描才被取樣 |
| PreviousStart | 0 | 模型保存上一掃描 Start，用來找上升緣 |
| State | WAIT | 只由一次狀態決策更新 |
| EnterTime | 未設定 | 接受啟動時保存虛擬時間 |
| ET | 0 ms | RUN 內的目前時間減 EnterTime，顯示上限 2000 ms |
| Busy | 0 | 由更新後的 State 推導，只有 RUN 為 1 |
| 原因 | 尚未執行 | 記錄轉移或拒絕原因；FAULT 期間保留 STOP／TIMEOUT |

模型中的時間不是瀏覽器等待了多久。即使停留一分鐘，沒有按掃描，ET 也不會改變。「執行 10 掃描」則使用同一組輸入連續取樣十次。

## 先跑成功路徑

按「全部重設」，依序操作。每列按一次「執行 1 掃描」。未列的輸入維持 0。

| 掃描／時間 | 輸入 | 更新後 State | Busy | 應看到的事 |
| --- | --- | --- | --- | --- |
| 1／0 ms | Start=0 | WAIT | 0 | 初始待機 |
| 2／100 ms | Start=1 | RUN | 1 | 接受新上升緣，EnterTime=100 |
| 3／200 ms | Start=0 | RUN | 1 | ET=100 ms |
| 4／300 ms | DoneInput=1 | DONE | 0 | 完成，等候 Ack |
| 5／400 ms | DoneInput=0 | DONE | 0 | 結果仍保留 |
| 6／500 ms | Ack=1 | WAIT | 0 | 清除此筆等待，ET 回到 0 |

第 4 列不能再同時跳到 WAIT，即使 Ack 已是 1，也要等下一掃描才處理 DONE 的規則。這是「每次只根據前狀態做一個轉移」的結果。

## 再跑失敗路徑，確認不是只會亮 Busy

### 逾時與完成同時成立

全部重設後，先勾 Start 並執行一次：時間 0 ms、State=RUN、ET=0。取消 Start，按一次「執行 10 掃描」後到 1000 ms；再按九次「執行 1 掃描」，到 1900 ms、仍為 RUN。

此時勾選 DoneInput，再掃描一次：時間 2000 ms，State 必須是 FAULT，原因 TIMEOUT，Busy=0。完成訊號沒有推翻已達期限的判定。

### 復歸不能保留舊完成訊號

承接上例，DoneInput 仍是 1 時勾 Reset，再掃描：仍為 FAULT。取消 DoneInput，保留 Reset，再掃描才回 WAIT。取消 Reset；重新讓 Start 從 0 變成 1，才開始下一筆工作。

### 長按啟動不能讓上一筆工作重跑

全部重設，Start=1 啟動後持續保持。用 DoneInput 完成，再清 DoneInput、用 Ack 回 WAIT；繼續掃描也應停在 WAIT。必須先取消 Start 並掃描一次，之後再勾 Start 並掃描，才有新的上升緣。模型重設後 PreviousStart=0，所以第一次取樣已為 1 的 Start 會被視為上升緣；實際設備若禁止開機已按住就啟動，還要另外設計啟動解鎖條件。

## 對照程式：一個決策點更新 State

以下是完整決策順序的偽碼，名稱對應上面的變數表。時間來源及型別必須在目標工程中另行宣告；這段不是已編譯的 PLC 專案。

```text
StartRise = Start AND NOT PreviousStart
NextState = State

CASE State
  WAIT:
    IF StartRise AND NOT Stop AND NOT DoneInput:
      EnterTime = NowMs
      NextState = RUN
  RUN:
    ET = NowMs - EnterTime
    IF Stop:                  NextState = FAULT; Reason = STOP
    ELSE IF ET >= 2000:        NextState = FAULT; Reason = TIMEOUT
    ELSE IF DoneInput:         NextState = DONE
  DONE:
    IF Ack:                   NextState = WAIT
  FAULT:
    IF Reset AND NOT Stop AND NOT DoneInput:
                              NextState = WAIT
END CASE

State = NextState
Busy = (State == RUN)
PreviousStart = Start
```

WAIT 的拒絕原因、FAULT 的原因保存、回到 WAIT 的計時清理，也必須一併實作，不能只抄 CASE 的轉移。本模型使用受限的四個狀態；實際 PLC 若狀態是整數，還要為未定義值加入故障分支，不能默默啟動。

## 發現結果不一樣時，先查哪裡

| 現象 | 先查 |
| --- | --- |
| 按 Start 無反應 | 上一掃描是否已為 1？Stop 或 DoneInput 是否還是 1？ |
| ET 一直 0 | 是否每次 RUN 都重寫 EnterTime？時間來源是否真的增加？ |
| 完成後立刻再 RUN | 是否用 Start 電平而非新的上升緣？ |
| Reset 直接開始工作 | 是否把復歸與啟動混為同一轉移？ |
| 到 2000 ms 又完成卻出現 DONE | 是否把完成判斷放在逾時之前？ |

上升緣的概念可對照 [CODESYS Standard R_TRIG 文件](https://content.helpme-codesys.com/en/libs/Standard/Current/Trigger/R_TRIG.html)。文件支持 BOOL 上升緣偵測；本篇的四個狀態、逾時優先順序和復歸條件是自行定義的案例，不是該功能塊提供的功能。

下一步可讀[自保持與長按再啟動](/articles/plc-self-hold-set-reset-q-series)，比較電平啟動和事件啟動的差別；需要了解連續成立多久才輸出，接著做[TON 計時練習](/articles/plc-ton-tof-tp-timer-selection)。
