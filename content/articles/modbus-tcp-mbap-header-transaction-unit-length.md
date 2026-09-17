---
title: Modbus TCP MBAP Header Transaction ID Unit ID 與 Length 欄位判讀
description: 拆解 Modbus TCP MBAP Header 的 Transaction ID、Protocol ID、Length、Unit ID 與 PDU，並用離線十六進位封包手算 Length 和配對回覆。
date: 2026-09-17
author: 站長
draft: false
---

## 先看 Modbus TCP 的封包分層

Modbus TCP 的應用資料放在 TCP 連線中，外層 ADU 由 MBAP Header 加上 Modbus PDU 組成。MBAP Header 有四個欄位：Transaction Identifier 2 bytes、Protocol Identifier 2 bytes、Length 2 bytes、Unit Identifier 1 byte；接著才是 PDU 的 Function Code 和資料。它沒有 Modbus RTU 的 CRC 欄位，不能把 MBAP 當成 RTU 封包直接解析。

| 欄位 | 長度 | 用途 | 判讀重點 |
| --- | --- | --- | --- |
| Transaction ID | 2 bytes | 把請求和回覆配對 | 通常由 Client 管理，回覆應帶回相同值 |
| Protocol ID | 2 bytes | 協定識別 | Modbus TCP 規定為 0x0000 |
| Length | 2 bytes | 後續 Unit ID 加 PDU 的 byte 數 | 不包含前面 6 bytes MBAP |
| Unit ID | 1 byte | 伺服器或下游單元識別 | 閘道場景尤其重要 |
| PDU | 變動 | 功能碼與資料 | 從功能碼開始解析 |

參考：[Modbus Organization《MODBUS Messaging on TCP/IP Implementation Guide》V1.0b，3.1.2 MODBUS On TCP/IP Application Data Unit 與 3.1.3 MBAP Header description 章節；查閱日期 2026-09-17。](https://www.modbus.org/file/secure/messagingimplementationguide.pdf)

## Length 怎麼算 先數後續 bytes

Length 欄位的計算範圍是 Unit ID 加上 PDU，不包含前面的 Transaction ID、Protocol ID、Length 本身。以讀取 Holding Registers 的請求為例，Unit ID 1 byte，加上 PDU 的 Function Code 1、Starting Address 2、Quantity 2，共 6 bytes，所以 Length=0x0006。回覆若有 Function Code 1、Byte Count 1、資料 N bytes，Length=1+1+1+N。

| 封包 | Unit ID | PDU 長度 | Length | 原因 |
| --- | --- | --- | --- | --- |
| 讀取請求 FC03 | 1 | 5 | 0x0006 | 1+1+2+2 |
| FC03 回覆2 registers | 1 | 6 | 0x0007 | 1+1+1+4 |
| FC03 回覆3 registers | 1 | 8 | 0x0009 | 1+1+1+6 |
| 例外回覆 | 1 | 2 | 0x0003 | 1+1+1 |

Length 是網路位元組數，不是 register 數量，也不是包含整個 TCP ADU 的總長度。若接收緩衝依 Length 組包，應先收到 6 bytes MBAP，再讀取 Length 指定的後續 bytes。實作還要處理 Length 不合理、半包、合包和連線關閉。

## 離線十六進位封包配對

以下是離線虛構封包，不連線設備。請求：00 2A 00 00 00 06 01 03 00 10 00 02。回覆：00 2A 00 00 00 07 01 03 04 00 64 00 C8。請按位元組拆解，不要把空格或換行當成封包內容。

| 位移 | 請求欄位 | 值 | 回覆欄位 | 值 |
| --- | --- | --- | --- | --- |
| 0-1 | Transaction ID | 0x002A | Transaction ID | 0x002A |
| 2-3 | Protocol ID | 0x0000 | Protocol ID | 0x0000 |
| 4-5 | Length | 0x0006 | Length | 0x0007 |
| 6 | Unit ID | 0x01 | Unit ID | 0x01 |
| 7 | Function | 0x03 | Function | 0x03 |
| 8之後 | Address/Qty | 位移8～11<br>00 10 00 02 | ByteCount/Data | 位移8～12<br>04 00 64 00 C8 |

回覆的 Length=7，因為 Unit ID 1 + Function 1 + Byte Count 1 + Data 4。Transaction ID 相同，所以可配對到這一筆請求；回覆資料是兩個 16-bit register：0x0064 和 0x00C8。這只證明封包欄位可依規格解析，不代表地址 0x0010 對應的工程意義已正確。

參考：[Modbus Application Protocol Specification V1.1b3，PDU、功能碼 03 與例外回覆章節；TCP Implementation Guide V1.0b，3.1.3 MBAP Header description。兩份文件共同支持本文的 PDU／MBAP 分界與功能碼解讀。](https://www.modbus.org/file/secure/messagingimplementationguide.pdf)

## Transaction ID Unit ID 與多筆請求

同一 TCP 連線上可能出現多筆請求。Transaction ID 的工作是讓 Client 把回覆對回原請求；不要只用『先送先收』的假設。離線檢查時，建立 pending 表，保存 Transaction ID、Unit ID、功能碼、位址、送出時間和預期長度。回覆若 Transaction ID 不在 pending 表、Unit ID 不符或 PDU 功能碼與請求不符，就先標成配對失敗。

| 待回覆ID／Unit／FC | 收到ID／Unit／FC | 判定 |
| --- | --- | --- |
| 002A／01／03 | 002A／01／03 | 相符，續查長度與資料 |
| 002B／01／04 | 002A／01／03 | 不能配對002B；另查是否有002A等待中 |
| 002C／05／03 | 002C／01／03 | ID相同但Unit不符 |
| 002D／01／03 | 002D／01／83 | 例外回覆，另讀exception code |

Unit ID 在直接 TCP 伺服器可能被固定或依設備規格使用，在 TCP-to-Serial gateway 場景則常用來識別下游單元。不要看到 Unit ID=1 就推論所有設備都必須使用 1；先查拓樸、閘道和目標資料表。Protocol ID 若不是規格預期值，也應先拒絕或標記異常。

Transaction ID 的配對範圍是同一 TCP 連線；不同連線可以出現相同 ID。同一連線尚未完成的請求不要重用同一 ID，並要處理逾時後遲到的回覆。TCP 保證位元組流順序，卻不保證一次接收剛好是一個完整 ADU；一個 ADU 可能分成多次收到，也可能一次收到多個。

## Wireshark 截圖 完成判定與限制

1. 截圖保留封包方向、TCP stream、完整 MBAP 7 bytes（含 Unit ID）、PDU 與時間戳。

2. 在文件中標出 Transaction ID、Protocol ID、Length、Unit ID、Function Code 五個重點。

3. 遮蔽 IP、帳號、設備名稱等不必要的敏感資訊，但不能遮住用來驗算的十六進位欄位。

4. 用 Length 重新計算後續位元組數，再用 Transaction ID 和 Unit ID 配對。

5. 將截圖來源、擷取時間、過濾條件和是否為虛構案例寫清楚。

完成後應看到：MBAP 的 7 bytes 和 PDU 分界正確；Length 等於 Unit ID 加 PDU 長度；Protocol ID 符合所用規格；回覆 Transaction ID 能找到對應請求；Unit ID 和功能碼符合拓樸與請求。失敗時先查：是否把 Length 算成整個封包、是否漏掉 Unit ID、是否誤把 RTU CRC 放進 TCP、是否將十六進位位元組順序讀反。 MBAP 是 7 bytes，但接收端可以先讀前6 bytes取得 Length，再收指定的後續 bytes；這兩個數字用途不同。

適用型號與限制：本文適用 Modbus TCP 封包離線判讀，不是 RS-485 RTU 封包教學。案例中的 IP、Unit ID、Transaction ID 和 register 資料皆為虛構。不同設備可能對 Unit ID、併發請求、連線逾時和例外處理有額外限制，需查目標設備文件。若要交給維護人員使用，還應附上 TCP stream、封包時間、連線端點和設備資料表版本，否則單看一段十六進位無法判定整個交易是否成功。

封包判讀的順序建議固定：先找 TCP stream，再確認 MBAP 是否完整，接著驗證 Length，最後才解析 PDU。若 Length 指向的 bytes 尚未收齊，等待下一個 TCP segment；若超出緩衝，標記封包格式或組包錯誤。TCP 是串流，不保證一次 recv 就得到一個完整 Modbus ADU，這也是不能只依讀取呼叫次數切封包的原因。

| 問題 | 回答 |
| --- | --- |
| Length 包不包含哪裡？ | 不包含前 6 bytes MBAP，計算 Unit ID 加 PDU。 |
| TCP 也要 CRC 嗎？ | Modbus TCP 的 MBAP/PDU 封裝不使用 RTU CRC；不要混用兩種 ADU。 |
| Transaction ID 可以都用 0 嗎？ | 要依 Client 實作與併發策略；若需要配對多筆請求，必須能區分交易。 |
| Unit ID 一律是 1 嗎？ | 不是。直接伺服器或 gateway 的使用方式要看拓樸與設備規格。 |

## 延伸閱讀

- [Modbus例外碼05 06 0A 0B 忙碌與閘道路徑怎麼分開查](/articles/modbus-exception-05-06-0a-0b-troubleshooting)
- [Modbus TCP連線重用與併發請求 TID 逾時與MBAP封包邊界](/articles/modbus-tcp-connection-reuse-concurrency)
