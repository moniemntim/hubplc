---
title: HMI 交班紀錄實作：接手責任，不改警報狀態
description: 下載兩筆固定交班資料，驗證接班、附加備註、版本衝突與資料過期，並核對 Active/Acked 沒有被交班動作改寫。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先跑一份完整交班紀錄

本例用 Node.js 24.19+ 執行自訂離線模型，沒有 PLC、登入服務或正式資料庫。下載以下檔案至同一資料夾：

- [model.mjs](/examples/shift-handover/model.mjs)
- [fixtures.mjs](/examples/shift-handover/fixtures.mjs)
- [demo.mjs](/examples/shift-handover/demo.mjs)
- [self-test.mjs](/examples/shift-handover/self-test.mjs)
- [practice.mjs](/examples/shift-handover/practice.mjs)
- [README.md](/examples/shift-handover/README.md)

開啟該資料夾的終端機，執行：

```powershell
node demo.mjs
node self-test.mjs
node practice.mjs
```

`demo.mjs` 會在目前資料夾寫入或覆寫 `handover-report.json`。這份檔案供你比對欄位與操作歷史，並非正式交班簽核或設備正常證明。

## 固定資料：07:00 接手兩筆不同的未完成工作

所有時間以 `2026-09-17T07:00:00+08:00` 為基準，程式保存 Unix 毫秒。兩筆來源快照都是該時刻的 Good 資料：

| 項目         | 來源警報狀態             | 接班人 | 下一步                   | 期限  |
| ------------ | ------------------------ | ------ | ------------------------ | ----- |
| H1／P-01／O1 | Active=true、Acked=true  | 早班甲 | 依巡檢程序檢查入口壓力   | 07:30 |
| H2／P-02／O2 | Active=false、Acked=true | 早班甲 | 確認溫度恢復後的現場狀態 | 08:00 |

P-01 已 Ack，仍有低流量問題；P-02 已 Clear，巡檢工作仍未完成。兩者都要交班，不能只篩「未 Ack」或「仍 Active」。`nextAction` 寫具體工作，`evidence` 留趨勢／工單識別與文字摘要，不只寫「已處理」。

## 逐步核對執行結果

```text
H1=ACCEPTED
H2=ACCEPTED
handover=RESPONSIBILITY_ACCEPTED; P-01 active=true
note=NOTE_APPENDED
old revision=REVISION_CONFLICT
reaccept=ACCEPTED
after 60001ms=NEEDS_CLARIFICATION
demo: PASS; wrote handover-report.json
```

1. 建立交班時兩項 revision 都是 1，整體是 `AWAITING_ACCEPTANCE`。
2. 早班甲逐項接受，兩項 revision 變成 2。整體 `RESPONSIBILITY_ACCEPTED` 只表示兩筆責任已接手；P-01 仍然 Active，P-02 的巡檢也不因此完成。
3. 對 H1 附加新備註後，revision 變成 3，先前紀錄仍在，H1 必須重新閱讀接受。這避免有人接受舊內容，後來文字被改掉卻仍顯示已接班。
4. 用舊 revision=2 接受，得到 `REVISION_CONFLICT`；改用目前的 3 才成功，產生 revision=4。
5. 以快照時間加 60001ms 查閱，整體顯示 `NEEDS_CLARIFICATION`。歷史接受紀錄不刪除，但舊快照不能一直冒充現在設備狀態。

打開 `handover-report.json`，應有四筆成功操作，依序是接受 H1、接受 H2、附加 H1 備註、重新接受 H1。舊版衝突被拒絕，沒有新增成功紀錄。這份範例沒有拒絕操作稽核庫；需要正式稽核時須另外設計保存。

## 修改一次資料品質，再核對接班結果

`practice.mjs` 預設把 H1 的 quality 改為 `Bad`。執行後第一行應是 `{"decision":"NEEDS_CLARIFICATION"}`；後面的報表仍保留設備與警報資訊，H1 沒有 acceptedBy，也沒有成功操作紀錄。

把 `changed[0].quality='Bad'` 改為 `Good` 再執行：第一行變為 `ACCEPTED`，但整體仍是 `AWAITING_ACCEPTANCE`，因為練習沒有接受 H2。只接一項不等於整張清單完成。

再把請求中的 `expectedRevision` 改為 99，應得到 `REVISION_CONFLICT`，而不是自動覆蓋。要看空欄位拒絕，可在建立 Handover 之前加入 `changed[0].owner = '';`，程式應以 `invalid handover` 結束，不能產生看似完整的交班表。

## 本例契約與現場需要補上的部分

每項必填設備、警報週期 ID、owner、dueAt、nextAction、evidence；最多 8 項、16 次成功操作。容量滿則拒絕新操作並保留既有內容。報表是副本，改輸出物件不會改回模型；備註只能追加，不能改寫原始警報 Active/Acked。

本例的「新鮮」定義是 Good 且快照年齡不超過 60000ms，等於邊界仍接受。這是教材參數，現場需依資料更新週期訂定；將報表時間換成 UTC 並不會替設備校時。模型不自動刷新來源；要恢復新鮮度，必須取得新的可信設備快照並建立新的交班紀錄，不能把舊 snapshotAt 改成現在。

`actor` 與 owner 相等只是案例欄位檢查，不是登入驗證。模型沒有角色授權、資料庫交易、斷線同步或跨程序恢復。正式系統須將身份和時間交給可信服務處理，並獨立保存交班及[警報生命週期](/articles/hmi-alarm-ack-clear-reset-workflow)。

旁路、手動模式與安全事項應另引用核准單與實際狀態來源；這個兩筆警報案例沒有實作旁路控制或簽核，不能靠交班勾選代替它們。要查截止前仍未確認的歷史事件，可接著做[半開時間窗報表案例](/articles/hmi-report-filter-time-window-alarm-state)。
