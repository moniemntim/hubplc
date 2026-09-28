---
title: 接收串流：分開 framing buffer 與完整訊框應用佇列
description: 下載 2-byte length-prefix 離線模型，重播拆分、黏包、完整 frame 入列、容量拒絕、EOF 不完整與超長 header 停流。
date: 2026-09-21
author: 茂伯
draft: false
category: 工業通訊與網路
---

## 先分清兩個應用層緩衝

本例的 framing buffer 只保存尚未組成完整訊框的 bytes；應用佇列只保存**已完整**解析的 payload。兩者不能以同一個「buffer 已滿」解釋：framing bytes 還不足以交付，queue bytes 則已是可被 consumer 取走的完整工作。

教材格式是 2-byte big-endian payload length，加上 payload；payload 合法範圍是 1 到 `maxPayload=1000` bytes。每個完整 header 一到就先比較長度；0 標為 `EMPTY_FRAME`，超過上限標為 `FRAME_TOO_LARGE`，兩者都停止此模型，不嘗試從後續 bytes 猜測重新同步位置。這是自訂應用格式，與 Modbus 或其他協定無關。

RFC 9293 說明 TCP 對應用程式提供可靠、有序的 byte stream；它不提供本例的訊框邊界或應用佇列規格。[RFC 9293，第 2.2 節](https://www.rfc-editor.org/rfc/rfc9293#section-2.2) 是這個分層界線的背景資料。本例只對 Node.js `Buffer` 做離線拼接與切割，不開 socket，未驗證 TCP、OS 接收視窗、背壓、CPU 或 P99。

## 下載並重播拆分、黏包與完整入列

下載同一資料夾的 [模型](/examples/receive-buffer/receive-buffer-model.mjs)、[固定輸入](/examples/receive-buffer/fixture.json)、[示範](/examples/receive-buffer/demo.mjs)、[獨立測試](/examples/receive-buffer/self-test.mjs) 和 [說明](/examples/receive-buffer/README.md)。本機以 Node.js 24.19.0 核對；使用此版本或更新版本。

```powershell
node demo.mjs
node --test self-test.mjs
```

固定輸入使用 payload queue 容量 8 bytes：第一個 4-byte frame 的 **header 第一個 byte** 先單獨到達，下一個 chunk 補上 header 的第二個 byte 與 payload，並黏著一個 6-byte 完整 frame。4-byte frame 可入列；6-byte frame 雖然已完整，但 queue 尚有 4 bytes，放入後會超過 8，因此整個 6-byte payload 被拒絕，已在 queue 的第一個 payload 保持不變。consumer 取出 4-byte frame 後，下一個 4-byte frame 才可入列。

固定 stdout 如下，可逐行核對：

```text
dataset=receive-buffer-synthetic-v1 synthetic=true
after_chunk_1 framing_bytes=1 queue_bytes=0 completed=0 accepted=0 rejected_queue=0 stopped=false
after_chunk_2 framing_bytes=0 queue_bytes=4 completed=2 accepted=1 rejected_queue=1 stopped=false
consume payload_bytes=4 queue_bytes=0 consumed_frames=1
after_chunk_3 framing_bytes=0 queue_bytes=4 completed=3 accepted=2 rejected_queue=1 stopped=false
conservation completed_payload=14 accepted_payload=8 rejected_payload=6 consumed_payload=4 queue_bytes=4 completed_matches=true accepted_matches=true
eof=COMPLETE
partial_eof=INCOMPLETE_FRAME_AT_EOF framing_bytes=4 loss_inferred=false
oversize stopped=true reason=FRAME_TOO_LARGE queue_bytes=0
```

兩個守恆檢查分別是 `completed_payload = accepted_payload + rejected_payload`，以及 `accepted_payload = consumed_payload + queue_bytes`。它們只驗證此合成模型是否在「完整、接受、拒絕、消費」之間遺漏或重複 payload bytes，不是外部資料完整性證明。

## EOF 與上限要回報確切狀態

若輸入在 header 與部分 payload 後結束，模型回 `INCOMPLETE_FRAME_AT_EOF` 和目前 framing bytes，`loss_inferred=false`。這只能說「提供的離線輸入到這裡就結束」，不能推論網路封包遺失、對端故障或 TCP 重傳失敗。反過來，`eof=COMPLETE` 只表示 framing buffer 已沒有殘留 bytes；它不表示 application queue 已被 consumer 全部處理。

教材上限為 `maxPayload ≤ 65535`、`queueCapacityBytes ≤ 65536`、`maxInputBytes ≤ 65536`、`maxFramingBytes ≤ 65537`，並要求 framing 可容納 `maxPayload + 2`。大 chunk 會在拼接前先檢查總輸入與暫存 framing 上限；超過便以 `INPUT_LIMIT_EXCEEDED` 或 `FRAMING_LIMIT_EXCEEDED` 停止。這是對單次大 chunk 的保守教材拒絕，不能當成通用 stream parser 或 OS RAM 量測；queue bytes 也不包含物件、索引和配置 overhead。

下表的 queue 結果只針對**目前這一個 frame**。同一 chunk 若先有合法完整 frame 入列，後面才出現空或超長 header，先前已入列的 frame 仍保留。

| 狀態                          | 代表                                   | 目前 frame 對 queue 的結果 |
| ----------------------------- | -------------------------------------- | -------------------------- |
| 尚未收齊 header／payload      | framing buffer 保留 bytes              | 不變                       |
| 完整 frame 且容量足夠         | 整個 payload 入列                      | 增加完整 payload bytes     |
| 完整 frame 但容量不足         | `rejected_queue` 加一                  | 不入列；既有 queue 保留    |
| 0 或超過 maxPayload 的 header | `EMPTY_FRAME`／`FRAME_TOO_LARGE`、停止 | 不入列；既有 queue 保留    |
| EOF 尚有 framing bytes        | `INCOMPLETE_FRAME_AT_EOF`              | 不變                       |

## 容量與延遲另用對應工具驗算

若只做理想算術：十進位 **100 KB/s** 輸入、**80 KB/s** 消費、10 秒、初始 queue 為 0，輸入是 `100 × 10 = 1000 KB`，消費是 `80 × 10 = 800 KB`，差值為 `1000 - 800 = 200 KB`。這是純假設計算，不能改寫成「實際收到 998 KB」或任何真實流量結果。到達率、容量與拒絕行為請看[FIFO 積壓可重現案例](/articles/plc-task-timeout-reentry-backlog)；一筆工作在哪個處理段變慢，請看[七個時間戳的 queue 診斷](/articles/communication-queue-backlog-diagnosis)。

本例沒有 100/80 速率模擬、OS socket 測試、TCP 背壓、率限制或 CPU／P99 量測。實機驗證必須分開保存 socket／平台事件、應用 framing counters、完整 frame queue counters、consumer 完成資料與同一時間軸，不能把這個離線 Node.js `Buffer` 結果當成網路壓測結論。

## 延伸閱讀

- [PLC 任務超時：用工作編號分開輪詢、FIFO 積壓與重入證據](/articles/plc-task-timeout-reentry-backlog)
- [通訊佇列積壓：用七個時間戳分開排隊、接收與解析](/articles/communication-queue-backlog-diagnosis)
