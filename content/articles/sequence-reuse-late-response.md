---
title: 序號重用遇到舊回覆如何安全丟棄
description: 下載 Modbus TCP FC03 晚到回覆案例，驗證連線世代、期限、序號用盡與回覆欄位，避免舊 callback 完成新請求。
date: 2026-09-21
author: 茂伯
draft: false
category: 工業通訊與網路
---

## 不能在同一個 epoch 猜測 TID 重用

Modbus TCP 的 Transaction Identifier 是 2 bytes。官方 TCP implementation guide 說明它由 client 初始化，server 在回覆複製，且同一 TCP connection 上「當時」必須唯一；它不是跨重連永久唯一的交易號。若在同一個通道世代已完成或逾時的 TID 又被重用，兩個 FC03 回覆可能有相同 TID、Unit ID、功能碼與資料長度。本地程式無法從這些欄位證明哪一筆較舊。

這裡採用較保守、可強制檢查的規則：**一個 epoch 內 TID 絕不回收**。`65535` 用完後，matcher 拒絕下一筆，而不是回到 `0`。只有整合程式已關閉舊通道、在通道外部確認它已關閉，再呼叫 `advanceEpoch({ oldChannelClosed: true })`，新 epoch 才重新從 `0` 配發。

`epoch` 不是 Modbus 或 TCP 欄位，也不是程式能自動從網路得出的事實。它是提交時就捕捉並隨 callback 傳回的本地中繼資料；`oldChannelClosed: true` 同樣是整合程式提供的外部確認。此離線範例不開 socket，不能替任何現場連線宣稱已關閉。

## 用可驗證的 pending 記錄接收 callback

每次送出 FC03 前，先保存 `epoch`、`peer`、TID、Unit ID、請求位址、register 數量、建立時間、deadline 和 `pending` 狀態。callback 入口依下列順序判讀：

| 條件                                                | 結果                              | 是否接受為正常資料 |
| --------------------------------------------------- | --------------------------------- | ------------------ |
| callback 的 epoch 小於目前 epoch                    | `old-epoch`                       | 否                 |
| peer 不同                                           | `wrong-peer`                      | 否                 |
| 同一 TID 已 `completed`                             | `duplicate`                       | 否                 |
| 處理時刻 `>= deadline`                              | `late`，轉 `expired`              | 否                 |
| FC03 的 Unit ID、功能碼、byte count 或 PDU 長度不符 | 拒絕該 callback，仍等待可驗證回覆 | 否                 |
| 檢查全部成功                                        | `pending → completed` 一次        | 是                 |

deadline 使用整合程式提供的單調時間；本例定義剛好在 deadline 的 callback 已經太晚。`nowMs` 與 `receivedAtMs` 都必須是在 matcher 方法執行時，從**同一個單調時鐘**取樣的處理時刻；`receivedAtMs` 不是封包擷取時間，也不是較早保存在 callback 裡的「到達時間」。matcher 拒絕任何比已處理時間更早的值，因此不會接受一個宣稱在請求建立前已處理的 callback。epoch 則相反：它在提交時捕捉，之後隨 callback 原樣傳回。

最重要的案例是：epoch `12` 的 TID `0` 超時，舊通道已由外部確認關閉，然後建立 epoch `13`，新請求再次取得 TID `0`。若延遲排程的舊 callback 保留提交時的 epoch `12`，matcher 會回 `old-epoch`；只有帶 epoch `13` 的 pending 可以完成。這不是宣稱舊 TCP bytes 會穿過新 socket，而是處理應用程式已排程的舊 callback。

## FC03 回覆只能比對實際存在的欄位

官方 Application Protocol §6.3 定義 FC03 request 有起始位址與 register 數量；正常 response 則是功能碼 `03`、byte count 和每個 register 兩 bytes。**正常 FC03 回覆沒有 request 的起始位址或數量 echo。** 因此範例將請求的 `startAddress` 和 `quantity` 留在 pending 作審計，但不把 address 當成回覆驗證條件。

本例採需辨識下游裝置的閘道情境，固定 Unit ID=1 並嚴格比對。直接連線的裝置如何處理 Unit ID 要依目標規格，不能把這項教學條件當成所有 Modbus TCP 裝置的通則。

已組好 MBAP 的 callback 交給範例時，FC03 正常回覆只核對：

1. callback 的 epoch、peer、TID 和 Unit ID 是否對應仍為 `pending` 的項目；
2. PDU function 是否為 `03`；
3. byte count 是否等於請求數量的 `2 × N`；
4. PDU 的實際長度是否正好為 function、byte count 和資料的總長。

`83 xx` 則走例外回覆分支，不能當 register data。本例只接受剛好兩個 bytes、且 exception code 非零的 FC03 exception PDU，並將 pending 終止為 `exception`。MBAP Protocol ID 與 MBAP Length 的組框／驗證屬前一層，可先用[MBAP 離線組框範例](/articles/modbus-tcp-mbap-header-transaction-unit-length)處理。

## 下載後離線重跑

下載同一資料夾的 [matcher](/examples/plc-late-response/fc03-late-response-matcher.mjs)、[固定案例 runner](/examples/plc-late-response/demo.mjs) 與 [README](/examples/plc-late-response/README.md)。它們沒有 npm 套件、socket、網路服務或 PLC 依賴；使用 Node.js 22.13.0 或更新版本，在**下載資料夾**執行：

```powershell
node demo.mjs
```

固定 runner 以 Node 的 `assert` 自行驗證 epoch `12/13`、重複完成、錯 peer／function／PDU 長度、deadline 的前一刻／剛好／之後、`65535` 後拒絕回捲，以及 `83 02` exception，然後才印出各列結果。專案內另有同樣邊界的測試。FC03 的請求位址加數量不得超過 `65536`，因此最後一個位址 `65535` 可以讀一個 register，不能讀兩個。這些是合成 callback 的狀態驗證，不是對任何 PLC 或網路的實測。

## 範圍與現場整合責任

範例只處理已組好的 Modbus TCP FC03 callback，沒有實作一般網路 client、重連器、寫入重送或 PLC API。`peer` 必須由整合程式定義為可穩定識別該邏輯通道的值；不應只用可能回收的物件位址。舊 epoch 仍留在記錄中，方便把舊 callback 分流為 `old-epoch`，而不是偷當成新 transaction。範例是短期教學工作階段，保留的 audit records 會跨 epoch 成長；正式系統的保留期間、容量與封存流程不在此示範範圍。

讀取的逾時表示結果未知或過期，並不證明 server 沒有處理；寫入的未知結果尤其不可藉由換 TID 自動重送。若需要重試或恢復，應依目標設備的結果查詢或冪等語意另行設計。

參考：[Modbus Messaging on TCP/IP Implementation Guide V1.0b §3.1.3、§4.2、§4.4.1.3：MBAP 的 Transaction Identifier、Length，以及同 connection 的 transaction pairing。](https://www.modbus.org/file/secure/messagingimplementationguide.pdf)

參考：[Modbus Application Protocol V1.1b3 §6.3、§7：FC03 正常／例外 PDU 欄位。](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf)

## 延伸閱讀

- [CRC驗證失敗時如何保存原始封包供追查](/articles/crc-failure-raw-frame-evidence)
- [非同步亂序回覆如何用待回覆表配對](/articles/async-out-of-order-pending-map)
