---
title: CODESYS 強制值與模擬輸入：在隔離程式看懂 Write 和 Force
description: 用未映射任何硬體 I/O 的 CODESYS ST 範例，分開觀察程式模擬來源、一次 Write Values 與持續 Force Values。
date: 2026-09-17
author: 茂伯
draft: false
---

## 範圍與三種方法

本篇只比較 CODESYS 對**應用程式變數**的三種處理：程式自行選取的模擬輸入、一次性的 `Write Values`，以及持續性的 `Force Values`。範例沒有 `%I`、`%Q` 或裝置 I/O 映射，所以它不驗證端子、感測器、輸出模組或機台。

| 方法 | 介入位置 | 文件所述行為 | 本例觀察點 |
| --- | --- | --- | --- |
| `SimInput` | ST 選擇器 | 一般程式賦值 | 來源選擇是否正確 |
| Write Values | 線上 Debug 命令 | 下一任務週期開始時一次寫入 | 程式能否覆寫 |
| Force Values | 線上 Debug 命令 | 程式前與程式後重套用 | 程式中間值與週期末值 |

本文已核對官方命令文件，但沒有在 CODESYS 或任何控制器編譯、登入或執行附件。表格的「預期」是程式與文件推導的條件；實際結果要填入下載的 CSV。

## 建立並啟動 CODESYS 模擬目標

建立新的隔離 Standard project，建立對話框中將 `PLC_PRG` 的實作語言選為 **Structured Text (ST)**。開啟範本自動建立的 `PLC_PRG` `PROGRAM` POU；不要另建同名 POU，也不要刪除該 POU 自動產生的 `PROGRAM PLC_PRG` 標頭。再到 Task Configuration 確認 `MainTask` 只呼叫 `PLC_PRG` 一次；請不要為這個 POU 建立 I/O 映射。

CODESYS 的 POU 編輯器把宣告和實作分開。將下載檔或下方「宣告區」貼到 **Declaration** pane，將「實作區」貼到 **Implementation** pane；`PLC_PRG` 的 POU 類型與名稱是在建立物件時設定，不要把兩段一起貼到單一 pane。

確認應用程式沒有編譯錯誤且目前已登出後，依官方模擬流程操作：

1. 選擇 **Online → Simulation**。
2. 選擇 **Online → Login**。
3. 第一次登入此活動應用程式時，出現建立並載入 `Sim.<device name>.<application name>` 的提示便選 **Yes**。
4. 選擇 **Debug → Start**。

官方文件說明 Simulation 不需要實體目標或通訊設定，且 I/O 驅動與 fieldbus stack 不會被評估。因此本例只把模擬目標當作程式邏輯與工具語意的實驗環境，不把結果延伸到真實 I/O。

## 可貼入的 ST

下載：[PLC_PRG.st](/examples/plc-forcing/PLC_PRG.st)；空白量測表：[forcing-test-record.csv](/examples/plc-forcing/forcing-test-record.csv)。

**Declaration pane**

```iecst
VAR
    (* Test-only values. Do not map these to physical I/O. *)
    SimMode : BOOL := TRUE;
    SimInput : BOOL := FALSE;
    PhysicalSnapshot : BOOL := FALSE;

    EffectiveInput : BOOL := FALSE;
    InputSource : USINT := 1; (* 1 = SIM, 2 = SNAPSHOT *)

    (* Use this one variable for Write/Force experiments. *)
    WriteForceProbe : BOOL := FALSE;

    (* Reset this with Write Values before each probe experiment. *)
    ClearProbeEvidence : BOOL := FALSE;
    ProbeAtProgramEntry : BOOL := FALSE;
    ProbeEntrySeen : BOOL := FALSE;
    ProbeAfterProgramWrite : BOOL := FALSE;
END_VAR
```

**Implementation pane**

```iecst
(* Source selector: ordinary application logic, not CODESYS Simulation Mode. *)
IF SimMode THEN
    EffectiveInput := SimInput;
    InputSource := 1;
ELSE
    EffectiveInput := PhysicalSnapshot;
    InputSource := 2;
END_IF;

(* A Write of TRUE clears the persistent probe evidence for the next case. *)
IF ClearProbeEvidence THEN
    ProbeEntrySeen := FALSE;
    ClearProbeEvidence := FALSE;
END_IF;

(* This assignment deliberately exposes Write Values versus Force Values. *)
ProbeAtProgramEntry := WriteForceProbe;
IF ProbeAtProgramEntry THEN
    ProbeEntrySeen := TRUE;
END_IF;
WriteForceProbe := FALSE;
ProbeAfterProgramWrite := WriteForceProbe;
```

`PhysicalSnapshot` 是第二個程式內測試值，並非端子讀值。`InputSource=1` 代表 `SIM`，`InputSource=2` 代表 `SNAPSHOT`。`ProbeAtProgramEntry` 只有一個週期的即時診斷；`ProbeEntrySeen` 會保持 `TRUE`，直到以 `ClearProbeEvidence=TRUE` 的一次 Write 重設，因此可在一般監看畫面可靠記下 W1 或 F1 曾進入程式的值。

## 四個來源選擇案例

保持 `WriteForceProbe` 未被 Force。在線上 POU 的 Declaration pane，雙擊 `SimMode`、`SimInput`、`PhysicalSnapshot` 各自的 **Prepared Value** 欄，輸入或切換成本列值，核對三個準備值後用 **Debug → Write Values**（`Ctrl+F7`）一次寫入。等一個週期後讀取 `EffectiveInput` 和 `InputSource`。不要對這三個來源變數使用 Force。

| 案例 | SimMode | SimInput | PhysicalSnapshot | 預期 EffectiveInput | 預期 InputSource |
| --- | ---: | ---: | ---: | ---: | --- |
| S1 | TRUE | TRUE | FALSE | TRUE | 1 (`SIM`) |
| S2 | TRUE | FALSE | TRUE | FALSE | 1 (`SIM`) |
| S3 | FALSE | TRUE | FALSE | FALSE | 2 (`SNAPSHOT`) |
| S4 | FALSE | FALSE | TRUE | TRUE | 2 (`SNAPSHOT`) |

這四列只驗證選擇器。若不符，先確認監看的是同一 POU 實例、它已被任務呼叫，而且來源變數沒有殘留 Force。

## 讓 Write 與 Force 的週期內差異可觀察

CODESYS 對一般 Force 的任務順序是：讀取輸入、第一次程式呼叫前重套用強制值、執行 IEC 程式、最後一次程式呼叫後再重套用、寫出輸出。程式內賦值可讓強制變數在週期中暫時改值。

本例先把 `WriteForceProbe` 讀入 `ProbeAtProgramEntry`，必要時鎖存 `ProbeEntrySeen=TRUE`，然後固定寫成 `FALSE`，並以 `ProbeAfterProgramWrite` 留下該結果。鎖存值解決單一週期結果在下一掃描被監看畫面覆寫的問題。

### 實驗 A：一次 Write Values

1. 準備 `ClearProbeEvidence=TRUE`，執行 **Debug → Write Values**，並讓程式跑完一個週期；讀回 `ClearProbeEvidence=FALSE` 與 `ProbeEntrySeen=FALSE`，確認前一案例的鎖存值已清除。
2. 準備 `WriteForceProbe=TRUE`，執行 **Debug → Write Values**（`Ctrl+F7`），再讓程式跑完一個週期。
3. 在監看表記錄下列結果。`ProbeEntrySeen` 不需要卡在該單一掃描才看得到。

| W1 觀察點 | 預期值 |
| --- | --- |
| `ProbeEntrySeen` | TRUE |
| `ProbeAfterProgramWrite` | FALSE |
| 週期結束後 `WriteForceProbe` | FALSE |

官方文件將 Write 定義為下一週期開始時的一次寫入，所以此案例只能說明**本程式**隨後能覆寫它；不量測掃描時間，也不代表其他程式都會寫回 `FALSE`。

### 實驗 B：持續 Force Values

先用實驗 A 的第一步清除鎖存值，並讀回 `ClearProbeEvidence=FALSE` 與 `ProbeEntrySeen=FALSE`；再準備 `WriteForceProbe=TRUE`，執行 **Debug → Force Values**（`F7`），讓程式跑完一個完整週期。

| F1 觀察點 | 預期值 | 原因 |
| --- | --- | --- |
| `ProbeEntrySeen` | TRUE | 程式前已重套用強制值 |
| `ProbeAfterProgramWrite` | FALSE | 程式賦值暫時覆寫 |
| 週期結束後 `WriteForceProbe` | TRUE | 程式後再次重套用 |

這不是「每一行程式都鎖成 TRUE」。若實測不同，先記錄觀察時點、其他程式或用戶端對同一變數的寫入，以及目標、CODESYS 和 runtime 版本。CODESYS 另指出 CFC 的 **Force Function Block Input** 使用 data breakpoint，不由 `Watch All Forces` 或 `Unforce Values` 管理；本篇不涵蓋它。

## 清理與記錄

實驗結束後，執行 **Debug → Unforce All Values**（`Alt+F7`），讓程式再跑一個週期，確認本例的 `WriteForceProbe` 回到 `FALSE`。以 **View → Watch → Watch All Forces** 檢查一般 Force 的清單；關閉監看視窗不是解除動作。

最後選擇 **Online → Logout**，再選 **Online → Simulation** 關閉 Simulation mode。下載 CSV 的 `expected_*` 是本文預期，`observed_*`、版本、任務週期與結果狀態必須由實測填寫；未執行維持 `not_run`。

## 官方依據與限制

- [CODESYS：Testing in Simulation Mode](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_testing_in_simulation_mode.html)（先登出、**Online → Simulation**、**Online → Login**、首次建立/載入與結束順序）
- [CODESYS 模擬教學：啟動應用程式](https://content.helpme-codesys.com/en/CODESYS%20Visualization/_visu_visualize_an_refrigerator.html)（模擬登入後的 **Debug → Start**）
- [CODESYS：Command: Simulation](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_cmd_simulation.html)（模擬目標、無實體目標的範圍，以及 I/O/fieldbus 限制）
- [CODESYS：Forcing and Writing of Variables](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_forcing_values.html)（Force 時序、`Watch All Forces` 與 CFC 例外）
- [CODESYS：Command: Write Values](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_cmd_write_values.html)（`Ctrl+F7`、線上模式與下一週期的一次寫入）
- [CODESYS：Command: Force Values](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_cmd_force_values.html)（`F7` 與強制標記）
- [CODESYS：Command: Unforce All Values](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_cmd_unforce_all_values.html)（`Alt+F7` 與解除）

這些文件支持 CODESYS 的命令及一般任務時序；它們不保證特定 PLC、裝置描述檔、I/O 映射或版本的實機行為。附件尚未編譯或執行。

## 延伸閱讀

- [模擬輸入正常、實機輸入異常：如何拆分 I/O 與感測器](/articles/simulation-real-input-io-sensor)
- [測試用強制值如何在測試結束列出並清除](/articles/force-list-clear)
