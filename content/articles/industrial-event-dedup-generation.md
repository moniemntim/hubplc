---
title: 工業事件去重與重啟世代
description: 以source、transitionId、bootId建立事件身份，保留arrivalAt並區分重送、重啟後新事件與外部副作用。
date: 2026-09-17
author: 茂伯
draft: false
---

## 一 先定義可比較的事件身份

事件去重的第一步不是把整段訊息做雜湊，而是先定義這筆事件來自哪個來源、屬於哪個狀態轉換，以及設備經過哪一個啟動世代。本文的主鍵採source、transitionId、bootId三欄；arrivalAt只記錄閘道實際收件時間，不放進去重主鍵。source可寫成設備識別與事件通道，例如PUMP-07/Trip。transitionId是該來源為一次狀態轉換產生的識別；bootId則在控制器重新啟動後改變。三者缺一時，資料列可以保存，但應標成IdentityIncomplete，不可假定已去重。

以PUMP-07在08:00:12產生Trip為例，第一次收到的資料帶source=PUMP-07/Trip、transitionId=T91、bootId=B17、SourceTimestamp=08:00:12.120、arrivalAt=08:00:12.180。網路重送仍是T91/B17，即使arrivalAt變成08:00:12.420，也應視為同一事件。若設備在08:05重啟成B18，後來再次出現Trip並帶T91，因bootId不同而成為新的世代事件；這是重新發生的候選，不是被arrivalAt誤判的重送。

transitionId若重啟後從1編號，須搭配可靠的bootId。本文三欄是應用契約，不是OPC UA或PLC必然具備的欄位。若來源已保證source加eventId跨重啟唯一，便可使用該契約，不必強加bootId；本文則示範計數器會重設的來源。CloudEvents以source和id辨識事件，本例可將bootId與transitionId無歧義編碼成其id。

## 二 建立去重索引與到達證據

資料表可用(source, transitionId, bootId)三欄建立複合唯一索引；不要直接以未跳脫的分隔符拼字串，避免不同欄位組合碰撞，但arrivalAt、接收節點、原始封包雜湊仍應保存。索引只回答「是否已收過同一來源事件」，不回答下游告警、簡訊、停機命令是否已經完成。插入時先寫原始事件與接收時間，再由索引判定inserted或duplicate；不要先刪掉重複列，否則無法證明設備曾經重送。

具體測試使用三筆輸入：A為PUMP-07/T91/B17在12.180收到，B為相同三欄在12.420收到，C為PUMP-07/T91/B18在08:05:00.100收到。預期A進入canonical，B進入duplicate_log且保留arrivalAt，C成為另一個canonical。若同一key卻出現不同payload，例如A的severity=High、後來B的severity=Low，狀態標成DuplicateConflict，保留兩份原文並交由規則或人員處理，不能靜默覆寫A。

資料庫驗收要檢查唯一索引拒絕第二筆canonical，但不應讓整個接收交易失敗到遺失duplicate_log。測試後查詢同一key，必須能看到canonical_id、duplicate_count、first_arrival、last_arrival與payload_hash。若兩個接收節點同時寫入，還要用資料庫唯一約束做最後仲裁；應用程式先查再插入的流程本身會有競爭視窗。

| 輸入 | source/transitionId/bootId | arrivalAt | 預期結果 |
| --- | --- | --- | --- |
| A | PUMP-07/T91/B17 | 08:00:12.180 | 建立canonical |
| B | PUMP-07/T91/B17 | 08:00:12.420 | duplicate並保留到達時間 |
| C | PUMP-07/T91/B18 | 08:05:00.100 | 新世代canonical |

## 三 重啟世代與真正再次發生

重啟後的事件判定必須看世代變化，而不是只看事件文字。控制器B17在10:00曾發出OverTemp/T22，10:01重新啟動成B18並再次發出OverTemp/T22，兩筆的source與transitionId相同但bootId不同，資料層應保留兩個來源事件，業務是否再次通知另由規則決定。若設備重啟後沒有產生任何新事件，只是把離線緩衝的B17資料重新送出，則不能因接收時間較晚就創造B18；來源資料中的bootId仍是B17。

建議把boot觀測拆成BootObserved事件與資料列欄位。收到B18的第一筆訊息時先記錄世代開始時間與來源重啟證據，再接受後續T22。若只收到一筆缺少bootId的T22，顯示「世代未知」並延遲合併，而非用當日日期拼一個假ID。這個限制很重要，因為沒有來源世代就無法證明兩次相同transition是兩次發生。

離線重送案例：PUMP-07在網路中斷期間產生T30/B20，恢復後於14:00與14:01送來兩次。兩筆的arrivalAt不同但key相同，canonical仍只有一筆；若14:02收到T31/B20，這是同一啟動世代中的下一次轉換，應作為新key。驗收表須同時列source、transitionId、bootId、SourceTimestamp、arrivalAt，不能只顯示人員容易混淆的告警文字。

資料庫交易須處理預期衝突，不能捕捉唯一鍵例外後在已失敗的交易直接續寫。以PostgreSQL為例，可用ON CONFLICT DO NOTHING仲裁canonical插入，再查已有記錄並保存arrival紀錄；其他錯誤仍需回滾重試。原始到達紀錄採獨立識別，不能也被同一去重索引攔掉。完成回傳canonical_id、decision與duplicate_of。

## 四 不要把去重誤稱為副作用恰好一次

資料庫唯一鍵可以讓事件canonical化一次，但不能保證發送簡訊、寫入ERP、啟動停機命令等外部副作用exactly once。若資料已提交而程式在送出通知後崩潰，重試可能再送一次；若先送通知才提交，提交失敗又可能造成通知沒有可追溯事件。實務上應把事件去重與副作用處理分開，以outbox或可重試的下游命令記錄狀態。

例如T91第一次插入canonical後建立notification_outbox=N501，通知服務送出但在更新sent_at前斷線。重跑時應用N501的冪等鍵由通知服務自行判定，或允許重送但記錄attempt=2；這不等於資料庫的dedupe_key提供恰好一次。對停機命令尤其不能因為事件重複就自動重放，必須由控制策略、操作者授權與設備狀態另行決定。

驗收分兩層：第一層注入相同source、transitionId、bootId十次，canonical_count必須為一，duplicate_count為九；第二層在outbox寫入後模擬程序崩潰，重啟後確認outbox狀態可恢復，並檢查外部接收端的冪等鍵。報告用語應寫「事件去重一次」與「副作用有重試/冪等設計」，不可寫成未驗證的exactly once。

```text
FAQ：arrivalAt不同為何不能當新事件？
回答：arrivalAt描述接收事實，網路重送本來就會改變它；同一source、transitionId、bootId仍指向同一來源事件。
```

```text
FAQ：只有transitionId沒有bootId怎麼辦？
回答：保存原始資料並標IdentityIncomplete；可在來源補充世代前暫不合併，不能自行用時間拼接假世代。
```

| 測試故障 | 資料庫處置 | 報表呈現 |
| --- | --- | --- |
| 同key不同雜湊 | DuplicateConflict，不覆蓋 | 列出兩份原文 |
| 缺bootId | IdentityIncomplete | 待補世代 |
| outbox送出後崩潰 | 保留attempt | 副作用需冪等 |

## 五 現場驗收與可追溯報表

驗收前準備一個可重複的離線輸入檔，包含同key重送、同transition跨boot、同key不同payload、缺欄位四組案例。匯入後查canonical與duplicate_log，確認每筆都保留原始arrivalAt和payload_hash。報表可用事件狀態、來源世代與接收時間三個欄位排序，讓工程師區分「同一事件晚到」與「新世代再次發生」。

建議驗收紀錄：案例1 A/B同key，預期一筆canonical加一筆duplicate；案例2 T22/B17與T22/B18，預期兩筆canonical；案例3同key不同內容，預期DuplicateConflict且不覆蓋先到值；案例4缺bootId，預期IdentityIncomplete並進入待補資料清單。每個結果都附查詢條件與資料列ID，避免只截取畫面。

完成後應看到來源事件數、到達次數與通知嘗試次數分開統計。若原始封包相同但來源身份缺失，先隔離待查；若同key內容不同，保留衝突供追溯。適用於可提供可靠事件識別的資料收集系統；來源欄位生命週期、重啟行為與資料庫併發處理仍須按實際平台驗證。

```text
FAQ：索引衝突要刪哪一筆？
回答：不刪原始列；保留先選定的canonical，後來列進duplicate或conflict記錄，並保存兩者雜湊及到達時間。
```

```text
FAQ：bootId改變就一定是新業務事件嗎？
回答：它證明來源世代不同，但業務是否應重新告警仍由業務規則決定；資料層先分開保存。
```

如果接收端想要在同一事件上只產生一次通知，應由通知服務保存自己的idempotency_key，例如canonical_id加通知種類。事件表的唯一鍵與通知表的唯一鍵可以互相參照，但兩者不是同一個保證。測試必須故意在兩個提交步驟間中斷，觀察恢復後是否可重建待辦工作。

參考：[CloudEvents 1.0.2：source與id的事件身份契約。](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md)

參考：[PostgreSQL 18 INSERT：ON CONFLICT與唯一鍵衝突處理。](https://www.postgresql.org/docs/18/sql-insert.html)

## 延伸閱讀

- [工業資料品質的完整性即時性一致性與有效性](/articles/industrial-data-quality-completeness-timeliness)
- [工業CSV附檔包與查詢快照](/articles/industrial-csv-package-manifest)
