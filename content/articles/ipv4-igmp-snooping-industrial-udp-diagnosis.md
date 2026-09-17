---
title: Multicast IGMP Snooping 與工業 UDP 流量 為何非訂閱端也會被塞滿
description: 以IPv4 multicast 239.10.1.20/VLAN30離線案例比較IGMP snooping正常與空表流量，說明querier、router port、老化、unknown multicast與fast-leave限制。
date: 2026-09-17
author: 站長
draft: false
---

## 先分IPv4多播角色

本篇主案例限定IPv4與IGMPv2。多播source把UDP資料送到群組位址；接收主機以Membership Report表示接收意願，querier以Query詢問成員，主機離開時依版本規則送Leave。交換器snooping觀察控制訊息，建立VLAN、group、receiver port與router port的轉送資料。成員存在不表示應用已正確處理payload。

群組239.10.1.20位於VLAN30，source 192.168.30.10接P0；接收埠R1、R2、R3各接一台主機，Uplink另接多播路由器。R1、R2主機加入，R3未加入。假設每秒1000包、每包UDP payload 1200 bytes，payload資料率9.6 Mbit/s。正常成員轉送只到R1、R2及必要router port，不送回來源P0；空表時處理依產品策略。

IGMP snooping通常需要知道querier或multicast router的存在，才能讓成員老化與重新加入。沒有Query時，table可能保持、老化、泛洪或採產品特定策略。先查目標設備版本與設定，再用封包與port counter驗證。

IGMP Report的版本與內容會影響snooping表。IGMPv2通常以group表達加入；IGMPv3可能包含source filter。若設備只顯示group，不能宣稱它已追蹤指定source；應對照封包中的Report與產品支援能力。

| 角色 | 訊息/狀態 | 盤點欄位 | 常見誤解 |
| --- | --- | --- | --- |
| Source | UDP multicast data | source、group、rate | 收到不等於payload正確 |
| Receiver | IGMP Report/Leave | port、VLAN、版本 | port燈亮不代表加入 |
| Querier | General/Group Query | IP、VLAN、interval | 不是任意管理IP |
| Snooping switch | 轉送表 | group、ports、age | 空表不必然flood |

## 正常表與空表的流量比較

離線正常狀態：R1、R2在VLAN30對239.10.1.20送Report，switch table為 group→R1,R2，router port為Uplink。每秒1000 packets應到R1、R2與需要的router port；R3不應收到資料。表格要保存建立時間、最後Report、老化時間與來源。

異常狀態：R1/R2未送Report，或snooping table因VLAN/querier問題變空。switch可能依產品把unknown multicast送到VLAN多數埠，也可能有抑制、硬體預設或管理策略。此時比較R3的packet counter、鏡像封包、table狀態與source counter，不能從一個設定名稱推導所有結果。

| 狀態 | table | R1/R2 | R3 | 需查 |
| --- | --- | --- | --- | --- |
| 正常 | G→R1,R2,Uplink | 約1000 pps | 接近0 | Report/Query/age |
| 空表 | 無G項目 | 依產品 | 依產品，可能增加 | unknown策略與VLAN |
| R2離開且確認無成員 | G→R1,Uplink | R1繼續；R2停止 | 0 | Leave/last-member流程 |
| querier故障 | 可能老化或保留 | 隨版本 | 隨版本 | Query與老化 |

1000×1200×8=9,600,000 bit/s，即9.6 Mbit/s，只計UDP payload。若同一資料被送到R3，這是交換器R3埠的egress、接收主機網卡的ingress；兩個視角不能混用。實際線上速率還含IP、UDP與Ethernet開銷。9.6 Mbit/s也不必然塞滿網卡，還要看埠速率、其他流量及主機處理能力。

Querier選舉與路由器存在是兩件事。VLAN中有真正的multicast router時，應確認router port學習與Query來源；沒有PIM但需要本地查詢時，某些Cisco平台提供snooping querier。不要把普通SVI管理IP直接當querier，除非產品文件與網路設計明確支持。

unknown multicast行為應以產品設定與實測表述。即使某版本預設泛洪，另一產品或另一版本可能抑制、只送router port或依靜態group處理；文章只提供分流方法，不把一種預設寫成標準。

## Querier router port與老化

VLAN內有多播路由器時，先確認Query來源與router port是否學到正確方向。若只做本地二層多播而沒有多播路由介面，可檢查產品是否提供snooping querier。Cisco IE2000的15.0(2)EA指南列有此功能；其他型號的支援、選舉與設定仍要查各自版本。普通管理IP存在，不等於querier已啟用。

正常Leave流程會依querier與交換器支援進行last-member查詢，確認是否還有成員，再移除對應轉送。把查詢間隔、次數與成員老化分開記錄，不猜一個固定秒數。R2離開後，應看到R1仍接收，R2在確認無成員後停止；若R1也斷流，先查是否共用埠或錯誤刪除整個group。

router port不是普通receiver port。若把uplink誤當receiver或反之，Query可能到不了主機，或data被送到錯誤方向。盤點表至少包括VLAN、group、source、querier、router port、receiver port、last Report與age。

| 證據 | 成功預期 | 失敗分流 |
| --- | --- | --- |
| General Query | VLAN30內週期到達 | 查querier、VLAN、router port |
| Report | R1/R2送達switch | 查主機IGMP版本與port |
| table age | 依產品時間更新/刪除 | 查版本參數與時鐘 |
| data port | 只到成員與必要uplink | 查unknown策略與table |

資料率計算要分pps、payload bytes與乙太網線上實際bytes。案例9.6 Mbit/s只用1200-byte payload估算，不含IP/UDP/Ethernet標頭。比較R3是否被塞滿時，使用同一時間窗的ingress/egress octets與packets，避免混用累積counter。

跨交換器trunk要確認IGMP控制封包、group data與router port的VLAN標籤；某些產品需要明確設定mrouter port或靜態group。未知設備不提供通用命令，只能依其版本手冊填入設定。

IGMPv3可能含source filtering，不能把僅有group欄位的舊表當作完整S,G狀態。若工業協定要求指定source，capture要記錄source IP、group、VLAN與receiver，並查交換器是否支援相應追蹤。

## Fast leave 版本與驗收

Cisco IE2000 Release 15.0(2)EA指南的Immediate Leave會在偵測IGMPv2 Leave後立即移除該埠，並要求VLAN內每埠只有單一接收端。這是指定平台行為，不把同名功能套到未知IGMPv3實作。共享埠P4後有A、B時，一台離開不代表整埠已無成員。

在隔離測試網路驗收，先備份設定與表格，再固定source、group、VLAN與資料率。第一階段R1/R2加入，確認Report、table、router port與R1/R2 counter；第二階段R2離開，依產品last-member流程觀察R1仍收得到；第三階段停止querier，記錄Query停止、age與R3流量，不預設unknown一定flood。

unknown multicast不是所有產品都一定flood。它可能依硬體、VLAN、IGMP版本、靜態group、router port與管理選項採不同處理。報告要寫產品版本、設定原文、實際table與capture，而不是只寫snooping on/off。

table老化與來源停送要分開。若source停止，receiver table仍可能暫時存在；若querier停止，table可能依產品保留或刪除。保存最後Report、最後Query、最後data與age，才能判斷是沒有訂閱、沒有查詢還是來源沒發送。

停止querier後，正式結論要寫「依產品老化策略待驗證」。只有同時看到Query消失、table age變化、R3流量結果與版本文件，才能說明實際處理。

UDP有封包不代表資料有效；還要查payload序號、source timestamp、資料長度、協定所定義的校驗或應用schema。若R3被塞滿，先證明它收到的group、VLAN與pps，再決定是snooping、querier、來源速率或應用消費速度。

同一group在另一個VLAN是另一份成員狀態；VLAN30的Report不會自動讓VLAN40的receiver加入。source、group、VLAN、receiver port與querier IP要一起列，否則容易把不同廣播域的表格混在一起。

報告應將產品版本、IGMP版本、snooping設定、querier來源、router port、fast-leave與table老化欄位一起保存。缺一項時，結論只能列待確認，不能用通用IGMP語意補上。

若R3流量增加，要先確認它收到的是239.10.1.20/VLAN30，還是其他group、broadcast或unknown unicast。依group、VLAN、source與時間過濾capture，再用bytes/packets counter核算，不要把所有增加都算到IGMP。

## FAQ 來源與驗證

FAQ1：IGMP snooping開啟後非訂閱端一定收不到multicast嗎？不一定，unknown multicast與產品策略可能仍轉送，必須查版本與封包。

FAQ2：沒有querier就一定停止多播嗎？不一定，table可能保留、老化或依產品策略處理；要看Query、age與官方文件。

FAQ3：fast-leave能否用在接了小交換器的uplink？不應直接使用；它常假設每個Layer 2 port只有一台host，可能誤刪其他成員。

FAQ4：收到UDP multicast就代表工業資料正常嗎？不代表，仍要驗證source、序號、時間、payload與應用品質。

另設共享埠P4作fast-leave反例：P4後方小交換器連主機A、B，兩者都接收同一群組。A離開時若立即刪除整個P4成員，B也會斷流。這與主案例R1、R2各接一台主機不同。先查是否共享埠、產品支援的版本與成員追蹤，不能把fast-leave當通用加速選項。

空table不一定等於沒有receiver，可能是Report尚未到達、VLAN錯誤、snooping未啟用、table容量滿或設備不顯示某些狀態。用主機封包、switch table、port counter三方比對，不能只看一個管理畫面。

source、group、VLAN與receiver表格要按時間保存，方便比較加入、離開、querier故障前後的差異。

資料流量與控制資料要分離監測。即使R3收到9.6 Mbit/s，也要判斷它是否真的訂閱該group、應用是否讀取payload，以及UDP接收buffer是否溢位；交換器轉送與應用處理是不同層次。

本文group、資料率、Report、Query、table與port流量為離線假設。

參考：[RFC 4541（Informational）：IGMP/MLD snooping建議，控制訊息與資料轉送注意事項。](https://www.rfc-editor.org/rfc/rfc4541.html)

參考：[Cisco IE2000 Release 15.0(2)EA：IGMP snooping、querier、IGMPv2 Immediate Leave與單一接收端限制。](https://www.cisco.com/c/en/us/td/docs/switches/lan/cisco_ie2000/software/release/15_0_2_ea/configuration/guide/scg-ie2000/swigmp.html)

## 延伸閱讀

- [RSTP 拓撲變更與網路抖動 從 Topology Change Log 找到迴路線索](/articles/rstp-topology-change-network-jitter-diagnosis)
- [HMI首頁的值班任務入口](/articles/hmi-home-task-entry-night-shift)
