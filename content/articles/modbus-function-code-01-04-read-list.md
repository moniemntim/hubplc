---
title: Modbus 0x01 0x02 0x03 0x04 怎麼選 從資料表建立讀取清單
description: 把 Coils、Discrete Inputs、Holding Registers、Input Registers 分開，將設備資料表的權限與位址轉成讀取清單，並用 byte count 驗收回覆。
date: 2026-09-17
author: 站長
draft: false
---

## 四種讀取功能碼先分清楚

Modbus 的功能碼不是單純看資料表前綴。0x01 讀取 Coils，0x02 讀取 Discrete Inputs，0x03 讀取 Holding Registers，0x04 讀取 Input Registers。前兩者以 bit 為單位，後兩者以 16 位元 register 為單位。Holding Registers 在協定資料模型中可讀寫，Input Registers 通常是輸入或量測資料；實際設備仍要以它自己的資料表說明為準。

| 功能碼 | 資料模型 | 單位 | 典型語意 | 讀回 byte count |
| --- | --- | --- | --- | --- |
| 0x01 (1) | Coils | bit | 可讀的線圈／輸出狀態 | ceil(數量/8) |
| 0x02 (2) | Discrete Inputs | bit | 可讀的離散輸入 | ceil(數量/8) |
| 0x03 (3) | Holding Registers | 16-bit register | 可讀寫設定或資料 | 2×數量 |
| 0x04 (4) | Input Registers | 16-bit register | 唯讀量測或輸入資料 | 2×數量 |

表格中的『典型』不是保證。某設備可能把狀態映射到 0x03，也可能把某個保持暫存器標成唯讀。功能碼要由設備通訊表和協定定義共同確認，不能只看到 00001、10001、30001、40001 就直接猜。

參考：[Modbus Organization《Modbus Application Protocol Specification》V1.1b3，資料模型與 Function Code 01 Read Coils、02 Read Discrete Inputs、03 Read Holding Registers、04 Read Input Registers 章節；查閱日期 2026-09-17。](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf)

## 把設備表的 R/W 欄轉成候選功能碼

下面是一台完全虛構設備的八列通訊表，已明確規定區域與 0-based PDU 位址，用來練習建立讀取清單。DI 是 Discrete Inputs，Coil 是 Coils，IR 是 Input Registers，HR 是 Holding Registers；同樣位址 0 在不同區域可代表不同資料。真實設備若沒有明示區域，就先列候選，不要只凭 R/W 決定功能碼。

| 虛構資料點 | PDU起址 | 區域／權限 | 讀取FC | 數量 | 資料定義 |
| --- | --- | --- | --- | --- | --- |
| 運轉狀態 | 0 | DI／R | 02 | 1 bit | 1=運轉 |
| 警報狀態 | 1 | DI／R | 02 | 1 bit | 1=警報 |
| 輸出許可 | 0 | Coil／R/W | 01 | 1 bit | 1=允許 |
| 溫度 | 0 | IR／R | 04 | 1 reg | INT16 ×0.1 °C |
| 壓力 | 1 | IR／R | 04 | 2 reg | UINT32 高字先 ×0.01 kPa |
| 目標速度 | 0 | HR／R/W | 03 | 1 reg | UINT16 rpm |
| 累計量 | 1 | HR／R | 03 | 2 reg | UINT32 高字先 件數 |
| 模式碼 | 3 | HR／R/W | 03 | 1 reg | UINT16 列舉 |

『讀取清單』只處理讀取，不要因為 0x03 可讀就直接推論可寫。寫入要另查 0x05、0x06、0x0F、0x10 等功能碼與設備限制；本文不把 0x03 當寫入命令。

## 位址 數量與回覆驗收

1. 先確定設備手冊使用 0-based PDU 位址，還是用 1-based 顯示編號；將兩者分開記錄。

2. 選定功能碼後，確認起始位址與讀取數量在該功能碼允許範圍內。

3. 依資料模型計算預期 byte count：bit 類型為足以容納數量的整數 byte，register 類型為數量乘 2。

4. 收到回覆時先核對回覆功能碼、byte count、資料長度，再解碼數值。

5. 若回覆功能碼最高位被設定，依例外回覆處理，不把 exception code 當成量測資料。

依本例可拆成四筆：FC02 起址0數量2，byte count=1；FC01 起址0數量1，byte count=1；FC04 起址0數量3，byte count=6；FC03 起址0數量4，byte count=8。壓力佔2個register，與溫度一起讀是3個register，不是2個資料點。若手冊不允許跨區段合併，須拆請求。

| 請求 | 數量 | 預期 byte count | 驗收結果 |
| --- | --- | --- | --- |
| 0x01 起址0 | 1 coil | 1 | 只取bit0 |
| 0x02 起址0 | 2 inputs | 1 | bit0運轉、bit1警報 |
| 0x03 起址0 | 4 registers | 8 | 速度＋累計2字＋模式 |
| 0x04 起址0 | 3 registers | 6 | 溫度1字＋壓力2字 |

本例 FC04 回覆 PDU 可為 04 06 00 FD 00 00 04 D2：00FD=253，乘0.1得到25.3 °C；0000 04D2依本例高字先組成1234，乘0.01得到12.34 kPa。這組倍率及32位排列是虛構設備的明訂規則，Modbus本身不替設備定義。若FC變84，後面是例外碼，不再按量測格式解碼。

參考：[Modbus Application Protocol Specification V1.1b3 的 Function Code 01 至 04 章節，定義請求中的 starting address、quantity，以及回覆的 byte count 與資料排列；實際設備的位址基準仍需對照其資料表。](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf)

## 文件未明示功能碼時怎麼記錄

遇到只寫『40001 溫度』卻沒有功能碼的資料表，不要自行填 0x03 後當成已確認。建立待確認紀錄：原始欄位、猜測依據、可能功能碼、要向供應商問的問題、驗證封包和不可宣稱的結論。若資料表同時提供範例封包，以範例中的功能碼與回覆長度優先核對。

| 待確認欄位 | 目前狀態 | 下一步 | 完成證據 |
| --- | --- | --- | --- |
| 40001 是 0-based 還是顯示編號 | 未確認 | 詢問設備廠商並比對封包 | 官方資料表或封包 |
| 溫度是 0x03 還是 0x04 | 未確認 | 查資料模型與讀取範例 | 功能碼說明 |
| 應用bit意義 | 待查設備定義 | 協定中首個請求bit放資料首byte最低位 | 另確認該bit代表運轉還是警報 |
| 32-bit 字組順序 | 未確認 | 確認資料型態章節 | 兩 register 範例 |
| 錯誤回覆 | 未確認 | 查 exception response | 例外封包 |

完成後應看到：每一列讀取清單都有功能碼、起始位址基準、數量、預期 byte count 和資料型態；仍不確定的列被標為待確認，而不是藏在程式註解裡。失敗時先查：功能碼是否與資料模型一致、位址是否偏移一格、數量是否超出範圍、回覆 byte count 是否符合公式。

適用型號與限制：本文適用 Modbus 應用層資料模型，可用於 RS-485 RTU 或 TCP 的 PDU 讀取概念；RTU/TCP 的外層封裝、CRC 或 MBAP 不在本篇主題。請以八列設備表與封包核對功能碼和資料位置。位址、倍率、資料型態和功能碼最終以目標設備原廠文件為準。實際導入前還要確認設備最大讀取數量、連續位址是否允許合併、通訊逾時與例外回覆策略，並把資料表版本保存進工程文件。

若一張設備表同時出現狀態 bit、量測 register 和設定 register，先按資料模型分組，再按連續位址排序。分組的好處是每個請求的功能碼和 byte count 更單純，回覆也比較容易驗證；但不要為了減少請求，把不同模型或不連續位址硬湊成一段。讀取清單的目標是可追溯與可驗收，不只是請求數最少。

## 常見問題 附錄與驗收清單

| 問題 | 回答 |
| --- | --- |
| 看到 40001 就一定用 0x03 嗎？ | 不一定。它可能只是顯示編號，先查設備資料表的資料模型與功能碼。 |
| 0x03 讀到的資料可以直接寫回嗎？ | 不可以。讀取功能碼和寫入權限、寫入功能碼是不同問題。 |
| bit 回覆為什麼不是每個 bit 一個 byte？ | Coils 和 Discrete Inputs 會以 bit 打包，byte count 依數量取足夠的整數 byte。 |
| 回覆 byte count 對了就代表數值正確嗎？ | 只代表長度符合；位址、排列、倍率和有號性仍要核對。 |

位元讀取回覆由首個請求位址起，先放在第一個資料byte的最低位，剩餘高位依規格補零。以FC02讀起址0共2 bit為例，資料03代表運轉與警報都為1；資料02代表只有警報為1。這是協定打包方向，設備手冊還要說明每個bit的業務含義。

1. 逐列標示資料模型與功能碼。

2. 確認起始位址、數量和 0-based／1-based 基準。

3. 計算預期 byte count，保留請求與回覆十六進位字串。

4. 將未明示功能碼和未驗證的數值解碼列為待確認。

參考：[Modbus Organization 官方規格頁列出 Modbus Application Protocol V1.1b3 與功能碼說明；本文技術判斷以該規格和目標設備資料表為依據。](https://www.modbus.org/modbus-specifications)

## 延伸閱讀

- [RS485 A/B標示不一致 用差動極性建立端子對照](/articles/rs485-ab-dplus-polarity-verification)
- [Modbus寫入功能05 06 0F 10的選用與回讀](/articles/modbus-write-05-06-0f-10-readback)
