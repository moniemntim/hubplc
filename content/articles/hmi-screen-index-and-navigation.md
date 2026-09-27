---
title: HMI十個畫面的索引與權限
description: 以十個HMI畫面ID建立用途、route、view、permission、data與version索引，說明Perspective pages與views的關係及離線驗收。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先建立畫面索引

HMI畫面管理先解決「這個畫面是什麼」而不是先畫按鈕。每個screenId要有用途、route、承載的view、允許角色、資料來源與版本；顯示名稱可翻譯，ID則保持穩定。索引是交接、權限審查與變更驗收的共同鍵，不能只靠工程師記憶或資料夾名稱。

Pages與views不是同一層。以Ignition Perspective為例，一個page可含primary view、docked views與partial URL；view是可嵌入的畫面元件，page則把導航位置與組合關係固定下來。其他HMI產品命名可能不同，本文的索引概念仍要依實際產品文件映射。

| 畫面ID | 用途 | 路由 | 主要View |
| --- | --- | --- | --- |
| SCR-001 | 總覽 | /overview | V-Overview |
| SCR-002 | 線A狀態 | /line/a | V-LineStatus |
| SCR-003 | 線B狀態 | /line/b | V-LineStatus |
| SCR-004 | 警報 | /alarms | V-Alarms |
| SCR-005 | 歷史趨勢 | /trend | V-Trend |
| SCR-006 | 配方檢視 | /recipe | V-Recipe |
| SCR-007 | 手動操作 | /manual | V-Manual |
| SCR-008 | 維護診斷 | /maintenance | V-Diagnostics |
| SCR-009 | 稽核紀錄 | /audit | V-Audit |
| SCR-010 | 登入/登出 | /login | V-Login |

SCR-002與SCR-003共用V-LineStatus，仍須各自建立page路由和來源參數。新增線C時更新平台組態及索引，不能只新增文件一列便假定畫面存在。表中為應用設計名稱，非已安裝的平台資源。

## 路由與權限要分層

route是使用者進入的位置，view是實際呈現與互動的元件，permission是能否看到或操作的條件，dataSource則是資料契約。SCR-007與SCR-002可以共用元件風格，但手動操作不應因共用view就繼承線狀態頁的讀取權限；命令寫入要另有Supervisor檢查與PLC互鎖。

索引中的permission只描述設計意圖，不能取代平台的授權設定。驗收要用Operator、Engineer、Supervisor、Maintenance、Auditor與未登入六種身分逐一測試：能否進入route、能否看到資料、能否執行寫入、拒絕時是否有可理解訊息。本案未登入者只允許登入導向或明確拒絕；/login表示導向平台身分驗證，不自製收密碼頁。

資料來源欄要寫清楚是即時tag、歷史庫、警報日誌、配方資料庫或認證服務。頁面可顯示資料來源中斷，但不能把空白畫面當成零值。每個來源要有quality、timestamp與錯誤狀態，畫面版本也要跟索引版本一致。

| 畫面ID | 角色設計 | 資料來源 | 畫面版 |
| --- | --- | --- | --- |
| SCR-001 | Operator | Tags/LineA | 1.2 |
| SCR-002 | Operator | Tags/LineA | 1.2 |
| SCR-003 | Operator | Tags/LineB | 1.2 |
| SCR-004 | Operator | AlarmJournal | 1.1 |
| SCR-005 | Engineer | Historian | 1.0 |
| SCR-006 | Engineer | RecipeDB | 1.0 |
| SCR-007 | Supervisor | CommandTags | 1.0 |
| SCR-008 | Maintenance | DiagTags | 1.3 |
| SCR-009 | Auditor | AuditDB | 1.0 |
| SCR-010 | Public | AuthService | 1.0 |

資料欄索引應記錄讀寫方向與更新頻率。SCR-002的狀態資料可讀取每秒刷新，SCR-007的命令資料則是使用者觸發寫入且必須有互鎖確認；兩者即使都來自Tags，也不能只寫同一個Tags來源而省略方向。

## 版本與變更索引

版本欄至少分成畫面版本、資料契約版本與權限規則版本。只改標題不應重新測試PLC命令，但改route、view綁定或data key就要更新索引並驗收。若同一view被十個page重用，view升版會影響多個screenId，變更單要列出所有受影響頁面。

建立索引時可先從現有route清單反查，再逐頁確認primary view、docked view與資料來源。發現沒有owner或沒有版本的畫面，先標為Unknown並限制發布；不要用猜測填入「共用」。路由大小寫、尾斜線與參數規則也要固定，避免同一頁被建立成兩個網址。

若HMI支援導覽參數，索引還要記錄允許參數與預設值。例如SCR-003可接受line=b，不可接受任意assetId後直接寫入設備。顯示參數與控制參數應分開，控制操作需要獨立權限及確認流程。

頁面導覽驗收可用三條路徑：直接輸入route、從總覽點選、從拒絕頁返回。每條路徑都要確認登入狀態、參數、返回位置與頁面版本。若直接輸入未授權route仍能看到資料，表示只在導覽按鈕隱藏而沒有真正授權。

建立索引的最後一步是抽查實際使用者任務：登入、找總覽、查看警報、開趨勢、申請手動操作、返回總覽。每一步記錄screenId、route、角色與資料品質，確認文件索引與實際導航一致。

若索引與平台匯出結果不同，以平台實際組態為待調查差異，不能直接改文件迎合預期。先保存匯出版本，再由owner確認是未登錄變更還是平台殘留資源。

## 離線驗收與排錯

先用不連真機的測試資料源載入十個screenId，逐一確認route、標題、view與版本。再用模擬品質Good、Bad、Stale和來源逾時測試畫面訊息，確認Bad不會顯示成0。最後匯出索引與權限測試結果，讓交接者能由screenId追到資料契約。

常見問題是route存在但view綁錯、docked view遮住主內容、未授權Operator仍能執行寫入、版本欄只改page未改共享view，以及歷史資料源時間區間未傳遞。排查順序是讀索引、查route解析、查view組合、查授權決策，最後才查資料連線。

本篇案例為設計與離線測試方法；未指定某PLC位址、命令或HMI原生API。

索引發布時保留上一版快照，變更摘要列出新增、移除與權限改變的screenId。若版本更新只影響SCR-005，不能在通知中泛稱全部畫面已更新；交接文件應讓人能逐項核對。

索引維護要設變更觸發器：新增page、刪除view、共享view升版、資料來源更換、角色改名或route改變都必須更新索引。每次審查輸出缺少owner、無版本、無dataSource或權限未測的清單，讓交接有明確待辦。

若頁面需要同時嵌入docked view，索引應列出其位置與是否可被角色看到。警報docked view即使在趨勢頁隱藏，也不能繞過警報查詢權限；顯示權限和資料權限要分開測。

資料來源索引還要記錄快取與刷新規則。若趨勢頁快取5分鐘，畫面須顯示最後資料時間，不能讓操作員以為每次切頁都取得最新值。品質Bad、Stale、來源逾時要有一致圖例與文字。

畫面移除時先把route導向替代頁，再標記原screenId Deprecated，觀察舊書籤與操作手冊是否仍使用，最後才刪除資源。保留映射表可讓事故報告追溯舊截圖所對應的版本。

索引匯出檔本身也要有建立時間、來源環境與檢視者，避免把測試環境的route表誤交給正式維護人員。

對相同view不同資料源的頁面，驗收時一定要切換來源並確認標題、asset與品質欄同步改變，不能只看畫面布局相同就判定完成。

實作練習將SCR-003故意指到LineA，先觀察線B標題配到線A數值的錯誤，再修正來源參數。驗收以兩線不同的離線值確認修正，記錄測試版本和預期差異；這比兩線都填零更能查出錯接。

## FAQ與來源

FAQ1：page就是view嗎？不是，page通常是路由與多個view的組合，實際概念依產品文件確認。

FAQ2：隱藏按鈕等於權限控管嗎？不是，伺服器或平台授權仍要拒絕未授權操作。

FAQ3：共用view升版只測一頁可以嗎？不可以，索引列出的每個受影響page都要確認。

FAQ4：資料源斷線可顯示上一筆嗎？只能在明示保持與freshness規則下顯示，且要標示Stale。

參考：[Ignition Perspective Pages：page可包含primary view、docked views與partial URL。](https://docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/pages-in-perspective)

參考：[Ignition安全與權限官方文件，供角色與授權設計查閱。](https://www.docs.inductiveautomation.com/docs/8.1/platform/security)

參考：[ISA-101 HMI標準資訊頁，作為HMI生命週期與設計治理背景。](https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa101)

## 延伸閱讀

- [工業資料異常值的保留與判定](/articles/industrial-outlier-preservation)
- [HMI備份與隔離還原驗收](/articles/hmi-backup-restore-isolated-validation)
