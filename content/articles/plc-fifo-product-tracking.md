---
title: PLC 產品 FIFO：容量五的 head-only 追蹤與事件重送
description: 下載 Node 離線 ring buffer，核對容量、回繞、S1 跳站、S2 出列與事件 ID 的 duplicate/conflict 規則。
date: 2026-09-17
author: 茂伯
draft: false
category: PLC 程式與控制
---

## 先定義容量與事件規則

本例是 Node.js 24.19.0 的單寫入者、記憶體內離線模型，不連 PLC、輸送帶或站點控制器。容量固定 5，以 `head`、`tail`、`count` 判斷空滿；head 等於 tail 不能單獨判斷。產品 ID 在本模型生命週期不能重用。

每掃描先處理入列，再處理站點事件。因此滿佇列同掃描收到 P06 入列和 P01 出列時，P06 先被拒絕為 `enqueue_rejected_full`，P01 才出列；下一掃描重送 P06，才會寫進回繞 tail。這不是現場感測事件的真實時間模型。

只有 head 產品能更新。S1 COMPLETE 令 `AT_S1 → AT_S2`，S1 SKIP 令 `AT_S1 → SKIP_S1`，S2 COMPLETE 才從 `AT_S2` 或 `SKIP_S1` 出列。錯 product、station 或順序不更新 ring。這個 head-only 規則不支援並行站點。

事件 ID 格式為 `E<epoch>-<sequence>`，epoch 是 1..255，sequence 是 1..1000000。模型保存 ID 與 product/station/action：同 ID 同內容是 duplicate；同 ID 不同內容是 conflict，不能只看 ID 就掩蓋內容改變。事件和產品 ID 各最多保存 20 筆；滿時明確拒絕新 ID，不靜默淘汰。

## 下載與執行

把六個檔案放同一資料夾，用 Node.js 24.19.0 或更新版執行。

- [模型](/examples/product-fifo/product-fifo-model.mjs)
- [fixtures](/examples/product-fifo/fixtures.mjs)
- [self-test](/examples/product-fifo/self-test.mjs)
- [demo](/examples/product-fifo/demo.mjs)
- [可改輸入的 practice](/examples/product-fifo/practice.mjs)
- [README](/examples/product-fifo/README.md)

```powershell
node self-test.mjs
node demo.mjs
node practice.mjs
```

固定案例先讓 P01～P05 完成，P03 以明確 SKIP_S1 後從 S2 出列，再重送 P01 的舊 S2 event，不增加完成數：

```text
five-products count=0 completed=5 replay=station_duplicate
wrap head=1 tail=1 count=5 order=P02,P03,P04,P05,P06
demo: PASS
```

回繞案例先滿五格，完成 P01 後才重送 P06，所以 P06 寫到索引 0；邏輯順序仍是 P02 到 P06。

下表是 `wrap` fixture 的逐掃描關鍵列；最後一列對應 `demo.mjs` 的 wrap 摘要。每個 fixture 元素代表一次呼叫 `fifoScan()`，索引從 0 起算。

| 掃描 | 輸入                       | head/tail/count | head 狀態 | 結果                   |
| ---- | -------------------------- | --------------- | --------- | ---------------------- |
| 1    | P01 入列                   | 0/1/1           | P01/AT_S1 | 寫入 slot 0            |
| 5    | P05 入列                   | 0/0/5           | P01/AT_S1 | 滿，head=tail 但不是空 |
| 6    | P01 S1 COMPLETE            | 0/0/5           | P01/AT_S2 | 尚未出列               |
| 7    | P06 入列 + P01 S2 COMPLETE | 1/0/4           | P02/AT_S1 | 先拒 P06，再出列 P01   |
| 8    | 重送 P06 入列              | 1/1/5           | P02/AT_S1 | P06 寫入回繞 slot 0    |

`practice.mjs` 另外提供三掃描練習。原始輸出應依序顯示 P01/AT_S1、P01/SKIP_S1、空 head，最後是 `practice: PASS`。把第二步唯一的 `action: 'SKIP'` 改成 `action: 'COMPLETE'` 再執行；第二行改成 P01/AT_S2、事件為 s1_complete_P01，第三行仍 count=0，並通過完成一件的斷言。若改成錯 product 或順序，最後斷言可能失敗，應先從每行 event 找拒絕原因，不要直接刪除斷言。

格式合法的事件會在 product、station、order 檢查前消耗 event ID。因此空 FIFO 或錯順序事件的同 ID 重送只會得到 duplicate，修正後必須使用新的 ID。epoch 只是 ID 格式的一部分，並非 active-epoch fencing，也不保證事件有序。

## 未實作的現場邊界

本例未實作產品被取走、站點逾時、重啟復原、持久化、並行站點結果暫存或 PLC task 同步。單一 JavaScript 寫入者不證明多 task 或多控制器的同步正確性。實機需要對應的感測、位置、station mapping、所有權、安全與復原驗收。

## 延伸閱讀

- [PLC 共用資源排程：用 FCFS 保證一次只授權一站](/articles/plc-exclusive-resource-scheduler)
- [PLC 工作參數快照：確認後，下一批才換新版本](/articles/plc-parameter-snapshot)
