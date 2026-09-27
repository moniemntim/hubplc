---
title: 排序資料時如何保持產品索引不錯配
description: 以本例的 P3、P1、P2 產品量測示範整列排序、相等值次鍵、缺值分流與版本保護回寫。
date: 2026-09-21
author: 茂伯
draft: false
category: PLC 程式與控制
---

## 一 排整列資料而不是只排數值

本例的產品紀錄以整列保存：product_id、measurement、arrival_seq、source_timestamp 與 quality。排序時要移動整列或使用與原資料關聯的索引，不能只把 measurement 抽出來排序後再按位置寫回。案例資料 P3=12、P1=8、P2=12，依 measurement 升序且相等時依 arrival_seq，結果是 P1、P3、P2。

排序位置是畫面或報表中的顯示序號，不是產品識別碼。排序後第一列是 P1，不代表 product_id=1；後續若以位置 0、1、2 去回寫設備，會把結果寫到錯誤產品。原始輸入應保留 immutable snapshot，排序結果另存 sorted_view 或 index_map。

先定義升降序、缺值規則與相等規則。arrival_seq 是同一批內的接收順序，數字越小越早；若兩列 measurement 與 arrival_seq 都相同，還要用明確的唯一 record_id 或保留原始穩定順序。不要把「排序穩定」當成跨批次去重功能。

| 原順序 | product_id | measurement | arrival_seq | 升序結果 |
| --- | --- | --- | --- | --- |
| 1 | P3 | 12 | 1 | 第2 |
| 2 | P1 | 8 | 2 | 第1 |
| 3 | P2 | 12 | 3 | 第3 |
| — | — | — | — | P1→P3→P2 |

每列還可以帶 source_timestamp 與 quality，但排序鍵不可偷偷改用時間。若報表要求「最新先看」，應把 timestamp 明確列為第一鍵；本題的產品量測報表則以 measurement 升序、arrival_seq 次序為規則。排序目的改變時，建立新 sorted_view，不覆寫原視圖。

排序前先建立 batch_id 與 snapshot_version。排序後以 product_id 和版本回寫，若原資料已被新批次取代，就拒絕舊排序結果並要求重新產生。這能避免操作員在畫面停留期間，另一批資料更新造成錯誤覆寫。

## 二 相等值與穩定排序

P3 與 P2 都是 12，但 arrival_seq 分別是 1 與 3，因此 P3 在 P2 前。若輸入改成 P2 先到、P3 後到，排序結果應改為 P2、P3；這是明確的次鍵規則。若業務希望產品編號優先，也可用 product_id 作次鍵，但要寫進規格，不能依賴某個函式碰巧保留順序。

穩定排序只保證同一排序鍵下保留輸入相對順序。它不能解決跨批次出現相同 product_id，也不能判斷兩筆資料是否同一測量。去重需要 batch_id、record_id、source_timestamp 或明確序號；發現重複時應標 DuplicateRecord 並保留被拒資料。

缺值與 NaN 先分流，不要直接讓比較函式處理。有效值可進入排序區，缺值另列 Missing；NaN 另列 NonFinite。若規格要求缺值排在最後，應由明確的 key=(missing_flag,safe_value,arrival_seq)，缺值列的 safe_value 固定使用相同佔位值，不能比較 NULL 或 NaN 實現，且不能讓 NaN 的不等比較造成不穩定順序。

| record | measurement | arrival_seq | 分類 | 升序位置 |
| --- | --- | --- | --- | --- |
| P1 | 8 | 2 | Valid | 1 |
| P3 | 12 | 1 | Valid | 2 |
| P2 | 12 | 3 | Valid | 3 |
| P4 | 缺值 | 4 | Missing | 最後另列 |
| P5 | NaN | 5 | NonFinite | 拒排另列 |

同值鍵的比較要使用數字 arrival_seq，不是字串。arrival_seq=2 與 10 若以文字比較會得到 10 在 2 前。產品 ID 也可能是 P2、P10，若拿字串做產品次鍵，須先確認業務是否接受字典序；不要把字串順序誤稱自然數字順序。

若產品索引是字串，先定義大小寫、前導零與自然排序。例如 P02 與 P2 是否視為同一產品，應由 product_id 契約處理，不可在排序時自動合併。資料清洗與排序是兩個步驟；清洗產生新識別結果，排序只使用已核准的識別值。遇到未核准 ID，保留原列並標 InvalidKey。

排序輸出要同時帶排序規則版本與輸入快照版本。當工程師改成降序或改用產品編號次鍵，舊報表仍可知道當時如何排列；不能只保存畫面上三個名稱而失去規則。

## 三 回寫 索引與版本保護

若排序只是顯示，最安全是產生 index_map，例如排序位置採一開始、原索引採零開始：位置 1→原索引 1、位置 2→原索引 0、位置 3→原索引 2，再以原索引讀取整列。若需要回寫 measurement，必須用 product_id 加 snapshot_version 找回原列，並在寫入前確認版本仍一致。

假設排序後操作員修正 P1 的 measurement=9，但新批次已把 P1 更新為 8.5。若只用顯示位置 1 回寫，可能覆蓋 8.5；若帶版本，系統會回報 VersionConflict，要求重新讀取。產品索引、排序位置、原始索引與批次版本是四個不同概念。

原始資料不可因排序而重排寫回來源緩衝區。可建立新的 sorted_records，保留 original_index、product_id、measurement、arrival_seq。若 PLC 記憶體容量有限，至少保留索引與版本，再由上層查詢原列；不要為了少一個陣列就失去追溯鍵。

| 欄位 | 用途 | 排序後是否改變 | 回寫依據 |
| --- | --- | --- | --- |
| product_id | 產品識別 | 否 | 產品ID與版本 |
| measurement | 量測值 | 否（除非明確修正） | ID+版本 |
| arrival_seq | 同值次序 | 否 | 批次內次鍵 |
| sorted_position | 顯示位置 | 會變 | 不可當ID |
| snapshot_version | 防舊資料覆寫 | 否 | 寫入前比對 |

回寫前的版本比對至少要同時檢查 batch_id、snapshot_version 與 record_id。只比 product_id 不足以辨識同一產品的兩次測量；只比 snapshot_version 也可能在不同批次碰撞。若任一識別欄不一致，將修正要求放入待審佇列，不直接寫入來源。

若排序結果只供畫面瀏覽，也不要改變來源快照；畫面關閉後可丟棄 sorted_view，但稽核報表應保存規則版本與輸入快照識別。

版本檢查與寫入必須由同一個受控提交動作保護，例如具條件的更新或單一寫入者序列處理。先讀版本、稍後無條件寫入仍可能在兩步之間被其他更新插入；不能把畫面顯示版本相同當成防止競爭的證明。

測試回寫時先建立原批次，再新增一個同產品的新版本，最後嘗試用舊排序結果修改。預期舊結果被拒絕並留下 VersionConflict，而不是靜默覆蓋。這項驗收比單純看 P1、P3、P2 的畫面順序更能證明索引設計正確。

## 四 排序故障的逐步排查

看到結果順序錯誤時，先列出排序前每列的 product_id、measurement、arrival_seq、quality 與 original_index，再重算 key。若 P1、P3、P2 變成 P1、P2、P3，先查相等值是否真的都為 12，及 arrival_seq 是否被轉成字串比較；若把 2 排在 10 後面，通常是把數字當文字排序。

若缺值出現在中間，查是否在 key 中明確設定 missing_flag；若 NaN 每次位置不同，先將它移入 NonFinite 區，不要用一般小於比較。若同一 product_id 出現兩次，查去重規則與 batch_id，而不是以排序後的相鄰位置刪掉一筆。

若回寫改錯產品，檢查程式是否用 sorted_position 當陣列索引；若舊畫面可以覆蓋新資料，檢查 snapshot_version 是否在寫入前比對。所有排查都要保存輸入快照與 sorted_view，讓工程師能重現當時的 key 與原始順序。

| 症狀 | 先看欄位 | 常見原因 | 修正驗收 |
| --- | --- | --- | --- |
| 12值次序錯 | arrival_seq型別 | 次鍵遺失 | 同值依序排列 |
| 10排在2前 | measurement型別 | 文字排序 | 數值比較 |
| NaN亂跑 | quality/status | 直接比較NaN | 先分流 |
| 產品被寫錯 | sorted_position | 位置當ID | ID+版本回寫 |
| 跨批重複 | batch_id/record_id | 穩定排序誤當去重 | 明確去重規則 |

排查時可用四筆資料覆蓋邊界：P3=12 seq1、P1=8 seq2、P2=12 seq3、P4 缺值 seq4；再把 P2 的新版本插入另一批。預期第一批排序仍是 P1、P3、P2，P4 進 Missing 區，新版本不能讓舊 sorted_view 直接回寫。

驗收報告也要列出排序前後的索引對照，讓每個畫面位置都能回到原始記錄。

若報表要顯示前三名，先完成完整排序或使用同一套排序鍵的選取流程，再顯示產品列；不能先取三個數值才回頭猜產品。每個顯示值都要能沿著 original_index 回到原始記錄。

本文驗證資料結構、排序鍵與案例。實際索引陣列容量、字串支援、資料持久化及回寫 API 必須依選定平台手冊確認，不能以通用排序函式推導。

## 五 驗收 FAQ 與來源

本題正常案例是 P3=12、P1=8、P2=12，arrival_seq 依輸入為 1、2、3；升序結果為 P1、P3、P2。排序移動的是整列或索引，product_id 不因排序改變；缺值與 NaN 先分流，跨批次重複 ID 另以版本與去重規則處理。

FAQ1：為什麼不能先把 measurement 排序再套回產品？答：排序位置不是產品 ID，會造成產品與數值錯配。應排序整列或保存 original_index，再依 product_id 和版本回寫。

FAQ2：穩定排序能否消除跨批次重複 product_id？答：不能。穩定排序只保留同一輸入內相等鍵的順序，跨批次重複要靠 batch_id、record_id 或版本規則判斷。

FAQ3：NaN 要排在最前還是最後？答：先依資料契約分流成 NonFinite；不要直接交給一般數值比較。若要顯示在最後，應明確建立缺值/非有限值區。

FAQ4：新批次到達後，舊排序結果可以直接回寫嗎？答：不可以。先比對 snapshot_version；版本不同就回報 VersionConflict，重新讀取後再產生排序結果。

參考：[Python Sorting HOWTO：key、穩定排序與多鍵排序概念參考，非 PLC API。](https://docs.python.org/3/howto/sorting.html)

參考：[Python built-in sorted 官方文件：排序回傳新列表與 key 參數說明，非設備索引保證。](https://docs.python.org/3/library/functions.html#sorted)

## 延伸閱讀

- [字串數字轉換時怎麼保留原始輸入](/articles/strict-string-number-conversion)
- [資料庫交易如何讓一批紀錄一起提交或回滾](/articles/batch-database-transaction)
