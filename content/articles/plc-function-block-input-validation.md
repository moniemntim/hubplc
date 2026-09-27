---
title: PLC 功能塊輸入怎麼檢查 無效參數的回報與替代行為
description: 用虛構縮放功能塊驗證 Raw 與工程值的合法範圍，示範 Valid、Value、ErrorCode 和執行中設定版本快照。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先把縮放功能塊的責任寫清楚

本篇不用真實感測器，而是建立一個虛構的縮放功能塊。它接收 RawMin、RawMax、EngMin、EngMax、RawValid 與 Raw，輸出 Valid、Value 和 ErrorCode。目標是把原始值線性換成工程值，同時讓呼叫端知道這次結果能不能使用。輸入無效時保留上一個有效 Value，但 Valid 必須變成 FALSE；保留數值只是避免畫面突然被零覆蓋，絕對不能默認它仍代表目前量測。

案例設定是 RawMin=0、RawMax=100、EngMin=0、EngMax=10。Raw=0 應得到 0 EU，Raw=50 應得到 5 EU，Raw=100 應得到 10 EU。縮放公式為 Value=EngMin+(Raw-RawMin)×(EngMax-EngMin)÷(RawMax-RawMin)。這個公式只描述合成資料的線性關係，不代表任何真實類比模組已經校正，也不包含輸出限幅。

RawValid 是資料品質入口。若通訊逾時、通道未初始化或上游已判定斷線，就把 RawValid 設為 FALSE；本篇先檢查Active設定，再檢查RawValid及Raw範圍；若設定與來源同時失效，先回報設定錯誤。RawValid 為 FALSE 時，不能因 Raw 恰好是 50 就計算 5 EU。這個順序把數值內容和數值是否可信分開，方便 HMI 顯示「最後有效值」與「目前無效」兩種狀態。

以下偽碼只用來說明時序，不能直接編譯：每次先令Valid為FALSE，檢查Active設定，通過後檢查RawValid、有限值與Raw範圍，最後才計算並更新Value與Valid。實際 FUNCTION_BLOCK 宣告、輸出保留方式、REAL 型別和錯誤列舉，必須依目標 PLC 工程軟體確認。

完成這一頁的準備後，呼叫端應能回答三個問題：這筆 Raw 是否可信、目前設定是否完整、Value 是否可以被使用。若任何答案不明，先停在診斷狀態，不要用畫面顏色或數值大小猜測。

## 先驗證設定 避免除以零與反向範圍

第一個不可省略的檢查是 RawMax>RawMin。若兩者相等，公式分母為零，不能靠把 Value 設成零來掩蓋設定錯誤；應輸出 ErrorCode=CONFIG_RANGE、Valid=FALSE，並保留上一個有效 Value。若 RawMax<RawMin，也回報同一設定錯誤，因為本篇不把反向量程偷偷解讀成另一種方向。

本篇要求EngMax大於EngMin，等於或小於都回報CONFIG_ENG_RANGE。上下限可為負，例如負10至10。所有數值須為有限值，且差值、乘法及除法中間結果必須在選用型別範圍內；否則回報NUMERIC_INVALID，不發布新結果。設定檢查通過後才建立 Active 設定快照，避免一次計算讀到新 RawMax、舊 EngMax 的混合資料。

| 測試設定 | RawValid | 預期 Valid | 預期 Value | ErrorCode |
| --- | --- | --- | --- | --- |
| 0/100，0/10 | TRUE | TRUE | 依 Raw 計算 | NONE |
| 50/50，0/10 | TRUE | FALSE | 保留舊值 | CONFIG_RANGE |
| 100/0，0/10 | TRUE | FALSE | 保留舊值 | CONFIG_RANGE |
| 0/100，10/10 | TRUE | FALSE | 保留舊值 | CONFIG_ENG_RANGE |
| 0/100，0/10 | FALSE | FALSE | 保留舊值 | RAW_INVALID |

表中的「保留舊值」不是成功結果。呼叫端應先看 Valid，再決定是否把 Value 傳給後續控制；如果畫面只綁 Value 而忽略 Valid，就會把過期資料誤顯示為即時工程值。ErrorCode表示本次運算結果，錯誤存在時持續回報，下一次有效運算為NONE；若要保存歷史故障另設LastError。開機尚無有效值時Value初始化為0但Valid為FALSE，不能把這個零視為量測。

實作時可把設定檢查結果拆成 ConfigValid 與 RawValid 兩個旗標。ConfigValid 為假時，所有 Raw 都應拒絕；RawValid 為假時，設定仍可維持有效，但本次 Value 不可被下游採用。兩個旗標分開後，排查人員能判斷是校正設定壞了，還是通訊資料暫時中斷。

## 逐筆算 0 50 100 並保留邊界意義

設定通過後，先算 Raw=0。Raw-RawMin 是 0，分子為 0，Value=0+(0×10÷100)=0 EU，Valid=TRUE。接著算 Raw=50，分子為 50×10=500，除以 100 得 5，Value=5 EU。最後算 Raw=100，分子為 100×10=1000，Value=10 EU。三筆都在合法原始範圍內，且結果從工程下限單調走到工程上限。

| Raw | Raw-RawMin | 比例 | Value EU | Valid |
| --- | --- | --- | --- | --- |
| 0 | 0 | 0.00 | 0 | TRUE |
| 50 | 50 | 0.50 | 5 | TRUE |
| 100 | 100 | 1.00 | 10 | TRUE |
| -1 | -1 | 超出範圍 | 保留舊值 | FALSE |
| 101 | 101 | 超出範圍 | 保留舊值 | FALSE |

Raw=-1 和 Raw=101 顯示本例採拒絕超出原始範圍的政策。另一個專案也可能允許外插或把輸出限幅到工程上下限，但那是不同契約，不能只改一行公式。若選擇限幅，仍應保留 OutOfRange 旗標，否則使用者會看見 10 EU 卻不知道原始值已超出校正區間。

整數運算順序也會改變結果。應在相減及相乘之前就轉成合適型別，並檢查中間值範圍；本例Raw=50在足夠寬的整數先乘再除也得到5，但一般小數結果需合適實數或固定小數點策略。若在整數型別先做 50÷100，比例會截成 0，結果停在 EngMin。本文沒有指定任何品牌轉型指令，實作時應用目標平台手冊確認中間型別與超範圍行為。

驗收表的每一列都應重新初始化功能塊或明確指定上一筆有效值，避免上一個案例的 Value 滲入下一列。先測 Raw=0、50、100 的精確端點，再測 -1 與101 的拒絕，最後才測 RawValid 切換；這樣能把公式錯誤、範圍政策和品質旗標錯誤分開。

若工程值需要整數顯示，先保留內部未取整 Value，再另定顯示格式；不要把顯示四捨五入誤當成縮放公式已改變。這樣 Raw=50 的5 EU仍可追查原始計算，而顯示層的格式不會掩蓋資料品質。

## 執行中換設定 用版本快照隔離新舊資料

假設第一批工作使用版本 3：RawMin=0、RawMax=100、EngMin=0、EngMax=10。HMI 正在編輯下一批設定，先把 RawMax 改成 200，再把 EngMax 改成 20；若功能塊直接逐欄讀取，可能在兩次寫入中間看到 RawMax=200、EngMax=10，產生不屬於任何完整版本的結果。

可把設定分成 Edit、Committed 和 Active。使用者修改 Edit，按下確認後才完整驗證並建立版本 4 的 Committed；功能塊在下一次工作接受或明訂切換點，把整份 Committed 複製成 Active。每次輸出附帶 ConfigVersion，監看者就能知道 Value 是用版本 3 還是版本 4 算出。

若目前 Raw=50，版本 3 的結果是 5 EU；版本 4 若 RawMax=200、EngMax=20，結果仍是 5 EU，但 Raw=100 時版本 3 是 10 EU、版本 4 是 10 EU，只有 Raw=150 才能顯示版本差異：版本 3 會被本例拒絕超範圍，版本 4 會得到 15 EU。這些數字能驗證快照真的被採用，而不是只看版本欄位。

設定變更失敗先查版本是否完整遞增、Active 是否只在提交點更新、RawValid 是否被誤當成設定有效，以及 ErrorCode 是否被下一掃描覆蓋。若多任務同時寫入設定，還需依平台資料一致性機制設計提交流程；本文不假定通用鎖定或原子複製指令。

版本快照也要處理取消與回復。若版本4提交驗證失敗，Active仍維持版本3，由提交介面的CommitError指出新設定無效；現行縮放的Valid與ErrorCode仍依版本3及本次Raw判定。若使用者取消編輯，Edit可以丟棄而不影響目前工作。不要在驗證尚未完成時先寫入Active，否則即使最後回報錯誤，控制流程已經使用了半套資料。

## 完成預期 失敗排查與四個問題

完成後應看到：合法設定與 RawValid=TRUE 時，Valid=TRUE，Value 按公式更新，ErrorCode=NONE；RawValid=FALSE、RawMax≤RawMin、工程範圍不合法或 Raw 超界時，Valid=FALSE，Value 保留上一次合法結果，ErrorCode 明確指出原因。驗收紀錄要同時保存輸入、Active 設定版本、Value、Valid 和 ErrorCode，不能只抄 Value。

失敗時先查 RawValid 和設定檢查，再查 Raw 是否真的落在合法區間，最後查型別、單位與版本快照。若結果突然變成零，先看程式是否在錯誤分支把 Value 清零；本篇預期是保留舊 Value。若結果被接受但超出工程範圍，查是否把外插、限幅和拒絕政策混在一起。

FAQ：一、RawValid=FALSE 時為何不把 Value 設為零？因為零可能是合法量測，清零會掩蓋失效；保留舊值並以 Valid=FALSE 阻止誤用。二、RawMax=RawMin 能不能讓 Value 等於 EngMin？不能，這會隱藏除零設定錯誤。三、EngMin 可以大於 EngMax 嗎？數學上可表達反向斜率，但本案例設定契約拒絕，若要支援必須另寫測試。四、改設定後何時生效？依版本提交與 Active 快照規則，不能靠畫面寫入時間猜測。

適用限制：以下來源用於查閱 IEC POU、函式塊資料與資料型別概念；CODESYS、Beckhoff TwinCAT 和三菱 Q 系列在宣告、初始化、REAL 運算、診斷與線上修改行為上可能不同。本文案例為離線推算，未宣稱已編譯、模擬或硬體執行。

參考：[CODESYS Function Block 官方說明](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_obj_function_block.html)

## 延伸閱讀

- [Function 與 Function Block 的選擇和實例隔離](/articles/plc-function-function-block-state)
- [多個相似工站怎麼共用程式 建立可重用的工站介面](/articles/plc-reusable-station-interface)
