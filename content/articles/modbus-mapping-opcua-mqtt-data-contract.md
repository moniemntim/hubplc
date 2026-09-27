---
title: Modbus點位映射至OPC UA與MQTT的欄位契約
description: 用三個虛構Modbus點位建立一個OPC UA Variable與兩個MQTT topic的欄位契約，涵蓋寬度、符號、倍率、品質、時間與版本。
date: 2026-09-17
author: 茂伯
draft: false
---

## 欄位契約先於轉換設定

協定閘道的資料映射不是把Modbus register位址抄到OPC UA或MQTT畫面。來源資料表、OPC UA資訊模型與MQTT topic各自有型別、寬度、品質與版本責任。本文用三個虛構點位做離線契約：40001是UInt16、40002是Int16、40003與40004合成UInt32，數值與地址都是案例條件。

每列要保存功能碼、來源位址規則、寬度、字節序、符號、倍率、單位、品質來源、來源時間、目標節點或topic與版本。只寫「溫度」不足以讓消費者重建數值。MQTT本身不定義payload schema；若payload用JSON，欄位型別、單位、quality、sourceTimestamp與schemaVersion都要寫進應用契約。

| 欄位 | 示例 | 審核問題 |
| --- | --- | --- |
| 來源 | FC03/40001 UInt16 | 地址是顯示值還是PDU偏移？ |
| 轉換 | raw×0.1 | 先轉寬型別再乘嗎？ |
| 目標 | OPC UA ns=2;s=Line1.Temp | 節點模型版本？ |
| 品質時間 | Bad、UTC來源時間 | 來源沒有時間時怎麼標？ |
| 版本 | map-1.2/schema-1 | 消費者如何相容？ |

契約表還要標示資料寬度。例如UInt16是兩個八位元組，UInt32是四個八位元組；不要讓「32-bit」被誤讀成四個Modbus registers。來源map版本與目標schema版本分開保存，因為來源地址不變也可能改變倍率或品質語意。

來源資料表還要寫功能碼與地址基準。40001可能是文件顯示地址，也可能在PDU中以零基偏移0送出；映射表同時保存兩者，並標記由哪份手冊定義。讀取長度若為1，來源寬度是1個16-bit register；組合40003與40004時則必須說明是否同一請求、回覆字序及中間更新風險。

## 三個來源到三個目標

本案例把40001映射成一個OPC UA Variable，把40002與40003/40004分別映射成兩個MQTT topic。40001原始值1234，倍率0.1後為123.4°C，目標為ns=2;s=Line1.Temp；40002原始Int16 -25，倍率0.01後為-0.25 bar；40003高字、40004低字組成累計值。

| 來源 | 寬度與計算 | 目標 |
| --- | --- | --- |
| 40001 | UInt16 1234×0.1 | OPC UA Variable Double 123.4°C |
| 40002 | Int16 -25×0.01 | MQTT factory/line1/pressure |
| 40003-40004 | UInt16高字/低字→UInt32 | MQTT factory/line1/total |

假設40003=0x0001、40004=0x00F0，高字在前時原始數值是0x000100F0，即65776。若設備採低字在前，結果會不同；契約需明寫word順序，並把「待以設備資料表確認」列為驗證項。不能看出數字合理就宣稱順序正確。

OPC UA Variable的DataType描述值型別；讀取的DataValue另攜帶Value、StatusCode與時間戳。先定義品質代表什麼：成功讀到暫存器，可以表示這次通訊及解碼有效，不能順便證明感測器健康。若應用需要設備健康而來源沒有提供，就另列未知，依契約判斷是否使用Uncertain，不要把兩種品質混成一個無條件Good。

離線樣本1234、-25、0001/00F0與Bad各跑一次，預期每個輸出都能由原始值重算。若Int16超出範圍或組合長度不足，結果應是拒收或明確錯誤，不可截斷成看似合理的值。

資料契約最好把空值、無效碼與通訊失敗分開。空值代表來源本來沒有值；無效碼代表來源回傳保留值；通訊失敗代表本次沒有新樣本。三者若都轉成0，消費者會把設備斷線誤判為零壓力或零累計。

## 位元拆解與數值邊界

一個register拆成bit時，要為每個bit指定index與語意。例如40005的bit0是PumpRun、bit3是Alarm；原始0x0009時兩者都為true。保留位元非零不應自動轉成另一個告警，應依來源文件標記未知或待確認。

| 原始 | bit0 | bit3 | 契約處理 |
| --- | --- | --- | --- |
| 0x0000 | false | false | 正常 |
| 0x0001 | true | false | 兩欄更新，Alarm清為false |
| 0x0009 | true | true | 兩欄均更新 |
| 0x8000 | false | false | 保留位待確認 |

倍率運算先選擇合適的數值型別。1234乘0.1要保留小數；若寫成整數1234除10，可能先截掉小數而得到123。使用Double或明確的小數運算，並定義顯示四捨五入規則。若公式改成raw乘整數分子再除分母，則另外核對乘法中間值是否溢位。

時間至少分設備事件時間、閘道取得資料時間與消費者收到時間。本例MQTT的sourceTimestamp專指設備事件時間，沒有就用null；另列gatewayTimestamp。OPC UA SourceTimestamp可由資料來源在取得值時建立，須依實際架構記錄時間來源，不能把閘道取得時間宣稱成PLC內部事件時間。

bit與倍率變更都要升版。消費者若只認舊schema，新增topic或並行版本比靜默改舊topic安全；正式策略仍要由產品與消費者文件確認。

## 版本變更與驗收

修改40002倍率或40003字序前，保存舊版map-1.2、schema-1與原始樣本，新增map-1.3並列差異。若變更不相容，採用schema-2與v2 topic或安排消費者同步更新；只改設定而不通知使用者，數值可能仍能解析卻已變了意義。

| 測試 | 預期 | 錯誤線索 |
| --- | --- | --- |
| 1234 | 123.4°C | 倍率/型別錯 |
| -25 | -0.25 bar | 符號/二補數錯 |
| 0001/00F0 | 65776（高字前提） | word順序錯 |
| Bad | MQTT quality=Bad、value=null | 品質被偽造Good |
| 0x8000 | 待確認 | 保留位誤轉告警 |

保存原始Modbus回覆、解析器版本、OPC UA寫入紀錄或MQTT payload，並標示離線樣本與未實機欄位。MQTT broker收到publish不代表消費者理解正確，需以schema validator檢查型別、倍率、單位與版本。

產品限制要獨立記錄：有些閘道只支援固定型別、不能自訂namespace、不能一個register拆兩個節點，或只輸出字串。這些能力要查mapping手冊，不可從協定標準推定。本文沒有指定產品。

MQTT topic要寫層級、大小寫、版本與保留訊息政策；payload schema另存文件或schema registry識別。若topic名稱不變而欄位改名，舊消費者可能仍能解析JSON卻讀到空值，這種靜默錯誤必須用版本或相容測試攔截。

本例壓力payload可寫成 {"value":-0.25,"unit":"bar","quality":"Good","sourceTimestamp":null,"schemaVersion":1}。這裡Good只表示本次讀取與解碼通過；設備健康尚未提供，另在契約註記。通訊失敗時本例改送quality=Bad及value=null，保留最後有效值則另設欄位，避免null被轉成數字零。

## 一致性與節點身分的補充檢查

映射變更要保留舊版到消費者完成切換。對倍率、符號、單位或bit語意的變更，都應在變更表列出舊值、新值、影響topic或NodeId、回復方式與待通知對象；不能只把JSON或畫面欄位覆寫後說已完成。

32-bit數值的更新可能跨兩個register。若設備沒有快照或一致性機制，讀到高字更新前、低字更新後的組合可能不是任何真實值；契約應寫讀取限制或以設備支援的鎖存方式取得，不能把一次讀取成功當成一致快照。

若來源品質為Bad，仍可保存raw與錯誤原因供追溯，但目標數值不可被當成可用測量。這個邊界要同時寫進OPC UA StatusCode與MQTT quality，避免兩條資料路徑對同一筆事件給出相反判斷。

OPC UA契約保存namespace URI與識別字串。本例URI為urn:hubplc:training:line1，識別字串Line1.Temp；ns=2只是本次連線NamespaceArray解析出的索引。重建伺服器或重新連線後重新解析URI，不能把索引2當永久身分。BrowseName、DisplayName與NodeId也要分開，中文顯示名稱相同不表示是同一節點。

OPC UA StatusCode的主要嚴重度為Good、Uncertain及Bad；Stale是本文MQTT契約中的自訂狀態，不是第四種UA嚴重度。轉換時需選擇符合原因的標準StatusCode，並保存原始代碼；例如通訊失敗不能只改成任意自訂數字，消費者也不能只看Value而忽略狀態。

契約審查者應逐列問四個問題：原始值從哪個功能碼來、轉換是否可重算、品質與時間是否保真、版本變更誰會受影響。四問任一缺答案，就將該列標為待確認，不用流暢的topic名稱掩蓋資料定義不足。

## FAQ與來源

FAQ1：MQTT有固定payload格式嗎？沒有，topic與payload schema是應用契約。

FAQ2：UInt16能直接當溫度嗎？不能，先核對符號、倍率、單位與無效碼。

FAQ3：OPC UA有Value就代表品質正常嗎？不代表，還要核對StatusCode與SourceTimestamp。

FAQ4：倍率改變只改閘道可以嗎？不一定，消費者版本與相容策略也要同步。

如果一筆來源被拆成多個bit，消費者應收到同一個sourceTimestamp與quality，並能追溯原始register。若bit之間需要互斥，這是應用規則，不是位元拆解本身保證；契約要另列衝突時的處理。

驗收可先用固定CSV輸入，再比較OPC UA節點快照與MQTT payload。每個輸出附map版本、schema版本與原始raw值，測試者可以重算1234、-25與65776。結果不同時先查地址、字序、型別，再查broker或server，不要反過來修改數值直到看起來合理。

練習時把三組來源補上封包欄位：本例40001、40002、40003至40004分別使用PDU起點0、1、2，数量1、1、2，功能碼均為03。先用手算核對123.4、-0.25與65776，再比較目標欄位。若收到的raw就不符，先查位址與站號；raw正確但結果錯，再查符號、字序及倍率。

三個點位、數值與映射均為案例條件，未對PLC、閘道、OPC UA server或MQTT broker編譯、模擬或實機驗證。

參考：[Modbus Application Protocol V1.1b3：暫存器與封包背景。](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf)

參考：[OPC UA Part 4 DataValue，Value、StatusCode及時間戳語意。](https://reference.opcfoundation.org/specs/OPC-10000-4/7.11)

參考：[OASIS MQTT Version 5.0：PUBLISH與應用payload邊界。](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html)

## 延伸閱讀

- [工業閘道的 NAT Port Forward 與雙網卡路由 資料流怎麼畫才不誤導](/articles/industrial-gateway-nat-port-forward-dual-nic-routing)
- [閘道斷線暫存的容量計算與重送去重](/articles/gateway-store-forward-queue-dedup-timestamps)
