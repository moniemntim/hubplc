---
title: 防火牆回程被擋如何用兩側證據判斷
description: 以SYN→SYNACK→ACK兩側觀測定位回程缺失，區分stateful與stateless規則、路由、ACL、介面和capture證據，避免盲目關閉防火牆。
date: 2026-09-21
author: 站長
draft: false
category: 工業通訊與網路
---

## 先看完整TCP握手而非單一封包

TCP連線建立的基本順序是client送SYN、server回SYN+ACK、client再送ACK。要判斷回程是否被擋，至少在兩側觀測同一條五元組和時間線。伺服器看到SYN並送出SYN+ACK，但client沒有看到它，只能表示回程封包在client觀測點缺失，不能直接證明某一台防火牆丟棄。

缺失也可能來自路由、非對稱路徑、中間ACL、介面選錯、capture過濾條件、時間不同步或伺服器其實把封包送往另一個出口。先建立證據鏈，再提出防火牆假設。兩端都要記錄來源、目的、介面、封包方向、時間和TCP旗標。

本篇以目標服務port 502示例：client從10.0.0.10:51000送SYN到server 192.0.2.10:502，server回到10.0.0.10:51000的SYN+ACK。51000是client的暫時來源port，不是需要對外提供服務的固定入站port；實際規則仍依環境和政策核定。

伺服器看到SYN+ACK已送出而client沒看到時，先疑路徑或中間ACL，不能把結論寫成「防火牆一定擋回程」。確認伺服器出口路由、client入口介面和中間設備順序後，才把防火牆log與封包時間對齊。

## 區分stateful與stateless回程規則

stateful防火牆會追蹤已建立或相關連線；在政策允許client向server:502建立連線時，合法的SYN+ACK回程通常由連線狀態放行，不必另開一條讓client入站提供服務的規則。但「通常」不等於所有產品和部署都如此，仍需查設備的狀態與規則命中紀錄。

stateless ACL不保存握手狀態，回程可能需依實際來源暫時port、目的port、方向和旗標設定規則。不能把stateful經驗直接套用。若政策只允許到server:502，應確認回程規則允許server:502到client的51000，而不是任意放開整段來源網段。

具體失敗案例：client SYN抵達server，server SYN+ACK在出口capture可見，邊界ACL沒有回程允許或路由把封包送錯介面；client重送SYN後仍收不到。另一案例是stateful規則命中，但client capture使用錯介面，實際SYN+ACK已從另一條路徑返回。兩者處置完全不同。

服務port、client暫時port和方向要分開寫在變更單。不要為了「測試方便」把client入站51000開成長期服務規則，也不要用關閉整台防火牆當第一個測試；那會擴大風險且無法證明正式規則正確。

如果中間有多層防火牆或雲端安全群組，要為每一跳建立責任邊界。第一層看到SYN不代表第二層收到；上一跳看到SYN+ACK離開也不代表下一跳允許。每個觀測點都用同一五元組和時間窗，避免把不同測試混成一條連線。

服務端若同時監聽IPv4與IPv6，還要確認client使用的地址族、DNS解析結果和路由。只在IPv4介面capture不能證明IPv6路徑被允許；規則、介面和log要對應同一地址族。

若看到SYN重送而沒有RST，可能是封包被丟棄或回程不可達；若立即收到RST，則要查服務監聽、主機防火牆或中間設備主動拒絕。這些只是分類線索，最後仍需兩側證據確認。

## 用時間 介面和log交叉定位

先讓兩側時間可比較，記錄時區、時鐘來源和誤差；capture保存原始時間戳，不只保存畫面截圖。以五元組和TCP序號搜尋：client是否送SYN、server是否收到、server是否送SYN+ACK、邊界是否看到、client是否收到，以及是否有RST或ICMP。

再把防火牆log對上同一時間窗和介面。若log顯示deny，仍要確認它是否是同一五元組；若顯示allow，不代表下一跳一定轉送成功。伺服器socket狀態、路由表、ARP或鄰居解析、介面錯誤和中間路由紀錄可作補充證據。

正常案例是三次握手在兩側都出現，client最後ACK到達server，之後才看到應用資料。失敗案例若只到SYN+ACK，伺服器端可能仍在SYN-RECEIVED，應以其實際狀態核對；若client收到後送ACK但server沒看到，反查client出口、回程路徑和capture位置。不要只看單邊「connected」訊息。

授權測試採最小規則：限定來源10.0.0.10、目的192.0.2.10、目的502、必要方向與時間窗，先在測試環境以規則命中和兩側capture驗收，再撤除測試規則。每次變更保存前後規則、命中計數和回復方式。

## 排查結論與限制

離線驗收至少測：stateful允許建立、stateless回程缺規則、路由錯誤、非對稱路徑、錯誤介面capture、RST、SYN重送與規則命中但下一跳失敗。每列記錄兩端看到的握手階段、時間差、介面和最後可證實位置。

若要調整規則，先以證據指出缺哪個方向、哪個port和哪個介面，再做最小範圍授權。禁止盲目關閉防火牆或開放所有來源。通過握手只證明傳輸連線建立，不能證明PLC應用協定、功能碼或製程動作成功。

RFC與作業系統文件能說明TCP和防火牆一般行為，不能替現場設備決定規則語法、NAT、路由或Q系列PLC通訊模組反應。本文案例已核對。

報告最後寫明證據層級，例如「server出口看見SYN+ACK、邊界入口未見、client未見」，結論是路徑或中間設備待定位，而不是直接指定某台防火牆。

若只能取得單側資料，報告應標示觀測盲區和下一個最小授權檢查點，例如請網路管理者提供邊界入口時間窗log，而不是要求全網路放行。

規則驗收要涵蓋允許與拒絕兩面：合法client到server:502能完成握手，未授權來源被拒絕且留下可對齊的log。若只測成功，可能漏掉回程規則過寬；若只測拒絕，也不能證明合法回程正確。

封包擷取點要寫入測試報告，包括介面名稱、過濾器、開始結束時間和是否可能漏包。不同設備的capture時間戳格式不一致時，先用共同事件校準，再比較SYN與SYN+ACK，而不是直接比較檔案行號。

最小規則驗收後要撤銷臨時例外並重新確認合法連線仍可建立；規則命中計數歸零或不再變化，也要在報告中說明觀測期間，避免把未測到誤認為沒有流量。

## 常見問題

問：server送出SYN+ACK但client沒看到，就能證明防火牆擋嗎？答：不能；還要排除路由、非對稱路徑、ACL、介面與capture錯誤。

問：client的51000要開成入站服務port嗎？答：stateful情況下合法回程通常由連線狀態放行；stateless則依實際回程規則核准，不應任意開大範圍。

問：把防火牆關掉測一下最快嗎？答：不應盲測；使用授權的最小規則和兩側封包、log證據，風險與結論都較可控。

問：三次握手成功代表PLC功能完成嗎？答：不代表；握手只證明TCP層建立，應用回覆和製程結果仍需另驗證。

參考：[IETF RFC 9293 TCP規範，作為SYN、SYN+ACK、ACK與TCP狀態的協定參考；本文防火牆判斷仍需兩側實際證據。](https://www.rfc-editor.org/rfc/rfc9293.html)

參考：[Microsoft Windows Defender Firewall官方文件，作為Windows防火牆規則與連線狀態管理的產品參考；不代表其他設備語法。](https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/)

## 延伸閱讀

- [雙NIC路由怎麼判斷 最長前綴 metric與回程證據](/articles/windows-dual-nic-route-prefix-metric)
- [NAT來源port變更如何追蹤交易](/articles/nat-source-port-transaction-tracing)
