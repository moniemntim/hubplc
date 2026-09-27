---
title: 廣播探索如何維護受控設備清單
description: 以20 collector每5秒查詢、每次50設備回覆，區分broadcast/multicast/mDNS/unicast，計算4 queries/s與理想200 replies/s並建立inventory驗證。
date: 2026-09-21
author: 茂伯
draft: false
category: 工業通訊與網路
---

## 一 先分清探索的傳輸範圍

探索不是一個通用的「找所有設備」按鈕。broadcast 把封包送給同一廣播網域的多個主機；multicast 送給加入群組的接收者；unicast 只送給指定地址。mDNS 是有自身名稱、群組與快取規則的協定，本篇不把 mDNS、一般 multicast 或廠商 discovery 混稱。以下只建立一個自訂 UDP broadcast 探索案例。

自訂案例把受控 broadcast 當作啟動或稽核工具，不作常態健康輪詢。20 個 collector 每 5 秒各送 1 次 query，平均 query rate 是 20/5=4 queries/s；若每次 query 有 50 台設備回覆，理想全回覆率是 4×50=200 replies/s，不是再乘一次 20。這是回覆數估算，仍需加入重試、抖動、遺失與重複回覆。

探索封包要帶 discovery_id、collector_id、nonce、協定版本與過期時間；回覆要帶 device_id、address、protocol、port、firmware_identity、last_verified 與 expiry。device_id 不能只由 IP 推導，因 IP 可能變動或被重複配置。收到回覆後先驗證身份，再更新 inventory。

| 項目 | 本案例值 | 用途 | 限制 |
| --- | --- | --- | --- |
| collector | 20 | 發起探索 | 須受控清單 |
| interval | 5s | 每台發送週期 | 啟動可抖動 |
| query rate | 4/s | 20÷5 | 平均值 |
| reply fanout | 50/query | 每query回覆數 | 理想全回 |
| reply rate | 200/s | 4×50 | 不含重試/遺失 |

探索請求與回覆的 payload 只放識別與能力摘要，不放寫入命令。回覆不代表設備已通過安全或功能驗證，inventory 的 last_verified 只表示身份與連線檢查完成。能力欄位需有版本與來源，未知值保留 unknown。

本案例沒有假定 Q 系列 PLC 有固定 discovery API。實作前要確認網段廣播、交換器、ACL、防火牆與設備是否允許自訂 UDP；不能把通用 UDP 範例當成廠商命令或控制介面。

## 二 啟動抖動與受控清單

若 20 個 collector 同秒啟動，4 queries/s 的平均值會掩蓋瞬間 20 queries 的 burst。可在啟動時為每個 collector 分配 0–5 秒抖動，之後維持固定週期；抖動要記錄 collector_id 與下一次發送時間，不能讓重啟後全部再次同時發送。

inventory 應是中央資料表，不是最後一次回覆的字典。每列至少保存 device_id、address、protocol、port、last_verified、expiry、identity_version 與來源 collector。收到相同 device_id 的不同 address 時，標 IdentityChanged 待驗證；本例假定每個IP只對應一台直接設備；相同address出現不同身份時先標疑似DuplicateIP，不自動覆寫。

常態健康檢查改用已核准的 unicast endpoint，固定目標與逾時；broadcast 只在啟動、人工稽核或受控變更窗口使用。這樣可以把探索流量與健康流量分開，也能在網路政策不允許 broadcast 時維持已知設備監測。

| 事件 | inventory動作 | 健康檢查 |
| --- | --- | --- |
| 首次回覆 | 建立待驗證列 | 尚未納入正常 |
| 身份驗證成功 | 更新last_verified/expiry | unicast輪詢 |
| IP變更 | 保留舊列並標IdentityChanged | 重新驗證 |
| 重複IP | 標DuplicateIP | 停止自動覆寫 |
| expiry到期 | 標Stale | 要求重新探索/人工核對 |

中央 inventory 的 expiry 應依最後驗證時間和政策計算，不因收到無法驗證身份的封包而延長。舊地址要保留歷史與變更時間，避免 IP 重新分配後把新設備誤認成舊設備。

清單更新要有版本或 transaction_id，避免兩個 collector 同時寫入造成舊回覆覆蓋新身份。可由單一受控寫入者依版本串行提交，或由資料庫條件更新實現；分開讀版本再無條件寫入仍有競態，不能稱為可靠仲裁。

## 三 回覆速率 遺失與重試

20 個 collector 每 5 秒發一次，理想 query rate 4/s；每次 50 台回覆則 200 replies/s。若 10% 設備未回覆，不應把重試立即加回同一秒；先依 discovery_id 分批重試並加抖動。報表同時列 query_sent、reply_received、duplicate_reply、timeout 與 identity_reject。

探索回覆可因廣播不可達、設備忙、ACL 或回覆碰撞而遺失。收到兩次相同 nonce 的回覆不應重複建立設備，應記 duplicate_reply；收到不同 nonce 但同 device_id，要依時間與身份版本判斷是否新探索。不能只用 IP 去重。

若每次重試都向所有 50 台重發，4 queries/s 的理想估算會被放大；因此重試責任、最大次數與窗口需在 discovery policy 明訂。探索失敗只影響 inventory freshness，不應直接觸發機台動作或假設設備不存在。

| 指標 | 含義 | 處置 |
| --- | --- | --- |
| query_sent | 實際探索次數 | 核對4/s平均 |
| reply_received | 有效回覆 | 更新候選清單 |
| timeout | 未收到回覆 | 抖動後有限重試 |
| duplicate_reply | 相同nonce/身份重覆 | 記錄不重建 |
| identity_reject | 身份不符 | 不更新inventory |

當 collector 暫時離線，中央系統不應把它最後收集的資料當成最新。每次回覆帶 collector_id 與 discovery_id，重複或晚到回覆要依發起時間和驗證結果判定，不能以寫入順序覆蓋較新的身份。

若回覆帶未知 protocol 或 port，先保留候選資料並標 UnknownCapability，不把未知值轉成預設協定；健康檢查前必須完成能力核對。

安全與網路政策也要納入驗收。廣播可能跨越不預期的網域或被反射，應限制來源介面、封包大小、頻率與回覆欄位；不能把探索封包設計成可觸發寫入、重啟或其他控制動作。

## 四 IP變動與完整驗收

具體案例：inventory 先記 device-A=192.0.2.10、port=5000、last_verified=10:00。10:05 回覆變成 192.0.2.20，但 device_id 與身份證明一致，標 IdentityChanged，重新以 unicast 驗證後才更新；若 192.0.2.20 同時回 device-B，先標 DuplicateIP，兩列都保留，停止自動選擇。

驗收先用 20 collector、5 秒週期跑 60 秒；理想 query 約 240 次、平均 4/s，若每次 50 回覆則理想回覆約 12000 次、平均 200/s。這個數字是假設每次全回，不代表設備一定如此；實際報告要列遺失、重覆、身份拒絕與抖動分布。

再注入一台設備 IP 變更、一個重複 IP、一個錯誤 device_id 與一個過期回覆。預期 inventory 不會因最後一包而靜默改寫；已驗證資料才進正常 unicast healthcheck。若已有ACL或網路證據確認廣播被封鎖，系統顯示DiscoveryUnavailable；只有未收到回覆時先標NoReply待查，而非把所有設備標成不存在。

| 驗收 | 輸入 | 預期 |
| --- | --- | --- |
| 速率 | 20×每5s×60s | 約240 queries |
| 全回 | 每query50 replies | 約12000 replies |
| IP變更 | 同身份新地址 | IdentityChanged後驗證 |
| 重複IP | 兩device同地址 | DuplicateIP不覆寫 |
| 廣播封鎖 | 無reply | NoReply待查 |

若廣播探索跨越多個 VLAN，先確認路由與網路政策；不要假設廣播會穿過路由器。需要跨網段時，可由各網段受控 collector 回報中央 inventory，而不是放大一個全域廣播。

inventory 寫入也要保存來源封包摘要與驗證結果，讓後續能回溯「誰在何時看到哪個地址」。這比只保存最後 address 更能處理交換器、DHCP與設備重啟造成的變化。

若一個閘道IP後面有多個邏輯設備，設備鍵還需含站號、通道或端點識別；不能套本例一IP一設備的假設。先查拓樸，再決定同地址多身份是衝突還是合法共享。單靠回覆裡自報device_id也不等於已驗證身份，需依專案的可信識別機制核對。

本文是自訂 UDP 探索與 inventory 流程，不是所有協定的通用行為。實際網路廣播範圍、multicast/mDNS 政策、設備身份欄位與防火牆規則需由目標環境核對。

## 五 驗收 FAQ 與來源

本案例明確區分 broadcast、multicast、mDNS 與 unicast；只自訂 UDP broadcast 探索。20 collector 每 5 秒 1 query 得平均 4 queries/s，每次 50 replies 得理想 200 replies/s；inventory 保存身份、地址、協定、port、last_verified、expiry，IP變更與DuplicateIP需重新驗證。

FAQ1：broadcast 可以找出所有網段設備嗎？答：不能。它受廣播網域、路由器、ACL、防火牆與設備協定限制；本篇只定義受控自訂 UDP 案例。

FAQ2：為何回覆速率是 200/s 而不是 4000/s？答：20 collector 每5秒平均4 query/s，每次50回覆，所以 4×50=200 replies/s；不能再把20重複乘一次。

FAQ3：設備 IP 變更可以直接更新 inventory 嗎？答：先驗證 device_id 與身份版本，再更新；同地址多身份要標 DuplicateIP，不能自動覆寫。

FAQ4：常態健康檢查也用 broadcast 可以嗎？答：不建議。常態檢查使用已核准 unicast，broadcast 保留給受控探索或稽核。

參考：[RFC 1112：IP multicast 概念與範圍參考，非本篇自訂 discovery API。](https://www.rfc-editor.org/rfc/rfc1112)

參考：[RFC 6762：Multicast DNS 的官方規範，與一般 broadcast discovery 分開。](https://www.rfc-editor.org/rfc/rfc6762)

## 延伸閱讀

- [NAT來源port變更如何追蹤交易](/articles/nat-source-port-transaction-tracing)
- [NTP失敗時如何判定時間品質](/articles/ntp-time-quality-holdover)
