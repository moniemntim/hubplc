---
title: HMI首頁的值班任務入口
description: 以虛構夜班接手三條產線為例，設計警報、待確認事件與交班報表入口，說明摘要、路由、返回、權限和導覽驗收。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先按值班任務設計首頁

夜班接手三條虛構產線時，首頁的目的不是把所有 tag 和圖表塞在一起，而是讓值班人員先知道現在要做什麼、點哪裡可以完成、完成後如何回到原來的工作。本文把入口分成警報處理、待確認事件與交班報表三種任務，這是教學用的自訂分法，不是 ISA 強制分類。每張卡片只呈現摘要、來源線別、最早時間、資料新鮮度、目前狀態和下一步入口；原始來源與細節放進第二層。

| 任務入口 | 卡片摘要 | 點入後第一步 | 完成定義 |
| --- | --- | --- | --- |
| 警報處理 | 未確認數、最高優先級、最早時間 | 開 Alarm Status Table 並保留線別 filter | 記錄確認，處置與恢復另判 |
| 待確認事件 | 未處理事件數、來源與 age | 開事件時間線 | 判斷處理中/已排除/待交班 |
| 交班報表 | 最後產出時間、缺口、待簽核 | 開報表與缺口明細 | 保存版本與交接人 |

入口排序要按照工作風險和期限，而不是卡片設計者喜歡的順序。本例先顯示需要立即確認的警報，再顯示已恢復待確認的警報及另行追蹤的未結案工作，最後是可在班末完成的報表。數字旁一定要有「資料更新於」和線別，避免把三線合計 12 筆誤看成某一線的 12 筆。完成本頁後，使用者應可在本例設定的三次點擊目標內由首頁到正確明細，且不需要猜圖示意思。

首頁還要標示目前使用者、目前時區與資料來源狀態，因為夜班交接常跨班別與時區。若摘要查詢失敗，卡片不能顯示上一個數字而不標示時間；應顯示 stale/error 和最後成功時間。這個設計讓值班者知道下一步是處理警報，還是先恢復資料路徑。

## 夜班三線的具體路徑

假設 L1 有兩筆未確認 High，L2有一筆Clear Unacked（條件已解除、尚未確認），L3 沒有現行警報但有一份交班報表缺少簽核。首頁卡片顯示 L1「2 未確認，最早 22:14」、L2「1 已恢復待確認」、L3「報表待簽核」。值班人員先點 L1，進入警報表後只顯示 L1，選取來源、優先級、事件時間與 ack state；完成處理後回到首頁，L1 數字應由 2 變成 1 或 0，並標出刷新時間。

| 操作步驟 | 畫面預期 | 失敗先查 |
| --- | --- | --- |
| 1. 開首頁 | 三線卡片及更新時間可見 | session/權限/資料源 |
| 2. 點 L1 警報 | 路由帶入 line=L1 filter | filter 是否被丟失 |
| 3. 開 detail | 看到 source、state、priority、時間 | 事件是否仍存在 |
| 4. 留備註後返回 | 返回首頁，數字重新查詢 | cache/refresh rate |
| 5. 點 L3 報表 | 回到同一交班版本 | report id/timezone |

返回不是單純 browser back。應保存入口、線別、篩選條件和頁碼；若明細完成後返回，首頁應重新查詢摘要，而不是沿用進入前的舊數字。若產品路由不支援帶參數返回，則把 line、task、reportVersion 寫入應用狀態，再由首頁重新套用。本文不指定某個框架函數，工程師需依產品文件映射。

如果 L2 的 clear unacked 被首頁歸零，會讓值班者漏掉尚未確認的警報；Ack狀態不等於處置記錄是否填寫；因此卡片摘要要明確寫「現行」或「待確認」，不要只用一個 alarm count。L3 的報表卡也不能用「沒有警報」代替報表完成。

本例首頁未確認數只統計Unacked，並把Active和Clear分開標記。確認一筆後，若沒有新警報且後端回覆成功，未確認數才減一；警報仍Active時，現行警報數不會因Ack歸零。處置備註是另一份工作紀錄，不能用兩個計數器互相代替。

## 資訊密度與權限路徑

首頁每一張卡片都要回答摘要、狀態和下一步，但不必顯示完整事件欄位。摘要可用數字、文字與時間並列，例如「L1 2 筆未確認／High／最早 22:14／更新 22:16:03」。detail 才展開 qualified source、備註、quality 與操作記錄。若螢幕較窄，優先保留狀態、時間、線別與入口，讓次要欄位進 popup 或第二頁；這是可讀性取捨，不是用小字解決。

| 角色（自訂） | 首頁可見 | 可操作入口 | 權限不足訊息 |
| --- | --- | --- | --- |
| Viewer | 摘要與更新時間 | 只讀 detail | 顯示需要登入/角色 |
| Operator | 三線摘要 | 確認警報、填備註 | 顯示申請 Supervisor |
| Supervisor | 同上加待簽核 | 處理報表與設定範圍 | 記錄核准者 |
| Maintenance | 診斷入口 | 維護頁面（另設條件） | 顯示維護模式限制 |

Ignition Security Levels、Users/Roles 與 project component restriction 是產品特定功能；即使首頁將按鈕隱藏，也不能把隱藏視為執行端授權。命令、配方寫入或 PLC 操作仍需 Gateway、PLC 或設備端重新驗證。入口設計要把「看不到」「看得到但不可操作」「操作被執行端拒絕」分開呈現，並留下可追溯的錯誤原因。

權限測試以同一個 L1 警報做三組：Viewer 看得到但不能 acknowledge；Operator 可以確認並必填備註；未授權直接呼叫後端操作仍被拒絕。測試時不可只拍一張隱藏按鈕的畫面，應保存 role、時間、請求結果與 實際執行端audit（警報確認通常在SCADA） 證據。

導覽與權限的驗收要分開記錄。使用者可能有權查看 L1 卻沒有權限確認；也可能在頁面載入後角色被撤銷。每次真正的操作都要由後端重新判斷，畫面只負責提供清楚提示。申請流程也要保留 request id，讓值班者能回到待確認入口，而不是反覆按同一個被拒絕按鈕。

## 導覽驗收與故障處理

導覽驗收表要測正常和失敗路徑。正常路徑是首頁→L1 警報→detail→備註→返回首頁；返回後摘要重新取得。錯誤路徑包括資料源暫時不可用、filter 對應線別不存在、使用者權限在頁面中途改變、明細事件已被其他人處理。每種錯誤都要有可理解訊息、重新整理或回首頁選項，不可顯示空白卡片讓人猜測。

| 檢查項目 | 教學預期 | 證據 |
| --- | --- | --- |
| 線別辨識 | L1/L2/L3 不混淆 | 卡片與明細 filter |
| 時間 | 顯示時區與更新時間 | 截圖/查詢時間 |
| 返回 | 保留 task、line、filter | 前後狀態記錄 |
| 權限 | 按角色允許/拒絕 | 登入角色與結果 |
| 資料失效 | 顯示 stale/error 狀態 | 錯誤碼與重試結果 |
| 交班 | 報表版本與簽核人可追溯 | report id/audit |

若卡片數字不更新，先查資料查詢是否成功、refresh/輪詢週期、快取時間、線別條件和使用者權限，再判斷是否真的沒有事件。若明細與首頁數字不同，保存同一時間點的 query result，確認是否是事件在兩次查詢間變化。不要用瀏覽器重新整理掩蓋競態。

首頁也不能取代詳細 alarm table 或事件 journal。它只是一個任務入口與摘要；值班者需要 source、priority、state、event time 和操作歷史時，必須能到下一層。

交班報表的卡片摘要要列版本與生成時間。若接手者看到的是22:00版本、另一位同班人員已產生22:30版本，返回首頁後應能明示版本變化。報表缺口、簽核人和匯出結果分開保存，不能把一個「已產出」圖示解讀成所有資料已審核。

## FAQ 來源與限制

FAQ1：首頁卡片顯示 0 是否代表整條線正常？不一定，可能是查詢失敗、權限過濾或資料過期；卡片應同時顯示資料品質與更新時間。

FAQ2：返回首頁要保留明細 filter 嗎？應保留能避免誤操作的上下文，例如線別與任務；若事件已變化，摘要仍要重新查詢。

FAQ3：隱藏按鈕能當作權限控制嗎？不能。UI 限制只改善操作提示，執行端仍需授權。

FAQ4：三線可以共用同一張警報表嗎？可以共用元件，但必須把來源、filter、角色和返回路徑明確傳遞，不能把合計數字當成單線狀態。

離線演練以 22:14、22:16、22:20 三個時間點重算卡片與明細，未連接現場設備。Ignition Perspective Dashboard 文件說明 CSS grid 與 responsive mode；Alarm Status Table 文件說明 filter、狀態與操作元件。

參考：[Ignition Perspective Dashboard。](https://docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-display-palette/perspective-dashboard)

參考：[Ignition Perspective Alarm Status Table。](https://docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-display-palette/perspective-alarm-status-table)

參考：[Ignition Security Levels。](https://www.docs.inductiveautomation.com/docs/8.1/platform/security/identity-provider-authentication-strategy/security-levels)

## 延伸閱讀

- [Multicast IGMP Snooping 與工業 UDP 流量 為何非訂閱端也會被塞滿](/articles/ipv4-igmp-snooping-industrial-udp-diagnosis)
- [HMI儀表板的三層狀態顯示](/articles/hmi-dashboard-three-level-cooling-water)
