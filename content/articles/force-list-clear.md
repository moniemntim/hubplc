---
title: PLC 強制值清場：解除後還要核對哪些來源與紀錄
description: 延續 CODESYS 隔離範例，逐項解除一般 Force、退出程式模擬來源並讀回結果，附清場表與查詢範圍紀錄。
date: 2026-09-21
author: 茂伯
draft: false
category: 維護與故障排查
---

## 先定義這次清的是什麼

本篇延續[強制值與模擬輸入實驗](/articles/plc-forcing-vs-simulated-input)，使用其中的 `PLC_PRG` 與 CODESYS **Simulation**。前篇負責建立程式及比較 Write／Force；這裡只處理實驗後的清場，不再重複貼一次相同程式。

清場不是單一按鈕。一般 Force、程式內 `SimMode`、尚未送出的 Prepared Value，以及診斷鎖存是不同資料，解除其中一種不會自動清掉其他項目。

**本文提供人工操作與記錄表，沒有自動連線、列單或清除控制器的程式。**本站未執行 CODESYS；以下是依前篇程式與官方文件建立的待測步驟，不是實測成功報告。

下載[清場紀錄 CSV](/examples/plc-cleanup/cleanup-record.csv)及[範圍與中斷紀錄表](/examples/plc-cleanup/scope-record.md)。CSV 每列保留 `not_run`，執行後才填觀察值、證據路徑與時間。

## 從前篇 Force 實驗的末態開始

前篇 F1 在 `WriteForceProbe` 強制 TRUE 後，預期診斷鎖存 `ProbeEntrySeen=TRUE`，程式內賦值後 `ProbeAfterProgramWrite=FALSE`，而強制目標在週期末再次為 TRUE。這些都是預期值，先保存自己的實際畫面，再進行以下步驟。

1. 確認狀態列為 Simulation、目前活動應用程式正是這份隔離範例。先填專案、應用程式名稱與工具版本。
2. 開啟 **View → Watch → Watch All Forces**，保存清理前清單。應能找到完整變數路徑的 `WriteForceProbe`；若有其他項目，先記錄來源，不要當成同一案例略過。
3. 執行 **Debug → Unforce All Values**，讓程式再跑至少一個週期。
4. 再讀 `WriteForceProbe`。本程式每輪賦值 FALSE，因此清除一般 Force 後預期為 FALSE；同時刷新清單，核對目前應用程式已沒有一般 Force 項目。
5. 把解除命令與讀回結果分開記錄。命令已送出，但還沒讀回，不能直接填「已確認解除」。

CODESYS 文件說明 Watch All Forces 列出目前應用程式的強制變數，並列出一般強制的解除方式；另指出 **CFC Force Function Block Input** 是不同機制，不受同一清單與解除命令管理。[官方 Forcing and Writing 說明](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_forcing_values.html)

所以本例的結論最多是「這個應用程式的一般 Force 已核對」。若專案還有 CFC 強制、其他應用程式或外部覆寫，必須另列範圍，不能拿空清單宣稱全部清場。

## 清單空了，再處理程式自己的測試狀態

下列變數是前篇的普通應用程式資料。先檢查宣告區與使用中的 Watch：本案例準備寫入的變數都是 BOOL，點擊各變數的 **Prepared Value**，在 TRUE、FALSE、空白之間切換，直到不需要的預備值為空白。這是官方教學記載的 BOOL 操作，不是把變數的實際 Value 改成 FALSE。[官方一次寫入教學](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_tutorial_refrigerator_app.html)

清掉殘留準備值後，只為下表指定的變數準備本次值，再執行 **Debug → Write Values**；不要用 Force 來做清場。每次寫入前都核對其他列沒有意外的預備值，避免一起送出。

| 項目 | 操作 | 跑完一個週期後的預期 |
| --- | --- | --- |
| `SimMode` | Write FALSE | `SimMode=FALSE`、`InputSource=2` |
| `ProbeEntrySeen` | 對 `ClearProbeEvidence` Write TRUE | `ClearProbeEvidence=FALSE`、`ProbeEntrySeen=FALSE` |
| 未送出的 Prepared Value | 點擊本例 BOOL 預備欄直到空白，再重開宣告區及 Watch 核對 | 各處均無不需要的預備值 |

`InputSource=2` 在本範例代表程式內的 `PhysicalSnapshot`，仍然是測試變數，**不是已接回現場端子**。`ProbeEntrySeen` 是診斷記憶；解除 Force 不會清掉這份記憶，所以需要另外復位。

如果清除鎖存後又立刻變 TRUE，先查 Force 是否仍有效、是否還有人寫入 `WriteForceProbe`，以及你是否看錯應用程式。不要反覆清零來掩蓋來源。

最後保存清場表與證據，執行 **Online → Logout**，再關閉 **Online → Simulation**。關閉視窗或登出時選擇保留強制，不能代替已完成的清單核對。

## 執行中斷，怎麼填才不會誤報完成

例如你按了解除，但隨即斷線：結果可能已生效，也可能尚未生效。此時填 `unknown`，保留最後成功讀回的狀態與時間；恢復連線、確認相同目標後重新查詢，才更新結論。

| 已知證據 | 可寫的結論 | 還缺什麼 |
| --- | --- | --- |
| 只有解除命令已送出 | 待確認 | 新清單與讀回值 |
| 查詢失敗，畫面看似空白 | 列單未完成 | 成功查詢及範圍 |
| 同一應用清單空、Probe 為 FALSE | 本例一般 Force 已核對 | 程式模擬來源與其他機制清場 |
| 所有本表項目都有新證據 | 本表範圍已確認 | 不替未涵蓋設備背書 |

不要把建立前的數值直接寫回當成「解除」。本例回到 FALSE 是因為程式持續寫 FALSE；若其他專案的正常來源在測試期間改變，應核對該來源當下的值與平台行為，而非恢復舊快照。

完整交付是清場表、範圍附頁及清理前後證據。若仍有 unknown 或未涵蓋的必要項目，結論保持 incomplete，列出負責人與下一個查詢動作。

## 延伸閱讀

- [CODESYS 強制值與模擬輸入完整隔離實驗](/articles/plc-forcing-vs-simulated-input)
- [模擬通過後，如何分段確認 I/O 與感測器](/articles/simulation-real-input-io-sensor)
