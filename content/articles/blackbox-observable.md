---
title: Modbus 讀取驗收表：區分離線解碼與設備實測
description: 用可下載的 FC03 離線案例驗收位址換算、兩個 word 與 Float32 解碼，並清楚分開已知資料與硬體未測。
date: 2026-09-28
author: 茂伯
draft: false
category: 維護與故障排查
---

## 用一筆 FC03 資料做離線驗收

這是一筆可離線核對的已知資料，不是遠端裝置連線紀錄。以本例採用的零起算規則，文件位址 `40010` 對應 PDU offset `9`；FC03 讀取 2 個 holding registers，要求 PDU 為 `03 00 09 00 02`。

已知回覆資料為 `03 04 41 48 00 00`：`04` 表示後面有 4 個資料 bytes，兩個 word 是 `4148`、`0000`。依 **ABCD** 順序合成 `41480000`，用 IEEE 754 Float32 解碼為 `12.5`。可用本站的[暫存器與 Float32 轉換工具](/tool/register-converter/)逐項核對。

| 項目 | 本機離線已知案例 | 硬體未測 |
| --- | --- | --- |
| 文件位址與 PDU offset | `40010 → 9` | 此規則是否符合目標設備手冊 |
| 要求 | FC03，offset 9，讀 2 words | 裝置是否接受要求、Unit ID 與權限 |
| 回覆資料 | `4148 0000`，ABCD → Float32 `12.5` | 線上回覆、品質與更新時間 |
| 結論 | 位址換算與解碼可離線重現 | 未宣稱已成功連線或讀取硬體 |

[下載 FC03 離線驗收表 CSV](/examples/blackbox-modbus-fc03-acceptance.csv)。CSV 的 `offline_known_result` 與 `hardware_tested` 分欄，避免把已驗算的位元樣式誤讀為現場讀值。

## 驗收時填什麼

將 CSV 複製後，只填實際已取得的請求與回覆。至少保留：文件位址、工具實際送出的 offset、功能碼、讀取 word 數、原始兩個 word、word 順序、解碼型別和版本。若手冊沒有指定跨 word 順序，就填 `unknown`，不要試到一個看似合理的數字就判通過。

真正接設備前另確認資料區、站號、連線授權與安全程序。FC03 回覆的結構正確，只能說資料格式可解析；它不證明值的工程意義、設備狀態或實體設備已完成任何動作。

## 延伸閱讀

- [設備倍率與 Float32 判讀](/articles/device-scaling-float32)
- [Modbus TCP 十六進位訊框怎麼手動拆解 MBAP FC03 與例外回覆](/articles/wireshark-modbus-tcp-opc-ua-offline-packet-walkthrough)
