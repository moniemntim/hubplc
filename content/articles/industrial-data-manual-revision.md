---
title: 工業資料人工修正與撤回版本
description: 保留原始null與原始列，將observed、estimated、manual分開，以版本、審核和撤回事件支援可追溯報表。
date: 2026-09-17
author: 站長
draft: false
---

## 一 人工修正的資料模型

人工修正不是把原欄位直接改成新數字，而是新增一個可追溯版本。原始列的值、null狀態、來源時間與接收時間必須保留；修正列以record_id、revision_id、revision_of、reason、editor與狀態連接回去。本文將觀測種類分成observed、estimated、manual三種：observed代表設備或量測來源直接提供，estimated代表依規則推估，manual代表人員輸入或調整。這些值不能靠同一個欄位互相覆蓋。

案例為TANK-4在10:15:00的液位列，原始level_mm=null，quality=Bad，原因是感測器無回波。操作員依現場尺讀得1480mm，建立revision R17，value=1480、value_kind=manual、reason=現場尺讀、狀態待審。原始null仍在original_value欄位，不能把null改成1480後假裝設備觀測到它。

若同一時間後來收到設備補正版本observed=1478mm，兩筆都保留，審核者要決定報表採用哪一版本；人工列不可因時間較晚就自動蓋掉新觀測。當估算值是1479mm，也應以estimated獨立保存並帶出公式版本、輸入範圍和不確定度。

資料表可採append-only的revision_log，再建立依規則解析的effective_view。append-only讓原始值和每次判定都不會被覆蓋，effective_view則可在規則變更時重新計算。兩者分離能避免報表的方便欄位破壞稽核證據。

## 二 建立版本與審核狀態

每次修改建立revision_id，不在原列上反覆改字。建議狀態為Draft、Submitted、Approved、Rejected、Withdrawn；只有Approved版本可進入正式報表，Rejected與Withdrawn仍可查詢但不作有效值。審核者不能與編輯者相同時，系統要檢查兩個識別欄位。撤回一個已核准版本時不要刪除資料，而是建立撤回事件，說明原因、時間與操作者。

以R17為例：10:18由OP-12建立Draft，10:20送出，10:23由QA-03核准；報表在10:24起使用1480mm。若10:40發現尺讀抄錄有誤，OP-12建立R18修正為1470mm並送審。R18尚未核准時R17仍有效，不能只因送審就取代它；R18由另一位審核者核准後才取代R17。若R18被退回，報表仍採R17，不可回到原始null，除非明確撤回R17並說明。

審核表至少列record_id、revision_id、原始值、修正值、value_kind、reason、editor、reviewer、created_at、reviewed_at、decision與supersedes。時間要用固定時區或帶offset的格式；單看人員畫面上的本地時間很難重建順序。

| 版本 | value | value_kind | 狀態 |
| --- | --- | --- | --- |
| 原始 | null | observed(來源無回波) | 原始保留 |
| R17 | 1480 | manual | Approved |
| R18 | 1470 | manual | Submitted |
| E15 | 1480 | estimated | Draft |

## 三 observed estimated manual的判讀

value_kind描述資料來源方式，quality描述可用程度，兩者分開。設備回報的Bad或null仍是observed類來源記錄，但不能當有效量測；缺來源時間則另標MetadataIncomplete。estimated保留方法和輸入版本，manual保留理由、單位與現場紀錄。畫面同時呈現kind和quality，不能把人工1480顯示成設備Good實測。

三點案例：10:00 observed=1460、10:15原始null、10:30 observed=1500。離線計算得到10:15 estimated=1480，並記錄方法=linear_between_observations、model_version=1；現場尺讀1480的manual版本另列。觀測、估算與人工是不同證據；本例只有估算與人工同為1480，若日後發現10:30其實是錯時資料，估算與人工的依賴關係可以分開重審。

品質規則可讓資料倉儲同時輸出effective_value與effective_kind，但要保存選擇規則版本。當沒有Approved修正時，effective_value可為原始observed；當原始是null且只有Draft manual，effective_value仍應是null，避免未審核輸入進入控制或結算。

審核介面應把原始值和待審值並排顯示，並在畫面上固定標出value_kind與單位。操作員先確認原始null的原因，再輸入manual數字；若沒有量測器讀值或附件，系統可允許儲存Draft，但不得提供「以目前數值覆蓋」的快捷按鈕。

每種value_kind都需要最小欄位集合：observed要有source_event_id與source_timestamp，estimated要有method與input_revision_ids，manual要有editor、reason與附件或現場紀錄引用。欄位缺失時標MetadataIncomplete，不要只看數字範圍就讓資料通過。

## 四 撤回與報表重算

撤回不是刪除。撤回操作建立withdrawal_id、target_revision_id、reason、operator、timestamp與範圍，並讓版本解析器在指定生效時間後排除該revision。若撤回的版本曾被報表使用，系統要列出受影響報表批次並產生重算工作；不能直接改歷史報表而不留差異。

另做撤回分支：10:40明確撤回R17而R18尚未核准，有效值暫回原始null。列出10:24至10:40曾採用R17的報表版本待更正，這是報表產生時間，不是液位量測時間；被修正的量測始終是10:15那一筆。R18於10:45核准後，新產生報表可對10:15採1470，舊發布報表保留並另出更正版。

如果人工修正觸發設備控制，文章範例只允許進入審核後的資料流程，不直接把未審核manual值寫入PLC輸出。控制系統需另有授權、上下限與聯鎖設計；本資料版本模型不能替代機台安全邏輯。

| 操作 | 原始列 | 有效視圖 | 稽核要求 |
| --- | --- | --- | --- |
| 建立Draft | 不變 | 不採用 | 記editor/reason |
| 核准R17 | 不變 | 採R17 | 記reviewer/time |
| 撤回R17 | 不變 | 回上一版或null | 建withdrawal事件 |

報表重算也要保存前後版本與執行批次。若原始列仍為null，重算後顯示缺值是正確結果，不可為了讓圖表連續而自動補零。每次匯出都帶出effective_kind，讓讀者知道數值是觀測、估算還是人工修正。

版本解析器需要明定同一生效時間的優先規則。本案例只採已核准且未撤回的明確替代鏈，Rejected與Withdrawn不作有效修正；不可拿revision_id字典排序猜最新。若兩個Approved沒有明確替代關係則標VersionConflict並停止自動選擇。這個規則要在離線測試中固定，而非由資料庫最後寫入順序決定。

若跨系統交換修正版，交換檔要帶revision_id、revision_of與原始record_id，接收端不可只匯入最後一個value。重送同一revision時以revision_id去重；不同來源對同一record各自建立版本並標示衝突，交由審核規則選擇。

## 五 驗收與限制

審核者在核准前還要確認數值單位、時間點和附件相符。若人工輸入1480但附件標示14.80m，系統應要求修正單位或退回，而不是只檢查數值落在上下限內。退回原因也要可報表化，方便統計哪些設備最常需要人工補值。

離線驗收建立原始null、approved manual、draft estimated、rejected manual、withdrawn approved五組資料。查詢歷史時間線，確認每個版本仍可被定位；查effective view，確認只有Approved且未撤回的版本被選出；查audit log，確認每一次決定都有editor、reviewer、reason和時間。

驗收結果應具體寫出：原始TANK-4列仍為null；R17的value_kind=manual且approved後才出現在有效視圖；Draft不出現在有效視圖；Rejected不覆蓋原始列；R17撤回後有效值退回規則指定的上一版或null；R18核准後只在其生效時間後出現。若任何查詢靠最後寫入的單一欄位判斷，測試即不通過。

版本資料可支援追溯，但不能自行證明人工讀值準確。需依現場計量器校正、操作者訓練和批准流程補足證據。W3C PROV-O的實體、活動與責任者關聯可作為來源追溯參考；實施時仍要把保存週期、權限和備份方式交由組織規範決定。

```text
FAQ：原始值是null時可以直接填入人工值嗎？
回答：不可覆蓋原始列；建立新的manual revision，原始null與原因都保留。
```

```text
FAQ：estimated和manual數值相同要合併嗎？
回答：不要。數字相同不代表證據相同，兩個版本保留各自來源、方法與審核狀態。
```

```text
FAQ：撤回是否刪除錯誤版本？
回答：不刪除；建立撤回事件並從有效視圖排除，這樣仍能重建誰在何時做了什麼。
```

```text
FAQ：Draft能否先給操作員看？
回答：可以作為待審核提示，但不能進入正式結算或控制有效值。
```

參考：[W3C PROV-O：資料來源與活動關聯模型](https://www.w3.org/TR/prov-o/)

## 延伸閱讀

- [工業CSV附檔包與查詢快照](/articles/industrial-csv-package-manifest)
- [工業日報與班報的跨日邊界](/articles/industrial-shift-date-boundary-timezone)
