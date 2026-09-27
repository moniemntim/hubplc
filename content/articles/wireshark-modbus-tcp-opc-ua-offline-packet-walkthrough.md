---
title: Wireshark 判讀 Modbus TCP 與 OPC UA 從連線到應用回覆
description: 以隨附十二包離線PCAP逐步判讀TCP、Modbus交易與兩個原始值，以及OPC UA HEL/ACK的適用界線。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先用離線檔練習 不接設備

開啟隨附的「146_離線自造ModbusTCP_UATCP.pcap」。它包含十二個以程式構造的封包、兩條TCP對話，沒有從PLC或網路擷取，也沒有發送測試命令。先清除顯示篩選，再確認封包數為十二，時間顯示選擇相對第一包的秒數；檔案用虛構起點，絕對日期顯示1970年並不表示實際事件年代。

| 對話 | 用戶端 | 伺服端 | 本檔範圍 |
| --- | --- | --- | --- |
| tcp.stream 0 | 192.0.2.10:50000 | 192.0.2.20:502 | 握手、FC03請求與回覆 |
| tcp.stream 1 | 192.0.2.10:50001 | 192.0.2.30:4840 | 握手、UA TCP HEL與ACK |

這些位址是文件用範例。實際分析先記錄兩端IP、TCP埠、擷取位置與時間，不只用「PLC那一包」稱呼。tcp.stream是Wireshark依此檔分配的對話索引，不是封包內的設備站號；另開檔案後索引可能改變。

在顯示篩選列輸入tcp.stream == 0，應留下第1至6包。這只改畫面，不刪原始資料；清除後十二包仍在。若一開始就用capture filter排除封包，事後清除display filter無法找回。練習不用啟動即時擷取，避免把本機其他流量混進來。

本篇可用於理解支援Modbus TCP或OPC UA TCP的系統，不宣稱Q06UDVCPU或QJ71C24N直接提供這兩項服務。QJ71C24N的串列通訊問題要用對應介面與協定證據；本檔不是RS485 RTU擷取，也沒有RTU CRC欄位。

## 先確認TCP 再看Modbus配對

第1包SYN、第2包SYN/ACK、第3包ACK構成TCP三向握手。這表示樣本中的連線建立流程，不等於讀值成功；真正的應用請求在第4包，回覆在第5包。第6包只是TCP確認，沒有第二筆Modbus資料，不能把每個ACK當設備已完成控制動作。

| 包號 | 相對秒數 | 方向 | 要核對的內容 |
| --- | --- | --- | --- |
| 4 | 0.100 | 用戶端→502 | TID=1、Unit=1、FC03、起點0、數量2 |
| 5 | 0.140 | 502→用戶端 | TID=1、Unit=1、FC03、資料4 bytes |
| 6 | 0.141 | 用戶端→502 | TCP ACK，沒有Modbus PDU |

展開Modbus/TCP的MBAP標頭，Transaction Identifier是1，Protocol Identifier是0，Unit Identifier是1。配對時同時限定TCP對話與方向，再查交易ID；交易ID可重用，不是跨所有連線永久唯一。Unit ID在閘道與直接TCP設備的處理可能不同，現場要依設備文件。

請求原始bytes為00 01 00 00 00 06 01 03 00 00 00 02。MBAP長度6計算的是後續Unit ID一byte加PDU五bytes，不是整包長度；整段Modbus TCP應用資料是12 bytes。PDU起點0000是零起算位址，不能把手冊的40001字樣直接當封包中的40001。

顯示篩選tcp.stream == 0 && mbtcp.trans_id == 1應呈現第4與5包。若只看到TCP而沒有Modbus解碼，先核對埠、完整資料與解碼設定；非預設埠可能需Decode As。設定解碼器只是告訴工具如何解析，不能以強制解碼成功反推實際協定一定正確。

## 把回覆數值與時間算出來

回覆bytes為00 01 00 00 00 07 01 03 04 00 FD 00 64。長度7等於Unit一byte、功能碼一byte、byte count一byte和資料四bytes。資料分成00 FD與00 64兩個16-bit暫存器；按本練習的UInt16契約，分別是253和100，並不是一個Float32。

| 欄位或運算 | 本例結果 | 可以下的結論 |
| --- | --- | --- |
| 00FD十六進位 | 253十進位 | 第一個原始暫存器值 |
| 0064十六進位 | 100十進位 | 第二個原始暫存器值 |
| 0.140−0.100 | 0.040秒＝40毫秒 | 同一觀察點請求至回覆間隔 |
| 假設第一值倍率0.1°C | 25.3°C | 僅在設備映射確認後成立 |

工程單位與倍率不會由普通FC03回覆自動告訴你。本文25.3°C只是另加的資料契約示例；若手冊定義有號整數、兩word浮點或其他倍率，解讀就不同。先保存raw值，再套型別、word排列、倍率及單位，才能分清通訊錯誤與資料解碼錯誤。

四十毫秒是此自造樣本的時間差，不是PLC掃描時間或效能量測。實際封包間隔包含網路、設備處理及觀察位置的影響，也可能受鏡像排隊影響。選第5包查看工具建立的request/response關聯，再與第4包時間手算核對，不只憑欄位名稱判斷。

若有正常TCP回覆但Modbus功能碼帶例外，例如FC03對應83，需讀例外碼與設備狀態；不能把它當正常資料四bytes。本練習沒有例外封包。若有請求卻沒回覆，也先查鏡像方向、擷取缺口、逾時與設備日誌，不直接認定設備完全沒送。

再做一次故意選錯的練習：只篩選伺服端埠作為目的埠，畫面只留下請求方向，回覆自然消失。改為同一對話篩選後，回覆重新出現。這能提醒你先檢查觀察條件，再提出設備故障假設；顯示筆數少，不代表原始檔真的少封包。

## OPC UA的HEL與ACK能證明什麼

清除篩選後輸入tcp.stream == 1。第7至9包是另一條TCP握手；第10包是UA Connection Protocol的Hello，第11包是Acknowledge，第12包是TCP ACK。UA訊息名稱ACK與TCP旗標ACK位於不同層，不能混為同一件事。

| 包號 | 應用內容 | 可見欄位 | 未證明的事 |
| --- | --- | --- | --- |
| 10 | HEL，57 bytes | EndpointUrl、buffer大小 | 使用者身分已通過 |
| 11 | ACK，28 bytes | 版本、buffer及message限制 | Session建立或Read成功 |
| 12 | 無應用內容 | TCP確認序號 | 設備工程值正確 |

第10包EndpointUrl為opc.tcp://192.0.2.30:4840，ReceiveBufferSize與SendBufferSize均為65536；第11包也回傳65536。這些是此樣本構造的協商欄位，不是現場產品預設。此檔沒有OpenSecureChannel、CreateSession、ActivateSession或Read，因此不能用它宣稱憑證、登入、NodeId及讀值驗證完成。

實際OPC UA診斷要循序定位TCP、UA傳輸協商、安全通道、Session及服務結果。使用加密SecurityPolicy時，擷取端未必能讀出服務內容；請結合客戶端與伺服端診斷，不以關閉安全設定作為通用解法。沒有看到明文數值也不等於服務沒有送出。

本例HEL至ACK為1.120−1.100=20毫秒，與Modbus的40毫秒屬於不同操作，不能直接比較哪個協定更快。兩條連線均未包含FIN關閉流程，是截取式練習資料；工具指出對話不完整時，先查缺少的是關閉、建立還是應用階段。

若握手正常卻停在協商階段，先保存最後一個完整訊息、方向、錯誤內容及客戶端日誌。端點網址不一致、訊息大小限制及伺服端拒絕可能出現在不同階段，應以實際回覆逐項定位。不要在沒有服務請求的檔案中搜尋工程值，再把搜尋不到寫成資料遺失。

## 練習驗收 排錯與來源

保留原檔及分析副本。每次加註都記錄軟體版本、篩選式、時間顯示模式與包號；若把部分封包另存新檔，包號與對話索引可能重排，要說明對照方式。交接人應能用同一檔案重現你的數值，而不是只看到一張沒有上下文的截圖。

完成後應能留下六個答案：共有十二包、兩條stream；Modbus請求起點0且數量2；回覆raw值253與100；請求回覆40毫秒；UA只有HEL/ACK；不能證明任何設備實測成功。將篩選條件與包號一起寫入記錄，別只保存裁掉欄位名稱的數字。

本機已使用tshark讀取此檔，核對十二包、兩條對話、Modbus解碼、四十毫秒間隔及IP/TCP校驗，並確認UA HEL/ACK欄位可解析。這是離線檔案驗證。檔案沒有實際Ethernet FCS或設備資料，不能把校驗通過延伸成線路品質、硬體通訊或PLC程式驗證。

FAQ1：埠502有流量就一定讀值成功嗎？不是，要配對請求與正常應用回覆，再核對映射。FAQ2：253一定是25.3°C嗎？不是，必須另有倍率與單位契約。

FAQ3：UA ACK表示登入成功嗎？不是，它是傳輸協商回覆，後續安全通道與Session未在本檔出現。FAQ4：看不到回覆先查什麼？先清除顯示篩選、確認stream與方向，再查擷取範圍與設備日誌。

參考：[Wireshark Display Filter Reference：Modbus/TCP交易、長度與Unit ID欄位。](https://www.wireshark.org/docs/dfref/m/mbtcp.html)

參考：[Wireshark Display Filter Reference：Modbus功能碼、暫存器與回覆關聯欄位。](https://www.wireshark.org/docs/dfref/m/modbus.html)

參考：[OPC Foundation OPC 10000-6 §7.1：UA Connection Protocol及Hello/Acknowledge。](https://reference.opcfoundation.org/specs/OPC-10000-6/7.1)

## 延伸閱讀

- [交換器鏡像埠的封包擷取準備](/articles/industrial-switch-port-mirroring-capture-direction-capacity)
- [乙太網路錯誤計數器怎麼看](/articles/industrial-ethernet-duplex-speed-error-counters)
