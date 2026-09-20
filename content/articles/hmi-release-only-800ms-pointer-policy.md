---
title: 同一元件的長按與短按如何判定
description: 採release-only長按政策：放開時以event timestamp判799ms短按、800ms長按，按住只顯示狀態，owner cancel、失焦與換頁取消，第二pointer忽略。
date: 2026-09-21
author: 站長
draft: false
category: HMI 畫面與操作
---

## 一 把政策改成release-only

本篇教你設計放開才判定的長短按元件，採release-only政策。按住期間只顯示Pressed或進度提示，不執行命令；放開時以同一手勢的event timestamp計算持續時間，799ms判ShortPress，800ms或以上判LongPress。一次手勢只產生一次結果，並在release處理完成後結束。

這裡的800ms是產品政策，不是安全停機時間。事件timestamp代表輸入事件發生的時間，callback實際執行可能較晚；平台若延遲送出release，服務仍依事件時間計算，但必須記錄延遲與平台限制。不能把callback到達時間當成使用者放開時間。按下與放開必須使用同一時間原点的單調事件時間，不能混用會校時跳動的日期時間。

按住到800ms只更新視覺提示，例如顯示「放開以執行長按」；在timer到點時不執行LongPress。這使規則不依賴即時timer，也避免使用者放開後又收到晚timer而重複觸發。

事件時間必須來自同一手勢的pointerdown與pointerup，且精度要在設計中標明。若平台只提供整數毫秒，799與800是可區分的邊界；若事件時間被四捨五入，邊界附近應採較保守的提示或拒絕策略。頁面顯示的進度條可以反映按住時間，但它只提供視覺回饋，不得觸發命令。

release-only還要處理pointerup遺失，例如使用者拖出視窗、瀏覽器切頁或系統鎖定。此時不要以最後一次mousemove猜測長度；由owner失焦或頁面卸載事件取消手勢，並清除本地候選。重新回到頁面後，必須從新的pointerdown開始，不能接續舊的按住時間。

| release持續時間 | 結果 | 執行時機 |
| --- | --- | --- |
| 799ms | ShortPress | release處理時一次 |
| 800ms | LongPress | release處理時一次 |
| >800ms | LongPress | release處理時一次 |
| 按住未放 | 尚未決定 | 只顯示提示 |

## 二 owner 失焦與換頁

每次pointerdown建立owner，保存pointerId、按下時間、generation與目前元件。只有相同owner的release才可產生ShortPress或LongPress；不同pointer一律ignored，不重新計時，也不改寫第一個手勢。若產品將來要支援多指，必須另定每個pointerId的狀態機。

pointercancel、視窗失焦、頁面切換與元件卸載都取消owner。取消只結束UI候選，不撤回已經存在的其他命令；在release-only政策下，取消發生前沒有LongPress命令，因為按住期間不執行。取消事件仍要記錄原因，避免看起來像遺失輸入。

generation用來阻止舊頁callback更新新頁。頁面換頁時增加generation並清除owner；舊release到達時檢查generation不符便丟棄。重新綁事件時先解除舊listener，否則一次release可能被兩個handler各自解讀成兩次命令。

owner欄位可用pointerId與頁面元件識別組合，建立後直到release、cancel或失焦前都不接受其他pointer。第二根手指碰到同一按鈕時，記錄ignored而不改變第一根手指的開始時間；第一根手指仍依原規則結束。若元件被重新掛載，先取消舊owner，再建立新元件，避免兩個listener各自發火。

頁面切換和權限改變也屬取消條件。若使用者在按住期間失去操作權限，回到release時只顯示SessionChanged，不執行短按或長按。這個判斷要在release時再次核對權限與頁面版本，不能只相信pointerdown時的快取，否則舊畫面可能提交新狀態。

| 事件 | owner狀態 | 處理 |
| --- | --- | --- |
| pointerdown | 建立 | 等待同pointer release |
| second pointer | 不擁有 | ignored |
| blur/cancel | 取消 | 不產生結果 |
| 換頁 | generation失效 | 丟棄舊事件 |

## 三 事件時間與命令分離

案例一：pointerdown在0ms，release event timestamp為799ms，雖然callback在830ms才執行，仍判ShortPress；案例二：release timestamp為800ms，callback在860ms執行，判LongPress。兩者都在release處理時各產生一次，不能用callback時間重新分類。

若event timestamp缺失、精度不足或跨頁不可比較，服務端不能假裝知道799與800的差別。此時把結果標TimeUnknown或要求平台提供可信事件時間，不用本地收到時間代替。事件時間與server log time分開保存。

命令若由release產生，建立operationId並把pointer owner、event timestamp、duration與payload摘要寫入。命令結果仍分Accepted、Applied、Rejected與Unknown；release完成只代表UI手勢完成，不能代表設備完成。放開按鈕也不會撤回已先送出的命令。

一次手勢的once-fire規則要在服務端或共享事件層去重。即使重複listener或重送release，operationId相同也只能保留一個結果；若payload不同則回Conflict而不是再執行。

例如pointerdown的eventTimestamp為1000，pointerup為1799，差值799，結果是ShortPress；另一個手勢在2000到2800，差值800，結果是LongPress。伺服器日誌的receivedAt可能晚數十毫秒，只用來排查傳輸，不可拿來改寫手勢分類。若兩個事件來自不同頁面epoch，整個手勢拒絕並要求重新開始。

每次release只產生一個operationId，分類完成後立即把手勢標為fired。畫面重繪、網路重送或元件再次收到同一事件，都只能查詢此operationId的結果。若release回呼逾時，狀態標為Unknown並查詢；不可因沒有回覆就再次執行同一命令，也不可把伺服器接受當成設備已完成。

## 四 驗收與限制

驗收注入799ms、800ms、801ms、長按未放、pointercancel、失焦、換頁與second pointer。每個案例記錄pointerId、owner、event timestamp、server收到時間、generation、結果與operationId，確認短長按只在release產生一次。

測試平台事件延遲：讓callback比event timestamp晚50ms、500ms，確認分類不變但延遲可觀測。若平台沒有可靠timestamp，驗收報告應標示不能保證799/800邊界，要求產品選擇更寬的政策或改用平台明確事件。

release-only適合資訊介面與需要明確放開才執行的動作，不適合作為安全停機或人身保護機制。owner cancel與換頁只取消尚未產生的UI手勢，不是設備撤回。本文不假定任何廠牌HMI事件API。

完成標準是按住不執行、release依事件時間一次決定、799/800規則一致、第二pointer忽略、取消不產生命令、舊generation不污染新頁。

測試應固定事件時間序列，覆蓋799、800、801毫秒、pointercancel、blur、換頁、權限變更與第二pointer。每次測試都檢查分類、取消原因、operationId數量及命令送出次數；尤其是重繪與回呼延遲時，應仍只有一次送出。這些是介面行為驗收，不是安全功能驗證。

平台限制要在交付文件列出：瀏覽器可能延遲事件、背景分頁可能暫停腳本、觸控裝置可能產生不同pointer事件序列。若產品需要硬即時或安全停機，這個release-only按鈕不能取代專用控制器與獨立互鎖；它只負責把明確手勢轉成一筆可追蹤的請求。

最後以日誌驗收一次手勢的完整鏈：pointerdown、視覺提示、pointerup或cancel、分類、授權檢查、operationId與送出結果。若缺少任一鏈結，就先標記資料不完整而不補猜；這能把介面故障和設備未回覆分開，讓排查從事件記錄開始。

## 五 FAQ與官方來源

FAQ1：按住到800ms會立即執行LongPress嗎？答：不會；本政策只在release依event timestamp決定。

FAQ2：799ms但callback晚到會變成長按嗎？答：不會，只要event timestamp可信，仍判ShortPress。

FAQ3：第二個pointer可以重新計時嗎？答：不行，本政策忽略second pointer。

FAQ4：放開後能撤回已產生的設備命令嗎？答：不能假定；UI手勢與設備撤回是不同契約。

參考：[W3C UI Events，事件時間與使用者介面事件模型背景。](https://www.w3.org/TR/uievents/)

參考：[OWASP Transaction Authorization，交易狀態、服務端驗證與不可跳過的執行門檻。](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)

參考：[W3C High Resolution Time：單調時間與時間原點。](https://www.w3.org/TR/hr-time-3/)

## 延伸閱讀

- [觸控誤觸的確認與取消流程](/articles/scoped-operationid-payload-conflict-cancel)
- [序列ASCII框架解析_STX長度ETX與逾時重組](/articles/serial-ascii-stx-length-etx-framing)
