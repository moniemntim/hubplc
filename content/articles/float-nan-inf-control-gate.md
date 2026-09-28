---
title: binary32 特殊值：先解碼，再用有限性、品質與範圍決定可用性
description: 下載 Node.js binary32 位元閘門，固定重播大端、小端、多種 NaN payload、正負 Inf、品質、範圍與格式拒絕。
date: 2026-09-21
author: 茂伯
draft: false
category: PLC 程式與控制
---

## 這是離線資料閘門，不是設備控制實測

本例把一筆資料契約明定為四個 bytes、`be` 或 `le` 端序、`good` 或 `bad` 品質、以及閉區間工程範圍。它使用 Node.js 的 `Buffer.readFloatBE()`／`readFloatLE()` 解讀 binary32，並自行保存符號、8-bit exponent、23-bit fraction 和原始 32-bit word。因此 `0x7fc00001` 與 `0x7fc0dead` 都會分類為 NaN，但仍能保留不同 payload bits。

IEEE 754 是 binary floating-point 與特殊值的規格背景；Node.js 文件則定義此下載程式所用的 Buffer float read/write API。[IEEE 754-2019 標準頁](https://standards.ieee.org/ieee/754/6210/)與[Node.js 24 Buffer API](https://nodejs.org/docs/latest-v24.x/api/buffer.html#bufreadfloatbeoffset)是此處的原始來源。這不是 PLC、HMI、通訊卡或設備手冊，也沒有量測任何 PLC 的暫存器、例外旗標、掃描週期或控制輸出。

端序是資料契約的一部分。大端的 1.0 是 `3f800000`；小端資料要以 `0000803f` 搭配 `le` 解讀才是 1.0。相同四 bytes 改用錯誤端序不應被猜回正常值；這個模型仍會回傳被宣告端序下的結果，實際整合必須把端序由介面規格固定下來。尤其 `0000803f` **錯誤地宣告為 `be` 仍是合法的四 bytes**，會解成約 `4.600602988224807e-41` 的有限正 subnormal；在本例 0 到 2 的範圍內，所以會 `ACCEPT`。gate 無法從位元自行偵測這種合法但錯誤的端序，不能只說「值不同」就當成已攔截。

## 下載並重播固定位元資料

下載同一資料夾的[模型](/examples/float-gate/float-gate-model.mjs)、[fixture](/examples/float-gate/fixture.json)、[demo](/examples/float-gate/demo.mjs)、[獨立自測](/examples/float-gate/self-test.mjs)和[README](/examples/float-gate/README.md)。本機以 Node.js 24.19.0 核對；使用該版本或更新版本。

```powershell
node demo.mjs
node --test self-test.mjs
```

固定 stdout：

```text
dataset=float-gate-binary32-synthetic-v1 synthetic=true
id=be_one bytes=3f800000 endian=be bits=0x3f800000 class=FINITE finite=true quality=good range=PASS usable=true decision=ACCEPT provenance=SOURCE_BYTES value=1
id=le_one bytes=0000803f endian=le bits=0x3f800000 class=FINITE finite=true quality=good range=PASS usable=true decision=ACCEPT provenance=SOURCE_BYTES value=1
id=nan_payload_a bytes=7fc00001 endian=be bits=0x7fc00001 class=NAN finite=false quality=good range=SKIPPED usable=false decision=NONFINITE_REJECTED provenance=SOURCE_BYTES nan_payload=0x400001
id=nan_payload_b bytes=7fc0dead endian=be bits=0x7fc0dead class=NAN finite=false quality=good range=SKIPPED usable=false decision=NONFINITE_REJECTED provenance=SOURCE_BYTES nan_payload=0x40dead
id=pos_inf bytes=7f800000 endian=be bits=0x7f800000 class=POS_INF finite=false quality=good range=SKIPPED usable=false decision=NONFINITE_REJECTED provenance=SOURCE_BYTES
id=neg_inf bytes=ff800000 endian=be bits=0xff800000 class=NEG_INF finite=false quality=good range=SKIPPED usable=false decision=NONFINITE_REJECTED provenance=SOURCE_BYTES
id=finite_out_of_range bytes=40400000 endian=be bits=0x40400000 class=FINITE finite=true quality=good range=FAIL usable=false decision=RANGE_REJECTED provenance=SOURCE_BYTES value=3
id=finite_bad_quality bytes=3f800000 endian=be bits=0x3f800000 class=FINITE finite=true quality=bad range=SKIPPED usable=false decision=QUALITY_REJECTED provenance=SOURCE_BYTES value=1
id=format_short bytes=000080 endian=le bits=none class=NONE finite=SKIPPED quality=good range=SKIPPED usable=false decision=FORMAT_REJECTED provenance=SOURCE_BYTES detail=bytes_must_contain_exactly_4_bytes
id=finite_operation_overflow bytes=7f800000 endian=be bits=0x7f800000 class=POS_INF finite=false quality=good range=SKIPPED usable=false decision=NONFINITE_REJECTED provenance=FINITE_OPERATION_F32_OVERFLOW
```

輸出中的 `nan_payload` 沿用名稱，但實際上是完整 23-bit fraction 欄位（`fractionHex`），包含 quiet／signaling 相關位元；它不是移除標誌後的「純 payload」整數。這讓 raw word 的診斷資訊不因分類而遺失。

### 直接改 fixture 重跑

先複製 `fixture.json`，每次只修改 `id: "be_one"` 的 `bytes`，並執行 `node demo.mjs`：

1. 設為 `[0, 0, 0, 0]`，輸出 `value=0`、`decision=ACCEPT`。
2. 設為 `[64, 0, 0, 0]`，輸出 `value=2`、`decision=ACCEPT`。
3. 設為 `[64, 64, 0, 0]`，輸出 `value=3`、`decision=RANGE_REJECTED`。

接著將 `be_one` 還原為 `[63, 128, 0, 0]`，把 `quality` 改為 `bad` 後重跑；它會輸出 `decision=QUALITY_REJECTED`，即使數值仍是 1。最後還原 fixture，固定 stdout 才會再次逐行相符。

## 固定順序：格式、有限性、品質、工程範圍

只有四項都成立才有 `usable=true`：

| 順序 | 檢查                                                             | 不通過時的 decision  |
| ---- | ---------------------------------------------------------------- | -------------------- |
| 1    | `Buffer` 恰為 4 bytes、端序、quality、range、provenance 格式有效 | `FORMAT_REJECTED`    |
| 2    | exponent 不是全 1 的 NaN／Inf 編碼                               | `NONFINITE_REJECTED` |
| 3    | `quality === good`                                               | `QUALITY_REJECTED`   |
| 4    | 有限值在 `min ≤ value ≤ max`                                     | `RANGE_REJECTED`     |

range 是閉區間：本 fixture 的 0、2 可通過，3 被拒絕。NaN 或 Inf 在第二步就停止，不會因大小比較的語意而意外落入可用範圍。品質失敗也不以「數字剛好正常」放行；它會保留 raw bytes、bits、品質與拒絕 decision，讓外層記錄系統可關聯來源世代和時間戳。

`FORMAT_REJECTED` 是資料契約不完整，不是數值 0。短於或長於 4 bytes、不是 Node.js `Buffer`、未知端序、未知 quality、無效 range 或空 provenance 都不會產生可用候選值。模型不讀文字 `NaN`／`Inf`，也不試圖從截斷訊息修復 bytes。

## 特殊值不能自己證明根因

`SOURCE_BYTES` 只表示這四 bytes 由外層標為來源資料；它不能根據 NaN、+Inf 或 −Inf 自動斷言感測器、網路、除以零或任何設備故障。demo 中兩個不同 NaN payload 與正負 Inf 都是 `NONFINITE_REJECTED`，但 provenance 仍是 `SOURCE_BYTES`。

另一條 fixture 使用模型明確執行的有限運算：先以 `Math.fround()` 把 `3.4e38` 和 `2` 化為可表示的 binary32 finite operands，再乘法並再化為 binary32。這一個窄範圍模型可觀察到 `7f800000`，所以才標為 `FINITE_OPERATION_F32_OVERFLOW`。ECMAScript 對 [`Math.fround`](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.fround) 的定義是這個離線示例的運算來源。

即使 provenance 是明確的 overflow，gate 仍只產出 `NONFINITE_REJECTED`；provenance 是診斷證據，不會把特殊值轉為範圍上限、零或可控制數字。其他 NaN／Inf 根因必須由外層保留的來源封包、運算前 operands、平台例外或通訊記錄決定；證據不足時應保留未知，而不是由位元模式猜測。

## 整合時仍要補齊的規格

這個模型沒有保存狀態、更新資料世代、控制命令或輸出 fallback。實際系統仍須為每筆資料定義端序、完整封包界線、quality 的協定語意、工程範圍、時間戳和資料世代的原子交換方式；控制端只應消費同一筆已通過閘門的快照。

有限性檢查不修復來源，quality 不是通用標準，range 也不是製程設定。若有飽和、替代值或人工復歸需求，必須在目標平台以獨立狀態、事件與審查規則實作，不能從這個 Node.js 離線範例推論任何 PLC 已編譯、模擬或現場驗證。

## 延伸閱讀

- [HMI 數字範圍與步進：在寫入前驗證輸入](/articles/hmi-numeric-range-step-validation)
- [接收串流：分開 framing buffer 與完整訊框應用佇列](/articles/receive-buffer-throughput-test)
