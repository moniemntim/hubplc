---
title: MTU與MSS怎麼分 用PMTUD和封包證據查路徑問題
description: 分清MTU、advertised MSS、TCP工作量與wire封包，使用IPv4/IPv6 PMTUD回報、capture和重傳證據排查中間路徑。
date: 2026-09-21
author: 站長
draft: false
category: 工業通訊與網路
---

## 一 MTU MSS與實際封包先分層

MTU是某一鏈路可承載的IP封包上限；MSS是TCP SYN選項中可接受的TCP資料上限，兩者不能當成同一個數字。以IPv4、MTU 1500、固定IP header 20與固定TCP header 20為例，基本MSS是1500−20−20=1460；IPv6固定IP header 40，則是1500−40−20=1440。這只是沒有其他路徑限制的算例，不代表每個連線都必定使用這兩值。

RFC 6691的重點是：計算advertised MSS時只扣固定IP與TCP header；IP或TCP options不應先被假設成一定要從advertised MSS再扣一次。實際發送端若在某個segment放入options，必須把該segment的TCP data length再減掉options長度，避免超過有效MTU。options長度可變，因此不能用一個固定MSS反映所有封包。

TCP write(512)、write(1460)或write(1472)只是交給傳輸層的工作量，不保證線上一定出現相同大小的TCP segment，更不能把改變write長度當成精確PMTU probe。TSO/GSO可能先在主機內形成大工作單元，wire上再切成多個IP封包；接收端GRO也可能把多個封包合併給上層。驗證要看實際IP total length、DF、ICMP與重傳。

| 概念 | 算例 | 能說明 | 不能保證 |
| --- | --- | --- | --- |
| IPv4基本MSS | 1500−20−20=1460 | 固定header下的基本推算，wire可更小 | 每個segment都1460 |
| IPv6基本MSS | 1500−40−20=1440 | 固定header下的基本推算，wire可更小 | 所有路徑MTU |
| TCP write | 512/1460/1472 | 應用工作量 | wire segment大小 |
| offload | TSO/GSO 64KB工作單元 | 主機處理 | wire多個IP封包 |

## 二 PMTUD與中間路徑案例

假設兩端介面MTU都是1500，但中間隧道或鏈路的實際path MTU只有1400。IPv4在設定DF的封包若超過中間路徑能力，路由器可能回ICMP Destination Unreachable、Fragmentation Needed並帶出下一跳MTU；IPv6路由器不能替來源分片，會回ICMPv6 Packet Too Big。這些回報是PMTUD可用的訊號，不是看到ICMP就能直接判定PMTUD失敗。

若來源收到ICMP並依其MTU調整後重傳較小資料，且後續TCP segment成功抵達，這反而是正常PMTUD回報。要判斷black hole或PMTUD failure，需看到封包持續超過路徑、ICMP被來源忽略或過濾，並伴隨重傳、長時間無ACK或應用timeout；單一ICMP事件不足以證明故障。

不要把兩端MTU 1500、無options時的IPv4 payload 1460列成必敗案例。此組合本身符合基本算式；真正案例應明確寫出中間path 1400，並以capture標記發送端IP total length、DF、路由器ICMP、ACK與重傳時間。若用ICMP echo做測試，另行計算IP header加ICMP header，不能拿TCP MSS公式直接套用。

若兩端SYN都宣告1460，並不表示中間path一定能承載1460加固定header。SYN只是端點接收能力的協商，路徑MTU可能在隧道、VPN或不同方向改變。雙向流量應分開看，因為A到B能收到ICMP不代表B到A也有相同MTU。

| 條件 | 觀察 | 正確判讀 | 不可直接下結論 |
| --- | --- | --- | --- |
| 端到端1500 | IP total≤1500、ACK | 基本路徑可用 | 所有服務正常 |
| 中間path1400 | 大DF包收到ICMP | PMTUD回報 | PMTUD已失敗 |
| 來源忽略ICMP | 大包重傳/timeout | 疑似black hole | 只因無ICMP |
| IPv6過大 | Packet Too Big | 收集MTU並調整 | IPv4 DF術語 |

## 三 受控觀察與capture讀法

建立受控測試時，先固定目的端點、協定、來源介面與時間窗；以應用工作量產生少量TCP流量，再在來源、可能的中間節點與接收端各取證。每筆至少記錄IP total length、TCP sequence、MSS SYN選項、TCP options、DF或IPv6狀態、ICMP/ICMPv6、ACK與重傳。這比只改write長度更能定位問題。

wire上的IP total length 1500不是「Ethernet frame一定1500」；L2標頭、VLAN tag及實體媒體另有配置。VLAN tag不必然扣掉IP MTU，必須查交換器、NIC與上游鏈路的L2 capacity。不要把所有VLAN都固定減24後宣稱IP MTU改變。

若capture顯示64KB TCP資料，先確認是在送端TSO/GSO前的主機觀測，或接收端GRO後的合併觀測。真正線上封包應在適當位置看到多個IP total length約1500的封包。關閉offload可作診斷對照，但是否能關閉、在哪個方向關閉，要依作業系統和NIC手冊；不能把capture工具畫面直接當實體線上的證據。

capture的時間戳要和TCP sequence、ACK以及重傳關聯；同一資料若在TSO前後各出現一次，不能計為兩次wire傳送。把封包介面、方向、snaplen、offload狀態寫入報告，並保留原始pcap或等價摘要，才能讓另一位工程師重算IP total length與segment payload。

若只在主機本身抓包，無法看見中間路由器是否丟包；必要時要在兩端或管理的中間設備取證。

| 觀察欄位 | 送端可見 | wire應看 | 解讀 |
| --- | --- | --- | --- |
| write長度 | 應用呼叫512/1460 | 不固定 | 工作量非封包大小 |
| TSO/GSO | 可能64KB | 多個IP封包 | offload差異 |
| GRO | 上層大資料 | 原始多包 | 接收合併 |
| VLAN | L2標籤 | 依鏈路capacity | 不必然扣IP MTU |

## 四 驗收 排錯與適用限制

驗收一個中間path 1400案例，可先取得SYN雙方MSS，再送受控TCP工作量並觀察實際IP total length。若大於路徑能力的DF封包收到ICMP Fragmentation Needed，記錄來源、下一跳MTU與後續縮小重傳；只有在來源忽略、封包持續重傳且應用timeout時，才把它列為疑似PMTUD black hole。若需要ICMP echo，另列IP+ICMP8的算式與結果。

排錯順序是先確認capture位置與offload，再確認端點MTU、SYN MSS與TCP options，接著找ICMP/ICMPv6和重傳，最後才調整介面或隧道設定。不要把MTU1500與MSS1460當作故障證據，也不要只用ping通或ping不通代表TCP業務。服務端仍需做TLS、應用協定與實際回應驗證。

本篇算例是通用IP/TCP教學，不聲稱任何PLC、Q系列模組或抓包工具已編譯、模擬或硬體驗證。RFC 6691本身已被RFC 9293取代，這裡引用其釐清MSS options的內容；實際作業應同時核對現代TCP實作、作業系統offload、VPN與L2設備限制。

若防火牆過濾ICMP，不能用「沒看到ICMP」證明路由器沒有回報；應查路由器或防火牆事件、來源TCP重傳與實際路徑。調整MSS或隧道MTU前先建立回復方案，因為過度降低MSS可能增加封包數和處理負擔，也不代表所有非TCP流量會一起修復。

測試結果應標明已驗證的層級：只有IP層回報時標PathMTUObserved；看到TCP ACK才標TransportProgress；TLS或應用回應通過才標ServiceVerified。這樣不會把底層可達誤寫成PLC或設備功能正常。

驗收結果要按方向與協定分開保存：來源與目的、IPv4或IPv6、端點MTU、SYN雙方MSS、實際IP total length、DF或Packet Too Big、ICMP來源、TCP ACK、重傳與服務回應。若只在IP層看到MTU回報，標PathMTUObserved；看到TCP ACK才標TransportProgress；TLS或應用回應通過才標ServiceVerified。每個方向都要各自觀察，因為同一路徑的去程和回程可能有不同PMTU。這些欄位要放在案例表，不能用一句「大包失敗」代替。

| 問題 | 先查 | 可接受證據 | 不要宣稱 |
| --- | --- | --- | --- |
| MSS疑問 | SYN、固定header、options | 雙向MSS與封包 | options必改advertised MSS |
| 大包失敗 | path MTU、DF、ICMP | ICMP後縮小重傳 | write長度就是probe |
| 64KB capture | TSO/GSO/GRO位置 | wire多個IP封包 | 線上64KB IP |
| VLAN後MTU | L2 capacity配置 | 設備文件與capture | 必扣固定數字 |

## 五 FAQ與官方來源

實際報告還應把IP版本、方向、來源與目的、是否含隧道、介面MTU和SYN雙方MSS分欄保存。不要用單一「封包太大」欄位代替這些證據，因為IPv4分片、TCP segmentation、隧道封裝和網卡offload的故障表現不同。

FAQ1：IPv4 MTU1500是否一定MSS1460？答：在固定IPv4/TCP header且沒有更小有效path MTU的基本算例是1460；實際連線仍受對端advertised MSS、路徑與封包options影響。

FAQ2：write(1472)失敗是否證明PMTU是1472？答：不是。write只描述應用工作量，需觀察實際IP total length、DF、ICMP、ACK與重傳；若測ICMP echo要另計IP與ICMP header。

FAQ3：收到ICMP Fragmentation Needed是否就是PMTUD failure？答：不是。若來源採用回報MTU並重傳小包，這是正常PMTUD流程；需證明來源忽略回報且大包持續重傳才可判疑似black hole。

FAQ4：capture看到64KB是否代表MTU失效？答：先分辨TSO/GSO送端工作單元或GRO接收合併；wire上的IP封包可能仍是1500左右。

參考：[RFC 6691 §2、§4、§5：advertised MSS只扣固定IP/TCP header，實際segment資料長度另須扣options；RFC 6691目前標示由RFC 9293取代。](https://www.rfc-editor.org/rfc/rfc6691)

參考：[RFC 1191：IPv4 Path MTU Discovery與Fragmentation Needed回報，獨立來源。](https://www.rfc-editor.org/rfc/rfc1191)

參考：[RFC 8201：IPv6 Path MTU Discovery與Packet Too Big，獨立來源。](https://www.rfc-editor.org/rfc/rfc8201)

## 延伸閱讀

- [接收buffer不足如何做流量測試](/articles/receive-buffer-throughput-test)
- [DNS名稱變更後如何驗證設備連線沒有吃舊快取](/articles/dns-change-cache-validation-existing-connections)
