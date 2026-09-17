---
title: MQTT命令與回覆的關聯追蹤
description: 以虛構泵浦 start request/response 示範 MQTT 5 properties 與 payload schema 如何追蹤命令，並處理逾時、重複、晚到回覆及 MQTT 3 相容。
date: 2026-09-17
author: 站長
draft: false
---

## 先把三種識別責任分開

設計 MQTT 命令時，最容易犯的錯是把 topic 當成完整交易識別。topic 解決訊息送到哪一類接收者；Response Topic 指定回覆應發布到哪裡；Correlation Data 讓請求端把回覆連回某一筆 request。User Properties 適合放可讀的追蹤標籤，而真正的命令欄位仍應在 payload schema 中定義。這些欄位互補，不能用其中一個取代其他欄位。

| 項目 | 負責回答的問題 | 範例 | 不可推論 |
| --- | --- | --- | --- |
| Request Topic | 請求送到哪個服務？ | plant/pump/P-01/request | 不保證唯一命令 |
| Response Topic | 回覆發布到哪裡？ | plant/hmi/H-02/response | 不等於已送達 |
| Correlation Data | 回覆對應哪個 request？ | 16-byte binary UUID | 不表示已成功 |
| User Properties | 附帶哪些追蹤標籤？ | trace=cmd-007 | 不取代 schema |
| Payload | 命令與結果內容？ | action、target、status | 不自動成標準欄位 |

OASIS MQTT 5.0 的 request/response 模型描述的流程是requester先訂閱 response topic，再發布含 Response Topic 的 request。Responder 收到後將回覆發布到該 topic；若 request 有 Correlation Data，應在 response 原樣帶回。Response 本身不應再帶 Response Topic。這是協定層的訊息關聯約定，不是設備動作的安全保證。

完成本頁後，你應能畫出一條訊息流程：HMI 先建立 pending，訂閱回覆，再送 request；服務端解析 payload，回覆相同 correlation；HMI 以 correlation 查表。若流程圖還用 topic 名稱猜測另一筆交易，先停止並補上明確欄位。

命令結果保存回覆者、契約版本與狀態轉移，讓操作者能查到接受和完成的不同時刻。這裡的關聯設計只是訊息處理契約，不能替代控制器的模式、聯鎖或設備回讀判定。

## 設計最小 payload 與命令契約

案例採用虛構泵浦 P-01，僅做離線 schema 設計，不對任何設備發布。request payload 使用 schemaVersion、commandId、requester、issuedAt、target 與 action 六個必要欄位；response 使用 schemaVersion、commandId、status、target、receivedAt、completedAt、reasonCode；completedAt只在完成狀態填入，其他狀態為null。commandId 是 payload 中可讀的業務識別，Correlation Data 是 MQTT binary property，兩者同時保存可以在轉接時仍追查，但必須檢查兩者是否符合pending表的對應關係，不要求兩個欄位位元組相等。

| 欄位 | 型別/格式 | 必要性 | 驗收規則 |
| --- | --- | --- | --- |
| schemaVersion | 整數，例如 1 | 必要 | 不支援版本拒收 |
| commandId | 字串 cmd-20260917-0007 | 必要 | 新命令不可重用；重送沿用同ID |
| requester | 字串 hmi-02 | 必要 | 與 ACL 身分比對 |
| issuedAt | UTC RFC3339 | 必要 | 不代替 broker 時間 |
| target | 資產識別字串 | 必要 | 與授權範圍比對 |
| action | start/stop 列舉 | 必要 | 未知值拒收 |
| status | accepted/rejected/completed | 回覆必要 | accepted 不等於完成 |

User Properties 可以放 trace、content、producer-version 等鍵值；因為規範允許多個 User Property，接收端不可假設只有一組，也不能把任意 property 當作授權。Correlation Data 是 binary，應以 bytes 比對，日誌若用HEX或Base64顯示，要採固定編碼並可還原同一串bytes。日誌可保存 property 名稱和值的摘要，但敏感 token 不應原樣寫入一般 log。

每個 request 建立 pending：correlation bytes、commandId、requester、target、issuedAt、deadline、狀態與 response 摘要。收到 response 時先比 correlation，再核對commandId、target及受信回覆來源；任一不一致都進 unmatched，不能因 status 看似 completed 就套到錯誤泵浦。

## 驗證拒收與稽核紀錄

把結構驗證、來源授權與交易身分分開檢查。前一項通過不代表後一項成立；在隔離的訊息樣本上先驗證拒收理由，再接到實際服務。每次拒收都保留原始關聯值與規則版本，才能追查是資料內容、權限或狀態不符。

一般MQTT PUBLISH不會自動向訂閱者揭露發布者的認證身分。payload的requester只是自述；要用受控topic權限、可信閘道注入的身分或應用驗證把它連回真實授權來源。同樣要限制responder可用的Response Topic，不能讓請求者任意指定回覆位置而外洩結果。

欄位驗收要使用拒絕案例，而不是只驗證完整 JSON。先刪掉 target，再把 action 改成未列舉值，最後把 issuedAt 改成無時區字串；三次都應得到可辨識的 schema/validation 結果，且不產生任何設備副作用。欄位增刪或型別改變須按版本相容矩陣驗證；commandId是命令身分，新命令不能重用舊ID，升schema版號也不能繞過此限制。

User Property 的鍵值不是任意診斷文字。建議固定 key 集合，例如 trace、producer、contract，並規定未知 key 是忽略、記錄還是拒收。保存時將 property 順序、重複鍵與 payload digest 一起記錄；這樣日後看到同一 commandId 的兩個 response，才能判斷是重送、轉接重複或兩個不同 correlation。

實作記錄建議包含接收時間、broker packet reason、Correlation Data 的雜湊、payload schema 驗證結果及狀態轉移。不要只保存最後 status，因為 accepted 後沒有 completed 可能正是逾時排查的關鍵。若日誌要供跨系統比對，統一 UTC 與 sequence，避免本地時區讓 late 判斷錯誤。

| 離線輸入 | 預期結果 |
| --- | --- |
| 缺target | 缺必要欄位，拒收 |
| 同commandId但未知correlation | unmatched，不套用舊pending |
| 原correlation但target不同 | 關聯內容衝突 |
| 同完成回覆再到 | 相同內容才視為duplicate |
| payload假寫其他requester | 需受信身分對應，不能僅信自述 |

## 以時間線追蹤正常 重複與逾時

本例使用同一response topic與兩個獨立命令U1、U2。U1正常完成並收到重複完成回覆；U2在另一輪測試中超時後才收到回覆。各自從request發布起算十秒完成等待期限，accepted不會在本例延長期限。U1及U2是16位元組關聯值的教學代稱，不是實際bytes。

| 時間 | 事件 | Client 處理 | 結果 |
| --- | --- | --- | --- |
| 09:00:00.000 | SUBACK成功，建立U1 pending | 確認可收回覆 | 尚未發布 |
| 09:00:00.100 | U1 request發布 | 記截止00:10.100 | pending |
| 09:00:02.000 | U1 accepted | 僅記接受 | accepted |
| 09:00:05.000 | U1 completed | 記完成及證據 | completed |
| 09:00:06.000 | 同U1完成回覆再到 | 內容相同才去重 | duplicate |
| 10:00:00.100 | 獨立U2 request | 記截止00:10.100 | pending |
| 10:00:10.100 | U2沒有完成回覆 | 標結果未知 | timeout |
| 10:00:12.000 | U2 completed晚到 | 保存late並核對原命令 | 不新增命令 |

accepted 只表示服務端接受或排入處理，completed 才是依契約回報完成；意義必須寫在 payload schema。timeout 只表示客戶端窗口內沒有看見回覆，不表示服務端沒有執行。對有副作用的 start/stop，重試前要有冪等規則、狀態查詢或人工核准。

若 response 先於 SUBSCRIBE 完成發布，規範模型下可能沒有 subscriber 而不會送達。因此驗收要故意把訂閱延後一次，從SUBACK與回覆時序辨識測試流程錯誤；僅看Client超時不能證明訂閱晚了，而不是靠 retained 或 wildcard 補救。不要把 response topic 設 retained，否則新訂閱者可能看見過期結果。

排錯順序是：先查 client 是否以 MQTT 5 CONNECT，再查是否送出 Response Topic/Correlation Data，再查 broker ACL，最後對照 responder parser。單看 topic 有訊息不能證明 properties 正確轉送。

## 不支援 MQTT 5 時如何維持可追溯

若一端只支援 MQTT 3.1.1，不能假設它會理解 MQTT 5 的 Response Topic、Correlation Data 或 User Properties。相容做法是把關聯欄位放入 payload，並用固定 topic 契約。這是應用層替代方案，不是讓 MQTT 3 獲得 MQTT 5 properties。

| 能力情境 | 可用識別 | 補上的契約 | 限制 |
| --- | --- | --- | --- |
| 雙端 MQTT 5 | Response Topic+binary correlation+commandId | ACL、schema、timeout | 檢查 properties 原樣 |
| Requester 5、Responder 3 | 固定 response topic+payload commandId | 禁止依賴 property | 只能 payload 關聯 |
| 雙端 MQTT 3 | 固定 topic+payload commandId | 自訂重複/逾時 | 需明示應用規則 |
| 轉接 gateway | 兩側 correlation mapping | 保存 digest、版本 | 不能宣稱原樣 |

gateway 轉接時保存 inbound correlation、outbound correlation、原始 topic、payload digest、轉換時間與 mapping version。若只把 correlation 轉成新字串而丟掉原始 bytes，後續無法證明兩側回覆是否同一筆。schema 也應寫明 unknown-field 規則，缺必要欄位或版本超出支援範圍就拒收。

完成結果應是一份版本化契約：topic 權限表、properties 表、request/response schema、timeout 與 duplicate policy、審計欄位。沒有指定 broker/client library 時，不要寫成某個函式名稱一定存在，先用這些欄位要求映射到產品文件。

授權也要與追蹤分開。requester 欄位寫 hmi-02 不會自動讓它得到 pump/P-01 的 publish 權限；broker ACL 應按 request topic、response topic 和 client identity 分別檢查。若 response topic 允許過寬 wildcard，別的 client 可能收到敏感回覆，應以部署矩陣驗收 publish/subscribe 的允許與拒絕組合。

## 驗收 FAQ 與官方依據

離線驗收準備四組封包：正常 U1、缺 correlation、錯 correlation、超時後 late response。逐組檢查 properties 原始值、payload schema、pending 狀態、日誌摘要與是否錯誤重執行。預期正常 U1 只完成一次；缺或錯 correlation 進 unmatched；late response 不會重新觸發 start。

FAQ1：Response Topic 是不是回覆一定會送達？不是。Requester 應先訂閱；若發送時沒有匹配 subscriber，response 可能不會送達。

FAQ2：Correlation Data 和 commandId 重複了嗎？用途不同。前者是 MQTT 5 binary property，後者是 payload 業務識別；可互相核對但不能混為一欄。

FAQ3：timeout 後可以直接重送命令嗎？不能直接假設。原 request 可能已執行，應先查冪等狀態或取得核准。

Topic 只負責路由，不能代替交易生命週期。兩個 request 可以同時使用同一 request topic，也可以共用 response topic；真正的分流靠 correlation、commandId 和 pending 表。若每個資產另設 response topic，仍要檢查 ACL、回覆遺失與 topic 版本；topic 數量增加不會自動解決逾時或重複。

FAQ4：MQTT 3 client 能讀 User Properties 嗎？不能依 MQTT 3 假設它理解 MQTT 5 properties；需放 payload 或由已驗證 gateway 轉換。

最終交付前逐項核對：requester 是否先訂閱、Correlation Data 是否原樣複製、response 是否錯誤帶回 Response Topic、User Properties 是否保留重複鍵語意、payload commandId 是否與 property 關聯、timeout 是否禁止盲目重送。若任一項只能靠猜測 client library 行為，應把它列為待查產品文件，而不是寫成已驗證。

參考：[OASIS MQTT Version 5.0 §3.3.2.3.5–3.3.2.3.7 與 §4.10 request/response。案例為離線契約設計，](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html)

## 延伸閱讀

- [MQTT遺囑訊息與離線狀態](/articles/mqtt-last-will-session-state-model)
- [MQTT會話保存與離線佇列](/articles/mqtt5-session-expiry-offline-queue)
