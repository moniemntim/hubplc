---
title: 報表篩選如何保存成可重現條件
description: 以 UTC 半開區間、完整篩選契約、資料版本與 export manifest 讓報表查詢可重跑並可解釋差異。
date: 2026-09-21
author: 茂伯
draft: false
category: 資料記錄與報表
---

## 先把一次查詢寫成完整契約

報表畫面顯示一百列，不代表下週用相同日期和設備就能得到同一百列。要讓查詢可重現，保存的不是一句『上週夜班』，而是明確契約：UTC 起點含、終點不含、pointIDs、schema、filter_version、unit、quality、aggregation、as_of_snapshot、data_revision 與 timezone。

時間邊界採 [start,end) 可避免相鄰報表重複一筆。例：UTC 10:00:00 至 11:00:00 包含 10:00:00，排除 11:00:00；下一段從 11:00:00 開始。使用本地夏令時間的『整點』必須先轉成明確 UTC，保存原 timezone 只供顯示與追溯，不能讓每次執行重新猜時區。

pointIDs 要保存排序後的完整識別，不可只存畫面名稱；schema 和 filter_version 決定欄位、篩選語意與缺值處理。unit 要記錄轉換前後的規則，quality 要說明只取 Good、包含 Uncertain 或保留 Bad。aggregation 則要寫平均、最小、最大、計數及窗口對齊方式。

as_of_snapshot 與 data_revision 是資料版本條件。它們可以讓讀取端指定某個快照或修訂，但保存條件不保證資料庫永遠不變；快照被清理、校正重算或來源補資料時，仍可能得到不同結果。報表應同時保存查詢條件與實際輸出證據，讓差異可解釋。

## 用固定 UTC 與品質規則重跑

案例查詢指定 start=2026-09-20T00:00:00Z、end=2026-09-21T00:00:00Z、pointIDs=[P01,P02]、schema=3、filter_version=7、unit=degC、quality=Good、aggregation=5min_mean、timezone=Asia/Taipei。這個窗口是台北9月20日08:00到9月21日08:00，並非台北9月20日整個日曆日；畫面及manifest要清楚標示，執行保留UTC原值。

正常結果是相同 revision 和 snapshot 下重跑得到相同列數、排序與數值；若 aggregation 規則版本更新，應產生新的 filter_version 或 schema，而不是在舊報表上靜默套用新算法。平均值還要說明窗口是左閉右開、空窗口如何表示，以及是否排除品質不良點。

失敗結果常見於把 end 當成含括，造成午夜一筆同時出現在兩張報表；或先以本地時間查詢，再以 UTC 寫入 manifest，導致重跑少一小時。另一種失敗是畫面保留『正常值』但沒有 quality 條件，修訂後補進一筆 Bad 資料，報表總數看似相同卻平均值改變。

排查時先讀取原始 manifest，再確認實際執行使用的 pointIDs、UTC 邊界、schema 與 filter_version。接著核對 as_of_snapshot、data_revision、quality 分布與 aggregation 窗口。不要先比較畫面四捨五入後的數字；應比較原始列與版本，才能知道是資料變動、規則變動還是顯示格式造成差異。

時間解析要拒絕沒有時區的模糊字串，或在契約中明訂其來源時區後立即轉換。保存時可同時保留原始輸入、正規化 UTC 與顯示 timezone；這樣看到 2026-09-20 08:00 的人，能知道它是台北顯示還是 UTC，而不是靠報表名稱猜測。

pointIDs 的順序也要固定，例如先以字典序排序再寫入條件；欄位順序、聚合窗口與 quality 過濾同樣要序列化成穩定格式後再計算條件 hash。只改 JSON 空白或欄位排列不應被誤判成查詢語意改變，但真正改 filter_version 必須留下新版本。

## export manifest 要證明輸出發生了什麼

每次匯出都產生 manifest，至少含查詢條件、執行 UTC 時間、rowcount、欄位順序、編碼、檔案格式與每個輸出分片的 hash。hash 是完整輸出或明確分片的內容摘要，不是把密碼、token、連線字串或原始機密資料寫進 manifest。

rowcount=0 可能是合法空結果，不能直接標成查詢失敗。manifest 應區分 query_status=success_empty、success_rows 與 failed，並保存 failure_reason。若資料源只回傳部分頁面，也要記錄完成頁數、游標與是否達到預期終點，不能拿部分結果宣稱完整報表。

輸出 hash 只能證明拿到的檔案內容一致，不能證明資料源本身沒有在別的時間改變。若需求是稽核，還要保存 data_revision、snapshot 識別與產製程式版本；若只需求操作重跑，則至少保存足以重新建立同一查詢的條件與時區。

權限、個資與機密欄位要在報表契約中另列遮罩規則。manifest 可保存欄位名稱與 hash，但不要把查詢 token 或原始秘密放入可下載的 JSON。若輸出需要簽章或不可否認性，應依組織的稽核系統設計，本文不假設任何 PLC 或 HMI 原生支援。

manifest 的 rowcount 要和檔案實際資料列分開驗證，因為標題列、錯誤列與多檔分片可能讓人少算一列。可保存每個分片 rowcount、總 rowcount 與檔案 hash；合併時重新計算總數，若不一致就標記 manifest_invalid，不把檔案交給下游。

資料修訂造成差異時，報表比較頁應並列兩次執行的 data_revision、snapshot、rowcount 與 hash，並指出新增、刪除或品質改變的列數。這比只說「數值不同」更有用，也能讓資料擁有者決定要固定快照、接受重算，或重新發布一份新版本。

## 驗收 限制與差異說明

保存的條件應能由另一位工程師獨立解讀，不能依賴原作者記憶或畫面暫存狀態。

若 manifest 需要供其他系統讀取，欄位名稱與版本也要固定，未知欄位不得靜默改變語意；解析器遇到不支援版本應回報，而不是猜測預設條件。

若結果要與舊報表逐列比對，除了 rowcount 與 hash，還要固定欄位排序、null 表示、數值精度與換行規則。否則資料列相同但檔案格式不同，hash 會不同；應在 manifest 清楚區分內容差異與序列化差異。

若同一條件在不同程式版本執行，應在 manifest 保存產製程式版本與 schema 版本；只保存畫面名稱不足以重現欄位與聚合。

資料重跑時若 snapshot 不存在，結果應是 SnapshotUnavailable 或 best effort，而不是靜默改查目前資料。操作員可以選擇重新查詢，但新的 manifest 必須有新的 request_id、執行時間與 revision，讓兩次輸出不會被誤當同一份。

若報表需給人閱讀，顯示 timezone 可以在表頭標示，但 CSV 欄位仍應保存帶 Z 的 UTC 或明確 offset。不能只輸出沒有時區的 09:00，因為跨系統匯入後無法知道它屬於哪一天。原始 filter 與顯示格式也應分開保存。

驗收向量包括：相鄰 UTC 區間同一筆只出現一次；夏令時間切換前後；空結果；同條件不同 data_revision；Good 與 Uncertain 混合；aggregation 窗口邊界；pointIDs 順序改變；以及輸出內容不變但顯示小數位改變。每次都核對 manifest rowcount 與 hash。

限制是資料來源可能不提供真正 snapshot，或修訂號只代表部分表。此時只能如實標記 best effort，不能宣稱歷史資料不可變。時間同步、schema 遷移、品質定義與單位換算也要由資料擁有者確認。本文是報表資料設計與驗收方法。

## 常見問題與官方參考

FAQ1：保存查詢字串就能重現嗎？答：不夠，還要保存 UTC 邊界、pointIDs、schema、filter_version、品質、單位、聚合與資料版本。

FAQ2：end 時間要含括比較直覺嗎？答：相鄰報表建議使用含 start、不含 end，避免邊界資料重複。

FAQ3：rowcount=0 是錯誤嗎？答：不一定；只要查詢成功且條件合法，可以是 success_empty，必須與 failed 分開。

FAQ4：hash相同就代表資料永遠沒變嗎？答：在所選演算法的可靠性假設下支持檔案bytes一致，仍要看 snapshot、data_revision 與查詢時間。

參考：[Python datetime 官方文件：時區、aware datetime 與時間轉換概念參考；報表契約仍須自訂邊界規則。](https://docs.python.org/3/library/datetime.html)

參考：[Python hashlib 官方文件：輸出內容摘要與 hash 計算參考，不代表稽核簽章或資料不可變。](https://docs.python.org/3/library/hashlib.html)

## 延伸閱讀

- [配方欄位變更怎麼確認 canonical diff與有效期](/articles/recipe-canonical-diff-confirmation-revision)
- [匯出失敗如何分辨權限路徑與資料錯誤](/articles/export-failure-classification-atomic-publish)
