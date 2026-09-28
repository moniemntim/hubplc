---
title: Modbus TCP MBAP Header Transaction ID Unit ID 與 Length 欄位判讀
description: 用可重跑的離線位元組案例驗算 MBAP 的 Length、Transaction ID 與 Unit ID，並處理 TCP 拆包與合包。
date: 2026-09-28
author: 茂伯
draft: false
---

## 先分清楚 MBAP 的 7 bytes 與讀取邊界的 6 bytes

Modbus TCP 的 ADU 是 **MBAP Header（7 bytes）加上 PDU**。MBAP 的前 6 bytes 是 Transaction ID、Protocol ID 與 Length；第 7 byte 才是 Unit Identifier。因此，接收端可以先累積 6 bytes 讀取 Length，再等待完整的 `6 + Length` bytes；完整 ADU 的 MBAP Header 仍是 7 bytes。

| 位移   | 欄位                   | 長度    | 本文的檢查方式                                          |
| ------ | ---------------------- | ------- | ------------------------------------------------------- |
| 0–1    | Transaction Identifier | 2 bytes | 回覆在同一 TCP 連線中應帶回請求值，用來配對。           |
| 2–3    | Protocol Identifier    | 2 bytes | Modbus protocol 為 `0000`。                             |
| 4–5    | Length                 | 2 bytes | 後續 bytes 數，包含 Unit ID 與 PDU，不含前 6 bytes。    |
| 6      | Unit Identifier        | 1 byte  | 依直接 TCP 裝置或 gateway 拓樸判讀。                    |
| 7 之後 | PDU                    | 可變    | Function Code 加資料；FC03 request PDU 固定為 5 bytes。 |

[Modbus Messaging on TCP/IP Implementation Guide V1.0b §3.1.2–§3.1.3](https://www.modbus.org/file/secure/messagingimplementationguide.pdf) 定義上述欄位，並明示 Length 是 Unit Identifier 和 data fields 的後續 byte count。該文件也指出此長度資訊用來辨認被拆到多個 TCP packets 的訊息邊界。

## 一筆 FC03 請求與回覆，逐 byte 驗算 Length

以下都是真正寫入本站離線範例檔的合成 bytes；沒有 PCAP、Wireshark 擷取、PLC 連線或硬體測試。

```text
請求：00 2A 00 00 00 06 01 03 00 10 00 02
回覆：00 2A 00 00 00 07 01 03 04 00 64 00 C8
```

| 欄位           | 請求             | 回覆                | 為何成立                                                            |
| -------------- | ---------------- | ------------------- | ------------------------------------------------------------------- |
| Transaction ID | `002A`           | `002A`              | 同一連線上的此回覆可配對這筆 pending request。                      |
| Protocol ID    | `0000`           | `0000`              | Modbus protocol。                                                   |
| Length         | `0006`           | `0007`              | 請求：Unit 1 + PDU 5；回覆：Unit 1 + FC 1 + byte count 1 + data 4。 |
| Unit ID        | `01`             | `01`                | gateway 場景可作下游路由；本例只驗證回覆與請求相同。                |
| PDU            | `03 00 10 00 02` | `03 04 00 64 00 C8` | 起始偏移 `0010`、讀 2 registers；回覆 data 為 4 bytes。             |

因此請求完整長度是 `6 + 6 = 12` bytes，回覆是 `6 + 7 = 13` bytes。兩個原始 16-bit register 為 `0064` 與 `00C8`。它們的工程意義、正負號、倍率和 word order 必須由目標設備資料表決定，不能從 MBAP 推得。

[Modbus Application Protocol V1.1b3 §6.3](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf) 指定 FC03 的數量為 1–125 registers，回覆資料為每 register 兩 bytes；所以本例 2 registers 的正常資料長度是 4 bytes。

## TCP 拆包：5 bytes 不是一個「短封包」

範例串流把上面第一筆請求刻意分成兩次交給接收端：

```text
chunk 1：00 2A 00 00 00
chunk 2：06 01 03 00 10 00 02
```

第一個 chunk 只有 5 bytes，連 Length 都還少一個 byte，接收端只能保留它，不能解析 Transaction ID 後就猜 PDU。加入第二個 chunk 後共有 12 bytes；讀到 Length=`0006`，再確認剛好有 `6 + 6` bytes，才輸出一筆 ADU。

這不是「TCP 封包長度必須為 12」的規則。TCP 提供有序 byte stream；分段位置由 TCP/IP stack 決定。應用程式要以 MBAP Length 做組框，不能把每一次 `recv()`、每一列日誌或每個 TCP segment 當成一筆 Modbus 交易。

## TCP 合包：一個 chunk 也可以含兩筆 ADU

同一離線 fixture 的第二個 chunk 在第一筆請求結束後，還接著完整放入另一筆 12-byte FC03 request：

```text
00 2B 00 00 00 06 01 03 00 12 00 02
```

正確迴圈的結果是先切出 TID `002A` 的 12 bytes，再繼續從剩餘資料切出 TID `002B` 的 12 bytes。若只在一次讀取後解析一筆並丟掉餘額，第二筆會遺失；若把兩筆連起來當一筆，就會使第一筆 Length 驗算失敗。

可直接下載並在本機執行的離線檔案如下：[`modbus-framing.mjs`](/examples/modbus-framing/modbus-framing.mjs)、[`stream-fixtures.json`](/examples/modbus-framing/stream-fixtures.json) 與 [`stream-demo.mjs`](/examples/modbus-framing/stream-demo.mjs)。demo 只示範「累積、依 `6 + Length` 切出、保留剩餘 bytes」，輸出兩筆 Transaction ID 與 remainder；不開 socket，也不連線設備。

三檔存到同一資料夾，使用 Node.js 22 或以上，在該資料夾執行：

```text
node stream-demo.mjs
```

預期輸出 `TID: 002A, 002B` 及 `remain: 0`。這只驗證組框；前述 pending 交易配對與 PDU 語意檢查並未由此 parser 實作。

## Transaction ID 與 Unit ID 的配對規則

在同一 TCP 連線上，建立 pending 表至少保留 Transaction ID、Unit ID、Function Code、位址、數量與逾時時間。收到回覆後先找同一連線的 Transaction ID，再核對 Unit ID 及正常／例外 Function Code。

| pending                 | 收到回覆              | 判讀                                               |
| ----------------------- | --------------------- | -------------------------------------------------- |
| `002A`／Unit `01`／FC03 | `002A`／`01`／`03`    | 可續查 byte count 與資料長度。                     |
| `002B`／Unit `01`／FC04 | `002A`／`01`／`03`    | 不是 `002B` 的回覆；可檢查 `002A` 是否仍在等待。   |
| `002C`／Unit `05`／FC03 | `002C`／`01`／`03`    | Transaction ID 相同仍不能略過 Unit ID 不符。       |
| `002D`／Unit `01`／FC03 | `002D`／`01`／`83 02` | 是 FC03 exception response，不能當 register data。 |

Transaction ID 的唯一性範圍是連線中尚在等待的交易，不是全系統永久 ID；逾時後遲到的回覆也要明確處理。官方 TCP guide 指定 client 初始化 Transaction ID，server 從請求複製；Unit Identifier 在透過 serial-line 或其他 bus 的 gateway 路由時尤其重要，server 回覆應帶回同一值。

## 先驗 Length，再驗 PDU，不要混入 RTU CRC

以下離線檢查順序可讓錯誤位置明確：

1. 先累積至少 6 bytes，讀 Protocol ID 與 Length；`0000` 以外的 Protocol ID 不按本篇 Modbus TCP 例子繼續解碼。
2. 等到 `6 + Length` bytes 全部到齊，切出一筆 ADU；資料不足時保留 remainder，不能補零或借用下一筆。
3. 以 Transaction ID、同一連線、Unit ID、Function Code 配對 request/response。
4. 正常 FC03/FC04 response 再比對 byte count 是否為請求 register 數量的 `2 × N`；exception response 則只讀 exception code。
5. 最後才套用設備資料表的位址基準、型別與倍率。

Modbus TCP 的 MBAP/PDU 不包含 Modbus RTU 的 CRC。把 RTU CRC 兩 bytes算進 TCP 的 Length，或以 RTU 站號取代 Unit Identifier，都會使上述驗算偏移。

本文沒有驗證真實 PLC、從站、網路、封包擷取工具或設備對併發請求的額外限制。用於現場時，請另保存完整雙向 byte stream、時間、端點及設備資料表版本，並以目標設備文件確認 Unit ID、逾時與併發策略。

## 延伸閱讀

- [Modbus 0x01 0x02 0x03 0x04 怎麼選 從設備表做成可驗收的讀取清單](/articles/modbus-function-code-01-04-read-list)
- [Modbus TCP資料分塊與最大讀取量](/articles/modbus-tcp-register-block-read-limits)
