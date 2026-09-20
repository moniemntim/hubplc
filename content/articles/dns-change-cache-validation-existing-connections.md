---
title: DNS名稱變更後如何驗證設備連線沒有吃舊快取
description: 以權威、遞迴、Windows用戶端與應用socket四層證據，驗證DNS改名或改址的實際收斂狀態。
date: 2026-09-21
author: 站長
draft: false
category: 工業通訊與網路
---

## 一 先確認權威資料與觀察目標

DNS 改名或改指向時，先把問題拆成四層：權威 DNS 是否已發布、遞迴解析器何時取得、Windows 用戶端是否仍有快取、應用程式是否已建立舊連線。改完紀錄變更時間、名稱、A/AAAA 集合與預期 TTL；不要把「某台電腦查到新位址」當成全球已完成。權威伺服器的回答是來源證據，遞迴伺服器回答則是某個觀察點的快取結果。

在隔離測試區建立私有解析測試域 plc.lab.test，測試權威位址例為192.0.2.53，遞迴伺服器R1=192.0.2.11與R2=192.0.2.12都能存取該權威。事前已把A TTL設為300秒，並在09:00前記錄R1最後取得舊值的時間。09:00將A由192.0.2.10改為192.0.2.20；09:00、09:01、09:02、09:03分別從權威、R1、R2查詢並記錄答案與剩餘TTL。到期後仍可能因遞迴服務的serve-stale或政策延後而保留舊答案，所以收斂必須以實際連續觀察判定，不能預設某個時刻一定完成。

在Windows可用 Resolve-DnsName -Name plc.lab.test -Type A -DnsOnly觀察預設解析路徑，也可用 -Server 192.0.2.11或 -Server 192.0.2.12指定兩個遞迴伺服器；-CacheOnly只回答本機快取。這些命令是唯讀觀察。名稱結尾的根域句點要依測試契約明確記錄，例如 plc.lab.test. 與搜尋後綴補出的短名稱不能混為同一查詢。

| 時間 | 觀察點 | 預期紀錄 | 判讀 |
| --- | --- | --- | --- |
| 09:00 | 權威 | A=.20、TTL=300、serial新 | 發布完成 |
| 09:00 | 遞迴R1 | 仍可能 .10、剩餘TTL | 快取尚未過期 |
| 後續觀察 | 遞迴R1/R2 | A=.20 | 兩觀察點已收斂 |
| 每次 | 用戶端 | 答案、Server、TTL、時間 | 保留證據 |

## 二 多答案 TTL 與 split DNS

A 與 AAAA 是不同類型的記錄，查 A 只回答 IPv4，查 AAAA 只回答 IPv6。若服務有多個 A，例如 .20 與 .21，驗證報告要保存完整集合及回答時間，不能只截圖第一筆。遞迴伺服器可能依輪詢、快取或政策改變順序；順序變動不等於位址已變更。

TTL 是該回答可被快取的剩餘時間，不是服務切換在所有應用完成的保證。權威端降低 TTL 通常要在舊TTL尚未到期前先做，否則既有遞迴快取仍可保留原值。變更後不要立刻把 TTL 改回很長並宣稱所有客戶已刷新，應以實際觀察時間線支持判斷。

split DNS 可能讓內部 DNS 回 10.10.20.5，外部遞迴則回 198.51.100.20。這不是矛盾，而是查詢來源不同。測試時記錄查詢伺服器、網路位置、VPN 狀態與 A/AAAA 類型；同一主機切換 VPN 後答案改變，要先確認政策和遞迴路徑，再判定服務是否錯誤。

驗證時要固定查詢名稱的完整形式與記錄類型，包含結尾根號是否存在；搜尋後綴可能讓短名稱被補成另一個網域。把查詢字串、實際Server、回應時間與TTL一起存檔，才能在不同VPN或不同網段重做同一觀察。若使用代理或服務發現層，也要把代理解析結果與作業系統解析分開，不要混成一個DNS答案。

| 查詢 | DNS伺服器 | 答案示例 | 可得結論 |
| --- | --- | --- | --- |
| A | 內部R1 | 10.10.20.5 | 內部split視圖 |
| A | 外部R2 | 198.51.100.20 | 外部視圖 |
| AAAA | R1 | 無答案 | 不代表A失效 |
| A | R1 | 10.10.20.5、.6 | 完整集合需保存 |

## 三 名稱解析不會搬走既有 socket

另一個獨立情境是：應用程式在09:02從舊的本機快取解析plc.lab.test得到192.0.2.10並建立TCP連線；09:03重新查詢遞迴伺服器取得192.0.2.20。既有socket不會因新答案自動遷移，應用是否重連、何時重查名稱、是否允許連線排空，取決於應用設計。測試要分成解析結果、新建立連線的RemoteAddress，以及既有連線狀態三筆證據。

Windows的Get-NetTCPConnection可查看現有連線的本地與遠端位址、狀態和連接埠；Test-NetConnection -ComputerName plc.lab.test -Port 443可測試一次新的TCP建立。新的連線仍可能受多答案、路由、代理或憑證影響，所以要保存輸出的RemoteAddress、SourceAddress和TcpTestSucceeded，並以實際服務身份驗證確認不是只連到一個開放端口。

若服務使用TLS，位址切換後仍要核對憑證名稱、SNI及應用協定回應。只看到 TCP SYN/ACK 不表示業務服務正確。若程式自己快取名稱，Windows 清除快取也不會強迫它重查；應依程式支援的重連或重啟流程處理，不能以通用命令猜測內部行為。

若A與AAAA同時存在，客戶端可能依Happy Eyeballs或程式策略先嘗試其中一種，不能只看到A已更新就宣稱所有連線會使用A。測試報告應列出每次建立連線的解析位址、位址族別、來源介面、建立結果與服務回應。IPv6失敗時先查AAAA路徑和防火牆，不要把問題簡化成IPv4快取。

| 證據 | 舊連線 | 新連線 | 結論 |
| --- | --- | --- | --- |
| DNS答案 | 可變 | .20 | 只說解析結果 |
| RemoteAddress | .10 | .20 | 新連線採用新位址 |
| TLS身份 | 既有session | 重新核對 | 確認服務 |
| TCP狀態 | Established | SYN/Established | 不能互相替代 |

## 四 失敗排查與安全收尾

看不到新位址時，先分別指定測試權威、R1與R2重查，再比對serial、TTL與完整A/AAAA集合；接著查本機Get-DnsClientCache -Name plc.lab.test，確認是否仍有舊項目。只有在確認本機快取是原因且變更風險可接受時，才由管理流程執行Clear-DnsClientCache；它只會清除本機DNS client cache，不會清理遞迴伺服器、權威資料或應用程式自己的快取。

若權威已新、遞迴仍舊，等待舊TTL或查該遞迴服務的刷新政策，不要反覆清所有電腦。若DNS答案新但應用仍連舊位址，查應用名稱快取、連線池與既有socket；若新連線遠端位址正確但業務失敗，再查TLS身份、服務版本和路由。每一步都保存時間與原始輸出。

變更完成的驗收條件可定義為：權威與指定遞迴在兩個連續觀察週期回相同集合；新TCP連線的RemoteAddress符合預期；TLS或應用健康檢查通過；舊連線按排空政策結束。這是本案例的驗收契約，不是DNS標準保證。

若解析器回覆NXDOMAIN或空集合，先確認查詢類型、權威區域與split DNS政策，不要把空答案當成快取已刷新。記錄否定答案與其TTL，等待後再次查詢；只有在權威資料本身正確且觀察點一致時，才把問題移交給遞迴或用戶端層。

| 症狀 | 先查 | 不要直接推論 | 下一步 |
| --- | --- | --- | --- |
| 權威新、R1舊 | TTL與查詢時間 | 權威沒生效 | 等待或查遞迴政策 |
| 本機舊 | Get-DnsClientCache | 全球都舊 | 評估只清本機 |
| 新位址、TLS失敗 | 憑證/SNI | DNS錯誤 | 查服務身份 |
| TCP成功、業務失敗 | 應用回應 | 服務正常 | 查協定與版本 |

## 五 FAQ 與來源

FAQ1：改完DNS是否要立刻清所有cache？答：不用。先分辨權威、遞迴、本機與應用層；Clear-DnsClientCache只清本機，盲目清理會破壞排查時間線。

FAQ2：DNS回兩個A是否代表兩台都健康？答：不代表。它只表示解析回答包含兩筆資料，仍須對每個候選建立新連線並做服務身份與應用檢查。

FAQ3：既有TCP連線會跟著名稱改變嗎？答：不會自動遷移。連線對端點已固定，必須由應用重連策略決定。

FAQ4：ping通新IP就算切換完成嗎？答：不算。要保存解析答案、新連線RemoteAddress、TLS/服務身份和業務回應。

參考：[Microsoft Learn：Resolve-DnsName 支援指定DNS伺服器、A/AAAA、CacheOnly與DnsOnly查詢。](https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname?view=windowsserver2025-ps)

參考：[Microsoft Learn：Clear-DnsClientCache只清除本機DNS client cache，等同ipconfig /flushdns。](https://learn.microsoft.com/en-us/powershell/module/dnsclient/clear-dnsclientcache?view=windowsserver2025-ps)

參考：[Microsoft Learn：Test-NetConnection可顯示DNS、路由/來源選擇及TCP連線診斷。](https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection?view=windowsserver2025-ps)

## 延伸閱讀

- [MTU與MSS怎麼分 用PMTUD和封包證據查路徑問題](/articles/mtu-mss-pmtud-wire-evidence)
- [雙NIC路由怎麼判斷 最長前綴 metric與回程證據](/articles/windows-dual-nic-route-prefix-metric)
