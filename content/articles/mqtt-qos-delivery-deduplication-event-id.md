---
title: MQTT QoS交付語意與應用資料去重
description: 比較MQTT QoS 0/1/2的協定交付語意，建立QoS1 eventID去重、同ID異payload衝突、Broker重啟與命令副作用的兩段驗收模型。
date: 2026-09-17
author: 茂伯
draft: false
---

## 三種QoS是兩段交付語意

MQTT QoS 0、1、2描述Publish在協定交換上的交付語意，不等同資料庫或控制動作一定執行一次。QoS0是at most once，可能遺失；QoS1是at least once，可能重複；QoS2在協定流程上提供exactly once交付，但不保證消費者資料庫commit或機械動作一次。

MQTT先分兩段：發布Client到broker，以及broker到訂閱Client，各有自己的QoS交換；發布QoS2不代表下游一定QoS2，還要看訂閱獲准的最大QoS等條件。訂閱Client收到後的資料庫提交則是第三個邊界，不能從任一段PUBACK或PUBCOMP推論業務已完成。

| QoS | 協定承諾 | 應用風險 |
| --- | --- | --- |
| 0 | 最多一次 | 遺失、無重送 |
| 1 | 至少一次 | 重送與重複 |
| 2 | 協定exactly once | DB/控制動作仍需冪等 |

QoS不是越高就越適合所有訊息。telemetry可容忍少量遺失時評估QoS0；告警與重要事件通常需要QoS1加去重；命令還要另有commandId、ack與執行結果，不能只靠QoS2。

QoS0的遺失要由應用監測序號缺口。若telemetry序號100後直接到102，consumer標記缺101；若資料本來允許抽樣，則契約要說明缺口不是錯誤。不要因QoS0低延遲就假設資料完整。

## QoS1重送與唯一鍵

固定本例為broker向訂閱Client傳送QoS1訊息，事件鍵來源S加E-2026-001。假設Client將資料提交後送PUBACK，但回覆未到broker，隨即斷線；雙方保留未完成會話，重連成功恢復後broker重送未確認PUBLISH。這是依條件建立的離線時序，不代表在同一連線上用任意計時器反覆重送。

| 到達 | eventID | 資料庫 | 畫面/動作 |
| --- | --- | --- | --- |
| 第一次 | E-2026-001 | insert commit | 顯示一次 |
| 重送 | E-2026-001 | unique conflict→duplicate | 不再觸發 |
| 同ID異payload | E-2026-001 | conflict error | 告警資料衝突 |

同一eventID若payload不同，不可當普通duplicate吞掉。保存第一次payload摘要與第二次摘要，標CONFLICT並送人工處理；否則攻擊、Bug或版本錯誤會被遮蔽。唯一鍵範圍要包含來源，避免兩台設備恰好使用相同文字ID。

先驗證schema及事件鍵，再在同一資料庫交易內完成唯一鍵檢查與業務更新。若先檢查不存在、離開交易後才insert，兩個並行處理者仍可能同時通過；資料庫唯一約束與交易結果才是最終依據。提交成功後記錄應用處理狀態，外部副作用另外核對可重試性。

QoS1的duplicate計數是品質指標，不一定代表Broker故障；ACK遺失、Client重連與Session恢復都可能造成合法重送。報表分開統計首次commit、duplicate、CONFLICT與schema reject，避免把重送全部算成新事件。

QoS2使用PUBLISH、PUBREC、PUBREL、PUBCOMP管理兩端協定狀態；它不替資料庫建立跨系統交易。若來源應用以新的發布動作再次送出同一業務事件，即使兩次各自都以QoS2正確交付，業務仍收到兩次。因此穩定eventID與資料提交規則仍有用途。

多個普通訂閱者可能各收到一份相同命令；QoS不會替系統選出唯一設備執行者。要使用經驗證的唯一執行權及命令冪等契約；單靠短期分散式鎖也不足以保證舊執行者在失聯後停止，不能在文章裡把一把鎖當通用機械控制保證。

告警重送時畫面只增加一次計數，但應保存duplicate與首次delivery時間，讓維護者知道傳輸曾重試。

若Broker重啟後沒有補送證據，報告應把缺口列出並說明持久化設定，而不是自動補造資料。

## Telemetry 告警與命令選型

telemetry通常是高頻資料，遺失一筆可能由下一筆取代，QoS0可降低延遲與Broker負擔；但若每筆都需保存，應用要補上序號、時間與缺口監測。告警需保留事件ID、時間與狀態，QoS1加去重較容易審核。

| 資料 | 可接受遺失 | 重複處理 | 額外欄位 |
| --- | --- | --- | --- |
| telemetry | 視趨勢需求 | 序號/時間檢查 | sourceTimestamp |
| 告警 | 通常不可靜默遺失 | eventID唯一鍵 | severity、狀態 |
| command | 需過期與未完成判定 | commandID、ack、狀態機 | expires、結果 |

命令的QoS2只代表MQTT訊息流程，不能保證控制器收到一次就只執行一次。命令consumer先以commandID建立Received/Executing/Completed狀態；若同一ID再次到達，回傳原結果或duplicate，而非再次呼叫設備。若第一次執行結果未知，狀態應是Unknown，不可盲目重做。

QoS1的PUBACK或QoS2握手也不是業務ack。應用ack要包含commandID、結果、完成時間、錯誤與設備回讀證據；兩者分開保存才能知道訊息已交付但動作尚未完成。

資料庫唯一鍵的欄位要和事件生成規則一致。若設備重啟會重置sequence，鍵應加入bootEpoch或session世代；只用sequence可能把新事件錯判成舊duplicate。

Session expiry設很短可能讓Broker丟失離線QoS1/2狀態；設很長則佔用資源。選值要依斷線最長時間、持久化容量與產品限制計算，不能只看QoS數字。

還要核對Client函式庫何時送協定確認。有些函式庫在應用完成DB提交前就自動回PUBACK，不能假設程式可以延後。需要跨DB的處理保證時，設計受控暫存與持久化工作佇列，或使用產品支援的確認機制；業務ack仍要另外定義。

命令ack要包含處理結果與來源時間，不能把PUBACK直接顯示為設備已完成。

## Broker重啟與Session

Broker重啟後能否重送取決於Client session、clean start、session expiry、持久化設定與Broker產品行為。QoS等級本身不保證跨重啟保存。Client重連時要記錄session狀態、最後收到eventID、ack與重送結果。

| 案例 | 必查欄位 | 驗收 |
| --- | --- | --- |
| 短斷線 | Session是否保留、QoS | 重送/遺失證據 |
| Broker重啟 | 持久化與expiry | 是否有離線訊息 |
| QoS1重送 | eventID與payload | 一筆commit |
| 同ID異payload | 摘要與版本 | CONFLICT |

紙上驗收列出首次提交、PUBACK遺失、斷線、會話恢復及重送五個步驟，預期正式事件一筆、重複送達一筆。相同ID改payload則報CONFLICT。broker重啟是另一案例，先寫明持久化與Session條件，再列預期補送範圍。

QoS2協定握手若在Broker或Client狀態遺失時中斷，實際恢復依Session與持久化能力而定。保存Packet Identifier、eventID與應用處理記錄，但不要把Packet Identifier當事件唯一鍵；它是協定流程欄位。

同一eventID異payload表示資料一致性問題，常見原因是兩個發布者共用ID、schema版本不一致或橋接器改寫內容。consumer保存payload hash與來源，拒絕自動覆蓋第一次commit。

Broker重啟驗收要記錄重啟前未完成Packet、Client clean start、session expiry、持久化開關與重連時間。若產品沒有持久化，不應把未補送訊息標成網路遺失而隱去責任。

Broker的retain、session與持久化是不同設定。retain保存最後一筆topic值，session保存訂閱與未完成交付狀態；不能因有retain就宣稱離線QoS資料完整。

所有QoS驗收都要把協定紀錄與應用結果分開保存，才能判斷遺失、重送或重複的真正責任。

## FAQ與來源

FAQ1：QoS2能保證資料庫只寫一次嗎？不能，它只約束MQTT協定交付，DB仍需冪等與唯一鍵。

FAQ2：QoS1重送算錯誤嗎？不一定，至少一次語意本來就可能重送，consumer要去重。

FAQ3：相同eventID不同payload能當duplicate嗎？不能，應報CONFLICT並保存兩份證據。

FAQ4：Broker重啟後QoS一定補送嗎？不一定，要查Session、expiry與持久化設定。

命令consumer若在收到後寫Received，再進入Executing，重送時要回目前狀態；若第一次執行結果未知，狀態機不可直接回Completed或再次呼叫。這是控制副作用與MQTT交付的邊界。

QoS選擇表要按資料類型與副作用決定，並列延遲、遺失、重複、儲存與去重成本。沒有一個QoS等級同時解決所有資料品質與命令安全問題。

MQTT的Packet Identifier與eventID責任不同。Packet Identifier協助協定配對，在不同連線或流程中可能重用；eventID是應用事件身分，應由來源契約生成並長期保存。

離線驗收另測相同eventID在不同sourceID的情況，預期是兩筆不同來源事件；若業務要求全域唯一，則由契約改用全域生成器並記錄來源。

若消費者schema驗證失敗，應在去重前保存reject證據，因為同一eventID的錯誤payload不能被當作正常duplicate。

恢復測試要比較重連前後的Session與最後處理eventID，不能只確認Client顯示connected。

本文事件、QoS、資料庫與命令案例均為離線設計，未連接Broker或控制設備。

參考：[OASIS MQTT Version 5.0：QoS、Publish流程、Session與Delivery語意。](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html)

## 延伸閱讀

- [工業MQTT資產階層與十二條Topic命名範例](/articles/mqtt-topic-taxonomy-industrial-asset-hierarchy)
- [MQTT保留訊息與陳舊命令](/articles/mqtt-retained-message-stale-command)
