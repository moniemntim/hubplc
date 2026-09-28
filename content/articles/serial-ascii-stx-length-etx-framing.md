---
title: 自訂 STX＋ASCII 長度＋ETX：逐 byte 重組與故障停流
description: 下載 Node.js parser，重播 STX 02、3-digit ASCII 長度、可列印 payload、ETX 03、500ms 總期限與完整 frame 才發布。
date: 2026-09-21
author: 茂伯
draft: false
category: 工業通訊與網路
---

## 這是自訂 frame，不是 Modbus

本例的 frame 依序是：`STX=02`、三個 ASCII 十進位 length bytes、長度指定的 payload、`ETX=03`。length 只算 payload，欄位固定三 byte，允許 `001` 到 `128`；`005` 表示五 bytes，不是二進位 5。payload 的每個 byte 必須在 `20..7e`，因此本例不允許 control byte、UTF-8 multibyte payload、escape 或 checksum。最大合法 frame 是 `1 + 3 + 128 + 1 = 133` bytes。

這是教材協定，不是 Modbus ASCII、任何 PLC 專用通訊、serial port 或真實通道隔離測試。parser 直接以整數 byte 比較 `0x30..0x39`、`0x20..0x7e` 和 control bytes；它不呼叫 Node 的 ASCII decoder，所以不會把 high-bit byte 默默轉成可見文字。

## 逐 byte 狀態與 500ms deadline

`WAIT_STX` 以前的 byte 只計入輸入上限並忽略；收到 STX 才建立候選 frame 與 `deadline = stx_now + 500ms`。接著依序進入 `LENGTH`、`PAYLOAD`、`ETX`。只有 ETX 正確且 payload 完整時才發布 frame；分段、一次傳來多筆、或每 byte 都分開送，得到的已發布 frame 序列相同。

時間戳是非遞減 safe integer 毫秒。期限採總期限，不會因每個新 byte 延長。`now >= deadline` 就逾時，且 `feedByte()` 一律先呼叫 `advanceParser()`：同在 500ms 抵達的 byte 先得到 `TIMEOUT_REJECTED`，該 byte 不會進 parser。沒有新 byte 時也能呼叫 `advanceParser(state, now)` 觀察逾時。

任何 length syntax、length range、payload、ETX、deadline、input 或 output limit 失敗都進 `STOPPED`。它停止處理後續 bytes，**不自動 resync**；新建 parser 只能重建此離線 state，不能證明實體 serial 通道、晚到資料或對端交易已隔離。

## 下載並重播固定資料

下載同一資料夾的[模型](/examples/serial-ascii/serial-ascii-model.mjs)、[固定 fixture](/examples/serial-ascii/fixture.json)、[demo](/examples/serial-ascii/demo.mjs)、[獨立自測](/examples/serial-ascii/self-test.mjs)和[README](/examples/serial-ascii/README.md)。fixture 是唯讀的固定 JSON；demo 與 self-test 不改寫它。本機以 Node.js 24.19.0 核對；使用該版本或更新版本。

```powershell
node demo.mjs
node --test self-test.mjs
```

```text
dataset=serial-ascii-stx-length-etx-synthetic-v1 synthetic=true
chunk_now=0 published=0 stage=LENGTH stopped=false
chunk_now=1 published=0 stage=PAYLOAD stopped=false
chunk_now=2 published=2 stage=WAIT_STX stopped=false
published_index=0 length=5 payload_hex=48454c4c4f frame_hex=0230303548454c4c4f03
published_index=1 length=1 payload_hex=5a frame_hex=023030315a03
fault=lengthSyntax stopped=true reason=LENGTH_SYNTAX_REJECTED expected=ASCII_DECIMAL_0x30_TO_0x39 received=023041
fault=lengthRange stopped=true reason=LENGTH_RANGE_REJECTED expected=LENGTH_1_TO_128 received=02313239
fault=payload stopped=true reason=PAYLOAD_REJECTED expected=PRINTABLE_ASCII_0x20_TO_0x7e received=0230303180
fault=etx stopped=true reason=ETX_REJECTED expected=ETX_0x03 received=023030314104
fault=timeout stopped=true reason=TIMEOUT_REJECTED expected=NEXT_BYTE_BEFORE_DEADLINE received=02
```

第一個 frame 是 `02 30 30 35 HELLO 03`，被拆成三個 chunks；第三個 chunk 接著黏上一個 `02 30 30 31 Z 03`。前兩個 chunks 都發布零筆，第三個才發布兩筆。輸出保留 `payload_hex`、完整 `frame_hex`，以及 fault 的 `expected` 和 `received`，不以顯示文字取代診斷 bytes。

## 拒絕順序與容量邊界

| 條件                        | decision                 | 診斷 preserved                          |
| --------------------------- | ------------------------ | --------------------------------------- |
| length byte 不是 `30..39`   | `LENGTH_SYNTAX_REJECTED` | 已收 frame hex、期望 ASCII digit        |
| 三 digits 是 000 或超過 128 | `LENGTH_RANGE_REJECTED`  | 已收 frame hex、宣告長度                |
| payload byte 不在 `20..7e`  | `PAYLOAD_REJECTED`       | 已收 frame hex、已收 payload 數         |
| payload 收齊後不是 `03`     | `ETX_REJECTED`           | 已收 frame hex、期望 ETX                |
| deadline 到或超過 500ms     | `TIMEOUT_REJECTED`       | STX 起的已收 hex、deadline 前 byte 要求 |

候選 frame storage 固定上限 133 bytes，lifetime input 預設上限 4096 bytes，published output 預設最多四個 frame；三者都有明確拒絕而非截斷。output frame 滿時，先前完整已發布 frame 保留，新完整 frame 不會部分發布。這些是此模型的記憶體界線，不是 OS serial buffer、硬體 FIFO 或吞吐量量測。

## 改 fixture 重跑

先複製 `fixture.json`。將 `validChunks[2].bytes` 的第一個 ETX `3` 改成 `4`，重跑後會得到 `ETX_REJECTED` 且 `received` 保留實際 hex。將 `faults.payload` 的 `128` 改成 `65`，它會變成 payload byte `A`；此時 demo 會顯示 `stopped=false stage=ETX published=0`，因為 frame 仍缺 ETX。再補上 ETX `3` 後才會顯示 `stage=WAIT_STX published=1`。不能只靠 payload 合法就發布。將 STX 後不送新 byte 並呼叫 `advanceParser(state, 500)`，可重現 timeout 的等號邊界。

Node.js 的 [`node:test`](https://nodejs.org/docs/latest-v24.x/api/test.html) 文件是本下載案例測試 API 的官方來源。frame byte 定義、期限與故障政策都是本文刻意固定的自訂規格；實際 serial API、baud、parity、OS buffer、timeout clock 和 PLC 模組行為必須查目標平台的官方手冊與測試結果。

## 延伸閱讀

- [接收串流：分開 framing buffer 與完整訊框應用佇列](/articles/receive-buffer-throughput-test)
- [binary32 特殊值：先解碼，再用有限性、品質與範圍決定可用性](/articles/float-nan-inf-control-gate)
