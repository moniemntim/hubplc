---
title: 操作log怎麼記才可追查 從畫面變更到設備結果
description: 設計包含畫面、tag、權威old/new、單位、使用者、可信時間、operationId、result與設備revision的操作log。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 一 先定義一筆操作事件

操作log不是把畫面文字複製到檔案，而是描述誰在何時對哪個畫面或tag提出什麼變更，以及設備最後回報什麼結果。欄位應包含screen、tag、oldValue、newValue、unit、user、trustedServerTs、operationId、result與equipmentRevision。operationId串起確認、送出、回覆和失敗，不用時間戳代替唯一識別。

欄位定義須固定並供查詢。

oldValue必須由權威服務在提交前讀取，不能拿HMI快取當舊值。畫面看到50.0時，別人可能已改成52.0；提交前若服務讀到52.0，就應把52.0記為old並依revision規則要求重新確認。newValue也要保存canonical型別與單位，避免50和50.0無法比較。密碼、token與金鑰應排除原文並記錄變更事件；不可用一般雜湊當成適用所有秘密的保護。

操作類型也要標示read、write、ack、cancel或login，避免只看tag就誤解事件。若是批次操作，另存批次識別與筆數。

若操作來自批次匯入，old/new以每個tag分行保存，批次結果不能掩蓋單筆失敗。

| 欄位 | 例值 | 用途 |
| --- | --- | --- |
| screen/tag | Recipe/Temp | 定位介面與欄位 |
| old/new/unit | 52/55/°C | 權威變更內容 |
| user | U17 | 責任歸屬 |
| trustedServerTs | 10:03:12Z | 事件時間 |
| operationId | OP-884 | 串接流程 |
| result | accepted/applied | 分清階段 |
| equipmentRevision | 42 | 提交前後版本 |

tamper evidence只能表示系統能偵測部分修改，例如鏈結hash或集中保存，不可宣稱log天然不可竄改。

## 二 accepted不等於applied

accepted代表服務接受請求進入處理，不代表設備已採用。result至少分accepted、sent、applied、rejected、unknown與partial。設備回讀值、回覆版本或明確commit結果到達前，不把accepted改寫成applied。若連線在送出後中斷，結果是unknown，要查設備狀態而不是盲目重送。

案例：10:00:00建立OP-884，權威old=52°C、new=55°C、revision=42；10:00:01服務accepted，10:00:02送出，10:00:03設備回讀55°C、revision=43，且可關聯OP-884，才記applied。若10:00:02.5斷線，log記unknown並保存最後步驟，不能把畫面綠勾當設備證據。

同一operationId的事件依追加式政策保存，後續結果以新事件追加或有版本的狀態表呈現。不要覆蓋原始accepted時間與回覆內容。

result的語意要寫入資料字典。accepted是服務收到且通過初步檢查，sent是請求已發出，applied是設備證實採用；rejected與unknown分別代表明確拒絕和結果未知。不要把網路HTTP 200直接映射成applied。

若設備回覆只有「收到」沒有回讀能力，最多記accepted或sent；可以另記equipmentAck，但不能猜測參數已生效。對未知結果提供查詢、人工確認與禁止重複的入口。

服務端接收old值時要把讀取時間與revision放在同一快照，不能先讀old、隔很久才讀revision。兩者不一致時重新取快照。

時間格式統一使用帶時區的ISO表示，並保存伺服器與設備時間的差異。

若事件跨越多個服務，保留correlationId與原始operationId，避免只剩最後一跳。

| 時間 | 事件 | result | 證據 |
| --- | --- | --- | --- |
| 10:00:00 | 建立 | pending | 權威old/revision42 |
| 10:00:01 | 服務接收 | accepted | 權限與格式通過 |
| 10:00:02 | 送設備 | sent | request已發出 |
| 10:00:03 | 讀回 | applied | 55°C/revision43 |
| 中斷未回覆 | 查不到 | unknown | 不可推測 |

## 三 可信時間與設備版本

trustedServerTs是服務端產生的標準時間；clientTs可另存但不能取代。設備source timestamp也分欄保存。時鐘不同步時記錄offset或confidence，不能用使用者電腦時間排列因果。operationId、server timestamp與設備revision一起使用，才能把畫面操作和設備狀態連起來。

equipmentRevision要在提交前讀取並在結果中回讀。若提交前為42，另一操作使它變43，原操作應回Conflict，要求重新讀old/new；不要因newValue仍是55就覆蓋。這是防止檢查與使用之間內容被換掉的基本門檻。

數值、單位、null、未提供與redacted不可共用空字串。秘密欄位記錄redacted=true及變更類型，不保存可供猜測驗證的密碼摘要。

trustedServerTs與equipmentTimestamp可同時保存，並標示各自時鐘來源。服務端排序以server事件鏈為主，設備時間只作來源資訊；若兩者差異大，記錄timeConfidence而不是默默調整。

revision須在權威端與接受修改做原子條件判定；前後各讀一次只能發現部分競爭，不能阻止覆蓋。自己的成功修改也會使版本變動，不能一見跳版就判衝突。沒有條件寫入能力時，明列限制與所有寫入入口。

設備只回傳部分欄位時，另記驗證不完整，不能因此斷言部分寫入。partial須有部分套用證據；完整回讀也要核對目標、版本及操作關聯，讀到相同值不必然是本次命令造成。

對回讀不一致建立獨立reason，不把它改成一般rejected，方便區分設備拒絕與資料驗證失敗。

設備拒絕時保存設備錯誤碼與服務判定，兩者不要互相覆蓋。

| 情境 | 應記錄 | 結果 |
| --- | --- | --- |
| 時鐘偏移 | serverTs、clientTs、confidence | 可解釋時間差 |
| revision衝突 | 舊/目前revision | Conflict |
| 秘密欄位 | redacted、變更類型 | 不寫原文 |
| 設備未回讀 | 最後步驟、連線狀態 | unknown |

## 四 驗收與證據強度

驗收涵蓋成功、權限拒絕、格式拒絕、revision衝突、設備逾時、回讀不一致與log儲存失敗。每次檢查screen、tag、old/new/unit、user、trustedServerTs、operationId、result與equipmentRevision是否齊全。

tamper evidence可用hash chain、只讀複本、集中收集與存取稽核提高可信度；它仍不是不可竄改證明。驗收要測修改偵測、缺號、時間倒退與重放operationId。

畫面、tag與設備識別要使用穩定ID，不要只記顯示名稱。名稱可能被翻譯或重新命名，穩定ID才能把多次操作串在同一資產上。若一次操作改多個tag，保留同一operationId並列出欄位順序。

oldValue若是陣列或結構，log要保存版本化摘要與checksum，不能只記「已修改」。單位轉換也要保留原始輸入與canonical值，否則事後無法分辨使用者輸入錯誤還是服務轉換。

每筆事件還應標示schema版本與來源信任區，讓日後欄位改版或跨服務轉送時能辨認資料語意。

log記錄服務與設備結果，安全停機、聯鎖與設備授權仍由獨立契約和驗證負責。完成標準是能回答誰、哪個欄位、從什麼到什麼、何時、送到哪台設備及最後結果。

失敗排查順序是先查operationId事件鏈，再比對權威old、revision和設備回讀，最後看畫面快取。

log驗收要檢查欄位缺失、超長值、換行注入與非法時間格式。輸入來自其他信任區時先驗證與清理，避免log本身被用來混入假事件。

集中保存與本地緩衝都要記錄送出失敗。若log儲存滿或服務中斷，應發出可觀測告警並保留最小必要事件，不要讓錯誤被靜默吞掉。

查詢log時以operationId和equipmentRevision交叉篩選，讓維護人員能找出同一版本的所有操作。

log查詢介面也要記錄誰查了哪些敏感事件，避免稽核資料本身成為無記錄的讀取。

欄位缺少時記錄缺少原因，不能用空值補齊後假裝完整。

## 五 FAQ與官方來源

FAQ1：畫面顯示old值可以直接寫log嗎？答：不行；oldValue以權威提交前讀值為準。

FAQ2：accepted可以寫成成功嗎？答：只能表示服務接受；applied要有設備回讀或明確結果。

FAQ3：hash chain能保證log不可竄改嗎？答：不能，只能提高修改可偵測性。

FAQ4：秘密欄位要完整記錄嗎？答：不要；排除秘密內容，保存操作類型與結果。

參考：[OWASP Logging Cheat Sheet，事件欄位、時間、使用者、結果、秘密排除與完整性建議。](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

參考：[OWASP Transaction Authorization，服務端驗證、交易狀態與TOCTOU防護。](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)

## 延伸閱讀

- [匯出失敗如何分辨權限路徑與資料錯誤](/articles/export-failure-classification-atomic-publish)
- [HMI重連後怎麼刷新 查詢重建與舊命令防重送](/articles/hmi-reconnect-stale-callback-unknown-write)
