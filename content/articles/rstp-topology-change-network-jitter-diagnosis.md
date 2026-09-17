---
title: RSTP 拓撲變更與網路抖動 從 Topology Change Log 找到迴路線索
description: 以三台交換器自訂priority與cost推導RSTP角色，再用TC、link flap、MAC flapping與應用timeout交叉判斷迴路線索，並說明edge限制。
date: 2026-09-17
author: 站長
draft: false
---

## 先看角色與證據

RSTP診斷先建立橋接拓撲，再看root bridge、port role與port state。root port是非root交換器通往root的最佳路徑；designated port代表某段網路的轉送責任；alternate port可作備援阻塞。這些名稱、成本與事件欄位要以目標交換器模式和手冊為準，不能只看到Forwarding就推導整個網路無迴路。

自訂三台交換器S1、S2、S3形成三角形。令S1 bridge priority=4096、S2=8192、S3=12288；priority較小的S1成為root只是本案例設定，不是所有設備預設。鏈路成本自訂為S1-S2=4、S1-S3=19、S2-S3=4。S2經S1成本4，S3經S2成本8，比直接S1成本19低。 三台屬於同一生成樹實例，沒有其他橋接路徑，鏈路兩端均採這組教學成本。

Topology Change log、link flap、MAC flapping與上層timeout是不同證據。TC事件表示生成樹處理拓撲變化，不直接證明物理迴路；要與port role/state、BPDU、MAC移動與時間戳對照。

比較root時要讀完整Bridge ID，不能只抄priority。使用extended system ID的實作會把優先權、實例相關識別值與MAC位址納入Bridge ID；在相同實例、優先權相同時，較小的MAC可打破平手。本文三台優先權不同，沒有成本或Bridge ID平手，因此可直接手算。

| 證據 | 能回答 | 不能直接回答 |
| --- | --- | --- |
| Root/role/state | 目前樹角色與轉送狀態 | 實體線材是否正常 |
| TC log | 何時有拓撲事件 | 一定存在迴路 |
| MAC flapping | 同MAC在多埠出現 | 哪個埠先故障 |
| 應用timeout | 上層何時失敗 | RSTP就是唯一原因 |

## 三交換器成本推導

S1是root；S2直達S1成本4。S3直達S1成本19，經S2成本4+4=8，因此S3連S2的埠是root port並轉送。S2連S3的一端為designated並轉送。真正備援阻塞的是S3連S1的埠：它是alternate，狀態為Discarding。請沿著轉送中的S1—S2—S3走一次，確認沒有把選中的root port又標為alternate。

| 鏈路 | A的選定root成本 | B的選定root成本 | 兩端角色 |
| --- | --- | --- | --- |
| S1—S2 | S1：0 | S2：4 | S1 designated；S2 root |
| S1—S3 | S1：0 | S3：8 | S1 designated；S3 alternate |
| S2—S3 | S2：4 | S3：8 | S2 designated；S3 root |

表中S3的8是它目前選中的總成本；19是經S1—S3直達的候選成本，兩者不能混用。若S1—S2斷線且其他鏈路正常，S3改以直達S1的埠作root port，成本19；S2改經S3通往S1，成本4+19=23。此時S3連S2為designated，S2連S3為root。記錄收斂後角色與應用恢復時間，不以瞬間狀態宣稱穩定。

port cost比較要使用同一模式與同一單位。若設備依速率自動給cost，不能把本案例4、19直接套到現場；若手動cost，仍要確認兩端角色與path cost顯示是否一致。三角形拓撲的手算目的是找候選路徑，不是替交換器下設定。

在隔離測試環境安排三種驗收情境：正常端點重新連線、單條上行斷線、疑似環路隔離。每次記root、role、state、TC、MAC table、link flap、廣播與應用回覆。沒有證據的「收斂正常」只能寫待驗證。

## TC link flap與MAC移動

RSTP與傳統STP的TC觸發不能混在一起。RSTP中，非edge埠進入Forwarding會引發拓撲變更；單純失去連線本身不是同一觸發條件，edge埠的轉送變化也不應當作一般TC來源。產品畫面的TC計數可能計入本機產生或接收到的通知，必須先查欄位定義。

離線假設紀錄：14:00:00 S3—S2 down，14:00:02 S3原alternate埠改經S1轉送，某台交換器的TC欄位增加1；14:00:05 PLC記錄TCP timeout，MAC沒有反覆移動。這支持單鏈路中斷後重新收斂的調查方向，仍不足以證明逾時原因。兩秒與加一都是自訂紀錄，不是RSTP保證時間或全網一致計數。另一時間窗若出現未知橋接、MAC-P在兩埠交替及廣播暴增，才優先追查誤接迴路。

TC counter與link flap分開統計。正常非edge鏈路切換可能產生TC；正確設定的edge終端重新上線不應照搬這個判斷。MAC flapping也可能來自移動端點、重複MAC或錯誤橋接，不是TC的同義詞。先確認事件欄位、來源埠與端點身分。

合法維護也會造成TC。例如拔除S2-S3後S3改走S1，TC增加但沒有MAC反覆移動或廣播暴增。若TC與link flap在同一埠週期性出現，才優先查接頭、光模組、電源與端點重啟；若MAC在兩埠來回，查未受控橋接與錯接線。

實體三角形與轉送迴路是兩回事。本例RSTP讓一端Discarding，實體備援線仍在，正常轉送路徑已無環。root ID保持不變也不足以證明全網正常；若某段未參與生成樹、BPDU被過濾或edge錯設，仍需從BPDU、MAC移動及廣播量查其他轉送迴路。

| 時間 | TC | link flap | MAC移動 | 解讀 |
| --- | --- | --- | --- | --- |
| 14:00:02 | +1 | S3-S2一次 | 無 | 收斂線索，非迴路證明 |
| 14:10:00 | 每秒增加 | 兩條上行 | P在兩埠交替 | 誤接環路優先查 |
| 14:20:00 | 無 | 無 | 無 | timeout要查上層 |

## Edge限制與變更程序

edge port只適用連接終端設備、預期不會收到BPDU的埠。Cisco官方手冊警告，PortFast edge配置在交換器或可能形成橋接的埠會造成資料迴圈；收到BPDU時，該埠也可能失去edge操作狀態。uplink、交換器間trunk與未確認的工業設備不要直接標edge。

BPDU Guard是產品功能，不是RSTP標準替代品；在Cisco特定平台上，edge收到BPDU可進入err-disabled，其他廠商的動作需查手冊。不要為了消除TC而對所有埠開edge或guard，先確認端點拓撲、是否有小交換器、冗餘環與維護需求。

變更流程是先匯出設定與show/log快照，再只改一個成本、priority或edge設定，觀察root/role/state、TC、MAC與應用事件，最後驗證回復。未指定產品不寫CLI；以欄位與預期結果取代猜測命令。

應用timeout與交換器log要使用可比較的時間。角色在14:00:02改變、TCP重傳到14:00:20才出現，僅憑先後不足以歸因收斂；還要比對請求發送、路徑實際恢復、重傳計時與擷取缺口。若timeout先於TC，也不能倒推後發事件造成先發失敗。保留時鐘偏差與解析度。

所有案例中的priority與cost是自訂教學數值。部署時以設備模式、速率、管理政策與現場冗餘要求重新計算，並先做變更審核。

若TC增加但root/role穩定，先查端點link flap與維護；若root改變、MAC flapping與廣播暴增同時發生，優先隔離疑似環路並依現場安全程序處置。控制網不應靠文章中的自訂priority直接套用。

若三台的priority、MAC或成本改變，root與角色可能不同。成本的單位和計算方式依模式/廠商而異；本文只用自訂數字展示比較方法。變更前保存bridge ID、priority、root ID、每埠cost、role/state與時間。

驗收表最後列出仍待現場確認的線材、埠標籤、設備版本與時鐘差異，避免把離線推導當成現場結果。

TC log若只有計數沒有來源埠，仍可依時間窗交叉link flap和角色變更，但不可把它歸因到某port。若產品能提供TC origin或last change欄位，保存原文與版本；未提供時清楚標示定位限制。

## FAQ 來源與驗證

FAQ1：有Topology Change就代表迴路嗎？不代表。正常非edge路徑切換也可能觸發；先查角色變化與其他證據。

FAQ2：成本越小就代表鏈路品質越好嗎？不代表。它是選路參數，不是錯誤率或延遲實測；本例只演示路徑成本比較。

FAQ3：所有交換器埠都能設edge嗎？不能，edge只適合確定不會送BPDU的終端埠。

FAQ4：RSTP穩定就代表PLC應用不會timeout嗎？不代表，還要查IP、TCP、服務與應用層證據。

變更edge前先列出端點是否含小交換器、無線橋、冗餘網卡或管理bridge。PortFast edge只適合確定的終端；若收到BPDU，Cisco平台可取消edge操作狀態或由BPDU Guard停用埠，實際動作依版本指南。

三台設備的拓撲圖要標示每個實體埠與對端，不只畫交換器名稱。疑似迴路時先確認線材實際接到哪兩個port，再對照MAC table與BPDU來源；邏輯圖和現場標籤不一致時，任何cost推導都只是紙上假設。

若觀察窗內只出現一次TC且應用未中斷，應保留為正常變更候選；若TC、MAC flapping與timeout同時重複，才提高迴路假設優先級。診斷是累積證據，不是單一告警自動定案。

本文三交換器、priority、cost、TC與MAC時間線為離線假設，未連接交換器或改動運轉網路。

參考：[IEEE 802.1w與現行802.1Q橋接標準入口，RSTP概念與標準沿革。](https://www.ieee802.org/1/pages/802.1w.html)

參考：[Cisco Understanding Rapid Spanning Tree Protocol，edge、point-to-point與快速轉送限制。](https://www.cisco.com/c/en/us/support/docs/lan-switching/spanning-tree-protocol/24062-146.html)

參考：[Cisco Catalyst 2960-X/IOS 15.2(3)E官方指南，PortFast edge與BPDU Guard限制；產品版本範圍為該指南對應平台/版本。](https://spg.xgslb-v3.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960x/software/15-2_3_e/consolidated_guide/b_1523e_consolidated_2960x_cg/m_lay2_stpopt_cg_old.html)

## 延伸閱讀

- [VLAN與Trunk不通的排查順序](/articles/vlan-trunk-native-vlan-diagnosis)
- [Multicast IGMP Snooping 與工業 UDP 流量 為何非訂閱端也會被塞滿](/articles/ipv4-igmp-snooping-industrial-udp-diagnosis)
