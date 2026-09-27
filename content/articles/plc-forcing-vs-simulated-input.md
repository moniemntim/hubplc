---
title: 強制值與模擬輸入有什麼不同 PLC 測試資料的使用範圍
description: 在隔離CODESYS專案中比較SimInput、一次性Write Values與持續Force Values，並以Target每掃描寫0的時間線說明差異。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先把三種來源分開

本篇只在未連接任何現場設備的CODESYS隔離專案中示範。隔離的意思是專案沒有接到真實輸入模組、輸出模組、機台網路或會改變工件的設備；所有PhysicalSnapshot都只是測試資料。這樣的範圍讓讀者可以觀察工具語意與程式邏輯，不能推導出現場接線、濾波、斷線診斷或機構反應。程式模擬來源是應用程式自己選擇的SimInput；Write Values是工程工具對變數做一次寫入；Force Values則是CODESYS在指定處理點反覆套用準備值。三者都可能讓監看視窗看到1，但介入層級、持續方式和排查方法完全不同。

| 來源 | 設定位置 | 後續程式影響 | 測試用途 |
| --- | --- | --- | --- |
| SimInput | 隔離專案邏輯 | 由SimMode選擇 | 流程與缺回饋 |
| Write Values | 線上Write Values | 之後可被程式改寫 | 一次事件 |
| Force Values | 線上Force Values | 週期處理點重施 | 觀察覆寫關係 |

CODESYS官方文件把Write Values定義為一次性把準備值寫入控制器，程式之後可以再次覆寫；Force Values則是持續套用，直到明確解除。本文不把關閉監看視窗當作清場，也不把這些工具操作當成電氣輸入量測。

## 建立隔離的輸入選擇器

測試專案建立SimMode、SimInput、PhysicalSnapshot與EffectiveInput。SimMode=TRUE時，EffectiveInput只取SimInput；FALSE時才取隔離專案內的PhysicalSnapshot。PhysicalSnapshot是測試資料快照，不是現場端子讀值。流程只讀EffectiveInput，避免每段程式各自決定是否模擬。教學偽碼不可直接編譯：IF SimMode THEN EffectiveInput:=SimInput ELSE EffectiveInput:=PhysicalSnapshot。

| SimMode | SimInput | PhysicalSnapshot | EffectiveInput | 來源標籤 |
| --- | --- | --- | --- | --- |
| 1 | 1 | 0 | 1 | SIM |
| 1 | 0 | 1 | 0 | SIM |
| 0 | 1 | 0 | 0 | PHYSICAL_SNAPSHOT |
| 0 | 0 | 1 | 1 | PHYSICAL_SNAPSHOT |

切換SimMode時要先停止測試流程，再清除待處理事件並重新建立EffectiveInput。退出模擬後，畫面仍要顯示目前來源和TEST狀態；若來源標籤沒有回到PHYSICAL_SNAPSHOT，就不能把案例標成完成。

## Target每掃描寫0的對照案例

為了看清Write與Force差異，建立Target變數，程式每掃描都執行Target:=0。測試者準備值1後分別使用Write Values或Force Values。Write只在下一個週期寫入一次，之後程式的Target:=0可以把它改回0；Force則由CODESYS在官方定義的任務處理點重施準備值。程式在週期中仍可能暫時寫出0，因此監看時間點要列清楚。

| 掃描/處理點 | 程式寫入 | 單次Write=1 | Force=1 | 解讀 |
| --- | --- | --- | --- | --- |
| S0前 | Target=0 | 0 | 0 | 初值 |
| S1開始 | Target:=0 | 1先寫入 | Force重施1 | 工具/執行模型 |
| S1程式後 | Target:=0 | 0 | 可能暫時0 | Force週期內可被程式改變 |
| S1結束 | 輸出處理 | 0 | Force再施1 | 依官方循環順序 |
| S2 | Target:=0 | 0 | Force再施1 | Write不持續 |

Force的具體施加時機必須以CODESYS官方Forcing and Writing說明為準：文件描述任務週期開始和最後一個程式呼叫後的處理點，而不是自行猜測成『每行程式後鎖住』。本例只在模擬專案觀察變數，不連接輸出。

Write與Force的比較只在工具變數層成立，不代表輸入模組、濾波或端子電壓行為相同。

測試報告要保存掃描表，不能只保存最後數值。

## 三條測試時間線

同一個輸入事件可用三條獨立時間線重播。SimInput由程式測試表在指定掃描置1；Write Values只在一次週期開始前把Target寫1；Force Values則維持準備值，直到解除。每條線都記錄Source、EffectiveInput、Target、流程狀態和缺回饋計時器，不能只記最後畫面。

| 掃描 | Sim來源 | Write來源 | Force來源 | 僅SimInput流程預期 |
| --- | --- | --- | --- | --- |
| 1 | SimInput=0 | Target=0 | Target=0 | WAIT |
| 2 | SimInput=1 | 寫Target=1一次 | 準備Force=1 | 接受請求 |
| 3 | SimInput=1 | 程式改Target=0 | Force仍在處理點重施 | 各自依來源 |
| 4 | SimInput=0 | Target=0 | 解除前仍可能為1 | Sim流程可逾時 |
| 5 | SimMode退出 | Write已失效 | 清單解除後才回程式值；若沒有解除，Force值仍可能在週期邊界被重施 | 回到WAIT |

若測試的是缺回饋，命令可以由SimInput觸發，但Feedback保持0。預期是流程在明訂期限後進入NO_FEEDBACK或TIMEOUT，撤除待發命令並保留診斷；不能因Force把某個回饋位元固定成1就宣稱缺回饋案例通過。

缺回饋案例要把命令與回饋分開。可由SimInput在掃描2產生Start，讓Feedback固定為0，預期流程進入Busy並在設定期限後進入NO_FEEDBACK。此時不要用Force把Feedback改成1；那會改變測試問題。若需要另一個正常案例，再建立新的事件序列、解除前一案例的來源狀態，讓每次結果都能追溯。

上表三種來源是獨立實驗，只有SimInput那條線接入流程。Target覆寫比較不直接產生工作請求，因此不能把Write或Force欄的1解釋為流程一定接受。正常比較另把Feedback在100毫秒設為1，缺回饋比較保持0並設定300毫秒期限；兩條流程各自重設初值和開始時間，不共用上一輪的計時状態。

## 清場與失敗排查

測試結束的順序固定為：停止虛擬流程、保存事件表、確認EffectiveInput來源、解除所有Force Values、清除準備值與Write Values待寫項、關閉SimMode，最後重新讀取變數。CODESYS官方文件要求使用Unforce All Values、Prepare Value中的解除操作或登出等明確動作；關閉視窗本身不是清場證據。強制變數仍存在時，要在Watch All Forces清單逐項確認。

| 現象 | 先查 | 不能直接推論 |
| --- | --- | --- |
| Write後下一掃描變0 | 程式Target:=0 | Write沒有執行 |
| Force中途看到0 | 程式處理時間點 | Force已解除 |
| 重啟後仍被改1 | Force清單與登出選項 | 視窗關閉已清場 |
| 缺回饋未逾時 | Feedback來源與計時器 | 流程本身沒問題 |

若SimMode顯示OFF但EffectiveInput仍標示SIM，先查來源選擇器與快照更新；若Target一直為1，先查Force清單，再查程式是否在其他任務寫入。不同來源要有不同診斷碼，否則測試人員會把工具覆寫誤判為程式邏輯。測試記錄至少包含掃描編號、來源欄、SimMode、SimInput、PhysicalSnapshot、EffectiveInput、Target以及流程狀態。若同一掃描中先看到Target=1、程式執行後變成0，應標明這是Write後被程式覆寫；若Force在週期處理點再次套用1，則記錄Force清單仍有效。這些欄位要和畫面截圖或事件匯出檔對得上，不能只寫測試通過。

具體操作時，先在隔離專案離線建立SimInput事件，再連線到模擬控制器觀察流程。若要比較Write Values，先清除Force清單，準備Target=1並執行一次Write，逐掃描記錄程式Target:=0的結果。若要比較Force Values，先確認Target原值，再準備1、執行Force，記錄任務週期開始、程式執行中與週期結束三個觀察點。測試完成後使用Watch All Forces逐項解除，重新登入或重新啟動只作為檢查，不取代明確解除。

## FAQ 來源

完成後應看到：解除Force後，Target由程式保持為0；來源選擇表的四組結果全部相符；正常回饋案例完成，缺回饋案例在300毫秒邊界進入逾時。這些都是待執行的預期結果，清場還應確認使用的是一般Force Values，若專案另用CFC功能塊輸入強制，官方說明它屬不同機制，不能只靠Watch All Forces清單排除。

問：Write Values寫1後能保證保持嗎？不能，CODESYS定義它是一次性寫入，後續程式或I/O寫入可覆蓋。問：Force是不是讓程式永遠讀到1？不是，官方說明指出程式處理期間可能暫時改變，Force會在指定週期處理點再套用。問：關閉監看視窗會解除Force嗎？不能如此判定，必須明確執行解除並檢查Force清單。問：SimInput能驗證現場接線嗎？不能，本篇只驗證隔離專案的邏輯流程。

現場強制操作須依設備的安全與授權程序執行。CODESYS文件中的Forcing and Writing頁面、Write Values命令與Force Values命令是本篇語意依據。

參考：[CODESYS 變數強制與寫入](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_forcing_values.html)

參考：[CODESYS Write Values command](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_cmd_write_values.html)

參考：[CODESYS Force Values command](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_cmd_force_values.html)

參考：[CODESYS 解除所有強制值](https://content.helpme-codesys.com/en/CODESYS%20Development%20System/_cds_cmd_unforce_all_values.html)

最後檢查來源欄與Force圖示，再把測試報告標成隔離專案結果。只有清除強制、關閉SimMode並確認來源回到快照後，案例才算收尾。

## 延伸閱讀

- [大量迴圈拖慢 PLC 掃描 如何分批處理工作](/articles/plc-batch-processing-large-loop)
- [PLC 模擬測試不只看正常流程 建立異常情境矩陣](/articles/plc-simulation-abnormal-scenario-matrix)
