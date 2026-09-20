---
title: 觸控誤觸的確認與取消流程
description: 以已驗證租戶scope與operationId形成唯一key，處理payload衝突、版本條件與未送命令取消。
date: 2026-09-21
author: 站長
draft: false
category: HMI 畫面與操作
---

## 一 按下 滑出與確認各做一件事

觸控誤觸最常見的問題，是手指才碰到按鈕，命令就已送出。本例把一般模式變更分成按下候選、放開顯示確認、明確確認才提交三段。以Pump-2從Auto切到Manual為例，按下只反白，不寫設備；放開且手勢仍有效時，才開啟確認窗。這是普通介面設計，不能取代設備互鎖。

本例採第一次滑出就取消的政策。手指按下後離開按鈕範圍，即使又滑回再放開，也不顯示確認窗，必須重新按下。使用指標座標與明訂的命中區判斷，不能因pointer capture仍把事件送給原元件，就誤認手指還在按鈕內。指標取消、失焦、換頁與權限變更都使未送候選失效。

確認窗顯示設備識別、目前Auto、候選Manual、資料取得時間與版本7。取消只清除這次未送草稿，設備保持原狀；確認則建立一筆操作，畫面進入等待。若在確認前設備已變成版本8，執行端必須拒絕過期意圖並重新顯示差異，不用畫面上三秒前的Auto當權威。

為避免連點確認送出兩筆，第一次合法確認就固定operationId並鎖定本次意圖。服務端使用已驗證的租戶scope與operationId作唯一key，target與完整canonical payload另外保存比對。相同key換設備或換內容必須Conflict，不能把target加進唯一key就放行第二筆。

canonical表示事先約定的資料型別、單位、精度與缺省規則，例如同一精度下的50與50.0可表示相同攝氏設定。它不是隨意把不同輸入改成一樣；比較內容還包含操作類型與expectedVersion，並保留使用者原始輸入供追查。設備名稱應解析成穩定識別，再讓使用者確認真正目的地。

## 二 claim與expectedVersion

服務端先驗證租戶、使用者與target權限，再以唯一key建立claim。claim成功只代表服務端保留候選，不代表設備已收到或執行。若同key再次送來且target與payload完全相同，可以回傳原交易的狀態；若不同，回Conflict並保留原候選，不能覆蓋第一次資料。

expectedVersion要與接受動作放在同一個原子條件。以D03目前版本7為例，服務端只有在版本仍為7時才接受OP17，成功後把版本條件或交易狀態往前推進。不能先讀到7，等畫面確認完才無條件寫入，因為別人可能已把設備改成8。

案例中U1以OP17、target=D03、payload H1、expectedVersion=7建立claim。U2先完成另一筆更新，使D03變成8；U1執行時原子條件失敗，回VersionConflict。若U1改傳H2仍使用OP17，則回PayloadConflict；兩種錯誤都不能被包裝成一般網路重試。

服務端回應要讓畫面知道下一步：相同payload可查原結果，版本衝突要重新讀取，payload衝突要重新確認，scope或權限錯誤要停止。錯誤記錄包含scope、operationId、target與hash，但秘密資料要遮罩。

若後端沒有資料庫的原子比較操作，可在所有寫入入口皆受控的前提下，用單一序列化服務管理鎖；還需可靠保存唯一key與狀態，單靠記憶體鎖不能承受重啟，也無法約束工程軟體等外部寫入，但鎖的範圍和逾時要寫入設計。先讀版本再另行寫入會產生競爭：兩個操作都看見7，第一個改成8後，第二個仍可能覆蓋設定。因此驗收要故意安排兩個同時提交者，確認只有一個成功。

同一key重送時，伺服器先比對保存的canonical payload與target。完全相同時回傳原先結果，不能再次執行；target、payload或其版本條件不符時回相應Conflict。canonical化需固定欄位順序、數字格式與缺省值規則，否則同一命令因JSON排版不同被誤判為兩個操作。

## 三 取消只限未送候選

cancel不是通用撤回。本文只允許取消Candidate或Queued且尚未送往設備的交易；服務端以原子狀態轉換保證取消與送出誰先成功。若cancel先完成，send不能再取得候選；若send先取得交易，cancel回Conflict並保留後續結果。

一旦進入Sent、Accepted或Unknown，原交易必須保留。Accepted只表示服務接受，Unknown表示可能已送出但尚未取得設備結果；這兩種狀態都不能被刪除或假裝成Cancelled。若設備明確支援撤回方法，才另建撤回流程並等待設備回覆，不能由一般HMI取消按鈕推測。

取消請求自身也要記錄操作者、時間、原因與回應。畫面按鈕變灰只是提示，不是狀態證據；服務端結果回來前，畫面仍顯示處理中。若使用者離開頁面，候選是否繼續排隊要依服務契約，不可因元件卸載就自動刪掉交易。

取消流程要把候選狀態和傳送狀態分開顯示。使用者按取消時，伺服器以原子操作把Candidate改為Cancelled；若sender已取得傳送鎖，取消回覆應是TooLate，畫面改顯示待查結果。這樣不會把尚未收到設備回覆誤報成已取消，也不會因網路延遲重複送出取消。

可取消的期限應由服務端保存，而不是由瀏覽器倒數決定。瀏覽器離線、分頁睡眠或回呼延遲，都可能讓顯示時間落後實際狀態。對Sent或Accepted命令，只能查詢設備結果、保存回覆與品質；若設備回傳Unknown，應保留Unknown並讓操作者依設備文件決定後續查證。

| 交易狀態 | 可否cancel | 正確處理 |
| --- | --- | --- |
| Candidate | 可 | Cancelled並留紀錄 |
| Queued未送 | 可 | 停止排程 |
| Sent | 通常不可 | 查設備結果 |
| Unknown | 不可假刪 | 保留待查 |

## 四 驗收與適用限制

驗收建立同scope的OP17重試、同key不同target、同target不同payload、版本競態與cancel競態。預期只有target與canonical payload都相同的重試能回原交易；任何差異都Conflict。另測不同租戶的同號operationId，確認scope先經服務端驗證而不是只靠字串。

測試expectedVersion時，兩個請求同時提交同一版本，只有一個能通過原子條件；另一個得到VersionConflict並重新讀取。測試取消時在排隊前、排隊後、送出瞬間各點按鈕，確認服務端狀態決定結果，且沒有刪除已送交易。

若設備本身不理解operationId，服務端的key仍可防止應用層重放，但不能宣稱設備端去重。若設備沒有結果查詢或回讀能力，Unknown只能保留並要求人工處理。本文不假定任何PLC指令、特殊暫存器或原子寫入能力。

完成結果是每筆交易都有唯一scope key、payload與target可追溯、版本條件可證明、取消邊界明確，並能分清Accepted、Applied、Rejected、Unknown與Cancelled。

實際操作驗收先測按下未放、滑出再滑回、正常放開取消、正常放開確認、快速連點與送出後斷線。預期前三種沒有設備寫入，正常確認只有一筆操作；斷線若結果不明則顯示待查，不能自動建立新命令。記錄pointer、候選、確認與服務回應時間線，便能找到誤觸從哪一步開始。

限制也要寫清楚：這套模型只保證服務端的命令認領與去重，不保證設備已執行或現場動作安全。設備斷線、服務重啟、外部操作者介入時，狀態可能停在Unknown；此時應停止自動命令重送並查證原操作結果。任何實際控制仍需由合格工程師確認互鎖與授權。

## 五 FAQ與官方來源

FAQ1：同一operationId但不同target可以當重試嗎？答：不行；同key的target或payload不同都回Conflict。

FAQ2：expectedVersion先查再寫可以嗎？答：不行，檢查與接受必須在同一原子條件。

FAQ3：cancel能撤回已送命令嗎？答：不能假定；Sent、Accepted或Unknown要保留並查結果。

FAQ4：accepted就是設備已執行嗎？答：不是，需設備回讀或明確Applied證據。

參考：[OWASP Transaction Authorization，服務端驗證、交易狀態轉換與TOCTOU防護。](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)

參考：[OWASP Logging Cheat Sheet，事件識別、結果與稽核記錄建議。](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

## 延伸閱讀

- [彈窗層級怎麼排 警報可見 焦點可操作與確認分工](/articles/hmi-alert-dialog-focus-layering)
- [同一元件的長按與短按如何判定](/articles/hmi-release-only-800ms-pointer-policy)
