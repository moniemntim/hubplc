---
title: HMI重連後怎麼刷新 查詢重建與舊命令防重送
description: 設計HMI重連後的查詢重建、command outbox、generation防舊回呼、unknown write查詢與按鈕edge復位。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 一 重連先分查詢與命令

HMI重連後最危險的做法，是把所有未完成request再送一次。display query通常可以重建，例如重新查目前值、警報與版本；command outbox則必須先查每個命令的結果，不能因按鈕仍是pressed就重送。先把資料流分成可重建讀取與需要追蹤結果的寫入。

每次連線建立增加connectionGeneration，例如從12變13。畫面查詢帶generation與requestId，回覆只接受目前generation；舊generation callback只記診斷，不更新元件。命令帶operationId與retry policy，若斷線時已送出但未收到結果，標unknown並進入查詢。

display query的重建可以在Ready事件後執行，但要顯示Refreshing，直到新的快照完成。不要把舊值改成零，也不要把斷線時的最後值標成剛讀到；保存source time與receive time。

command outbox要保存建立者、operationId、payload摘要、送出時間與最後結果。畫面重連只刷新狀態，不從按鈕外觀重新推導payload。

查詢快照可以保留最後Good值，但要標stale與最後成功時間。重連後新值通過格式和版本檢查才解除stale。

查詢重建時保留使用者目前篩選條件，但不沿用已過期的cursor或舊版本。

重連流程的每個狀態都要有可觀測事件，包含斷線、連線建立、查詢重建、舊回呼丟棄與unknown結果，才能從紀錄還原操作。

| 項目 | 重連策略 | 不可做的事 |
| --- | --- | --- |
| display query | 新generation重建 | 接受舊callback |
| 未送命令 | 保留草稿，重新確認 | 把按鈕狀態當證據 |
| 已送未回 | 查operationId | 直接重送未知write |
| 已確認結果 | 顯示applied/rejected | 再次觸發 |

重連是通訊狀態變更，不等於控制流程重置；HMI不能因socket關閉就推論設備沒有收到。

## 二 generation與stale callback

時間線：10:00:00 generation4送讀取A；10:00:01斷線，建立generation5並送B；10:00:01.2收到A回覆。因A屬generation4，丟棄其畫面更新；10:00:01.4收到B才更新。generation是本地世代，不是設備或協定欄位。

元件卸載時要失效generation或取消subscription。重新掛載若沿用舊callback，會把舊值寫入新元件；若每次掛載都綁listener而不解除，重連幾次後一次click會送多筆。建立listener前先解除舊註冊，或使用生命週期管理。

查詢可以用快照重建：Ready後讀設備摘要、警報、版本與模式，再讓局部查詢更新。回覆順序不固定時，以generation、requestId與資料版本判斷，不只看抵達順序。

generation應在舊連線失效時先更換，使斷線到重連期間的舊回呼也無效；新連線初始化使用新世代，而不是每個畫面元件各自亂加。元件若有自己的生命週期token，可再用token阻止卸載後回呼；兩者責任不同，需在設計文件分開。

若同一頁同時有多個查詢，generation相同但requestId不同；回覆要核對兩者與查詢條件。不要用一個全域旗標讓慢查詢取消所有無關查詢。

舊callback即使資料內容看起來更新，也要先通過generation和元件token；內容新不代表它屬於目前畫面。

generation溢位或服務重啟時使用新的隨機世代值，避免與舊回呼碰巧相同。

查詢重建完成前禁止依舊快照產生新的write，除非產品明確允許且再次確認版本。

| 事件 | generation | 處理 |
| --- | --- | --- |
| 送A | 4 | 等待 |
| 斷線重連 | 5 | A標stale |
| A晚回 | 4 | 丟棄 |
| B回覆 | 5 | 接受 |

## 三 unknown write與按鈕邊沿

unknown write表示命令可能已到設備，但HMI尚未取得結果。重連後先用operationId查詢服務端或設備狀態；查不到且命令不可安全重複，就停在unknown要求人工決定。只有產品明確支援冪等鍵，才可用同一operationId重試，並核對保留期限與相同payload；不同payload必須拒絕。

按鈕edge要與畫面生命週期分開。重連後清除候選並將armed設false；若按鈕仍按住，先等確實放開，再允許下一次按下；不要因重新初始化把true當成新沿，也不要在刷新時呼叫click handler。命令送出後鎖定按鈕，直到結果或明確取消。

案例：10:00按Start，服務accepted後斷線。10:00:05重連，畫面顯示Unknown，不自動再送；查詢得到OP9已applied才顯示完成。查到rejected顯示原因；查不到則保留人工處理入口。

unknown查詢要設置明確期限與結果狀態，查詢逾時仍保持unknown，不轉成rejected。只有設備或服務端提供否定證據時才寫rejected。

按鈕edge測試需涵蓋重連時按鈕被按下、按鈕長按、頁面重建和雙擊。每個情況都要證明一次使用者意圖最多產生一個operationId。

unknown狀態可顯示「待查結果」而非錯誤紅燈，因為它不等於rejected。不同狀態要有不同人工動作。

設備狀態查詢回覆不完整時維持unknown，不能以最後一筆畫面值補成applied。

重連後先恢復只讀，再按權限與狀態逐步開放write，避免尚未同步就接受操作。

| 結果 | 畫面 | 下一步 |
| --- | --- | --- |
| accepted | 處理中 | 等結果 |
| applied | 已完成 | 顯示回報 |
| rejected | 被拒絕 | 顯示原因 |
| unknown | 結果未知 | 查詢或人工 |

## 四 重連驗收與限制

驗收先測只讀查詢：斷線、重連、舊回覆晚到，確認stale callback不更新。再測命令在送出前斷線、送出後斷線、accepted後斷線與設備已applied但HMI未收到。每種案例保存generation、requestId、operationId、按鈕事件與結果。

測試listener數量：反覆進出頁面與重連十次，每次點一次按鈕，服務端最多收到一個符合operationId的命令。檢查頁面卸載後沒有更新不存在的元件，按鈕狀態回到可理解初始值。

設備可能提供不同結果查詢、冪等鍵或命令歷史；沒有手冊就只設計抽象契約，不發明API名稱。generation與edge reset不能代替設備端去重。沒有查詢能力時，unknown只能保留並要求人工確認。

完成標準是查詢可安全重建、舊callback不污染、命令不因重連自動重送、unknown有處理、listener不重複，且主控制不依賴畫面在線。

斷線期間可禁止新的write或要求重新登入，但這是產品策略，不應假定所有HMI都有相同行為。禁止時要說明原因並保留只讀查詢入口。

若重連後命令狀態查詢與畫面快照不同，先顯示同步中，完成一致性檢查後才允許下一個相關命令，避免使用者在未知狀態上連續操作。

多個頁面共用同一command outbox時，重連只啟動一個結果同步器，避免每個頁面各自查詢或重送。

listener去重測試要包含錯誤路徑，確保例外也會解除註冊。

狀態文字要讓操作員知道目前是同步中、已完成或結果未知。

## 五 FAQ與官方來源

FAQ1：重連後所有未完成request都重送可以嗎？答：只讀查詢通常可重建；write要查結果，unknown不可盲重送。

FAQ2：generation是設備協定欄位嗎？答：不是，是客戶端隔離舊回呼的本地世代。

FAQ3：按鈕保持true會自動再送命令嗎？答：不應；重連後先等放開再重新武裝，下一次按下才算新意圖。

FAQ4：listener重複有何症狀？答：一次點擊可能送多筆；要用生命週期解除或去重註冊。

參考：[OWASP Logging Cheat Sheet，互動識別、連線失敗、結果與故障測試建議。](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

參考：[OWASP Transaction Authorization，服務端交易檢查、狀態轉換與防重放/TOCTOU。](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)

## 延伸閱讀

- [操作log怎麼記才可追查 從畫面變更到設備結果](/articles/operation-log-accepted-applied-equipment-revision)
- [離線顯示模式如何標示不可操作元件](/articles/offline-hmi-non-operable-controls)
