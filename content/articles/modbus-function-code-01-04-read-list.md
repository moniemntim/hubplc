---
title: Modbus 0x01 0x02 0x03 0x04 怎麼選 從設備表做成可驗收的讀取清單
description: 依資料模型而不是 0xxxx／4xxxx 顯示編號選功能碼；用完整假設案例核對位址、bit 打包、register 長度與例外回覆。
date: 2026-09-28
author: 茂伯
draft: false
---

設備表能不能直接變成輪詢清單，關鍵不在於欄位寫了「40001」，而在於它明確說出資料模型、位址基準、型別與讀取規則。先把這四項補齊，才選 0x01、0x02、0x03 或 0x04；再用回覆的功能碼與長度驗收。本文的封包都是 **PDU**，沒有 RTU 的站號與 CRC，也沒有 TCP 的 MBAP。

## 先用資料模型選功能碼

| 功能碼 | 標準資料模型 | 一個資料單位 | PDU 數量範圍 | 正常回覆資料 |
| --- | --- | --- | --- | --- |
| 0x01 | Coils | 1 bit | 1–2000 coils | `ceil(N/8)` bytes，第一點在第一個 byte 的 bit 0 |
| 0x02 | Discrete Inputs | 1 bit | 1–2000 inputs | `ceil(N/8)` bytes，排列同 0x01 |
| 0x03 | Holding Registers | 16-bit register | 1–125 registers | `2 × N` bytes，每個 register 高 byte 在前 |
| 0x04 | Input Registers | 16-bit register | 1–125 registers | `2 × N` bytes，每個 register 高 byte 在前 |

這是 Modbus 應用層的四個不同資料模型。標準把 Coils 和 Holding Registers 列在「internal」資料，Discrete Inputs 與 Input Registers 列在「physical discrete／input」資料；它沒有規定某廠商一定把「警報」放在哪一區，也沒有把 0x03 的可讀性變成每個 register 都可寫。功能碼與權限應由該設備的 map 決定。

官方依據：Modbus Application Protocol V1.1b3 §4.3 的資料模型表，以及 §6.1–§6.4 的功能碼、數量與回覆格式。[官方 PDF](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf)

## 顯示編號不等於送出的位址

協定 PDU 的 starting address 是 16-bit、從零起算的偏移量。很多設備表另以 `00001`、`10001`、`30001`、`40001` 作人類可讀的區域編號；那是文件慣例，不能原封不動塞進 PDU。官方介紹也以 40001 對應第一個 holding register、其相對位址為 0 為例。

採用下列欄位記錄，每一列才可重現：

| 設備表原文 | 資料模型／FC | 文件的位址表示法 | 送出的 PDU 位址 | 尚待確認 |
| --- | --- | --- | --- | --- |
| `40001 Speed` | Holding Register／0x03 | 顯示編號，第一點為 40001 | `0x0000` | 型別、倍率、可否寫入 |
| `IR 9 Temperature` | Input Register／0x04 | 1-based 區內編號 | `0x0008` | 是否真的以 IR 表示 |
| `Alarm bit 1` | 不足以判定 | 未列區域與 FC | 不填 | 要求原廠提供 map 或實際讀取範例 |

若手冊已直接給 `offset 0` 或 `PDU address 0000h`，照該欄送出，不要再減一。若只給「40001」卻沒交代基準或功能碼，先標成待確認；以猜到的一次成功回覆去改寫工程文件，日後最容易造成偏一格的故障。

## 一張假設設備表，拆成四筆請求

以下是離線練習，假設設備手冊**明訂**使用 0-based PDU 位址、32-bit 值為高 word 在前，且允許同一資料模型的連續範圍合併。這不是任何真實設備的 map。

| 資料點 | PDU 位址 | 模型／讀取 FC | 型別與本例解碼 |
| --- | ---: | --- | --- |
| 運轉、警報 | 0、1 | Discrete Inputs／0x02 | bit；1 表示該狀態成立 |
| 輸出許可 | 0 | Coil／0x01 | bit；只在本例可讀 |
| 溫度 | 0 | Input Register／0x04 | INT16，值 × 0.1 °C |
| 壓力 | 1–2 | Input Registers／0x04 | UINT32，高 word 在前，值 × 0.01 kPa |
| 目標速度、累計量、模式 | 0、1–2、3 | Holding Registers／0x03 | UINT16、UINT32、UINT16 |

從這張表建立的清單如下。不同模型即使都從位址 0 開始，也不能合成一筆；同一模型中若手冊說有保留洞、區段限制或較小的最大數量，也要拆開。

| PDU 請求 | 本例讀取 | 預期回覆 byte count | 驗收重點 |
| --- | --- | ---: | --- |
| `01 00 00 00 01` | 1 coil | 1 | 只讀第一個資料 byte 的 bit 0 |
| `02 00 00 00 02` | 運轉與警報 | 1 | bit 0＝運轉，bit 1＝警報 |
| `04 00 00 00 03` | 溫度 1 word＋壓力 2 words | 6 | 三個 register 共六 bytes |
| `03 00 00 00 04` | 速度、累計量 2 words、模式 | 8 | 四個 register 共八 bytes |

PDU 中 `00 00 00 03` 的前兩 bytes 是起始位址，後兩 bytes 是數量；不是「讀三個資料點」。壓力雖然是單一工程值，佔兩個 register，因此溫度加壓力要讀三個 register。

## 逐 byte 驗收兩種回覆

### Bit：0x02 讀取兩個離散輸入

對請求 `02 00 00 00 02`，假設運轉與警報都為 1，正常回覆 PDU 是：

```text
02 01 03
│  │  └─ 0000 0011b：bit 0＝位址 0，bit 1＝位址 1
│  └──── byte count＝1
└─────── 功能碼＝0x02
```

第一個請求點放在資料第一個 byte 的最低有效位，未使用的高位以零補齊，這是 §6.1／§6.2 的規則。`03` 不表示「值 3」；本例解作兩個 bit 都成立。若資料是 `02`，則位址 0 為 0、位址 1 為 1。

### Register：0x04 讀取溫度與壓力

對請求 `04 00 00 00 03`，假設原始溫度為 `00 FD`、壓力為 `00 00 04 D2`，正常回覆 PDU 是：

```text
04 06 00 FD 00 00 04 D2
│  │  └───────────── 三個 register，共 6 bytes
│  └──────────────── byte count＝6
└─────────────────── 功能碼＝0x04
```

依本例**假設**的資料定義：`0x00FD` 是 253，溫度為 25.3 °C；`0x000004D2` 是 1234，壓力為 12.34 kPa。Modbus 只規定每個 16-bit register 的高 byte 先傳；32-bit word order、正負號、浮點格式、倍率和工程單位都必須由設備文件確認。byte count 正確也只證明訊框長度相符，不能證明解碼規則正確。

## 例外回覆要停止解碼

若請求 0x04 得到 `84 02`，`84` 是功能碼加上 `0x80`，`02` 是 exception code，不是第一個量測值。先把本筆交易記為「從站有回覆、要求被拒絕」，再查位址基準與整段範圍；不要把它歸類為 RS-485 沒回應，也不要用延長逾時掩蓋錯誤。

Application Protocol V1.1b3 §7 說明 exception response 的功能碼形式與 exception code；§6.1–§6.4 的 state diagram 對讀取請求列出不支援功能、非法數量、非法位址與裝置失敗等分支。[官方 PDF](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf)

## 上線前的讀取清單檢查

1. 每列都記下原始 map 名稱、資料模型、功能碼、PDU 起始位址、數量、型別、word order、倍率與文件版本。
2. 每筆請求先算出預期長度：bit 是 `ceil(N/8)`，register 是 `2×N`；收到後比對站號／外層交易身分、功能碼、byte count 與實際資料長度。
3. 只用原廠標為可讀的測試點建立第一筆請求；有正常或例外回覆後，才分別處理通訊、位址與數值解碼問題。
4. 對未明示的功能碼、位址基準或 32-bit 排列保留「待確認」，附上要問原廠的問題；不要把暫定值當成已驗證設定。

本篇適用於 Modbus PDU 的資料模型與回覆判讀。RTU 的站號、CRC、字元間隔，以及 Modbus TCP 的 MBAP 與 Unit Identifier，須另依傳輸方式核對。

## 延伸閱讀

- [Modbus 寫入功能 05、06、0F、10 的選用與回讀](/articles/modbus-write-05-06-0f-10-readback)
- [Modbus 有回應但數值不對的排查方法](/articles/modbus-response-wrong-value)
- [RS485 A/B 標示不一致 用差動極性建立端子對照](/articles/rs485-ab-dplus-polarity-verification)
