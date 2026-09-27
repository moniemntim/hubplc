---
title: 雙NIC路由怎麼判斷 最長前綴 metric與回程證據
description: 以兩張網卡與多條路由案例，按最長前綴、metric、來源IP和回程路徑建立可重現的Windows排查流程。
date: 2026-09-21
author: 茂伯
draft: false
category: 工業通訊與網路
---

## 一 先畫出兩張網卡與目的網段

雙NIC排查先列出每張介面的IP、前綴、閘道、介面索引與metric，再列出目的位址。不要先刪route或關閉網卡。Windows選路的第一個問題是哪些路由前綴匹配目的地；匹配多個時先選最長前綴，再在相同前綴長度比較路由與介面metric。

案例主機有NIC-A=10.10.1.20/24、閘道10.10.1.1，NIC-B=192.0.2.20/24、閘道192.0.2.1。目的192.0.2.44時，192.0.2.0/24是明確直連路由，優先於0.0.0.0/0；目的198.51.100.44只匹配兩條default時，才需要比較完整metric與政策。

若兩張NIC都放在同一個192.0.2.0/24，會出現同網段歧義：ARP、來源位址選擇、回程路徑與應用綁定可能互相影響。這時「把metric調低」不是完整修復，因為同前綴的鄰居解析與強/弱主機行為仍要核對。優先建立清楚的網段規劃或明確來源綁定。

| 目的 | 匹配前綴 | 候選NIC | 應先問 |
| --- | --- | --- | --- |
| 192.0.2.44 | 192.0.2.0/24與default | B及default | /24較長 |
| 198.51.100.44 | 兩條default | A、B | 比較完整metric |
| 10.10.1.55 | 10.10.1.0/24 | A | 直連路由 |
| 同192.0.2.0/24 | 兩介面同前綴 | A、B | 先處理歧義 |

## 二 只讀命令與路由證據

先用 route print 查看IPv4路由表，用 Get-NetRoute -AddressFamily IPv4 查看DestinationPrefix、NextHop、RouteMetric、InterfaceIndex；用 Get-NetIPInterface 查看InterfaceMetric與介面狀態。這些命令只讀取目前狀態。把輸出保存到變更工單，並記錄查詢時間與目的IP，避免只看一張不含介面索引的截圖。

Get-NetTCPConnection可查看已存在TCP連線使用的LocalAddress、RemoteAddress、State與OwningProcess。它回答現在的連線用了哪個端點，不直接回答下一個新連線一定會走哪條路。一般TCP端口測試可單獨使用：Test-NetConnection -ComputerName 198.51.100.44 -Port 443 -InformationLevel Detailed。路由選擇診斷則是另一個參數集合：Test-NetConnection -ComputerName 198.51.100.44 -DiagnoseRouting -ConstrainSourceAddress 10.10.1.20 -InformationLevel Detailed；它呈現選路結果，不是保證以該來源建立業務TCP probe。

Test-NetConnection的-Port參數可測試指定TCP端口；-DiagnoseRouting搭配-ConstrainSourceAddress或-ConstrainInterface則用於獨立的路由選擇診斷。兩種參數集合不能合併成同一次Port命令，也不能拿路由診斷輸出的TcpTestSucceeded當成A/B來源綁定探測結果。若真要固定來源建立TCP，必須使用目標工具或應用本身明確支援的來源綁定功能，本文不發明API。ping是ICMP測試，也不能替代業務連接埠。

路由表快照要和介面快照同時保存，因為介面metric可能自動計算，網路連線狀態也會使候選路由增減。Get-NetIPInterface可依InterfaceIndex對照Alias、AddressFamily、ConnectionState與InterfaceMetric；Get-NetRoute則以同一索引對照NextHop和RouteMetric。若只保存route print而沒有時間與介面狀態，事後很難解釋為何同一目的地結果不同。

| 命令 | 用途 | 輸出重點 | 限制 |
| --- | --- | --- | --- |
| route print | 看路由表 | 網段、閘道、介面 | 不驗證業務 |
| Get-NetRoute | 結構化路由 | prefix/metric/index | 需指定目的解讀 |
| Get-NetIPInterface | 看介面metric | 狀態/metric | 不等於應用綁定 |
| Test-NetConnection | 測TCP與路由 | 來源/路由/成功 | 不代表服務協定 |

## 三 最長前綴與metric算例

假設目的203.0.113.77，表中有203.0.113.0/24 RouteMetric 50、InterfaceMetric 20，以及0.0.0.0/0 RouteMetric 5、InterfaceMetric 10。兩條都匹配，但/24前綴長度24大於0，先選/24；不能因default完整metric=15小於/24完整metric=70就改選default。這正是先最長前綴、再比較同長度metric的順序。

若兩條都是10.20.0.0/16：NIC-A的路由metric 10、介面metric 20，總和30；NIC-B的路由metric 30、介面metric 5，總和35，案例中A較低。但實際Windows版本、協定提供者、自動metric及來源位址限制要以現場輸出為準，不能只用算式推測。

若兩條同前綴且完整metric相同，不應自行宣稱一定採A或B；要查看實際路由選擇診斷與來源位址。應用需要固定NIC時，先確認程式是否支援綁定來源IP或介面，再用該程式的正式功能建立實際TCP連線；Test-NetConnection的-ConstrainSourceAddress只能作路由選擇診斷。回程路徑也要查對端路由，單向送達不能證明雙向服務正常。

當目的地是名稱而非IP時，先用Resolve-DnsName列出A與AAAA及查詢時間，再對每個實際位址做路由診斷。名稱可能在變更期間回傳新舊集合，或內外DNS回不同地址；此時必須把DNS問題與路由問題分開。若服務端要求固定來源，使用-ConstrainSourceAddress只作診斷，先確認這個來源確實屬於目標介面，不要把測試參數誤當永久設定。

| 候選 | 前綴 | route metric | interface metric | 判定 |
| --- | --- | --- | --- | --- |
| A | 203.0.113.0/24 | 50 | 20 | 先勝過default |
| default-A | 0/0 | 5 | 10 | 較短，淘汰 |
| A2 | 10.20.0.0/16 | 10 | 20 | 總30 |
| B2 | 10.20.0.0/16 | 30 | 5 | 總35，A2較低 |

## 四 從來源IP到回程路徑驗收

先選一個不具破壞性的TCP服務，例如維護窗口中的443或明確測試端口。先執行一般端口測試，保存RemoteAddress、SourceAddress、InterfaceAlias與TcpTestSucceeded；再分別執行-DiagnoseRouting -ConstrainSourceAddress NIC-A來源和NIC-B來源的唯讀路由診斷，保存選定前綴、NextHop與InterfaceIndex。這些診斷可比較候選路徑，但不等同以兩個來源各建立一次業務TCP連線；若須真實來源綁定探測，應使用明確支援該功能的應用或工具。

對服務端或路由器也保存回程證據：服務端看到的來源IP、回應路由、ACL命中與應用日誌。若A方向能建立TCP、B方向不能，先查對端是否允許B來源、回程是否走錯閘道、NAT或防火牆是否不同。不要只把client的成功/失敗歸因於metric。

排查完成的結果應是可重現的路由快照：目的IP、時間、解析後位址、選定前綴、NextHop、InterfaceIndex、SourceAddress、TCP結果與服務身份。若DNS名稱有多個A/AAAA，逐一記錄；名稱解析選到不同位址時，不能拿一次測試推論所有路徑。

同網段雙NIC的危險還包括回覆從另一介面離開，造成對端看到的來源與預期不同。即使client端的TcpTestSucceeded為True，服務端ACL可能只允許其中一個來源。案例驗收要同時要求client的SourceAddress、server的接收來源、server回程介面和應用層回應一致；缺少其中一項，只能標示為部分證據。

若路由看似正確但連線仍失敗，將問題拆成ARP或鄰居解析、NextHop可達、TCP端口、TLS身份和應用協定五層。每層使用對應證據，避免看到route存在就推論封包一定抵達服務。變更前先保留原表與回復窗口，測試結束再由管理者決定是否調整metric。

若兩介面都配置default gateway，先以目的網段和完整metric做唯讀比較，不能用介面排列順序代替路由選擇。遇到VPN或虛擬介面，還要記錄其自動路由與安全政策；測試資料應標明是在VPN連線前或後取得，否則同一命令可能得到不同來源。

也要保留查詢時的主機名稱解析結果，避免日後把不同目的位址誤合併。

| 結果 | 需要保存 | 合理判讀 | 後續 |
| --- | --- | --- | --- |
| A來源成功 | 來源IP/route/服務log | A路徑可用 | 驗證回程與身份 |
| B來源失敗 | 失敗端口/ACL/route | 可能政策或回程 | 查對端證據 |
| ping成功 | ICMP結果 | 只有ICMP可達 | 仍測業務端口 |
| TCP成功 | 端口與服務回應 | 傳輸層可達 | 再驗證協定/TLS |

## 五 FAQ 與來源

FAQ1：metric較低是否一定勝出？答：只有在匹配前綴長度相同時才比較；最長前綴先勝出。完整metric還可能包含route與interface部分，需看實際輸出。

FAQ2：兩張NIC同一網段可否只調metric？答：不宜直接這樣做。先處理網段歧義、來源IP、ARP與回程路徑，再決定是否由管理流程調整設定。

FAQ3：Test-NetConnection成功是否表示PLC或應用正常？答：不表示。它可確認TCP測試及路由資訊，仍須做TLS、協定握手和服務功能驗證。

FAQ4：看到錯路由可否直接刪除或關NIC？答：不要在未評估的情況下操作。先保存唯讀證據，確認業務影響與回復方案，再由變更程序處理。

參考：[Microsoft Learn：路由多前綴匹配時先選最長前綴，同長度再用較低metric。](https://learn.microsoft.com/en-us/windows-hardware/customize/desktop/unattend/microsoft-windows-tcpip-interfaces-interface-routes-route-metric)

參考：[Microsoft Learn：Windows interface metric與route metric共同決定介面偏好。](https://learn.microsoft.com/en-us/windows-server/networking/technologies/network-sub-interface-metric)

參考：[Microsoft Learn：Test-NetConnection支援TCP、路由選擇、來源/介面限制與診斷輸出。](https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection?view=windowsserver2025-ps)

## 延伸閱讀

- [DNS名稱變更後如何驗證設備連線沒有吃舊快取](/articles/dns-change-cache-validation-existing-connections)
- [防火牆回程被擋如何用兩側證據判斷](/articles/firewall-return-path-tcp-handshake)
