---
title: VLAN與Trunk不通的排查順序
description: 用VLAN20 PLC與VLAN30資料收集拓撲，沿MAC、ARP、tag、allowed list、PVID、native與L3 ACL路徑定位trunk漏VLAN問題。
date: 2026-09-17
author: 站長
draft: false
---

## 先分 access trunk與路由

VLAN診斷先回答封包目前是tagged還是untagged、入口PVID把它放進哪個VLAN、trunk allowed list是否允許該VLAN，以及兩個IP網段是否需要L3 routing。access port通常把端點未標記流量歸入一個VLAN；trunk可承載多個tagged VLAN，native或untagged行為則依廠商設定。

虛構拓撲有VLAN20 PLC網段192.168.20.0/24與VLAN30資料收集網段192.168.30.0/24。PLC-A=192.168.20.10接SW1 access VLAN20，Collector=192.168.30.50接SW2 access VLAN30，PLC-B=192.168.20.11接SW2 access VLAN20；SW2在本例另提供VLAN20/30的L3介面，位址分別為192.168.20.1與192.168.30.1。SW1-SW2為trunk。若兩端只需同VLAN20互通，trunk必須允許20；若20與30互通，還需要三層介面與ACL，光有trunk不會路由。

本文只做離線封包與表格推演，不提供未知廠牌命令。PVID、native VLAN、tagged/untagged出口規則要按目標交換器手冊核對，因為不同產品對hybrid、general或native名稱可能不同。

另作對照：若把原本SW2的PLC-B放在SW1的VLAN20，trunk允許清單漏20仍可能讓它們互通；這正是局部成功的陷阱。把測試端移到SW2或讓capture位於trunk，才能驗證VLAN20真的穿過兩端。跨VLAN測試更要指定來源與目的IP、gateway、ACL及回程。

| 介面 | 端點/用途 | 入口 | 預期出口 |
| --- | --- | --- | --- |
| SW1-PLC | PLC-A，VLAN20 | untagged→PVID20 | 往PLC端為untagged |
| SW1-SW2 | trunk | 接受20、30 | 依allowed帶tag20/30 |
| SW2-Collector | Collector，VLAN30 | untagged→PVID30 | 端點看到untagged |
| L3 gateway | 20與30互通 | SVI或路由介面 | 依ACL轉送 |

## allowed VLAN漏20的MAC與ARP路徑

假設本案例兩端trunk allowed都只有30，VLAN20應採tagged，其他設定正常，VLAN20被漏掉。PLC-A送給同VLAN20的PLC-B時，SW1從access口學到PLC-A的MAC，送往trunk前因allowed拒絕tag20；SW2看不到該frame，SW2的MAC table也不會出現PLC-A在trunk上的VLAN20位置。這是SW1出口已阻擋VLAN20的離線假設；若只有SW2清單漏20，則需改查接收端准入。舊MAC快取可能尚在，不能只憑MAC項目有無判斷當下通訊。

若PLC-A要連192.168.20.11，先發ARP request廣播。SW1在VLAN20內泛洪，但不能經allowed list漏20的trunk送到SW2，因此PLC-B不回ARP，PLC-A維持incomplete。若PLC-B在SW1同一交換器，ARP可成功，造成「部分控制網可達」的假象。

不同VLAN的192.168.20.10到192.168.30.50不應期待ARP直接跨VLAN。PLC先ARP自己的default gateway 192.168.20.1，送tag20到L3介面；本例SW2的L3功能查路由與ACL，再以VLAN30介面192.168.30.1 ARP Collector，最後送到SW2 access VLAN30。每一跳都要有自己的MAC與ARP證據。

| 步驟 | VLAN20同網段 | 跨VLAN 20→30 |
| --- | --- | --- |
| 1 | PLC-A ARP PLC-B | PLC-A ARP gateway20 |
| 2 | SW1泛洪/學MAC | L3收到tag20 |
| 3 | trunk需允許20 | 路由查ACL |
| 4 | PLC-B回ARP | L3 ARP Collector在30 |
| 5 | 雙向frame | 回程走gateway30→20 |

MAC table要按VLAN讀取。同一個MAC地址在VLAN20與VLAN30可以合法出現於不同port；只看全域MAC表可能把兩個廣播域混在一起。ARP也要帶介面與VLAN，192.168.20.1和192.168.30.1是不同L3鄰居，不能用一張ARP表推演全部路徑。

ARP request是廣播，不能跨L3路由器直接傳送；跨VLAN時只會在來源VLAN尋找gateway的MAC，再由路由器在目的VLAN另發ARP。看到PLC-A有192.168.30.50的ARP項目就要警惕，可能是代理ARP或錯誤拓撲，不可直接當成端點二層相鄰。

檢查順序是端點IP與mask、default gateway、兩端VLAN membership、MAC table的VLAN欄、trunk allowed與tag、ARP狀態、L3 route及ACL。不要只看port燈或同一台switch的管理IP能否登入，就宣稱PLC資料路徑正常。

## PVID native與tagged出口

PVID通常描述未標記入口如何歸類；它不等於所有出口都會帶同一個tag。某些設備的native VLAN把指定VLAN在trunk上以untagged送出，對端的PVID或native設定必須一致；若SW1把未標記放VLAN20、SW2把未標記放VLAN30，同一條線上的untagged frame就進入不同廣播域。

第二個獨立故障案例先假設兩端allowed皆包含20、30，但SW1原生VLAN20以untagged送出，SW2把untagged歸到PVID30。封包會被放入錯誤VLAN；是否被阻擋或報不一致另依產品及STP等機制。這是另一組設定，不與前頁allowed漏20同時套用。

access端點通常不應看到802.1Q tag；trunk監看點應確認VLAN20與30的tag是否存在，並注意鏡像工具可能保留或移除tag。抓到無tag封包不能直接說原始trunk沒有tag，因為抓包位置可能在access口或鏡像功能已改寫。

| 故障案例 | SW1假設 | SW2假設 | 預期查點 |
| --- | --- | --- | --- |
| A allowed漏20 | 只30 | 只30 | 查20准入 |
| B native不同 | allowed20,30／native20 | allowed20,30／native30 | 查untagged分類 |
| access PLC | PVID20 | 不適用 | 端點預期untagged |
| access Collector | 不適用 | PVID30 | 端點預期untagged |

跨VLAN ACL應列來源網段、目的網段、協定、port、方向與回程。若ACL允許PLC到Collector但拒絕回程，ARP可能成功而TCP建立或應用回覆失敗；若只測ping，可能忽略控制協定的實際port。這些規則必須依目標L3設備文件查核。

封包鏡像要記錄鏡像來源port、方向、是否保留802.1Q tag與capture drop counter。若監看port過載，抓不到VLAN20不代表trunk未送；應同時看來源port counter、對端MAC table與另一個不丟包的觀測點。

若同一VLAN的ARP成功但應用仍逾時，查端點服務、主機防火牆及適用的ACL；只有路徑需路由時再查L3回程；若ARP本身incomplete，先查VLAN membership、allowed、tag與PVID。這個順序能避免在二層尚未通時反覆改應用程式或控制器設定。

## 變更與驗收

驗收完成後保留變更前後兩份設定與三段證據：同VLAN20的MAC/ARP、trunk上的tagged frame、跨VLAN的gateway/ACL與回程。若只有一段通過，報告應指出確切斷點，不用「網路正常」概括。

變更前匯出SW1與具L3功能的SW2設定，保存MAC、ARP、VLAN membership、trunk狀態及回復檔。一次只改一個原因，例如案例A僅修正兩端allowed加入20，再驗證同VLAN20；不要同時改native、PVID與ACL，否則結果變好也無法知道哪項造成。

加入20後，期待SW1與SW2的trunk都列出20，PLC-A與PLC-B的MAC在各自VLAN表可見，ARP由incomplete變complete，雙向封包帶相同VLAN20 tag穿過trunk。跨VLAN測試則另外確認gateway ARP、route、ACL允許方向與回程，不把同VLAN測試當成跨VLAN證明。

失敗時保存封包五元組、tag、來源/目的MAC、ARP opcode、介面、時間與capture drop；同時保存交換器counter。若同VLAN可通、跨VLAN不通，優先查L3 route/ACL；若SW1同VLAN可通但跨trunk不通，查allowed與native/PVID；若只有未標記流量失敗，查端點access與native策略。

變更回復條件應具體：加入VLAN20後若兩端trunk狀態異常、MAC學習消失或PLC應用回覆下降，立即還原單一變更並保存時間戳。不要在故障中連續改native、PVID、allowed與ACL，否則無法建立因果。

正式報告列出設定快照時間、變更者、單一變更、預期、實際MAC/ARP/封包證據與回復條件。VLAN可達不代表應用服務可用，仍要以PLC協定、port、ACL與端點回覆驗證；不得把ping成功當成控制資料完整。

## FAQ 來源與驗證

FAQ1：trunk設定了VLAN30，VLAN20還能過嗎？不能假定；allowed list漏20時，VLAN20 frame會在trunk被阻擋。

FAQ2：兩個不同VLAN只要trunk就能互通嗎？不能，還需要L3 routing、兩端gateway與允許的ACL。

FAQ3：PVID等於native VLAN嗎？概念常相關但不是所有產品同義；要依廠商對未標記入口與出口的定義核對。

FAQ4：看到交換器管理IP可達就代表PLC網路正常嗎？不代表，管理流量可能在另一個VLAN，需沿PLC實際MAC、ARP與tag路徑查證。

不同廠商可能把access、trunk、hybrid、tagged與untagged稱為不同模式；文章不指定命令。工程師應將實際設定匯出成介面、VLAN、PVID、tagged、untagged、allowed與native欄位，再逐項對照手冊。

VLAN membership和allowed list是不同欄位。port可能已加入VLAN20，但trunk allowed沒有20；也可能allowed含20，卻因PVID/native或tagged出口規則把untagged frame放入30。診斷表要同時保存這兩種設定，不能看到其中一個就結案。

介面設定表要把入口與出口分開：入口寫untagged是否依PVID分類，出口寫VLAN20與30是否加tag、native是否去tag。若廠商用general或hybrid名稱，先從手冊找實際tag行為，再把它翻譯成這兩欄；不要因模式名稱相同就假定兩台設備相容。

本文拓撲、IP、MAC、ARP與封包均為案例資料。

以Cisco Catalyst1200文件作產品範例：trunk native規則定義未標記入口的歸類，general模式另有tagged與untagged成員設定。這只說明為何要查具體介面模式，不代表所有交換器使用同名欄位。正式驗收要加上型號、韌體版本和原始設定截錄，再對應本文入口與出口表。

參考：[Cisco Catalyst1200 CLI Guide：VLAN、trunk native與general tagged/untagged語意，本文不套用其CLI。](https://www.cisco.com/c/en/us/td/docs/switches/campus-lan-switches-access/Catalyst-1200-and-1300-Switches/cli/C1200-cli/vlan-commands.html)

## 延伸閱讀

- [乙太網路錯誤計數器怎麼看](/articles/industrial-ethernet-duplex-speed-error-counters)
- [RSTP 拓撲變更與網路抖動 從 Topology Change Log 找到迴路線索](/articles/rstp-topology-change-network-jitter-diagnosis)
