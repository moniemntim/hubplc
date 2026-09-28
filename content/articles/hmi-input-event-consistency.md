---
title: HMI輸入事件一致性：用單一 form submit 凍結草稿快照
description: 以離線文字草稿案例處理 composition、鍵盤、pointerup、Pending gate 與回覆不覆寫新草稿。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 七步重現

下載唯一檔案：[demo.html](/examples/input-events/demo.html)，以 Edge 開啟。這是單檔、離線的 form 行為教材，不是 PLC、網路、後端 CAS 或真實輸入法保證。草稿允許空字串，最多 120 個 JavaScript 字元單位；送出 gate 也會檢查同一上限。

1. 在「文字草稿」輸入 `組字草稿`，再點「原生送出」。預期 `requestCount=1`、snapshot 為 `OP-01:組字草稿`、狀態為 Pending。
2. Pending 時把草稿改成 `新草稿`，再按送出。預期仍只有一筆 request，log 新增 `DUPLICATE_PENDING`，舊 snapshot 不變。
3. 按「模擬回覆」。預期結果完成 OP-01、草稿仍是 `新草稿`，不會被舊回覆覆寫。
4. 再以按鈕或 Enter 送出。預期產生 `OP-02:新草稿`；完成後才是新的使用者意圖與新 ID。
5. 重設後按「測試：開始合成組字」，再按 Enter。預期 requestCount=0；按「測試：結束合成組字」後再按一次 Enter 才送出。這是 synthetic composition 測試，不是實體 IME 認證。
6. 重設後按「測試：只派發 pointerup」。預期 requestCount=0；隨後按「原生送出」才變為 1。focusout 只記錄 `FOCUSOUT_DRAFT_RETAINED`，不清草稿。
7. Pending 時按「取消未送出草稿」。預期拒絕撤回已送操作；非 Pending 時才清本機草稿。第 17 個 operation 會被拒絕；log 是僅保留最近 16 項的 rolling diagnostic，不是稽核紀錄。「重設教材」可回到固定狀態。

## 一個入口，兩個 state

範例只有 form 的 `submit` handler 建立操作。原生按鈕 click 和鍵盤 Enter 都到這個入口；`pointerup` 只留下診斷，不直接提交。MDN 將 `submit` 定義為表單提交事件，而直接呼叫 `form.submit()` 不會觸發此事件，因此教材與測試使用原生 submit 路徑。[MDN: submit event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/submit_event)

草稿可在 Pending 時繼續編輯，但送出瞬間會凍結 `{ id, payload }` snapshot。回覆只結束對應 Pending，不回填文字欄，所以 OP-01 的完成不會覆寫後來的「新草稿」。這個 UI gate 不證明後端冪等、版本比較或設備已執行；需要該層行為時，另見[冪等鍵與重複寫入](/articles/idempotency-key-duplicate-write)與[HMI數值輸入](/articles/hmi-numeric-range-step-validation)。

`compositionstart` 與 `compositionend` 是文字組字事件；範例在 composing 期間阻擋 Enter，結束後下一次 Enter 才可由 form submit 建立操作。[MDN: compositionstart event](https://developer.mozilla.org/en-US/docs/Web/API/Element/compositionstart_event) 與 [MDN: compositionend event](https://developer.mozilla.org/en-US/docs/Web/API/Element/compositionend_event) 的事件定義可作 Web 範例參考。Pointer Events 規格定義 pointerup 事件，但不替此教材實作多指 ownership、capture 或取消協定。[W3C Pointer Events](https://www.w3.org/TR/pointerevents3/)

## 已驗證的範圍與限制

本批以 Edge 實跑 native click、鍵盤 Enter、synthetic composition、key repeat、focusout、pointerup、Pending 重複送出、完成後草稿保留、16 筆邊界及 320/768/1440px 版面。它沒有驗證實體 IME、觸控硬體、多指 ownership、後端 CAS、網路重送或已送命令的撤回；對已送出的 Pending 操作，畫面只誠實地拒絕「取消」。
