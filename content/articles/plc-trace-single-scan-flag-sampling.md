---
title: PLC Trace 如何用單掃描旗標、計數器與相位找出漏取事件
description: 下載離線資料集，比較每掃描與較粗取樣，從保留計數器與相位判讀單掃描事件的 Trace 證據。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先分開事件證據和波形證據

短暫事件已由程式接受，Trace 卻沒有畫出 `OneShot=1`，要分開回答兩件事：**同一控制邏輯有沒有接受事件**，以及**這組 Trace 取樣有沒有碰到那一掃描**。前者用不會在下一掃描歸零的 `EventCount`；後者才用 `OneShot` 時間列。上升緣的程式寫法不在本文重複，請見[上升緣與下降緣](/articles/plc-rising-falling-edge-button-event)。

資料集固定 2 ms 任務週期，事件在 scan 3、7、10。每個事件只讓 `OneShot` 在該 task row 的半開區間 `[startMs, endMs)` 為 1，並把 `EventCount` 加一且保留。它比較三個取樣計畫：

| 觀察 | 取樣時間 ms | 看見 OneShot 的 scan | 最後取到的 EventCount | 判讀 |
| --- | --- | --- | --- | --- |
| `single-scan` | 0, 2, 4, …, 22 | 3、7、10 | 3 | 每個模型 task row 一筆 |
| `coarse-phase-0` | 0, 6, 12, 18 | 7、10 | 3 | scan 3 漏取，6 ms 已讀到 Count=1 |
| `coarse-phase-2` | 2, 8, 14, 20 | 無 | 3 | 三個短旗標都在樣本之間 |

兩個 coarse 計畫都是 6 ms，只有 phase 差 2 ms。因此「每 6 ms 取樣」本身不能證明一定看得到或一定看不到。這些時間戳是**自訂離線模型**，不是 CODESYS、任何 PLC Runtime 或實體 I/O 的量測。

## 下載、執行與核對完整輸出

以下檔案不需 npm 套件，使用 Node.js 22.13.0 以上。將它們留在同一資料夾後執行 runner：

- [README.md：資料欄位與模型界線](/examples/plc-trace/README.md)
- [run.mjs：離線 runner](/examples/plc-trace/run.mjs)
- [trace-model.mjs：可檢查的取樣模型](/examples/plc-trace/trace-model.mjs)
- [fixture.json：12 scan 與三個取樣計畫](/examples/plc-trace/fixture.json)
- [expected-output.txt：此 fixture 的完整、逐字 stdout](/examples/plc-trace/expected-output.txt)

```powershell
node --version
node run.mjs
```

fixture 不變時 stdout 必須和 `expected-output.txt` 完全相同。`eventCount` 是樣本當刻讀到的保留邏輯值，不是 Trace 工具替你算出的事件數。若要重播另一種漏取，先只改 `fixture.json` 的 `eventScans` 或 `phaseMs`，重新執行，再一併保存 fixture 和新輸出。

`task_rows` 中 scan 3 的定義如下：

```text
scan,startMs,endMs,oneShot,eventCount
2,2,4,0,0
3,4,6,1,1
4,6,8,0,1
```

`coarse-phase-0` 在 6 ms 的樣本是 `6,4,0,1`：旗標是 0，計數器已是 1。它支持的結論很窄：**這個模型的粗取樣未碰到 scan 3，但模型已接受一次事件**。它不能替現場輸入端的最小脈寬背書。

## 端點與相位怎麼寫入診斷紀錄

模型把 scan 3 的 ON 窗定義成 `[4, 6)` ms：4 ms 屬 scan 3，讀到 `oneShot=1`；6 ms 已屬 scan 4，讀到 `oneShot=0`、`eventCount=1`。半開區間只是讓離線案例的邊界不含糊；實際 Trace 還有寫入位置、任務 jitter、時間戳解析度和 Runtime 支援等條件。

每一次受控重播都記下事件號、寫入 task 和 Trace task、各自的 Interval／priority／jitter、完整變數路徑、樣本時間戳、OneShot、EventCount、每 n cycle、trigger、post-trigger 與 buffer。Count 增加而旗標沒出現時，報告應寫「此設定未取到旗標」，不要寫「PLC 未執行」。Count 也不增加才回查輸入、初始化和 POU 呼叫頻率；見[子程式跳過呼叫時的前值與輸出保留](/articles/plc-subprogram-call-frequency-edge-timer)。CODESYS Task 文件也明示循環 task 的 Interval、監看 jitter，以及 priority／CPU 架構對排程的影響。[Object: Task](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_f_reference_task.html)

## 用 CODESYS Trace 重做同一個問題

以下是已依官方文件核對的 CODESYS 工具操作，不是宣稱 JavaScript 驗證了 CODESYS。前提是安裝 Trace package，且目標 Runtime 支援要用的功能；官方也警告 Trace 可能明顯增加 IEC task cycle time。[Data Sampling with Trace](https://content.helpme-codesys.com/en/CODESYS%20Trace/_cds_f_data_acquiring_with_trace.html)

1. 開啟既有 Trace object，選 **Trace → Configuration**，在 Record Settings 選取資料記錄 task。官方建議通常選寫入該變數的同一 task。[Creating Trace Configuration](https://content.helpme-codesys.com/en/CODESYS%20Trace/_cds_trace_configuring.html)
2. 用 **Add Variable** 加入完整實例路徑的 `OneShot`、`EventCount` 和輸入或事件號；不要只選輸出或 HMI 顯示值。
3. 需要圍繞事件保留資料時，啟用 Trigger，記錄 trigger variable、edge、post-trigger samples 和 record condition。這些欄位及 timestamp resolution 都在 Record Settings。[Trace Configuration](https://content.helpme-codesys.com/en/CODESYS%20Trace/_cds_dlg_trace_configuration.html)
4. 在 **Advanced** 記錄 `Measurement in every n-th cycle` 和 runtime buffer size。`n=1` 是每個已選 task cycle 取一筆；buffer 決定可保留時間範圍。[Advanced Trend Settings](https://content.helpme-codesys.com/en/CODESYS%20Trace/_cds_dlg_trace_advanced_settings.html)
5. 應用程式 online 時執行 **Trace → Download Trace**，以固定腳本重播事件，再保存原始 Trace、設定與 task 設定。官方描述此命令會傳送設定、開始取樣並將樣本傳回開發環境。[Download Trace](https://content.helpme-codesys.com/en/CODESYS%20Trace/_cds_cmd_trace_download.html)

在 CODESYS 重做之前，還須自行建立產生相同事件序列的 PLC 程式，確認寫入與取樣的相對位置；本文沒有提供或執行該 PLC 工程。匯出資料應記錄 task、變數路徑與取樣設定，但設定相同仍不能保證與理想時間表逐點相同。runner 不會連線、下載設定、模擬 CODESYS scheduler，也不會讀寫實體 I/O。

## 最小驗收表

| 要保存 | 實際資料 | 判讀目的 |
| --- | --- | --- |
| 應用、控制器、Runtime、Trace package 版本 | 版本號 | 不混用不同環境 |
| 寫入 task／Trace task | 名稱、Interval、priority、jitter | 解釋樣本和邏輯快照關係 |
| 變數 | 完整實例路徑 | 避免同名不同實例 |
| 取樣設定 | 每 n cycle、trigger、post-trigger、buffer | 說明保存的時間範圍 |
| 每次事件 | 事件號、OneShot、EventCount、時間戳 | 分辨漏取與未接受 |

如果開啟 Trace 後 timeout 或 jitter 變大，停在受控測試環境，比較開啟前後 task 監看值，再縮減通道、頻率或 buffer。不要為了讓波形好看而改正式 OneShot 的控制語意；診斷用延長旗標只能在隔離版本重做驗收。

## 延伸閱讀

- [PLC 掃描週期與輸入輸出更新：用五次掃描看懂執行順序](/articles/plc-scan-cycle-io-refresh)
- [PLC Watchdog 觸發時：辨別執行超時與遺漏週期](/articles/plc-watchdog-timeout-diagnosis)
