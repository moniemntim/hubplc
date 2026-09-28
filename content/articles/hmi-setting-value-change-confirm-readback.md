---
title: HMI 設定值變更怎麼以讀回證據確認已套用
description: 以既有 operation-log-v1 固定案例區分 accepted、unknown、applied 與 revision conflict，避免把畫面數字當設備確認。
date: 2026-09-17
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 先核對本例真正要證明的事

輸入欄的值、服務 accepted、送出寫入與設備已套用不是同一件事。本頁整合既有 `operation-log-v1` 離線證據讀取器：固定 operationId=`OP-884`、equipment=`EQ-A`、tag=`TEMP_SP`、畫面顯示舊值=50、fixture 假設的設備權威舊值=52、要求新值=55、expected revision=42。這些是合成教學資料，不是實讀設備。

本篇輸入合成事件鏈並解讀其結果；它不發出設定值變更，也不宣稱任何輸入步距。數字文字、範圍與步距請使用既有的 [HMI 數值範圍與步距驗證](/articles/hmi-numeric-range-step-validation/)；多人編輯的版本比較請使用 [HMI 並行編輯與版本衝突](/articles/hmi-concurrent-edit-last-writer-version/)。

## 下載與固定證據輸出

將以下檔案放在同一個資料夾，以 Node.js 24.19+ 執行：

- [model.mjs](/examples/operation-log/model.mjs)、[fixtures.mjs](/examples/operation-log/fixtures.mjs)、[demo.mjs](/examples/operation-log/demo.mjs)、[self-test.mjs](/examples/operation-log/self-test.mjs)
- [readback-demo.mjs](/examples/operation-log/readback-demo.mjs)、[readback-practice.mjs](/examples/operation-log/readback-practice.mjs)、[README.md](/examples/operation-log/README.md)

```powershell
node readback-demo.mjs
node readback-practice.mjs
node self-test.mjs
```

`readback-demo.mjs` 的固定結果：

```text
acceptedOnly: result=accepted reason=accepted_not_applied
disconnectUnknown: result=unknown reason=disconnect_after_send
success: result=applied reason=correlated_readback_proof
sameValueWrongOperation: result=unknown reason=readback_proof_incomplete_or_mismatched
revisionConflict: result=rejected reason=VERSION_CONFLICT observed=43 expected=42
readback demo: PASS
```

## 讀回要關聯同一操作，而不只比數字

`accepted` 只表示讀取器看到接受事件，`sent` 只表示已送出。斷線發生在 sent 後時是 `unknown`；它不等於失敗，也不可盲目重送。只有 readback 同時符合下列教學契約才是 `applied`：

| 讀回欄位                       | 固定值         |
| ------------------------------ | -------------- |
| operationId                    | OP-884         |
| equipment / tag                | EQ-A / TEMP_SP |
| value                          | 55             |
| revisionBefore / revisionAfter | 42 / 43        |

因此讀到相同數字 55 卻帶 `OP-OTHER`，結果仍是 unknown。讀回 revisionAfter=44 也仍是 unknown。revision 43 是本例的 `42 + 1` 契約，不是所有設備都使用的版本規則。

顯式 `VERSION_CONFLICT observed=43 expected=42` 才是 rejected 的證據；事後讀到不同值不能自行推論為 rejected。若 commit 與回覆之間斷線，先保留 unknown，再查同一 operationId 的讀回或事件，不把 retry 當成安全預設。

## 可改練習與限制

`readback-practice.mjs` 預設讀取 wrong-operation fixture，輸出 `OP-OTHER` 與 unknown。把最後一筆 readback 的 `operationId` 改為 `OP-884`，再執行，會得到 applied；或保留 operationId 正確而把 `revisionAfter` 改為 44，會保持 unknown。每次修改後都要保留 operationId、target、value 與 revision 一起判讀。

此資料夾的讀取器對 metadata、event 欄位、seq 與 ISO UTC serverTime 都有固定且有界的教學契約（最多 12 events、序列化後最多 4096 UTF-8 bytes）。它不提供帳號驗證、輸入控制、服務持久化、可信時鐘、PLC 寫入、實機 revision 原子性或 exactly-once 設備效果。畫面顯示已輸入 55、或單純讀到 55，都不能取代關聯讀回證據。
