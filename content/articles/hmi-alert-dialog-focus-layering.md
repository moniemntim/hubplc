---
title: HMI警報摘要與刪除確認：焦點、模態層與本機草稿要分開
description: 用單檔離線案例驗證固定警報摘要、native alertdialog、鍵盤焦點與只刪本機草稿的界線。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 下載後直接操作

下載唯一檔案：[demo.html](/examples/alert-dialog/demo.html)。以 Edge 開啟它即可；不需要伺服器、帳號或外部資源。這是固定合成資料的 UI 教材，不是 HMI、PLC、警報確認、Reset 或安全控制實作。

1. 在「主編輯草稿」點入輸入欄，按「1000ms 後注入一次警報」。預期按鈕立即把焦點交回輸入欄；一秒後摘要顯示合成警報 1 筆，游標仍留在輸入欄。
2. 按「刪除本機草稿」。預期 native `showModal()` 對話框開啟，角色是 `alertdialog`，有標題、說明，且初始焦點在「取消」。
3. 在對話框按 `Shift+Tab`，焦點從取消移到「注入警報」，再按一次會從第一個控制回到確認；在確認按 `Tab`，焦點回到「注入警報」。焦點不會跑到背景。
4. 對話框開啟時按「注入警報」。預期對話框內文字同步顯示目前合成警報總數，仍只有一個模態對話框。
5. 按 `Escape`。預期對話框關閉，背景解除 `inert`，焦點回到「刪除本機草稿」。
6. 再開啟並按「確認刪除」。預期草稿變空，並顯示 `Ack=未確認；Reset=0`；它只改本頁 local draft。
7. 按「重設教材狀態」，它會取消尚未觸發的一次延後注入；然後將視窗縮為 320px、768px、1440px。預期內容不會水平溢出。

## 為何固定摘要與確認對話框不同

固定警報摘要是非模態 `status` 區域：它保留來源、狀態與合成筆數，但不搶正在編輯欄位的焦點。教材的延後注入是一次、可控制的 `setTimeout` 呼叫，沒有輪詢或無限計時器。使用者必須主動查看或操作，警報本身不會被這個刪除流程確認。

刪除草稿才使用 native `<dialog>` 的 `showModal()`，並標記 `role="alertdialog"`、`aria-modal="true"`、可見標題與說明。開啟時範例把外部主畫面設為 `inert` 和 `aria-hidden=true`，關閉時解除；對話框以明確的 `Tab` 與 `Shift+Tab` 處理保持迴圈。W3C 的 Dialog (Modal) pattern 要求 modal 外的內容不可互動，並規定 Tab/Shift+Tab 留在對話框、Escape 關閉、關閉後通常回到觸發元素。[W3C Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

Alert dialog 是用於需要取得回應的簡短重要訊息；它不是一般非模態警報摘要，也不會因為名稱相似就 Ack 警報或發出 Reset。[W3C Alert and Message Dialogs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/)

## 此案例實際驗證與限制

本批以 Edge 實跑鍵盤焦點迴圈、Escape 取消、背景無法聚焦、對話框內警報更新、刪除結果與 320/768/1440px 無水平溢出。它沒有做螢幕閱讀器認證，也不宣稱 ARIA 屬性能替代讀屏、觸控、放大字體或實機操作測試。

範例故意把 Ack 維持「未確認」、Reset 維持 0。真正產品仍需以獨立的警報生命週期、權限、控制命令與安全設計處理；不能由對話框、z-index 或這個頁面是否彈出，推論設備已確認、復歸或安全停止。

## 延伸閱讀

- [HMI警報確認、清除與發生紀錄要分開](/articles/alarm-acknowledge-clear-occurrence)
- [HMI事件時間線：把警報、操作與備註放進可重建的證據窗口](/articles/hmi-event-timeline-alarm-operation-note)
