---
title: CODESYS Watchdog 排查：執行超時、未啟動與缺資料怎麼分
description: 用三組可下載合成資料區分執行超時、未啟動與證據不足，再按 CODESYS 設定與現場紀錄排查。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先分清楚你在量什麼

「等 Sensor B 超過 5 秒」是應用程式的步驟逾時；「任務執行超過監控時間」是 Watchdog；「任務一直沒有啟動」又是另一種排程問題。這三件事不能靠加大同一個時間參數解決。步驟逾時請看[等待、故障快照與復歸案例](/articles/plc-step-timeout-recovery)，本文只處理任務診斷。

本文有兩種資料，請分開使用：

- **已執行的離線練習**：讀取人為編製的 JSON，計算時間差並核對三個分類。沒有啟動 PLC、製造 CPU 負載或觸發真正的 Watchdog。
- **尚未執行的現場紀錄**：提供空白表，讓你保存目標設備設定、例外碼與輸出狀態。沒有 CODESYS 或硬體測試結果。

## 下載後重播三種證據

需要 Node.js 22.13 以上。將 [replay.mjs](/examples/plc-watchdog/replay.mjs) 與 [observations.json](/examples/plc-watchdog/observations.json) 存進同一資料夾，在該資料夾執行：

```sh
node replay.mjs
```

教材固定 `Interval=10 ms`、`Watchdog Time=5 ms`、`Sensitivity=1`，三個案例互相獨立。這些數字是方便計算的假設，不是設備建議設定。程式不支援其他 Sensitivity，避免把這個小練習誤用成完整 Runtime 模型。

CODESYS 文件區分已執行任務的監控與 Omitted Cycle；後者的觀察窗為 `max(Time × Sensitivity, 2 × Interval)`。本例為 `max(5×1, 2×10)=20 ms`。一般超時還受 Sensitivity 影響；本文只用 1，不推導連續多次超時行為。[官方 Task 文件](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_f_reference_task.html)

| 案例 | 合成觀察資料                                                                 | 程式答案              | 能下的結論                          |
| ---- | ---------------------------------------------------------------------------- | --------------------- | ----------------------------------- |
| A    | 最後開始 100 ms；106 ms 仍在執行；假設 Runtime 執行時間計數為 6 ms；紀錄完整 | EXECUTION_CANDIDATE   | 6 > 5，優先查正在執行的任務與程式段 |
| B    | 最後開始 100 ms、已結束；121 ms 仍未再次開始；任務使能、啟動紀錄完整         | OMITTED_CANDIDATE     | 21 > 20，優先查任務未獲排程的原因   |
| C    | 畫面只剩 100 ms 的舊開始值；121 ms 再讀取；中間紀錄不完整                    | INSUFFICIENT_EVIDENCE | 21 ms 的舊值不足以證明任務沒有啟動  |

完整 stdout 應為：

```text
synthetic only; execution > 5 ms; omitted window 20 ms
A: sinceStart=6 ms, execution=6 ms -> EXECUTION_CANDIDATE
B: sinceStart=21 ms, execution=unknown ms -> OMITTED_CANDIDATE
C: sinceStart=21 ms, execution=unknown ms -> INSUFFICIENT_EVIDENCE
3 synthetic assertions passed; no runtime or output behavior verified
```

A 的 `runtimeExecutionMs=6` 是**額外給定的合成計數**，不是拿 106−100 就宣稱量到了 CPU 執行時間。任務可能被搶占，開始至觀察的牆鐘時間不能直接代替 Runtime 的執行時間。也沒有「一定取得完成耗時」的假設：Watchdog 可能已中止任務，完成標記不一定更新。

B 的 `traceComplete=true` 同樣是教材前提，程式無法替真實記錄系統證明完整性。若實際資料只是 HMI 輪詢、記錄有掉包，或任務被停用，就不能直接套 B。C 刻意保留相同的 21 ms，示範缺資料時應停止下結論。

三個答案都是查證方向；真正的故障分類還需要 Runtime 例外碼、任務狀態及目標文件。本程式不是設備日誌解析器，也不模擬 Watchdog 精確觸發時刻。

## 在 CODESYS 專案中保存哪些證據

先下載 [runtime-record.csv](/examples/plc-watchdog/runtime-record.csv)。第一列 `not_run` 的實際欄位全部留白；測過之後才填入結果與證據路徑。不要把上面的 A、B 數字抄成設備量測值。

1. 開啟對應專案，記錄 CPU 型號、Runtime 版本與程式修訂。於裝置樹展開 `Task Configuration`，開啟出錯的任務。
2. 在任務 `Configuration` 記下 Type、Interval、Priority、Watchdog Time 的**數值及單位**、Sensitivity；另記任務核心綁定。若裝置用百分比，先按裝置文件確認，不能直接把畫面的 5 當成 5 ms。
3. 保存 Runtime 日誌中的原始例外碼、時間與任務名稱，並保存任務 `Monitoring` 畫面。使用同一時基的啟動／完成序號與平台計時資料；記錄工具的取樣條件及是否有遺失。
4. 先確認任務處於應執行的狀態，再依上表 A／B／C 排查。若只有一張停機後畫面、沒有歷史紀錄，先寫「證據不足」，補上下一次隔離測試的記錄計畫。
5. 記下 PLC Settings 的 `Update I/Os`、輸出預設值與實際例外後輸出。CODESYS 文件描述啟用該選項時重設為定義的預設值；預設值不必然是 FALSE，不能直接寫「所有輸出已安全關閉」。

以上介面名稱及行為依 [CODESYS Task 文件](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_f_reference_task.html)。目標設備可能限制或預設監控設定，其他品牌 PLC 也不一定有同名選項；需在紀錄中留下對應文件。

## 分類後才決定怎麼改

| 證據較接近              | 下一步                                                                   | 修改後要比較                                 |
| ----------------------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| A：已開始、執行時間過長 | 在隔離測試版對最大迴圈、解析、複製或同步等待分段量測；一次縮小一項資料量 | 相同輸入下的最大執行時間、功能結果、例外紀錄 |
| B：應執行卻沒有再次開始 | 查同核心其他任務的負載、優先級、使能及排程診斷                           | 啟動間隔、其他任務是否受影響、總負載         |
| C：記錄不完整           | 先修正記錄時基、取樣與遺失偵測                                           | 能否證明一段時間內所有啟動事件都被記錄       |

不要用任務名稱猜根因，例如看見「排序」就宣布排序耗時 9.5 ms。保留原始輸入及版本，量測後才寫數字；平均很低也不能代替最大值。調整任務配置時，還需檢查共享資料與 I/O 更新時序。

若調整 Watchdog，紀錄原值、新值、裝置依據與反應時間需求，分開驗證正常負載和目標支援的隔離故障測試。單純不再報錯，不能證明原因已排除。本文不提供製造無窮迴圈或停用監控的操作，也沒有宣稱已驗證故障後可安全恢復設備。

## 這份案例的交付範圍

下載檔能證明的是：相同合成輸入得到固定計算與分類，且缺資料不會被當成 Omitted Cycle。實際任務門檻、Runtime 例外、輸出處理與修正後負載，仍應填在現場表中，沒有紀錄就是未測。

取樣為何會漏掉瞬間事件，可接著操作[單掃描旗標與 Trace 取樣案例](/articles/plc-trace-single-scan-flag-sampling)；它也不能取代 Runtime 的 Watchdog 診斷。
