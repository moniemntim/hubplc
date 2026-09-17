---
title: 工業MQTT資產階層與十二條Topic命名範例
description: 以site、area、line、asset階層為兩條產線建立telemetry、state、event、command、ack、config共12條topic，說明filter、schema、retain與雙寫遷移。
date: 2026-09-17
author: 站長
draft: false
---

## 資產階層與命名規則

本例路徑固定為site/area/line/asset/version/kind。plant-a是廠區，pack是區域，line-01及line-02是兩條線，press-01及press-02為設備；v1表示路徑契約版本，最後一段區分telemetry等用途。全部小寫及使用連字號是本例組織規則，不是MQTT強制命名標準。

topic名稱不是filter。發布者只能向一個具體topic發布，例如plant-a/pack/line-01/press-01/v1/telemetry；訂閱者可用+或#作filter，例如plant-a/pack/+/+/v1/telemetry，但萬用字元不是合法發布topic。大小寫不同就是不同topic，命名政策需在程式、ACL與文件一致。

| 層級 | 示例 | 責任 |
| --- | --- | --- |
| site | plant-a | 廠區唯一識別 |
| area | pack | 區域與權限邊界 |
| line | line-01 | 產線資產群組 |
| asset | press-01 | 設備實體識別 |
| version | v1 | 路徑契約版本 |
| signal/語意 | telemetry | 訊息用途，不是設備名 |

版本、格式、單位與retain策略另列在契約欄位。topic路徑可含v1，但schemaVersion仍應放payload，因為同一topic可能有不同資料內容；兩者不應只靠猜測。

下一頁逐列列出十二條完整topic，供複製及核對；欄位中的v1與payload的schemaVersion要一致符合契約。資產移動時，穩定assetId仍保存在payload，讓歷史報表不必因路徑改名就換成另一台設備。

## 兩條線十二條topic

本案例每條產線固定六類topic：telemetry、state、event、command、ack、config。兩條線共12條，只有line段與asset段不同；command與ack必須有相關識別，不能和telemetry共用。

| 用途 | 完整Topic Name |
| --- | --- |
| line-01/telemetry | plant-a/pack/line-01/press-01/v1/telemetry |
| line-01/state | plant-a/pack/line-01/press-01/v1/state |
| line-01/event | plant-a/pack/line-01/press-01/v1/event |
| line-01/command | plant-a/pack/line-01/press-01/v1/command |
| line-01/ack | plant-a/pack/line-01/press-01/v1/ack |
| line-01/config | plant-a/pack/line-01/press-01/v1/config |
| line-02/telemetry | plant-a/pack/line-02/press-02/v1/telemetry |
| line-02/state | plant-a/pack/line-02/press-02/v1/state |
| line-02/event | plant-a/pack/line-02/press-02/v1/event |
| line-02/command | plant-a/pack/line-02/press-02/v1/command |
| line-02/ack | plant-a/pack/line-02/press-02/v1/ack |
| line-02/config | plant-a/pack/line-02/press-02/v1/config |

本例固定retain政策：telemetry、event、command及ack不保留，state及config保留目前快照。這是應用契約，不是MQTT規定每類資料必須如此；state快照仍帶時間及有效性，config則只作設定資料，消費者按版本、權限及適用時機決定是否套用。

## Schema filter與ACL

每類topic建立不同schema。telemetry可有value、unit、sourceTimestamp、quality、schemaVersion；state可有mode、health與lastChange；event要有eventId、type、time、severity；command要有commandId、action、args、expires；ack要有commandId、status、completedAt；config要有configVersion與effectiveFrom。

| 類別 | 必要欄位 | retain/發布政策 |
| --- | --- | --- |
| telemetry | value、unit、quality | 通常不retain，依平台需求 |
| state | mode、health、lastChange | 可retain目前值 |
| event | eventId、time、severity | 避免用retain當歷史 |
| command | commandId、expires | 不retain |
| ack | commandId、status | 依查詢窗口 |
| config | configVersion、effectiveFrom | 可retain版本快照 |

訂閱filter要與ACL一起審核。plant-a/pack/+/+/v1/telemetry可讓分析者跨線讀量測，但不應自動取得command；command需精確到asset或受限的管理群組。#若放在根層可能涵蓋所有用途，不能因測試方便永久使用。

MQTT沒有替應用定義payload schema。JSON欄位、型別、單位、空值、時間格式、版本與未知欄位處理由組織契約定義；OASIS規格提供topic與傳輸語意，不替工業資產命名。

telemetry與state的保留策略要依資料用途。保留state最後一筆能讓新訂閱者看到目前模式，但若payload帶過期時間，消費者仍要檢查stale；retain不應讓斷線期間的舊值看起來像即時量測。

schema改版要測未知欄位、缺欄位、單位與時間格式。舊消費者若只讀value可能看似正常，卻可能忽略unit或quality，故切換前要用實際消費者解析器做離線檢查。

event通常要由消費者用eventId去重。若broker重送或雙寫，新舊topic中的同一eventId不應被報表計算兩次；command更要防止同一commandId被兩個橋接器執行。

migration報告保存雙寫開始、消費者切換、舊路徑停止與ACL撤銷四個時間點，讓日後能判斷某筆訊息來自哪個契約版本。

## 改名 升版與雙寫

資產改名或schema升級要先決定相容期。若press-01改為press-a，不應直接停止舊topic並假設所有消費者同步；可在過渡期雙寫telemetry/state/config，但command不可因雙寫被執行兩次。

| 階段 | 資料topic | command策略 | 驗收 |
| --- | --- | --- | --- |
| 舊版 | 舊路徑v1 | 保留單一路徑 | 統計消費者 |
| 過渡 | 舊/新telemetry雙寫 | command只選一個入口 | payload與schema比對 |
| 切換 | 新路徑v2 | 舊command拒收或導流 | 所有消費者確認 |
| 淘汰 | 停止舊topic | 撤銷舊ACL | 保存變更紀錄 |

雙寫時為每筆telemetry使用相同eventId或sampleId，避免下游把兩個topic當兩筆資料。command採單一執行入口，另一側只發布遷移通知或拒絕；不能讓橋接器把同一command複製到兩個執行topic。

每次變更保存舊新完整topic、schema版本、retain狀態、ACL差異、開始與結束時間。未確認的消費者要列出，不以「訂閱#的人應該收到」當成切換完成。

event的eventId要在雙寫期間保持相同，讓下游去重；若新schema改變eventId生成規則，必須先升版契約。commandId則只允許一個執行入口，ack回應要包含原commandId與結果狀態。

雙寫的淘汰條件應是所有已知消費者完成切換、舊topic無命令寫入、ACL已更新並保存通知紀錄。只看新topic有訊息不能證明舊路徑可以停用。

config變更要有effectiveFrom與發布者，消費者收到retain後先驗證版本與權限，再決定套用或回報拒絕。不要把retain等同強制設定。

訂閱萬用字元時，+只匹配一層，#只能放在最後並匹配多層。本例plant-a/pack/+/+/v1/state匹配兩條線的state，不匹配event；練習逐段對照十二列，再把v1改成v2，確認舊filter不會自行收到新版本。broker的授權語法另依產品文件，不能把訂閱filter當通用ACL設定。

## 發布權限與版本遷移的檢查步驟

config retain適合發布目前設定快照，不等於消費者可以無條件套用。應檢查configVersion、effectiveFrom、來源簽章或權限，並把拒絕原因送到管理事件。

不要把site、area、line、asset層級當作安全邊界的唯一依據；ACL政策需另列讀寫權限與例外。topic清楚有助治理，但不能取代Broker認證授權。

topic中的version段與payload schemaVersion可同時存在，但責任不同。路徑版本協助ACL與遷移，payload版本讓解析器辨識欄位契約；若只升其中一個，變更表要說明為何。

若資產移到另一area，路徑全變更，應保留舊新對照與過渡期限。報表可用assetId保持連續，但topic名稱變更仍需雙寫與ACL更新。

config若retain，payload要含版本、發布時間與來源，且消費者檢查版本後再套用。retain是Broker保存最後一筆，不是歷史資料庫，也不能讓command因retain而重執行。

大小寫政策要和ACL比對。Plant-A與plant-a不是同一topic；press_01與press-01也不應混用。資產改名時先建立別名對照與截止日，並記錄舊topic是否仍讀取，不能讓消費者自行猜測。

filter與topic名稱分開保存。訂閱者可用plant-a/pack/+/+/v1/state讀兩條線狀態，但發布者不能向含+或#的字串發布；ACL也要限制誰能讀command或寫command。

## FAQ與來源

FAQ1：+與#可以拿來發布嗎？不行，它們是訂閱filter萬用字元，發布topic必須是具體名稱。

FAQ2：state與event能共用topic嗎？不建議，兩者是目前狀態與事件紀錄不同語意，應有不同schema與保留策略。

FAQ3：retain能當歷史資料庫嗎？不能，retain只保存最後一筆訊息。

FAQ4：雙寫所有topic就能安全升版嗎？不能，command要避免雙重執行，還要驗證schema與消費者切換。

測試只產生契約與樣本，不向broker發布。若日後實測，逐類topic保存Publish時間、payload版本、retain旗標與ACL結果，command則另保存執行與ack證據。

狀態state可保留最後值，但需附sourceTimestamp與expiresAt，讓新Client能判斷這是目前資料還是過期快照。telemetry通常依平台保存，不能把兩者都retain後再由消費者自行猜語意。

每類topic的payload欄位、時間格式、數值單位與未知欄位政策都要版本化，避免topic名稱看似穩定但實際內容靜默改變。

topic filter的寬度要和工作需求匹配。跨兩條線讀telemetry可用+，但讀event或state仍需明確用途；command寫入應縮小到單一asset並配合身份授權。

只有完成schema、ACL、retain與command單一路徑的逐項驗收，才可把舊topic標記為淘汰。

產生名稱時先檢查允許字元、段數及資產登錄表。MQTT區分大小寫，不會自動正規化；若接收既有名稱，不要擅自轉小寫，否則原來不同的兩條topic可能被合併。新契約可要求拒絕不合規名稱，並在改名時建立明確對照。

變更期間若收到舊topic command，橋接器應拒絕或明確回報遷移狀態，不可同時轉發到新舊兩個執行端點。

本文12條topic、資產名稱與payload均為文件案例，未向任何broker發布訊息。

參考：[OASIS MQTT Version 5.0：Topic Name、Topic Filter、Wildcard、Retain與Publish語意。](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html)

## 延伸閱讀

- [OPC UA斷線後如何恢復資料](/articles/opcua-reconnect-lifecycle)
- [MQTT QoS交付語意與應用資料去重](/articles/mqtt-qos-delivery-deduplication-event-id)
