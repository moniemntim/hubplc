---
title: Modbus TCP 十六進位訊框怎麼手動拆解 MBAP FC03 與例外回覆
description: 不用連線或下載封包檔，從合成十六進位訊框逐欄核對 Modbus TCP 的 MBAP、FC03、資料長度、原始暫存器與例外回覆。
date: 2026-09-28
author: 茂伯
draft: false
category: 工業通訊與網路
tags:
  - Modbus
---

## 這是手動十六進位解析，不是封包擷取或設備驗收

本篇只有可手算的**合成 Modbus TCP 應用資料**；沒有附加 PCAP、沒有連線到 PLC 或從站，也沒有執行封包分析軟體。目標是先看懂一段已保存的十六進位資料是否符合 MBAP 與 Modbus PDU 的結構，再回到設備手冊、原始通訊紀錄與現場程序判讀。

先準備完整的請求與回覆位元組、讀取時間、同一 TCP 連線方向、設備的資料表版本，以及資料型別、word 順序、倍率、單位與無效碼定義。只有 HMI 最後顯示的數字，無法分辨位址、型別、倍率或資料新鮮度出了哪一種問題。

本文不提供 IP、封包時間或 TCP 對話來讓人誤以為它是擷取結果。若你手上有實際資料，先把每個方向的 TCP 位元組流完整保存；同一個 Modbus ADU 可能被 TCP 分段，也可能與後續資料連在同一段中。

## 先看 MBAP：前 7 bytes 說明這一筆是什麼

Modbus TCP ADU 先有 7 bytes 的 MBAP Header，後面才是 Modbus PDU。以下是本篇第一筆**合成請求**：

```text
00 01 00 00 00 06 01 03 00 00 00 02
```

| 位元組位置 | HEX | 欄位 | 本例判讀 |
| --- | --- | --- | --- |
| 0–1 | `00 01` | Transaction Identifier | `1`；用戶端建立，伺服端正常回覆時原樣帶回。 |
| 2–3 | `00 00` | Protocol Identifier | `0`，表示 Modbus protocol。 |
| 4–5 | `00 06` | Length | `6`，代表**後面**有 6 bytes，不是整個 ADU 長度。 |
| 6 | `01` | Unit Identifier | `1`；在直接 TCP 設備與閘道的意義要依設備文件。 |
| 7 之後 | `03 00 00 00 02` | Modbus Request PDU | FC03、起始位址與數量。 |

此請求的 Length 會成立，因為後面確實有 Unit Identifier 1 byte 加 PDU 5 bytes：`01 03 00 00 00 02`。因此總長為 MBAP 前 6 bytes 加 Length 所指定的 6 bytes，也就是 12 bytes。

對 TCP 接收緩衝區，先累積至少 6 bytes 才能讀到 Length；再等到完整的 `6 + Length` bytes 才解析本筆 ADU。Length 不足、資料在中途結束，或下一筆 ADU 被誤拼入本筆，都應標成資料不完整，不能直接把剩下的 bytes 當暫存器。

## 逐欄手算 FC03 讀取兩個 Holding Registers

請求 PDU 是：

```text
03 00 00 00 02
```

| PDU bytes | 意義 | 本例結果 |
| --- | --- | --- |
| `03` | Function Code | Read Holding Registers。 |
| `00 00` | Starting Address | 零起算位址 `0`。它不是文件常見寫法中的 `40001`。 |
| `00 02` | Quantity of Registers | 讀取 `2` 個 16-bit registers。 |

假設伺服端正常回覆下面這段**合成回覆**：

```text
00 01 00 00 00 07 01 03 04 00 FD 00 64
```

先核對 MBAP。Transaction Identifier 仍為 `0001`、Protocol Identifier 仍為 `0000`、Unit Identifier 仍為 `01`。Length 是 `0007`，其後 7 bytes 為 `01 03 04 00 FD 00 64`：Unit 1 byte、Function Code 1 byte、Byte Count 1 byte、資料 4 bytes。回覆總長因而是 `6 + 7 = 13` bytes。

| 回覆 PDU bytes | 意義 | 本例結果 |
| --- | --- | --- |
| `03` | Function Code | 與請求 FC03 相符。 |
| `04` | Byte Count | `4` bytes，剛好是兩個 16-bit register。 |
| `00 FD` | 第 1 個 register | 以 UInt16 解讀為十進位 `253`。 |
| `00 64` | 第 2 個 register | 以 UInt16 解讀為十進位 `100`。 |

完成這組練習時，應可寫出：請求的 PDU 起始位址是 `0`、數量是 `2`；回覆的原始 register 是 `00FD` 與 `0064`；回覆資料長度是 4 bytes。這些都只代表通訊資料的結構與原始數字，**不代表** `253` 一定是 `25.3 °C`、也不代表設備目前值正確。

若設備資料表明定第 1 個 register 是 UInt16、倍率 `0.1 °C/count`，才可在解析後另算 `253 × 0.1 = 25.3 °C`。若資料表寫 Int16、兩個 register 的 Float32、不同 word order 或不同倍率，必須依資料表重新解碼；普通 FC03 回覆不會自帶這些工程語意。

## 例外回覆不是正常資料

以下是一組獨立的合成範例，僅用來練習結構，不宣稱任何設備會對這個位址作出相同回覆。

```text
請求：00 02 00 00 00 06 01 03 00 7D 00 01
回覆：00 02 00 00 00 03 01 83 02
```

回覆的 Transaction Identifier 是 `0002`，可以和這組請求配對。Length `0003` 代表後面只有 `01 83 02` 三個 bytes：Unit Identifier、例外 Function Code、Exception Code。

| 回覆 bytes | 判讀 |
| --- | --- |
| `01` | Unit Identifier；依 Modbus TCP implementation guide，伺服端在回覆時複製請求值。本例因此與請求相同；若實際資料不同，保留原始 bytes 並核對閘道／設備文件。 |
| `83` | `03 + 80h`，表示 FC03 的 exception response，不是正常 FC03 資料。 |
| `02` | Illegal Data Address。它表示此請求的位址不被伺服端接受；仍須配合資料表確認真正原因。 |

看到 `83 02` 時，不能將 `02` 當成「回覆一個值為 2 的 register」，也不能把 Transaction Identifier 正確當成讀值成功。應保存原始請求、原始回覆、資料表位址寫法、Unit Identifier、設備狀態和時間，先核對位址基準、資料區與存取權限。

## 實際資料的核對順序

1. 對同一 TCP 連線與方向保存完整 bytes，從 MBAP 的 Length 切出完整 ADU；不要以一次 `recv()` 或畫面一行就假定是一個完整 Modbus 訊息。
2. 檢查 Protocol Identifier 是否為 `0000`，並確認 Length 與實際後續 byte 數相符。
3. 以 Transaction Identifier、同一連線、方向和請求／回覆 Function Code 配對。Transaction Identifier 之後可能重用，不能跨連線永久當唯一鍵。
4. 正常回覆時，用 Byte Count、請求數量和資料型別核對資料長度。FC03 讀取兩個 16-bit registers 時，正常資料應有 4 bytes。
5. 例外回覆時，先保留 exception function code 和 exception code；不要送入 register 或 Float32 轉換。
6. 最後才以**目標設備手冊**套用位址基準、資料型別、word/byte 順序、倍率、單位與品質規則，再和第二筆不同的已知狀態交叉比對。

沒有回覆時，本篇的十六進位範例不能判定原因。實際排查仍要檢查用戶端逾時、TCP 連線／防火牆、擷取範圍、設備日誌和讀取資料表；不要靠變更倍率或將零值填入來掩蓋通訊問題。

## 完成條件、限制與來源

本篇完成條件是能手動重算兩組合成資料：

1. `00 01 00 00 00 06 01 03 00 00 00 02` 的 Length 為 6，讀取零起算位址 0、數量 2。
2. `00 01 00 00 00 07 01 03 04 00 FD 00 64` 的 Length 為 7，兩個原始 UInt16 值為 253、100。
3. `00 02 00 00 00 03 01 83 02` 是 FC03 的例外回覆，Exception Code 為 02，不是正常資料。

本文沒有驗證 PLC、從站、線路、TCP 效能、封包時間、Wireshark 解碼或任何實體設備。將本篇的合成 bytes 與設備通訊做比較前，須先在不寫入設備的前提下保存原始資料，並依現場程序與設備文件進行確認。

參考：[Modbus Messaging on TCP/IP Implementation Guide V1.0b §3.1.3：MBAP Header 的 Transaction Identifier、Protocol Identifier、Length 與 Unit Identifier。](https://www.modbus.org/file/secure/messagingimplementationguide.pdf)

參考：[Modbus Application Protocol Specification V1.1b3 §4.2、§6.3、§7：多 byte 資料的大端傳送、FC03 與 exception response。](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf)

## 搭配工具與延伸閱讀

- [Modbus 位址換算](/tool/modbus-address/)
- [暫存器與 Float32 轉換](/tool/register-converter/)
- [Modbus 有回應但數值不對的排查方法](/articles/modbus-response-wrong-value/)
- [TCP 連線成功但沒有應用回覆怎麼排查](/articles/tcp-connect-no-application-response/)
