---
title: 不良品重測怎麼記錄 PLC 流程避免重算產量
description: 分開產品、測試嘗試與良品統計，保留首次失敗並拒絕重送與晚到結果。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先把測試與產量分開

同一產品第一次測試失敗、第二次測試成功時，測試次數應是二，但完成產品數只能增加一。要做到這點，你必須把 product_id、test_count、last_result、first_fail_code 與 counted 分開保存。測試紀錄描述每次嘗試；產量統計描述產品是否已完成，兩者不能共用一個 done 計數器。

| 欄位 | 案例值 | 用途 |
| --- | --- | --- |
| product_id | P07 | 辨認同一產品 |
| test_count | 2 | 累計測試次數 |
| last_result | PASS | 目前最後結果 |
| first_fail_code | LEAK | 保留首次失敗原因 |
| counted | TRUE | 完成統計已計入 |

1. 產品入線只建立一筆產品資料。

2. 每次真正開始測試才讓 test_count 加一。

3. 只有從未 counted 且達到最終完成條件時，完成產品數加一並鎖定 counted。

## 定義重測狀態與覆寫規則

本例狀態為 NEW→TESTING→PASS 或 FAIL_HOLD。FAIL_HOLD 只有在重測許可、產品 ID 相同且未被判定報廢時才能進 RETEST。重測成功可把 last_result 改為 PASS，但 first_fail_code 永遠保留；若重測再次失敗，last_result=FAIL 並累計失敗原因。已 counted 的產品收到重複 PASS 事件，只記 duplicate，不增加完成數。

| 事件 | 狀態 | test_count | 完成數 | 說明 |
| --- | --- | --- | --- | --- |
| P07 建立 | NEW | 0 | 0 | 尚未測試 |
| 第一次開始 | TESTING | 1 | 0 | 建立測試紀錄 |
| 第一次失敗 | FAIL_HOLD | 1 | 0 | first_fail=LEAK |
| 允許重測 | RETEST | 1 | 0 | 保留原失敗 |
| 第二次開始 | TESTING | 2 | 0 | 同一 ID |
| 第二次通過 | PASS | 2 | 1 | counted 由 F→T |
| 重送通過 | PASS | 2 | 1 | duplicate，忽略統計 |

這張表就是你的核算基準：P07 有兩次測試事件，卻只有一次完成產品。若畫面顯示完成數為二，先回頭查 counted 邊沿與重送去重。

## 偽碼 去重與資料保存

```text
教學偽碼，非指定PLC語法：
若新start_test且狀態為NEW或RETEST：
  test_count加一；建立新attempt_id；狀態:=TESTING
若result_event：
  若event_id已處理：回覆已處理，不改任何產品資料
  否則若產品ID、attempt_id不符，或state≠TESTING：隔離晚到結果
  否則：保存不可變attempt紀錄；更新last_result
    首次FAIL且first_fail_code空白才寫首次原因
    PASS：state:=PASS；尚未counted才將completed加一並鎖counted
    FAIL：state:=FAIL_HOLD，不增加completed
    保存本次event_id為已處理
明確報廢決策另外使state:=REJECT，scrap只增加一次。
```

| 統計量 | 公式 | P07 結果 |
| --- | --- | --- |
| 測試總次數 | 每次 start_test +1 | 2 |
| 完成產品數 | counted 從 F→T 次數 | 1 |
| 尚未結案 | NEW+RETEST+TESTING+FAIL_HOLD | 0（完成後） |
| 重測次數 | test_count−1（已測產品） | 1 |
| 投入守恆 | 完成+待處理+報廢=投入 | 1+0+0=1 |

建議把每次測試保存成一筆不可變的 attempt 紀錄，再由產品摘要欄位保存目前狀態。attempt_01 記錄 FAIL/LEAK，attempt_02 記錄 PASS，摘要才更新為 PASS；刪除第一筆紀錄會失去品質追溯。重測許可應包含操作者、原因與有效期限，期限過後收到結果要進人工複核。產品離開測試站前，先鎖定摘要和統計，再送出完成握手；握手失敗時可以重送同一 event_id，但不能重新建立 attempt。每天交班時列出 test_count 大於一的產品，逐筆和報廢、出貨紀錄核對，能及早發現統計被重算。

## 操作 故障與驗收

duplicate 判斷必須先於任何狀態、test_count 或統計修改，並同時校驗 product_id、attempt_id、event_id。final FAIL 只進報廢流程，不增加 completed；全文 completed 統一定義為良品完成數。十件案例明訂 P09 一次失敗即報廢，P07 第二次失敗時也進報廢，兩者各只計一件報廢。

把重測流程畫成兩條線：產品生命週期一條，測試嘗試紀錄一條。產品由 NEW 進 TESTING 時建立 attempt；FAIL 進 FAIL_HOLD，等待授權後再進 RETEST；PASS 或 REJECT 才能成為最終狀態。統計只接受最終狀態第一次提交的邊沿，並以 product_id 加 counted 作雙重判斷。若產品已 PASS 又收到 FAIL，不能直接改回失敗，除非規格允許複驗且建立新流程狀態；若已 REJECT 則所有晚到結果都應隔離。測試站重送時使用原 event_id，PLC 回覆已處理即可；若站點產生新 event_id，還要核對 attempt_no，避免把一次重送算成第三次測試。保存資料時可分成目前摘要與歷史紀錄，摘要供控制流程快速讀取，歷史供品質追溯。最後以投入、完成、報廢、待處理和測試總次數五項對帳，任何不守恆都先停用自動報表，查清楚後再恢復。

若重測必須換治具或換站點，請在 attempt 紀錄加入 station_id 與 fixture_id；同一產品換站後仍沿用 product_id，但不可沿用上一站的完成旗標。

在畫面上把「測試次數」與「完成數」分開顯示，並在 P07 的例子旁標出 2 與 1。操作員若按下重測取消，產品進 REJECT 或人工待判，不能停留在 TESTING 造成統計永遠等待。對帳時另列晚到結果、重送次數與未配對事件，這些數字不直接加入投入或完成。

當測試站回傳結果但產品已不在站上，先以 product_id 查詢歷史狀態，再決定接收或隔離；不要因為結果是 PASS 就直接增加完成數。

復歸完成後先核對摘要與歷史 attempt 的最後序號，再開放下一次測試；復歸前的晚到訊息不可直接寫入統計。

完成驗收後，把每件重測產品的 attempt 清單與產量守恆表保存，確認報表只以最終狀態計數。

這項紀錄也能協助你分辨測試站重送與統計重算錯誤。

所以排查時先看產品摘要，再看歷史紀錄，最後才調整統計公式。

## 操作 故障與驗收 續

1. 建立 P07，確認 test_count=0、counted=FALSE。

2. 送第一次 FAIL/LEAK，確認進 FAIL_HOLD 且原因不空白。

3. 只允許同 ID 重測，送第二次 PASS，確認 test_count=2、完成數=1。

4. 重送同 event_id 或同一完成脈衝，確認完成數不變。

5. 重新啟動後檢查 P07 與 event_id 保存策略，禁止未核對就重算。

```text
用守恆表做每日對帳最可靠。假設投入 10 件，其中 P07 重測一次，最後 8 件一次通過、P07 二次通過、P09 報廢，則實際產品數仍為 10，測試總次數為 11，完成數為 9，報廢數為 1，待處理為 0；完成加報廢加待處理等於投入 10。重測次數是 1，不能把它加到投入數。若 P07 第二次仍失敗，完成數改為 8、報廢數改為 2，但 test_count 仍為 2。
結果覆寫也要有條件。先由FAIL_HOLD取得重測許可，再進RETEST並建立新attempt；只有該次TESTING的匹配結果可更新last_result；已報廢或已出貨的產品收到 PASS，必須拒絕並報 LATE_RESULT。相同 event_id 重送時，檢查紀錄可以增加通訊重送次數，但測試次數與產量不能增加。若收到相同產品的新 event_id，先比對目前狀態與測試站序號；不符合就進人工複核。斷電恢復時先鎖住統計寫入，讀回產品表並與測試站對帳，完成後才解除鎖定。
```

### 完成後應看到什麼結果

P07 的測試次數為 2、最後結果為 PASS、首次失敗原因仍是 LEAK、完成產品數增加 1；重複結果不增加產量，投入守恆表可對上。

### 失敗時先查哪裡

先查 start_test 是否被電平重複觸發，再查 product_id 是否換筆，接著查 counted 是否在結果確認前清零，最後查斷電恢復與 event_id 去重資料是否遺失。

### 適用型號與限制

適用於 Q06UDVCPU 等以資料結構保存品質流程的控制器；實際保持範圍、檔案保存、HMI 重送及測試站握手需依設備規格驗證。

## 常見問題與來源

### FAQ

```text
問：重測成功能不能清掉失敗原因？答：不建議；保留 first_fail_code 才能追溯，另設目前結果欄位。
問：測試脈衝卡住怎麼辦？答：用上升沿加產品狀態互鎖，完成後鎖住同一事件。
問：斷電後怎麼避免重算？答：保存產品狀態、counted、統計與事件序號，並在復歸時先對帳。
```

參考：[三菱 QnUCPU 使用手冊 程式執行與裝置資料](https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh080807eng/sh080807engaf.pdf)

## 延伸閱讀

- [用 FIFO 追蹤輸送線產品 避免結果和產品對錯筆](/articles/plc-fifo-product-tracking)
- [PLC 型別轉換的小數 截斷與超範圍處理](/articles/plc-type-conversion-truncation-range)
