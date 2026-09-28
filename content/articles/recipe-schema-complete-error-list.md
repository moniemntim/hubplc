---
title: 批次配方欄位缺漏如何產生完整錯誤清單
description: 以可下載的 recipe-v3 Node 驗證案例，固定 required、type、range、cross-field 與未知欄位錯誤順序，保留原始 JSON 並只產生候選資料。
date: 2026-09-21
author: 茂伯
draft: false
category: PLC 程式與控制
---

## 先定義本例的 recipe-v3 邊界

本例驗證的是平面 JSON 資料，不是 PLC 配方下載或設備驗收。唯一接受的 `schema_version` 是 `recipe-v3`；required 欄位為 `schema_version`、`recipe_id`、`temp`、`speed`、`low`、`high`。數字必須是 JSON number 且為有限值，字串數字例如 `"1200"` 不轉成 1200。

教材界限為：`temp` -40 到 180 °C、`speed` 0 到 3000 rpm、`low` 與 `high` 0 到 100%。只有 low 和 high 都通過 number type 與 range 時，才檢查 `low <= high`。這些數值不是任何 PLC 寄存器、機台或現場配方的預設規格。

輸入以 UTF-8 最多 2048 bytes 為界。界限內保留完全相同的 `raw.text`，再用 `JSON.parse`；超過時不解析、不保留不受限原文，回傳 `raw.text=null`、`raw.truncated=true` 與 `incomplete=true`。錯誤最多輸出三筆；若實際錯誤更多，最後一筆是 `error_limit_reached` 並且 `incomplete=true`。這表示清單不完整，不可補零、截斷數值或宣稱只存在列出的錯誤。

## 下載並重跑固定案例

將下列六個檔案下載到同一個新資料夾，在 Node.js 24.19.0 或更新版執行。沒有 npm 安裝、網路呼叫或 PLC 連線。

- [驗證器](/examples/recipe-validation/recipe-validation.mjs)
- [固定 fixture](/examples/recipe-validation/fixtures.mjs)
- [完整 self-test](/examples/recipe-validation/self-test.mjs)
- [簡短 demo](/examples/recipe-validation/demo.mjs)
- [修改輸入與查看完整結果](/examples/recipe-validation/inspect.mjs)
- [README](/examples/recipe-validation/README.md)

```powershell
node self-test.mjs
node demo.mjs
```

`self-test.mjs` 涵蓋正常值、合法零、多缺欄、空字串、`NaN` JSON 解析錯誤、`1e999` 非有限數、未知欄、low/high 相等、上下限、錯誤上限、舊版本與非物件。`demo.mjs` 的 R7 固定輸出如下，順序也是契約：

```text
R7: valid=false incomplete=false errors=/temp:required,/speed:finite_number_required,/low:low_must_not_exceed_high
valid: valid=true candidate=recipe-v3:5756a04ce6dfc55aa2ad34cb203f3b97e5aa05c2cba14beeb7ada008c94233dc
error-limit: valid=false incomplete=true errors=/high:required,/low:required,/:error_limit_reached
demo: PASS
```

## 錯誤順序與 R7 的三個獨立問題

驗證順序固定為 required、type、range、cross-field、unknown，同階段依欄位路徑排序。版本缺漏、版本不支援或頂層不是 object 時，停止欄位驗證，不猜測應採用哪一套欄位規則。未知欄位採嚴格拒絕，置於 unknown 階段，並依顯示路徑排序。

R7 的資料內容如下；此處展開排版，fixture 原文是單行 JSON：

```json
{
  "schema_version": "recipe-v3",
  "recipe_id": "R7",
  "speed": "abc",
  "low": 20,
  "high": 10
}
```

它穩定得到三筆錯誤：`/temp` 是 `required`，`/speed` 是 `finite_number_required`，`/low` 是 `low_must_not_exceed_high`。`/speed` 的錯誤保留 `{ "kind": "string", "value": "abc" }`，而缺失 temp 則是 `{ "kind": "missing" }`；兩者不混淆。因為 low 與 high 都是有效範圍內的數字，20 大於 10 仍可做 cross-field 判斷。

空字串是存在的欄位，因此 recipe ID 空字串或全空白得到 nonempty-string type 錯誤，不會被當成缺鍵。`1e999` 雖可被 JSON 讀成 JavaScript 的非有限 number，仍在 type 階段被拒絕；文字 `NaN` 則不是 JSON，直接得到 `invalid_json`。range 不會對 type 失敗的欄位再產生第二個噪音錯誤。

先執行 `node inspect.mjs`，可以看見完整 raw、errors、candidate。用文字編輯器打開 inspect.mjs，只修改 raw 的 JSON：補上 `"temp":25`、把 speed 改為數字 1200、把 low 改為 10 並保持 high=10，儲存後再跑；應得到 valid=true、errors=[] 和候選 ID。再把 speed 改回字串 `"1200"`，應只得到 /speed 型別錯誤，candidate=null。self-test 與 demo 的固定 fixture 不必修改。

本例也會在欄位檢查前拒絕頂層重複鍵，例如同一份 JSON 出現兩個 temp；Unicode 跳脫寫法若解析成同一鍵也算重複。JSON.parse 本身會留下最後一值，本例另行掃描已通過 JSON 語法檢查的原文，避免把含兩個互相衝突數值的配方當成正常候選。巢狀物件不屬於這份平面契約，未知欄位仍拒絕。

錯誤路徑 /low 表示 low 與 high 的關係檢查；根層或錯誤截斷用 / 作為本教材的顯示標記。未知鍵中的 ~ 和 / 分別寫成 ~0 和 ~1，避免欄名被誤看成另一層路徑。空白 recipe_id 不可形成候選；其他有效字串保留原樣，不會替讀者偷偷修正名稱。

## 有效資料只形成候選

所有錯誤清單為空時，模組按照固定欄位順序建立 canonical JSON，再以 Node 的 `createHash('sha256')` 產生候選 ID。固定序列避免 JavaScript 物件插入順序影響候選資料；SHA-256 僅用來識別這份候選內容，不是簽章、授權或部署動作。[Node.js `crypto.createHash`](https://nodejs.org/download/release/v24.19.0/docs/api/crypto.html) 可建立雜湊並輸出 digest；本例以 UTF-8 輸入和 hex 輸出。

`Buffer.byteLength(text, 'utf8')` 用來計算上面的原文 bytes，而非 JavaScript 字元數。[Node.js Buffer](https://nodejs.org/download/release/v24.19.0/docs/api/buffer.html) 說明它回傳指定編碼後的位元組數。這讓「2048 bytes 上限」有可重現的意義，但不是任何設備的緩衝區容量宣告。

candidate 只包含 canonical JSON、SHA-256 和 candidate ID。它沒有送進 PLC、沒有寫資料庫、沒有套用舊值、更沒有越界自動 clip。若實際流程需要簽章、巢狀結構、版本遷移、權限或設備互鎖，必須另訂契約及驗證。

## 延伸閱讀

- [資料庫交易如何讓一批紀錄一起提交或回滾](/articles/batch-database-transaction)
- [浮點 NaN 與 Inf 在控制前如何攔截](/articles/float-nan-inf-control-gate)
