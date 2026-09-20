---
title: 非同步亂序回覆如何用待回覆表配對
description: 以A101慢、B102快先回案例，使用pending map、每請求deadline與一次性狀態轉移，分流unknown、duplicate、expired並定義batch all/partial。
date: 2026-09-21
author: 站長
draft: false
category: 工業通訊與網路
---

## 不要用FIFO猜回覆對象

非同步服務可能先回較晚送出的請求。若A的id=101先送但處理較慢，B的id=102後送卻先回，FIFO會把B的資料交給A，造成數值與設備狀態錯配。只要協定有可核對的transaction id，就應用pending map以id查找，而不是用佇列頭部配對。

送出每筆請求時建立pending[id]，保存request摘要、peer、連線epoch、建立時間、deadline、預期回覆類型與狀態sent。回覆到達時先驗證id、epoch和格式，再找map項目；找不到就是unknown，項目已完成就是duplicate，已超過deadline就是expired或late，三者不要混為一般錯誤。

每個request有自己的deadline。A可以有2秒，B因為是快速查詢只有500毫秒；不能用整條連線一個共用timeout讓慢請求拖住快請求，也不能因B先回就把A標成失敗。deadline使用單調時鐘，逾時只改變該筆狀態。

若協定沒有transaction id或任何可配對欄位，不能編造一個對端不會回傳的id。可限制同時只有一筆outstanding，但逾時後還要隔離舊回覆，不能直接把下一筆回覆配給前筆，或在兩端加上一層真正會往返的wrapper並明確寫入協定；單靠本端計數器不能解決亂序。

pending map的鍵要防止不同peer或不同epoch碰撞。若同一個id在兩個連線都出現，應以連線世代和對端識別分開保存；callback到達時也再次確認目前連線仍持有該項。不要把全域字典只用id當鍵。

建立pending與送出資料的順序要一致且可恢復。若先送後插入map，極快回覆可能找不到；若只插入不送出，逾時器會留下幽靈項目。應在明確狀態下完成註冊、傳送和失敗清理，並記錄每一步。

## 用101與102走過亂序案例

案例：A id=101在t=0送出，deadline t=2000；B id=102在t=10送出，deadline t=510。t=200收到102，pending[102]轉completed並交給B；t=1200收到101，仍在A的deadline內，pending[101]再轉completed。完成順序是B再A，業務配對仍正確。

若t=600才收到102，B已expired，回覆分流為late/expired，不得更新B的輸出；若t=700又收到同一個102，視為duplicate late只保留遲到證據，不產生任何成功完成結果。若收到999且map沒有該項，標unknown，不能塞進最早的pending。

一次性狀態轉移可用sent→completed、sent→expired、sent→cancelled。completed後再次收到相同回覆只能走duplicate；expired後的回覆不能讓它復活。狀態與結果寫入要具有一致性，避免讀取執行緒和逾時計時器同時完成同一筆。

正常結果是101與102各更新自己的結果一次；失敗結果是FIFO把102交給A，或逾時後late回覆改寫新資料。每筆日誌帶id、epoch、狀態轉移、收到時間與原因，排查才不會只看到「response arrived」。

## 批次all與partial要先定規格

若上層一次提交多筆請求，要先定義batch是all還是partial。all表示所有成員完成且驗證通過才提交整批結果，任何成員expired或其已配對回覆格式錯誤，都讓整批進入失敗或待處理；不屬本批的unknown封包另行隔離，不直接歸咎某個成員；partial則逐筆公開結果，並清楚列出缺少成員。不能收到第一筆就宣稱整批成功。

批次狀態要保存成員集合、已完成集合、失敗集合、deadline和提交狀態。101完成、102逾時時，all批次應是incomplete或failed，不可用101的成功掩蓋102；partial批次可呈現101成功、102 expired，但控制流程仍需知道批次不完整。

回覆unknown可能是對端重啟、連線epoch不同、id已被回收或資料損壞。duplicate則表示同一pending已完成或同一回覆重送；expired是本端期限已過。分流保存後，才能分別查協定、重啟和時間設定。

不要用全域FIFO、最後抵達者或任意資料量來推定批次進度。每次提交、取消和逾時都要有唯一狀態轉移；如果業務動作不可重複，逾時後不得自動把未知結果再送一次。

完成或逾時後若立即刪除map項目，再來的相同id只能被當unknown。若需要辨別duplicate與late，另保留有期限和容量限制的完成摘要或墓碑紀錄；保留到期後就標UnknownAfterRetention，不假裝能永久識別重複。

## 驗收與協定限制

離線驗收至少測：101慢、102快先回；102先逾時、晚回；unknown id；duplicate response；101格式錯；epoch改變；all批次一筆失敗；partial批次一筆成功；回覆重排與重送。每列核對pending map、狀態、輸出更新次數和batch結論。

若回覆只有資料沒有transaction id，最多只能在同一時間保留一筆outstanding，除非雙方共同改造協定。不要把本端送出順序寫進本地表後假定對端會按順序回覆；那是未被協定保證的推論；逾時後若無法辨別舊回覆，須關閉舊通道等明確隔離措施。

即使使用pending map，也要限制map容量與單筆回覆大小。大量unknown或未完成項目可能耗盡記憶體；達到上限時應拒絕新請求、告警並保留現有證據，不可隨意淘汰仍可能有副作用的write。

每個pending項目也要有取消和清理路徑。應用主動取消時標成cancelled並阻止晚到回覆更新；連線epoch改變時批次標記舊項目為orphaned，保存它們的id和原因後再釋放記憶體。

若B先回而A尚未回，批次進度只能反映B已完成；不要為了畫面方便把A預填成成功。對外結果應清楚顯示waiting、completed、expired或failed，讓操作員知道下一步是等待、查詢還是人工處理。

實際socket或PLC通訊模組可能提供自己的callback執行緒、緩衝和錯誤回報，但本文不假稱任何特定Q系列PLC API。需依目標手冊確認並發模型、連線重建、資料保持與寫入副作用。本文案例已核對。

排查從id和epoch開始，再看pending建立、deadline、狀態轉移與回覆分類。若同一id更新兩次，查並發鎖或重送；若FIFO錯配，查是否誤用佇列；若unknown暴增，查對端重啟、協定版本和epoch交換。

重連後的pending不能自動搬到新epoch，除非協定提供可查詢的結果識別和明確恢復程序。否則保留為unknown或orphaned，比把舊請求當新連線工作更安全。

配對表的生命週期也要有容量與告警指標：目前pending數、最老deadline、unknown率和duplicate率都應可觀測。指標異常時先停止增加並發，保留現場證據，再調整逾時或服務容量。

結果回呼應只在狀態成功轉移後通知上層一次；通知失敗不能再把pending改回sent，也不能重做已完成的寫入。需要重送通知時，使用通知層自己的識別與去重。

批次結算也要等成員狀態固定後執行；不要在仍可能收到合法回覆時提前封存partial結果或誤報整批成功。結算時同時保存成員id與最後狀態，讓重啟後能重建批次邊界。

## 常見問題

問：先送的A一定先收到嗎？答：不一定；非同步處理可讓B先回，應用pending map依id配對。

問：逾時後收到回覆要怎麼辦？答：分到expired或late，不讓它復活或改寫新結果，並保存證據。

問：unknown與duplicate一樣嗎？答：不一樣；unknown找不到pending，duplicate是已完成項目的再次回覆，排查方向不同。

問：沒有transaction id可以自己在本端加序號嗎？答：本端序號不能讓對端回覆可配對；只能單一outstanding或共同增加wrapper協定。

參考：[IETF RFC 9293 TCP規範，作為TCP有序位元組流與應用層訊息邊界需另定義的背景；本文非同步配對是應用資料設計。](https://www.rfc-editor.org/rfc/rfc9293.html)

參考：[Python官方socket文件，作為socket資料讀寫與阻塞行為的通用參考；不代表Q系列PLC的callback或API。](https://docs.python.org/3/library/socket.html)

## 延伸閱讀

- [序號重用遇到舊回覆如何安全丟棄](/articles/sequence-reuse-late-response)
- [通訊佇列堆積如何分辨設備慢與程式塞](/articles/communication-queue-backlog-diagnosis)
