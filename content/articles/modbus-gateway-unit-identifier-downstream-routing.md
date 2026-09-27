---
title: Modbus Gateway 多從站路由 Unit Identifier 不等於固定站號的情況
description: 用唯一Unit Identifier映射與三筆獨立Transaction，核對TCP端點、下游串口、RTU站號、回覆來源及閘道例外，避免把MBAP當成含SerialPort的路由指令。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先定義Unit Identifier的責任

在Modbus TCP ADU中，MBAP標頭包含Transaction Identifier、Protocol Identifier、Length與Unit Identifier；MBAP沒有Serial Port欄位。Unit Identifier是否用來選下游RTU站號，要由目標閘道器文件定義。直連Modbus TCP server也可能忽略或要求特定值，不能一律填255、0，亦不能靠盲測站號0宣稱安全。

本文以一台虛構、且明確假設支援同一TCP端點多個Unit映射的閘道G做教學。唯一路由表為：192.0.2.50:502、Unit12→Serial1/RTU12；同端點Unit13→Serial1/RTU13；同端點Unit112→Serial2/RTU12。最後一筆是重映射假設，必須在目標產品手冊確認；不是標準保證。

| 需保存欄位 | 範例 | 作用 |
| --- | --- | --- |
| TCP endpoint | 192.0.2.50:502 | 定位閘道網路服務 |
| Unit Identifier | 12、13、112 | 選擇文件定義的邏輯路由 |
| 下游介面 | Serial1或Serial2 | 確認實際串列出口 |
| 實體站號 | RTU12或RTU13 | 串列端真正目的地 |
| 路由證據 | 設定版本、日誌、擷取 | 把回覆配回請求 |

如果同一endpoint同一Unit12想同時指定兩個串列埠，MBAP本身沒有欄位可以表達這個意圖。客戶端不能靠送包先到某埠、後到另一埠來猜測。要改用不同Unit值、不同TCP端點，或依產品文件採用其他明確映射。

路由表匯出後先做鍵值檢查：endpoint與Unit組成查找鍵，若兩列相同卻指向不同Serial，標記CONFIG_CONFLICT；若Unit112只在文件列出而韌體版本不同，標記VERSION_UNCONFIRMED。這些標記比直接刪除一列更有用，因為它保留了待確認的理由。

## 建立唯一映射與請求清單

先將設定匯出檔轉成可審核路由表，保存設備型號、韌體、匯出時間與版本雜湊。路由表每列只允許一個endpoint與Unit Identifier組合對應一個下游出口；若同一鍵出現兩列，先標為衝突，不要用最後一列覆蓋。這個唯一性檢查是配置審核，不是對設備掃描。

| TID | TCP目的 | Unit | 預期下游 | 測試資料 |
| --- | --- | --- | --- | --- |
| 0x2101 | 192.0.2.50:502 | 12 | Serial1/RTU12 | 讀取已知暫存器 |
| 0x2102 | 192.0.2.50:502 | 13 | Serial1/RTU13 | 同功能碼、不同站號 |
| 0x2103 | 192.0.2.50:502 | 112 | Serial2/RTU12 | 驗證重映射假設 |

三筆請求各用獨立Transaction Identifier。即使功能碼、起始位址與長度相同，也不能以「內容相同」代替TID。接收回覆時先配TID，再核對回覆Unit是否照原請求返回，最後把閘道日誌或串列監視器的實際目的與設定表比對。只看到一個正常資料值，不能證明它來自正確串口。

測試順序可從0x2101、0x2102、0x2103分開送出，每筆等待明確結果並保存時間；若產品文件允許並行，仍需確認回覆可用TID配對且下游串列不會把兩筆交錯。若文件未說明並行上限，先用單筆序列測試，並把並行狀態列為待確認。

本例規定回覆Unit必須照TCP原請求回送12、13或112。第三筆下游RTU地址雖為12，閘道回到TCP時仍應帶112；若產品另有不符標準的改寫行為，應記成相容性差異並確認客戶端處理，不能只把正常回覆規則默默改掉。串列監視器仍須顯示Serial2/RTU12作獨立來源證據。

每筆測試還要記錄功能碼、參考位址與回覆長度。三個Unit可以使用相同只讀請求，才能把差異集中在路由；若同時改功能碼與位址，收到例外時無法判斷是站號不存在、功能未支援，還是資料區錯誤。測試資料應先取得下游文件定義。

## 直連TCP與串列閘道分開判讀

直連Modbus TCP server時，Unit Identifier的意義由該server文件決定。若文件說明它是單一TCP設備並忽略Unit，客戶端仍應使用文件指定值並記錄「被忽略」；若文件要求某個值，只有該值可作正式測試。不能把常見值255或0當成跨產品預設，也不能用試送Unit0來推論其他值安全。

| 證據層 | 直連TCP server | TCP-to-serial gateway |
| --- | --- | --- |
| TCP建立 | 目的IP/port可連 | 目的IP/port可連 |
| MBAP | TID與Unit依server文件 | TID配對且Unit選路由 |
| 下游證據 | server自身狀態 | 串列監視器的Port/RTU地址 |
| 失敗定位 | 例外或逾時 | 閘道例外、串列逾時或站號錯 |

例如直連192.0.2.20:502的文件指定Unit1，客戶端就測Unit1並保存回覆；若未提供Unit語意，不把Unit12映射成RTU12。相反地，對G的三筆案例，Unit12與Unit112雖各自可能回資料，仍要看串列出口才能區分Serial1/RTU12與Serial2/RTU12。

路由表也要保存TCP連線來源、目的埠與防火牆規則。連線拒絕表示IP、port或網路路徑階段有問題；連線成功後回閘道例外，才進一步查Unit映射與功能支援；下游無回覆則查指定Serial、RTU地址、串口參數與線路狀態。不要跳過前一層直接換感測器。

若要修改映射，先匯出原配置，將一列改動寫入變更單，再以一筆TID測試。測試通過後才處理下一列；失敗時恢復原檔並保存前後差異。這樣可以把配置錯誤與同時變更多個站號的影響分開。

串列監視器的時間戳要和TCP擷取使用同一時基，至少能以毫秒級順序對照。若閘道先收到0x2102後才把RTU13回覆送回，記錄應保留中間等待時間；不要只保存最後一筆畫面狀態。

## 例外 逾時與來源證據

標準0A表示閘道無法配置通訊路徑，0B表示閘道未取得目標回覆，不能把兩個碼視為沒有定義。它們仍不直接指出是哪根線或哪個參數錯：0A先查映射與資源，0B先查指定下游的發送、接收與期限。保存完整PDU、TID、Unit、閘道日誌及時間差，若產品有不同實作則另記差異。

| 徵象 | 第一個證據 | 下一步 |
| --- | --- | --- |
| TCP無法建立 | 連線錯誤、路由與ACL | 查IP、port、防火牆與服務狀態 |
| 回0A/0B | 完整例外PDU與閘道日誌 | 對照產品例外定義與下游狀態 |
| 逾時無回覆 | TID、Unit、串列監視器 | 查映射、串口參數、RTU地址 |
| 資料正常但來源錯 | Serial/RTU監視器 | 拒收資料，標ROUTE_MISMATCH |

案例：TID 0x2103、Unit112回覆正常資料，但串列監視器顯示Serial1/RTU12。Unit與資料格式都正常，來源卻不符合唯一映射，結果應是拒收並保留證據，而不是更新應用資料。第二案例是Unit13回0B，閘道日誌顯示已選Serial1但RTU13未回應；這時不能把0B改寫成「TCP錯誤」，應依產品文件查下游逾時與線路。

逾時值也不能任意套用。保存閘道設定的connect timeout、下游response timeout、重試次數與實際時間戳；若文件沒有說明重試是否會重送RTU請求，先把重複副作用列為風險。對只讀測試可設計有限重試，對寫入或會觸發動作的功能碼則先查設備語意。

串列監視器若沒有提供來源Port，配置本身不能證明第三筆去了Serial2。此限制要寫入驗收結論，並改採產品提供的診斷計數、不同TCP端點或其他明確隔離方式；不能用封包抵達順序或「資料看起來合理」補足缺失證據。

回復驗收也要重做三筆路由，而不是只確認匯入按鈕成功。匯入後若Unit112被韌體拒絕，應保留拒絕訊息並停止在原配置；只有三筆TID與來源證據都符合，才可把新版本標為待上線。

## FAQ 來源與離線驗收

FAQ1：Unit12是否自然等於RTU站號12？不一定。只有閘道文件把Unit12映射到RTU12時才能這樣記錄，直連TCP server更不能自動套用RTU概念。

FAQ2：同一TCP endpoint的Unit12能指定Serial1或Serial2嗎？MBAP沒有SerialPort欄位；若產品只允許唯一映射，就必須改Unit或端點，不能靠送包順序選埠。

FAQ3：回覆Unit12且資料正確就能算路由成功嗎？不能，還要以串列監視器或產品診斷確認實際Port與RTU地址，並核對TID。

FAQ4：0A或0B能直接判定設備故障嗎？不能。它們分別指路徑不可用及目標未回應；具體原因仍要由映射、串口設定、供電、接線與交易日誌定位。

離線驗收交付包含唯一映射表、三筆獨立TID的請求與回覆、串列監視器或診斷證據、逾時設定、例外原文、來源限制與回復檔。192.0.2.50、Serial1/2與三筆路由都是明示的案例條件。

參考：[Modbus Application Protocol V1.1b3：功能碼、正常與例外PDU及0A、0B分類。](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf)

參考：[Modbus Messaging Implementation Guide：TCP訊息與串列閘道整合的官方背景文件，實際映射仍須以目標產品手冊為準。](https://www.modbus.org/file/secure/messagingimplementationguide.pdf)

## 延伸閱讀

- [Modbus TCP資料分塊與最大讀取量](/articles/modbus-tcp-register-block-read-limits)
- [TCP-to-Serial Gateway 設定審核 Socket Serial Port Unit ID 三層不要混寫](/articles/tcp-serial-gateway-socket-serial-port-unit-id-audit)
