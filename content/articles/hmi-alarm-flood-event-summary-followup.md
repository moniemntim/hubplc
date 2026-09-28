---
title: HMI 警報洪水：保留轉換、重播摘要與晚到事件
description: 可下載的 Node.js 固定 50 cycle／132 transition 範例，驗算 window、重播、late event 與未確認狀態。
date: 2026-09-17
author: 茂伯
draft: false
---

## 下載並重播固定資料

這是 Node.js 24.19.0 的離線合成資料模型，不連 HMI、PLC、資料庫或網路。將下列六檔放入同一資料夾：

- [model.mjs](/examples/alarm-flood/model.mjs)
- [fixtures.mjs](/examples/alarm-flood/fixtures.mjs)
- [demo.mjs](/examples/alarm-flood/demo.mjs)
- [self-test.mjs](/examples/alarm-flood/self-test.mjs)
- [practice.mjs](/examples/alarm-flood/practice.mjs)
- [README.md](/examples/alarm-flood/README.md)

```powershell
node self-test.mjs
node demo.mjs
node practice.mjs
```

固定 fixture 真正計算 50 個 cycle 的 132 個 transition：50 ACTIVE、40 CLEAR、42 ACK。每筆 transition 都保留原始 id、cycleId、source、group、occurredAtMs、receivedAtMs 和 sourceSequence；摘要只是可回查這些原始列的另一個視圖，不會自動 ACK、Clear、刪除或改寫來源資料。

本例所有時間是同一個虛擬 clock 的安全整數，不是現場實測 UTC，也不表示來源已同步。occurredAtMs 表示事件發生時間，決定 window 歸屬；receivedAtMs 是資料到達摘要可用的時間。生命週期排序只用 sourceSequence，不用接收先後。

## 固定 window 的可核對輸入與輸出

window 是 [0, 900000)，結尾不包含 900000。固定資料輸出如下：

| 項目            |                計算值 | 判讀                                                       |
| --------------- | --------------------: | ---------------------------------------------------------- |
| cycle groups    | 1 + 14 + 20 + 15 = 50 | Utility、Pump、TemperatureFlow、Communication              |
| transition rows |    50 + 40 + 42 = 132 | ACTIVE、CLEAR、ACK 分開保留                                |
| Clear / Active  |               40 / 10 | 900000 前的結束狀態                                        |
| 未 ACK          |                     8 | Active 3、Clear 5，不能與 Active 相加                      |
| candidate       |                  C001 | sourceSequence 最早的 cycle，僅候選，不是因果或 root cause |

例如 low-level 摘要可顯示 group count，但 trace 仍會列出每一個 cycle 與它原本的 transition。CLEAR 和 ACK 的 sourceSequence 可先後互換；兩者都只能各出現一次，ACTIVE 也只能出現一次。這使「已 Clear 但未 ACK」與「仍 Active 但已 ACK」能在同一份固定資料中正確分開。

每個輸入列必須是 plain object 的精確 shape，字串有上限且不得空白或控制字元，時鐘為非負 safe integer，並要求 receivedAtMs 不早於 occurredAtMs。一份重播最多接受 512 個總輸入列與 256 個 unique transition id；同 id 的重送不另算新 transition，但也不能無限餵入。sourceSequence 在本範例代表單一合成 journal 的全域唯一序號，不是各設備可重號的序號；其順序中 occurredAtMs 不得倒退，cycle 的後續列也必須沿用 ACTIVE 的 source 和 group。重播完全相同的 id 和 payload 時，模型保留第一筆、回報 ignored duplicate，unique transition 與 cycle count 不變。相同 id 但 payload 不同會拒絕，不會靜默覆蓋歷史。

## 結尾、carry-in 與晚到資料

一筆 ACTIVE 的 occurredAtMs=900000 不屬於第一窗，而在下一個 [900000, 1800000) window 計為一個新 cycle。carry-in 另列：它是 window 起點前已 ACTIVE、到起點仍未 Clear 的 cycle，不重新算成此窗新發生。

summary 需要所請 window 在 asOfMs 可見的完整先前 source history。若可見後續列卻缺少更早列，模型會拒絕，不會猜成空狀態；實際 bounded query 必須連同足以建立 carry-in 的先前 history。fixture 外另有練習用 late row：occurredAtMs=899999、receivedAtMs=920000。asOfMs=900000 的原始 snapshot 看不到它，仍為 50 cycles。用相同原始列在 asOfMs=920000 重算時才變成 51 cycles，contentVersion hash 也改變；原 snapshot 物件沒有被抹掉或覆蓋。hash 是對 canonical unique visible transitions、摘要與包含 asOfMs 的 window 算 SHA-256；重送診斷與輸入接收順序不會改變它。它不是安全簽章。

## 可照改的練習

直接執行 node practice.mjs。預設會加入晚到列，輸出 original cycles=50、recomputed cycles=51、nextWindowCycles=0。把 practice 裡複製出的 late occurredAtMs 從 899999 改成 900000，再執行：舊 window 回到 50，nextWindowCycles 變成 1。也可從複製的 rows 陣列移除一筆 ACK，驗證未 ACK count 增加，而原始 fixture 不受改動。

這是自訂的資料契約與摘要規則，未對 Ignition、ISA 或任何產品 API 作相容性或標準符合性宣稱。最早的 sourceSequence 只能提供人工調查的候選起點；同時性、接收順序與摘要分組都不能證明因果。
