---
title: PLC 故障復歸：為什麼原因解除後，還要重新按一次？
description: 在頁面直接操作故障復歸，觀察長按、原因未解除及斷線恢復的結果；附完整 ST 程式對照與分開記錄的驗收表。
date: 2026-09-28
author: 茂伯
draft: false
---

## 先把復歸縮小到一個能測試的動作

這一課只做一件事：清除一個內部故障保持位元 `fault`。故障原因仍存在時拒絕；原因解除後，必須先看到有效釋放，再按下才能清除。一次接受只產生一掃描的 `pulse`，長按不重複接受。

**本文是本站自訂規則的 JavaScript 離線模型，沒有在 PLC 或原廠模擬器執行。**

它不清除 CPU 診斷、不復歸驅動器、不處理安全迴路，也不啟動任何輸出。先在頁面核對規則，再閱讀下方 ST 程式對照；兩者的驗證狀態分開記錄。

## 先在上方練習區完成三個動作

不需要下載或安裝。初始 fault=1、armed=0，按鈕已按住。直接按「執行 1 掃描」，應顯示「先釋放，再重新按下」，接受次數為 0。

1. 取消「復歸按鈕按住」，執行一次：armed=1，表示看到了有效釋放。
2. 再勾選按鈕，執行一次：fault=0、pulse=1，接受次數為 1。
3. 保持按住，按「維持輸入 10 掃描」：pulse=0，接受次數仍為 1。

這裡每按一次才推進掃描；真實等待不會更新。pulse=1 只屬於那一次計算，畫面會保留直到下一次執行，不代表實際 PLC 輸出一直為 1。練習最多記錄 100 筆，滿了請重新開始。

接著按「載入正文 11 步案例」，下方紀錄會從初值重算。應在第 6、11 步各接受一次，最後 fault=0、pulse=1、接受次數=2。逐列對照本文表格，尤其是第 3～4 步：故障原因解除，並不會補做之前拒絕的按壓。

### 想自行修改程式時再下載

網頁與下載版共用同一個判定函式，不需為閱讀本文安裝 Node.js。進階讀者可將 [reset-model.mjs](/examples/fault-reset/reset-model.mjs) 與 [demo.mjs](/examples/fault-reset/demo.mjs) 存在同一資料夾，以 Node.js 22 以上執行 `node demo.mjs`。最後一列應為 `11,1,1,0,0,1,2,accepted`。

## 輸入、初值與優先順序

| 名稱     | 初值或意義                                                  |
| -------- | ----------------------------------------------------------- |
| valid    | 復歸按鈕來源是否可信；0 不等於按鈕已釋放                    |
| button   | 1 表示提出復歸請求；不是現場端子的接線定義                  |
| cause    | 本機已判定的故障原因；1 表示仍存在，不受按鈕來源 valid 控制 |
| fault    | 故障保持位元，練習初值 1                                    |
| armed    | 已看到有效釋放，初值 0                                      |
| pulse    | 本掃描是否接受復歸，每次掃描先清為 0                        |
| accepted | 接受次數，初值 0；是練習紀錄，不是永久工作序號              |

每次呼叫 `resetScan` 就是一掃描，沒有實際等待時間。按下列順序執行：

1. `cause=1` 先把 `fault` 設成 1。
2. `valid=0` 取消 armed，本次不接受請求。
3. 有效且 `button=0`，才建立 armed。
4. 有效且 `button=1`，不論接受或拒絕都消耗 armed。之前沒有 armed，就等待釋放。
5. 已 armed 但原因未解除，回覆 `cause-active`；沒有故障則回覆 `no-fault`。
6. 其餘情況清除 fault、pulse 設 1，accepted 加 1。

這個順序刻意避免「按住等待條件成立後自動復歸」。拒絕的請求不排隊。函式會拒絕非布林輸入；例如字串 `"false"` 不會被當成有效的 false。

## 對照 11 次掃描

`demo.mjs` 的前三個輸入欄依序是 valid、button、cause。執行後逐列核對：

| 掃描 | valid | button | cause | fault | pulse | accepted | 判讀                            |
| ---- | ----- | ------ | ----- | ----- | ----- | -------- | ------------------------------- |
| 1    | 1     | 1      | 0     | 1     | 0     | 0        | 開始就按住，不算新請求          |
| 2    | 1     | 0      | 0     | 1     | 0     | 0        | 看到有效釋放                    |
| 3    | 1     | 1      | 1     | 1     | 0     | 0        | 原因仍存在，消耗並拒絕此按壓    |
| 4    | 1     | 1      | 0     | 1     | 0     | 0        | 原因解除但仍按住，不補做        |
| 5    | 1     | 0      | 0     | 1     | 0     | 0        | 再次釋放                        |
| 6    | 1     | 1      | 0     | 0     | 1     | 1        | 接受第一次復歸                  |
| 7    | 1     | 1      | 0     | 0     | 0     | 1        | 長按不再接受                    |
| 8    | 0     | 0      | 1     | 1     | 0     | 1        | 新故障仍保持；失效的 0 不算釋放 |
| 9    | 1     | 1      | 0     | 1     | 0     | 1        | 恢復連線仍按住，不接受          |
| 10   | 1     | 0      | 0     | 1     | 0     | 1        | 恢復後取得有效釋放              |
| 11   | 1     | 1      | 0     | 0     | 1     | 2        | 接受第二次復歸                  |

再改三組輸入觀察：把第 7 列複製十次，accepted 仍為 1；把第 6 列 cause 改成 true，不能清故障；第一次成功後加上有效的 0、1，但不加新故障，應回覆 no-fault，不增加次數。

## CODESYS V3：完整 ST 邏輯對照

平台提醒：下列宣告與呼叫範本採 CODESYS V3，不能直接視為 FX5U／GX Works3 工程。本站下一個原廠平台驗證目標為 FX5U；目前尚無 GX Works3 工程、編譯紀錄或 FX5U 實測證據，以下保留為邏輯對照。

以下採 CODESYS V3 的 Function Block 宣告與呼叫形式。

**此 ST 原始碼尚未在 CODESYS 編譯、模擬或實機測試，不能把瀏覽器通過當成原廠驗證。**

確切 service pack、runtime／CPU 版本須填入驗收表，本文不虛構測試環境。

下載 [FB_InternalFaultReset.st](/examples/fault-reset/FB_InternalFaultReset.st) 與 [PLC_PRG.st](/examples/fault-reset/PLC_PRG.st)。這是文字原始碼，不是可匯入的工程檔；檔內 DECLARATION、IMPLEMENTATION 分別貼入編輯器的宣告與實作區。

宣告區：

```iecst
FUNCTION_BLOCK FB_InternalFaultReset
VAR_INPUT
    SourceValid : BOOL;
    ResetRequest : BOOL;
    CauseActive : BOOL;
END_VAR
VAR_OUTPUT
    Fault : BOOL := TRUE;
    Armed : BOOL := FALSE;
    AcceptedPulse : BOOL := FALSE;
END_VAR
```

實作區：

```iecst
AcceptedPulse := FALSE;
IF CauseActive THEN
    Fault := TRUE;
END_IF;
IF NOT SourceValid THEN
    Armed := FALSE;
ELSIF NOT ResetRequest THEN
    Armed := TRUE;
ELSE
    IF Armed AND NOT CauseActive AND Fault THEN
        Fault := FALSE;
        AcceptedPulse := TRUE;
    END_IF;
    Armed := FALSE;
END_IF;
```

| 瀏覽器欄位 | ST 變數       | 用途                         |
| ---------- | ------------- | ---------------------------- |
| valid      | SourceValid   | 測試輸入品質，非自動斷線診斷 |
| button     | ResetRequest  | 復歸請求                     |
| cause      | CauseActive   | 本機已判定的故障原因         |
| fault      | Fault         | 內部故障保持                 |
| armed      | Armed         | 已取得一次有效釋放           |
| pulse      | AcceptedPulse | 此次 FB 呼叫接受復歸         |

接受次數是瀏覽器的教學紀錄，ST 不另外累加計數。這個 FB 沒有 X／Y 或實體 I/O 映射，不能直接當作急停、安全復歸或伺服告警清除。

### 建立測試工程與監看

1. 在你的 CODESYS V3 測試工程新增 POU，選 Function Block、ST，命名為 FB_InternalFaultReset，依上文分區貼入。
2. 在 PLC_PRG 宣告 `ResetLogic : FB_InternalFaultReset;` 與三個 BOOL 輸入，按下載的 PLC_PRG 範本每週期呼叫一次。循環任務需包含 PLC_PRG；不要在兩個任務同時呼叫此實例。
3. 本練習不用 RETAIN／PERSISTENT，不接實體輸出。先編譯並記錄實際版本與診斷；有錯誤就停止驗收，不能用網頁結果填成通過。
4. 監看三個輸入及 `ResetLogic.Fault`、`ResetLogic.Armed`、`ResetLogic.AcceptedPulse`。輸入需至少保持到一次任務呼叫，按表格順序施加；重做開機長按案例前須在測試環境重新初始化實例。
5. 一般監看畫面可能漏掉只有一次呼叫寬度的 AcceptedPulse。需要任務同步 Trace 或平台支援的單週期測試證據，不能因肉眼沒看到脈衝就判失敗，也不能只看 Fault 已清就判脈衝寬度通過。

使用 [驗收紀錄 CSV](/examples/fault-reset/verification-record.csv) 記錄觀察值、軟體與 runtime／CPU 版本及證據。範本每列為 NOT_RUN；模擬器與實機請各保留一份。尚未執行的欄位維持空白。

CODESYS 的 [Function Block 官方文件](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_obj_function_block.html) 說明實例、宣告／實作分區與呼叫形式。本文據此整理語法，並未取得本例的編譯結果。

## 哪些工作不在這個復歸範例內

### FX5U 驗證要留下哪些證據

FX5U 版本需在 GX Works3 另建測試工程，記錄 GX Works3 完整版本、CPU 完整型號與韌體，以及測試使用模擬器或實機。GX Works3 支援 ST 與標籤編程，但這不代表本頁 CODESYS 文字檔已通過轉換。[GX Works3 官方編程說明](https://us.mitsubishielectric.com/fa/en/products/cnt/programmable-controllers/engineering-software/gx-works3/programming/)

驗收沿用上表 11 次掃描：先保存工程與完整編譯診斷，再保存每次掃描的三個輸入、Fault、Armed、AcceptedPulse。第 6、11 次應出現接受脈衝；第 4、9 次應維持故障，不能補做舊按壓。測試須能逐掃描施加輸入與擷取輸出；只截一張 Fault=0 的監看畫面不足以證明長按防重複或脈衝寬度。模擬紀錄與實機紀錄分開，未跑的項目保留 NOT_RUN。

### 邏輯範圍與移植限制

模型只有一次掃描內完成的「內部故障鎖存清除」。若復歸要等待伺服回覆或其他跨掃描動作，就需要另外設計處理中、完成、失敗與逾時，不能直接把 pulse 當成工作完成。`valid` 也不是模型自動檢測的斷線結果，需要來源提供。

實機移植應把 fault、armed、pulse 設為 BOOL，明確指定啟動時的初始化／保持策略，並選擇容量足夠的計數型別。再把上表放進目標平台的測試紀錄，分開記「模擬器結果」與「設備結果」。本文沒有提供可直接匯入 GX Works 的專案，亦未驗證三菱 CPU 的指令與保持行為。

此模型不處理接點彈跳、兩次掃描間的短脈衝、HMI 請求序號重送或斷電恢復。布林重新武裝不能證明網路請求恰好執行一次；也不能把 fault 清除直接接成機台重新啟動。

## 下一課

- [三步驟順序控制：另看 RUN、DONE、FAULT 與逾時](/articles/plc-state-machine-three-step-sequence)
- [自保持：比較長按啟動在停止解除後的行為](/articles/plc-self-hold-set-reset-q-series)
