---
title: 協定版本協商失敗如何安全拒絕
description: 以client {2,3}與server {1,2}示範選2、無交集拒絕、必要能力缺少拒絕，以及版本、schema、transport分層。
date: 2026-09-21
author: 站長
draft: false
category: 工業通訊與網路
---

## 一 先定義自訂握手與版本責任

本篇先建立一個明確的應用層握手，不能把它說成 TCP 內建功能。TCP 只提供可靠的位元組串流；client 與 server 要在資料中交換版本集合、必要能力與原因。案例的 client supported={2,3}，server supported={1,2}，交集是{2}，因此選用版本2。只有握手成功後才允許業務訊息。

版本協商和 optional capability 是兩個不同欄位。version 決定訊息基本語意、長度與錯誤處理；capabilities 只表示在該版本下可選的功能。若 client 宣告某項 mandatory capability 而 server 不支援，回覆 MandatoryMissing 並拒絕連線，即使版本交集存在也不能降級成沒有該功能的工作模式。

| 欄位 | 案例值 | 判定 | 後續 |
| --- | --- | --- | --- |
| client_versions | {2,3} | 保留原集合 | 等待 server 選擇 |
| server_versions | {1,2} | 與 client 交集{2} | 選 version 2 |
| mandatory | batch_ack | server缺少 | 拒絕 MandatoryMissing |
| optional | compression | 可缺省 | 依協商結果使用 |

拒絕回覆必須同時保存 client 集合、server 集合、reason、schema 版本與連線時間。這些資料讓排查者知道是沒有共同版本、缺少必要能力，還是傳輸層版本不相容。不能只回一個 generic error，更不能在日誌中抹掉雙方原始集合。

本案例所有欄位都是自訂協定設計。不可宣稱 Modbus TCP 或一般 TCP 自帶這套握手；若目標設備已有既定協定，應依其文件實作，不能把下面的 JSON 或位元組格式直接當成廠商介面。

協商訊息要有明確的 request_id 與 connection_id，並將收到時間、解析結果及回覆原因寫入同一筆事件。若同一個連線重送 HELLO，第二次不能覆蓋第一次的原始集合；可標 DuplicateHello，依規格回目前狀態或重新開始，但不能讓兩個 selected_version 同時有效。

若 client 宣告的版本集合含重複值或非整數，先回 HandshakeMalformed；集合排序只影響日誌可讀性，不應改變交集結果。版本值應有上限，避免惡意或錯誤訊息造成無限解析與巨大記憶體配置。

## 二 逐步協商與拒絕策略

握手第一個訊息可含 message_type=HELLO、protocol_family、schema_version、supported_versions、mandatory_capabilities、optional_capabilities 與 transport_profile。server 收到後先驗證語法與集合，再計算交集；不能先選一個看似最新的版本，再發現必要能力不存在。

案例一：client={2,3}、server={1,2}，mandatory={}，交集為{2}，server 回 SELECT version=2，兩邊暫存候選版本2，再核對能力並確認握手；完成前維持NEGOTIATING。案例二：client={3}、server={1,2}，交集為空，回 NoCommonVersion；不能偷偷改用1或2。

案例三：雙方都支援2，但 client 要求 mandatory=batch_ack，server 回報 supported_capabilities 不含它。結果必須是 MandatoryMissing，不可把 batch_ack 從請求中刪掉後繼續。optional compression 缺少時才可標 optional_unavailable，並以未壓縮格式工作。

| 情境 | 版本交集 | 必要能力 | 結果 |
| --- | --- | --- | --- |
| {2,3}/{1,2} | {2} | 無 | 選2 |
| {3}/{1,2} | 空 | 無 | NoCommonVersion |
| {2}/{2} | {2} | batch_ack缺少 | MandatoryMissing |
| {2}/{2} | {2} | compression缺少且optional | 成功但不壓縮 |

每次連線都要重新協商。重連時不能只使用上次 cache 的 selected_version，因 server 軟體、能力或安全政策可能已變更。若重連在協商前收到業務資料，先以 ProtocolStateError 丟棄或封存，不可把它當成已建立的 session。

server 選版本時要保存選擇依據，例如 intersection=[2]、selection_rule=only_common。若交集是[2,3]，規格可指定選最高共同版本，但必須兩端都知道此規則；不能一端選最高、一端假設選最低。拒絕事件也要標示是集合錯誤、能力錯誤或 schema 錯誤。

協商逾時和 NoCommonVersion 是不同結果。逾時代表沒有收到足以判定的握手回覆，應記 transport/application timeout；收到明確拒絕則保存對端 reason。重試可重新建立連線，但不可把逾時當成對端同意降級。

## 三 把版本 schema 與 transport 分開

版本號只描述應用協定語意，不能拿來代替 schema、TCP/TLS 或憑證政策。案例可另有 schema_version=4、transport=tls、tls_min=1.2；即使 application version=2 相容，若 TLS 版本或憑證不符合，仍應在 transport 層拒絕。

schema 變更要明訂向後相容規則。例如 version2 的 response 有 status、request_id、payload 三欄；新增欄位不能讓舊 client 解析既有欄位失敗。若 unknown 欄位策略是 ignore，必須只忽略明確標為 optional 的欄位；mandatory 新欄位則回 SchemaUnsupported，不可靜默忽略。

unknown 新欄位也要保存原始訊息摘要與 schema 版本，供日後判斷。解析器不能看到未知欄位就把整包當成功，也不能看到任意新欄位就自動升級。升級應由明確配置或協商結果觸發。

| 層次 | 示例 | 失敗原因 | 處理 |
| --- | --- | --- | --- |
| application | version 2 | 無共同版本 | NoCommonVersion |
| capability | batch_ack mandatory | server不支援 | MandatoryMissing |
| schema | schema 4 | 未知必要欄位 | SchemaUnsupported |
| transport | TLS min 1.2 | 版本/憑證不符 | TransportRejected |

實作測試要把每一層的錯誤分開記錄：TCP 連線成功不代表 TLS、握手或業務成功；TLS 建立也不代表 application selected。狀態機可採 CONNECTED、NEGOTIATING、READY、REJECTED，只有 READY 才讓業務佇列出隊。

transport_profile 可包含 tls_required、endpoint_name 與 cipher policy，但這些欄位不應藏在 application version 中。若 TLS 已建立而 application 握手拒絕，關閉原因仍應是 application rejection；反過來 TLS 未建立則不能假稱收到 NoCommonVersion。

schema 解析器應採欄位白名單與版本表。對 optional unknown 欄位可保存 raw、忽略其語意；對 mandatory unknown 欄位立即停止，不要先執行同一包中的其他業務欄位。這能避免部分解析造成半成功狀態。

## 四 重連 降級與驗收案例

離線驗收案例從空白狀態開始。10:00 client 送 {2,3}，server 送 {1,2}，10:00:01 選2並進 READY；10:05 server 更新只支援{1}，重連後交集為空，server回NoCommonVersion，client記錄拒絕 並停在 REJECTED，不得沿用10:00的 version2 cache。

再測 mandatory capability：server 仍支援version2，但移除 batch_ack。client 收到 MandatoryMissing，保存雙方能力集合與 reason；操作員可看到「版本相容但必要能力缺少」，不會誤判為網路斷線。修正 server 後重新連線才可進 READY。

驗收還要測未知欄位、亂序與提前業務資料。未知 optional 欄位應保留 raw 並依規則忽略；未知 mandatory 欄位應拒絕。READY 前送入的業務資料不可執行；重連後的第一個業務 request 要帶新 connection_id，避免舊回覆誤配。

| 測試 | 輸入 | 預期結果 | 記錄 |
| --- | --- | --- | --- |
| 共同版本 | client{2,3}/server{1,2} | selected=2 | 雙集合與時間 |
| 無共同版本 | client{3}/server{1,2} | REJECTED | NoCommonVersion |
| 必要能力缺少 | batch_ack不在server | REJECTED | MandatoryMissing |
| 重連版本變更 | cache=2、server只{1} | 重新拒絕 | 不可用舊cache |

若現場需要相容舊設備，應在規格中明訂允許的版本與能力組合，再針對每一組做測試；「先用最新，失敗就往下試」不是安全的協商政策，因為可能讓兩端對訊息語意產生不同理解。

驗收時加入 server 重啟與能力變更：第一條連線選2，server 重啟後只公布{1,2}仍可選2；若改成只公布{1}，新連線必須拒絕。另測兩個 client 同時連線，各自以 connection_id 綁定狀態，不能共用一份 pending capability。

操作員報告至少列 connection_id、雙方集合、selected_version、mandatory/optional 結果、schema 與 transport 狀態。若只有「握手失敗」四字，無法區分版本不相容與憑證或能力問題，驗收不算完成。

## 五 驗收 FAQ 與來源

本案例的選版本規則是交集唯一值；若交集有多個，另需規格指定最高支援或優先順序，不能由實作任意猜。所有拒絕都保存雙方集合、reason、schema 與時間；業務只在 READY 狀態處理。

HELLO本身採預先固定的外層編碼與長度上限，先能解析握手才能協商業務格式。TLS若為必要條件，先依本地設定建立及驗證，再送HELLO；不可等未加密HELLO要求才決定是否保護本次連線。

FAQ1：TCP connect 成功是否代表協定版本成功？答：不是。TCP 只建立串流，仍要完成應用握手、能力與 schema 檢查。

FAQ2：client 支援3、server支援1和2，可以自動選1嗎？答：不可以，交集為空，應回 NoCommonVersion；未支援版本不能靜默降級。

FAQ3：optional capability 缺少時一定拒絕嗎？答：只有 mandatory 缺少必拒絕；optional 依規格採未啟用，但要記錄結果。

FAQ4：重連能沿用上次選定版本嗎？答：不能直接沿用，必須重新協商並以新 connection_id 隔離舊回覆。

參考：[RFC 9293：TCP 只定義傳輸層行為；本文應用握手為自訂設計。](https://www.rfc-editor.org/rfc/rfc9293)

參考：[RFC 8446：TLS 版本與握手層次參考，不能與本文 application version 混為一談。](https://www.rfc-editor.org/rfc/rfc8446)

若規格允許多個共同版本，需測試每個邊界組合及未知新版本。client 支援{2,3,4}、server支援{2,4}時，依既定規則選4或2並留下依據；若 server 只支援未來版本，應拒絕而不是將欄位猜成舊語意。

業務佇列在 NEGOTIATING 期間應保持等待或明確拒絕，並設定總 deadline。協商完成後才釋放佇列；協商失敗的業務請求要帶拒絕原因，不可無聲丟失。

## 延伸閱讀

- [斷線期間命令是否排隊如何建立明確策略](/articles/offline-command-queue-policy)
- [非 ASCII 長度以 byte 正確拆包](/articles/non-ascii-byte-length-framing)
