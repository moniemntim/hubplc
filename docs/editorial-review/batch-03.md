# 第三批：事件、數值、封包與政策邊界

上一輪屬於實質進展：14篇審查版本及附件已留在工作區，盤點與整合驗證可核對。本批延續全部449篇發布內容的目標，沒有把範圍縮成少數教材。

## 範圍與接受條件

- PLC rising/falling edge、state entry：分別處理輸入變化及狀態進入，初值、更新順序與逐掃描結果必須一致。
- PLC floating tolerance、negative fixed-point display：分開控制判定與顯示捨入，說明數值型別／量綱，不以JavaScript當作PLC REAL執行證據。
- Modbus MBAP、block read limits：分別處理TCP串流框架與資料範圍分批，所有位元組及讀取範圍需由範例重算。
- Modbus Security：原文重複憑證提醒且標題承諾過大，改為真正可填寫的能力表與分層驗收準備；設備結果保持未測。
- Retention：原文列多種自訂期限而沒有可重跑預覽，改為單一明確的30天演練，提供七筆資料、到期邊界與Hold測試；不執行刪除、不提供法定期限。

## 來源界線

Modbus Security規格核對第5、8.2、8.4節及R-31：502/802、雙向憑證及產品特定角色授權。導入表的操作計畫是本站工作表，不宣稱實機執行或符合性認證。

Microsoft Purview retention官方文件只支持產品有保留／刪除設定優先次序的背景；本站DEMO-T30-v1、30×24小時與七筆資料皆屬自訂離線教材，不能套用成法律或產品預設。

## 主線與獨立複核修正

- 新稿曾把83十進位寫成0x0083，主線更正為0x0053；40word回覆PDU82、Length83、ADU89，追加真實Buffer長度測試。
- 浮點表格未跳脫豎線曾導致欄位錯位，改為ABS記法；增加實際25.05-25反例及可精確表示的等號案例。
- CLI不能用URL pathname比Windows路徑，已改fileURLToPath/resolve並測試實際JSON輸出。
- 手動讀取清單驗算器增加FC03/04硬上限125及位址／大數值防護，避免非法範圍造成無界迴圈；明列它不會自動找齊所有需求位址。
- 獨立review發現角色授權是SHOULD：S05改為能力支援且啟用時適用；unknown不能當N/A，本地架構要求仍需另行滿足。
- 核對scope與示例：PLC皆為離線模型、Modbus為合成bytes、TLS表保持未測、保留期限為自訂示例。沒有新增實機通過聲明。

## 整合驗證

- `node --experimental-strip-types --test tests/*.test.mjs`：154/154通過，log在outputs/editorial-review/unit-tests-batch3.log。
- `node node_modules/typescript/bin/tsc --noEmit`、全專案`oxlint`通過。
- `oxfmt --check`本批19個程式／資料／測試檔通過；`git diff --check`通過。
- `prepare-articles.mjs`、`prepare-site.mjs`及Vinext build成功：449篇發布文章、507個URL。
- `tests/layout-browser.mjs`：列表、8篇文章及404在320/768/1440px共30組通過。
- 42個正文連結附件HTTP200，與public來源逐位元組一致。
- 實跑stream-demo：TID002A、002B，remain0；block-plan-demo：基準及替代清單188word、跨項目/洞位/越界/設備上限反例拒絕。
- 實跑entry-demo：S2先初始化再收12；S6不收99且保存25/3；新批保留前批快照。

全部450個檔案（449篇發布內容、1篇草稿）：22篇reviewed-local，427篇unreviewed。全文目標仍未完成。未提交或發布本轮修改；本機預覽已重建。
