---
title: Socket半開心跳逾時如何回收連線
description: 區分half-open失聯與half-close方向，使用自訂heartbeat序號、單調deadline和epoch，依suspect、close、清buffer、backoff順序安全回收socket。
date: 2026-09-21
author: 站長
draft: false
category: 工業通訊與網路
---

## 先分失聯與有方向的關閉

Socket半開常被簡化成「連線還在」，但本端可能已收不到對端資料，或對端只關閉了傳送方向。half-open是失聯或狀態不一致的推定；half-close則是收到FIN後，某一方向已到EOF，另一方向未必立即關閉。兩者記錄與處置不同。

TCP keepalive只能協助偵測某些傳輸層失效，不能證明對端應用健康、事件佇列正常或設備已完成動作。若需求是應用健康，定義自訂heartbeat：request_id或sequence、回應中的對應序號、deadline與失敗原因。本文不假稱Q系列PLC原生提供該API。

任意收到的資料不能算heartbeat echo成功。必須驗證訊息格式、連線epoch、序號和回應方向；舊連線的回覆即使內容看似正確，也不能替新連線完成heartbeat。資料品質與應用健康狀態要一起保存。

狀態機可採healthy、suspect、closing、closed、reconnecting。deadline使用單調時間計算。逾時先進入suspect並停止派發新的不可重複動作；依規格決定是否再等一個受控期限，最後close、清buffer、增加epoch，再以backoff嘗試新連線。

heartbeat回覆也要有大小與處理時間上限，避免對端送出超長內容讓讀取buffer無限增加。解析失敗時記錄格式錯誤並依狀態機回收，不把部分合法前綴當作成功。若一個週期內有多筆未配對序號，應標示協定異常而非逐筆猜測。

## 用序號與deadline判定heartbeat

例如epoch=41時送出heartbeat seq=100，deadline為單調時間t+500毫秒。收到seq=100且格式正確的echo才算成功；收到seq=99、另一epoch、一般資料或無法解析的文字，都不能清除逾時。下一筆可用seq=101，並保存送出與回覆時間。

獨特案例：seq=100在t=0送出，t=300收到一般狀態資料，t=500沒有對應echo，應維持suspect；t=700才收到seq=100的舊回覆，若此時已close並建立epoch=42，舊連線讀取工作或延後回呼交來的結果必須丟棄；TCP不會把舊socket資料自動送進新socket。不能因任意資料抵達就把連線標回healthy。

heartbeat interval與deadline要分開定義，並考慮處理時間、網路延遲、重送和時鐘跳動。用牆上時間計算可能因校時造成過早或過晚回收；用單調計時器只比較經過時間。數值是專案容量與風險決策，本文不替現場指定通用毫秒。

收到FIN表示對端已完成某方向的傳送；讀取回EOF後，不應再把它當作heartbeat失敗或繼續等待該方向資料。是否允許本端完成剩餘寫入，要看應用協定；若資料尚未確認，不能把half-close誤當安全完成。

## 逾時回收的順序與忙碌保護

timeout後進入suspect，停止讀寫新的不可重複業務動作，讓一個回收流程取得所有權。接著close舊socket、清除讀寫buffer與未配對heartbeat、遞增epoch，再建立新socket。新連線不能沿用舊buffer或舊epoch，否則遲到資料可能配錯請求。

若讀迴圈、寫迴圈和逾時計時器同時發現失敗，要以原子狀態或鎖保證只有一個回收者。其餘流程收到closing或epoch不符便退出，不得再close一次、重建第二個socket或繼續寫入。這個busy保護尤其重要，否則會出現兩條連線同時對同一設備發送。

重連使用受控backoff和上限，記錄第幾次嘗試、最後原因與目前epoch。恢復後重新做握手和heartbeat，不重放不明白是否已完成的動作。可重放的查詢與不可重放的寫入要分開；寫入結果未知時先查詢狀態或等待人工決定。

正常結果是epoch=41的seq=100配對成功，連線維持healthy。失敗結果是deadline到期後suspect、close、epoch=42、新buffer為空並進入backoff。若收到FIN則另記half-close方向；若完全無資料且逾時才記heartbeat timeout，不把兩種原因混為一談。

若連線在suspect期間收到新資料，先以epoch和序號判斷是否為既有請求的遲到回覆；不能因資料量增加就重新建立healthy。狀態轉移要有唯一擁有者，讓觀測、寫入和回收看見同一個epoch。

## 測試邊界與適用限制

離線驗收至少測：正常echo、seq錯配、一般資料冒充echo、回覆超過deadline、舊epoch遲到回覆、收到FIN、讀寫同時報錯、雙重timeout回收、重啟後恢復、backoff，以及動作回覆未知後重連。每列核對狀態、epoch、buffer、socket數量和是否有重放。

回收時先將未完成業務請求封存為Cancelled或OutcomeUnknown，再清讀取暫存、待寫佇列與heartbeat配對表，不能連診斷紀錄一起刪掉。若保留不可重放的write，重連後可能誤送；若保留舊回覆，可能配給新序號。每項是否丟棄或保存都要在恢復紀錄中說明。

半開偵測不是安全互鎖的替代品。Heartbeat只能提供通道與應用回應證據，不能證明馬達、閥或製程已到安全位置。控制輸出在通訊失效時的保持、停止或安全狀態，必須由機台風險評估與專案規格決定。

RFC和一般socket文件不會替自訂heartbeat決定序號、格式、deadline或重試語意；這些要寫進協定契約。實際Q系列PLC的通訊模組、掃描週期、連線資源與斷線反應需查目標手冊。

排查先找最後一筆正確配對的epoch與seq，再看是否收到FIN、是否只是任意資料、deadline使用何種時鐘，最後檢查是否有兩個回收者或殘留buffer。只有證據足夠時，才調整heartbeat週期或backoff，不要先無限延長timeout。

狀態圖和事件表應同步保存，方便現場交接與後續復盤。

## 常見問題

正常案例先確認t=300毫秒收到seq=100且尚未超過t=500的期限，才標Healthy；失敗案例則只有一般狀態資料，應在t=500切Suspect。兩者都收到資料，但是否配對成功不同。保存這兩條時間線，避免測試只證明連線有流量。

backoff期間保留本地狀態檢查；到期只允許一個連線流程執行，不額外建立另一條健康檢查socket。達到重試上限時進入需要人工處置的狀態，保存最後epoch、最後配對序號和失敗原因，讓恢復不靠猜測。

若服務端重啟後序號重新從零開始，epoch仍必須改變，不能只看seq判斷新舊。握手應交換協定版本與連線識別，收到不相容版本時停止業務寫入並回報格式錯誤。

測試時可故意延遲、重排或重送heartbeat回覆，確認舊回覆不會讓新epoch復活；也可只關閉單一方向，確認half-close紀錄與讀寫策略符合契約。

問：開啟TCP keepalive就代表應用健康嗎？答：不代表；keepalive與應用heartbeat層次不同，仍需配對自訂序號和回覆。

問：收到任意資料可以清除heartbeat timeout嗎？答：不可以；必須核對格式、epoch、序號與對應回覆。

問：收到FIN就是整條連線立即失效嗎？答：FIN表示一個方向到EOF，屬half-close；剩餘方向如何處置要依應用協定決定。

問：重連後可以把未確認的write再送一次嗎？答：不應直接重放；先查結果或取得人工決策，避免動作重複。

參考：[IETF RFC 9293 TCP規範，作為FIN、連線狀態與TCP語意的協定參考；本文heartbeat狀態機是應用層設計。](https://www.rfc-editor.org/rfc/rfc9293.html)

參考：[IETF RFC 1122主機需求文件，作為TCP keepalive與主機通訊行為的背景參考；不代表任何PLC原生功能。](https://www.rfc-editor.org/rfc/rfc1122.html)

## 延伸閱讀

- [TCP連線成功但應用無回覆如何分層定位](/articles/tcp-connect-no-application-response)
- [TCP分次recv如何組成完整固定長度訊息](/articles/tcp-recv-fixed-frame-buffer)
