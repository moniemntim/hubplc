---
title: Modbus TCP資料分塊與最大讀取量
description: 以 200 個 Holding Register 的離線地圖切出六區塊，分清標準 125-word 上限、設備限制與雙 word 邊界。
date: 2026-09-28
author: 茂伯
draft: false
---

## 先寫出標準上限與設備上限，不能只寫「最多 50」

本文固定使用 FC03 Read Holding Registers。官方規格對一次 request 的 Quantity of Registers 是 **1–125**（`0001`–`007D`），正常 response 的 Byte Count 是 `2 × N`，因為每個 register 是兩個資料 bytes。FC04 Read Input Registers 也是 1–125；這個數字不適用於 coils、寫入功能或所有廠商的實作限制。

| 限制來源                                | FC03 本文採用值 | 如何處理                                                     |
| --------------------------------------- | --------------: | ------------------------------------------------------------ |
| Modbus Application Protocol V1.1b3 §6.3 |   125 registers | 高於 125 的請求是標準範圍外，主站不要送出。                  |
| 本文假設的設備限制                      |    50 registers | 即使小於 125，也以 50 作每筆上限，並把設備文件版本記進設定。 |
| 本文的禁讀洞位                          |        不可跨越 | 由主站分塊器在送出前拒絕；不臆測設備會回哪個 exception。     |

官方規格也說明 PDU 位址從零開始。設備手冊若顯示 `40001`，它可能是文件慣例中的第一個 Holding Register，而 request PDU 的 starting address 仍可能是 `0000`；要把原始寫法與送出的偏移分欄記錄。

參考：[Modbus Application Protocol Specification V1.1b3 §6.3（FC03）與 §6.4（FC04）](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf)。兩節明列 1–125 registers、兩 bytes/register、0-based PDU address 與正常 response 的 byte count。

## 離線 200-word 地圖：188 個可讀 word，不是 188 個工程點

本例的 Holding Register 偏移為 0–199。`120–129` 共 10 個、`150–151` 共 2 個被列為禁讀，所以可請求的 word 總數是 `200 − 12 = 188`。一個 32-bit 量測值占兩個 word，不能把它當作一個 word，也不能將兩次不同時間回覆的兩個 word 直接拼成可信數值。

| 範圍    | 狀態       | word 數 |
| ------- | ---------- | ------: |
| 0–119   | 可讀       |     120 |
| 120–129 | 禁讀       |      10 |
| 130–149 | 可讀       |      20 |
| 150–151 | 禁讀       |       2 |
| 152–199 | 可讀       |      48 |
| 合計    | 可讀／禁讀 | 188／12 |

以下六筆是此地圖在「設備上限 50」與洞位規則下的具體讀取清單；40 不是標準最大值，只是本例為了輪詢週期和資料群組選的數量。

| 區塊 | FC03 starting address | Quantity | PDU request      | 正常 response data bytes |
| ---- | --------------------: | -------: | ---------------- | -----------------------: |
| A    |                     0 |       40 | `03 00 00 00 28` |                       80 |
| B    |                    40 |       40 | `03 00 28 00 28` |                       80 |
| C    |                    80 |       40 | `03 00 50 00 28` |                       80 |
| D    |                   130 |       20 | `03 00 82 00 14` |                       40 |
| E    |                   152 |       28 | `03 00 98 00 1C` |                       56 |
| F    |                   180 |       20 | `03 00 B4 00 14` |                       40 |

六區相加為 `40 + 40 + 40 + 20 + 28 + 20 = 188`。C 的 `0050` 是十進位起點 80，`0028` 是數量 40；回覆中的 Byte Count 是 `50` hex（80 decimal）。相同的字面數字不表示相同欄位或單位。

## 切分順序：先合法範圍，再設備上限，再資料項邊界

本文附的讀取清單驗算器不會自動拆分或改寫 request；它只驗證手動列出的清單是否符合下列規則：

1. 只接受 0–199 且不穿越禁讀洞位的候選範圍。
2. 每筆不得超過已確認的設備上限 50，也不得超過 FC03 標準上限 125。
3. 若 32-bit 或 64-bit 項目跨區，調整區塊讓完整項目留在同一筆；若它跨到禁讀洞位，標記成不可由此 map 讀取。
4. 最後才按更新週期分組。資料連續不表示一定適合和慢速診斷資料合成一筆。

例如 78–79 的 32-bit 項目完整落在 B。若項目在 79–80，原清單會跨 B/C；可把 B 改為 40–78（39 words）、C 改為 79–119（41 words），兩筆仍小於 50，且這是**取代**原 B/C 的方案。119–120 則包含禁讀的 120，不能用跨區讀取解決。

同一 FC03 response 只能保證傳回那筆 request 的連續 registers；它不保證裝置在讀取瞬間提供跨 register 的一致快照。若設備提供 snapshot、sequence counter 或資料更新旗標，才依其文件驗證；否則將此限制記為資料品質風險。

## 長度驗收：40 words 的 PDU、MBAP 與 TCP ADU 各不同

以 C (`03 00 50 00 28`) 為例，成功回覆包含 Function Code 1 byte、Byte Count 1 byte、資料 80 bytes，所以 **response PDU 是 82 bytes**。若包在 Modbus TCP ADU：Unit ID 1 + PDU 82，MBAP Length=`0053`（83 decimal）；完整 ADU 是 `6 + 83 = 89` bytes。

| 計數名稱                 |   C 的值 | 包含內容                                   |
| ------------------------ | -------: | ------------------------------------------ |
| register quantity        |       40 | FC03 request 的 word 數。                  |
| response data byte count |       80 | `2 × 40`，不含 FC 與 byte count。          |
| response PDU             | 82 bytes | FC + byte count + 80 data bytes。          |
| MBAP Length              | 83 bytes | Unit ID + 82-byte PDU。                    |
| Modbus TCP ADU           | 89 bytes | MBAP 前 6 bytes + Length 指定的 83 bytes。 |

收到的正常 response 若 byte count 不是 80、Function Code 不是 03，或 MBAP Length 與實收 bytes 不合，就先標記為通訊／組框驗收失敗；不能用上一輪 C 的值當作本輪成功資料。若收到 `83 xx`，那是 FC03 exception response，先保存 exception code 並停在資料解碼之前。

## 禁讀、超界與設備例外要分開記錄

`start=80, quantity=50` 會要求 80–129，跨到本例禁讀洞位；`start=180, quantity=22` 會要求 180–201，超出本文地圖。兩者應被**主站設定驗證**拒絕，修正分別是 `80,40` 與 `180,20`。這個離線讀取清單驗算的拒絕不是設備 response，也不能寫成「必定收到 Illegal Data Address」。

目標設備若真的收到某個不支援或不合法 request，FC03 的規格列出 exception function code `83` 及可能的 exception code `01`、`02`、`03`、`04`。實際選哪一個取決於設備與 request，必須保留原始 request/response 及設備文件，不要由本地地圖倒推設備一定回 `02`。

| 測試     | 本地主站預期                | 若真的送往設備時要記錄                 |
| -------- | --------------------------- | -------------------------------------- |
| `80,50`  | 拒絕：範圍含 120–129 洞位   | 原始 ADU、回覆或逾時、設備 map 版本。  |
| `180,22` | 拒絕：結束地址 201 超過 199 | 原始 ADU、回覆或逾時、設備 map 版本。  |
| `79,2`   | 視 32-bit 定義調整 B/C      | 是否有一致快照與資料項規則。           |
| 六區     | 188 word、六筆均在 50 內    | 每區 request、有效接收時間、raw data。 |

## 輪詢頻率是另一個限制

本文假設 A/B/C 每 2 秒、D/E 每 10 秒、F 每 60 秒；它們不是協定預設值。若每筆正常交易連同解析共需 50 ms，快速三筆為 150 ms，但逾時、重試、TCP 重連與設備處理時間都必須另設明確上限。單一 in-flight request 的實作，在距下一個快速區截止 200 ms 而慢區最壞期限為 500 ms 時，應延後慢區，不能假裝兩筆同時完成。

對每區保存預定開始、實際送出、有效接收與最後成功時間。這能分辨「排程晚啟動」和「有送但無有效資料」，也避免舊值被誤標為本輪成功。

本文所有地圖、50-word 上限、洞位、週期與時間均為離線教學假設，沒有對任何 PLC、從站或 gateway 執行讀取。現場採用前，請以目標設備文件確認 FC、PDU 位址基準、最大 quantity、禁讀／保留範圍、資料型別、word order 與讀取副作用。

對應的可下載離線檔案為 [`block-plan.mjs`](/examples/modbus-framing/block-plan.mjs)、[`block-plan-fixture.json`](/examples/modbus-framing/block-plan-fixture.json) 與 [`block-plan-demo.mjs`](/examples/modbus-framing/block-plan-demo.mjs)。fixture 列出六筆共 188 words 的手動清單、79–80 的 32-bit 項目，以及洞位、超界、超過設備 50-word 上限的拒絕案例；demo 會印出每個驗算結果。

三檔存到同一資料夾，使用 Node.js 22 或以上，在該資料夾執行：

```text
node block-plan-demo.mjs
```

基準清單及調整 B/C 邊界後的清單應為 `valid=true; words=188`；原清單搭配79–80雙word項目應回 `item-crosses-block`。其餘三例分別回 forbidden-range、out-of-range、device-cap。`valid` 檢查列出的區塊與指定項目，不代表自動找齊所有需要的位址；本例還須核對188個word與表內六區。驗算器另固定FC03/FC04協定上限125，不能藉由放大設備設定繞過。

## 延伸閱讀

- [Modbus TCP MBAP Header Transaction ID Unit ID 與 Length 欄位判讀](/articles/modbus-tcp-mbap-header-transaction-unit-length)
- [Modbus TCP資料品質 Fresh Stale Bad如何定義與驗收](/articles/modbus-tcp-data-quality-fresh-stale-bad)
