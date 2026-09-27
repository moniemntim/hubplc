---
title: Modbus TCP Idle Timeout 與 Keepalive 把連線 資料新鮮度與重連分開
description: 區分連線狀態DISCONNECTED/CONNECTING/WAIT_VALID/READY與品質GOOD/STALE/INVALID，以兩條精確時間線處理請求逾時、資料age、Idle Timeout、OS Keepalive與重連。
date: 2026-09-17
author: 茂伯
draft: false
---

## 三個時間概念不能互換

Modbus TCP的TCP已連線，只表示三次握手完成且本機尚未收到作業系統報告的連線失效；它不表示遠端應用程式仍在處理請求。最後有效PDU是應用程式完成交易驗證、功能碼與資料內容可接受的時間點；資料age則是現在時間減去最後有效PDU時間。若連線保持ESTABLISHED但30秒沒有有效回覆，資料age仍會增加，畫面不能繼續把舊值標成即時。

TCP keepalive是傳輸層探測，不是Modbus服務健康檢查。探測得到ACK，只能說TCP對端仍回應傳輸層；遠端程式可能卡住、隊列滿、Unit ID錯誤或只由代理回ACK。應用程式仍要以實際Modbus請求的成功回覆更新lastValidPdu，並對每一筆資料保存時間戳、交易識別與品質。

| 狀態 | 可證明的事 | 不能證明的事 |
| --- | --- | --- |
| TCP已連線 | socket尚未被TCP判死 | Modbus服務可處理請求 |
| Keepalive ACK | 對端傳輸層回應探測 | PDU功能碼與資料有效 |
| 最後有效PDU | 一次應用交易通過驗證 | 下一次交易一定成功 |
| 資料age | 距最後有效資料的時間 | 設備目前實際值未變 |

應用層資料新鮮度要用單調時鐘計算，避免系統校時讓age倒退。收到有效PDU時只寫入該次交易的完成時間和來源；畫面更新、資料庫寫入或keepalive封包都不能改寫lastValidPduAt。若設備回傳相同值但交易有效，age仍應歸零，因為新鮮度描述的是成功取得時間，不是數值是否改變。

設計上把connectionState、lastValidPduAt、dataAge與quality分開存放。連線建立時不要把lastValidPduAt重設成現在；重連成功也不能把舊資料變新。只有收到符合請求交易、來源、功能碼、長度、MBAP與協定欄位檢查的回覆，才更新最後有效PDU。此時間應對各測點更新：讀到溫度不能順便刷新未讀到的壓力。標準Modbus TCP ADU沒有RTU CRC欄位；TCP使用自己的校驗和，封包解析不可在PDU尾端誤扣兩byte。

## 作業逾時與30秒資料時間線

以下是自訂教學政策：單筆請求期限500 ms；連續三次逾時便關閉舊連線進入DISCONNECTED，再依退避規則重連。資料age小於10秒為GOOD，10秒以上且小於30秒為STALE，30秒以上為INVALID。STALE需顯示過期，INVALID禁止作為即時控制依據；具體設備動作另按製程要求設計，這些秒數不是標準預設。

時間線案例一以最後有效PDU在t=5 s為基準：t=10 s送出請求101，t=10.5 s逾時；t=10.5 s送出請求102，t=11.0 s逾時；t=11.0 s送出請求103，t=11.5 s逾時。在沒有其他連線錯誤的本例中，第三次逾時11.5秒才依政策關閉舊連線。因最後有效時間是t=5 s，t=11.5 s時age=6.5 s，按本篇門檻品質仍為GOOD，但不能把逾時誤寫成資料年齡。

| 時間 | TCP狀態 | 最後有效PDU/資料age | 應用動作 |
| --- | --- | --- | --- |
| 5 s | ESTABLISHED | age=0，GOOD | 最後有效PDU |
| 10 s | ESTABLISHED | age=5，GOOD | 送出101 |
| 10.5 s | ESTABLISHED | age=5.5，GOOD | 101逾時，送102 |
| 11.0 s | ESTABLISHED | age=6，GOOD | 102逾時，送103 |
| 11.5 s | DISCONNECTED | age=6.5，GOOD | 第三次逾時，關閉舊連線 |
| 15 s | 重連進度另記 | age=10，STALE | 假設仍無新有效資料 |
| 35 s | 重連進度另記 | age=30，INVALID | 禁止當即時控制資料 |

逾時與重連的測試要故意分開故障。先讓Modbus服務延遲超過500 ms但保持TCP，再測服務停止、拔除網路和只丟棄回覆的情況；觀察每種情況的failureCount、TCP狀態、資料age與重連時間。若所有故障都只顯示「斷線」，維護人員無法知道是應用慢、網路丟包還是遠端程序停止。

在30秒案例中，畫面可繼續顯示最後值，但必須明確顯示STALE或INVALID及age數字；資料記錄也要保存品質，不可只寫一個沒有時間的數值。控制程式若需要安全替代值，應另設經審核的fallback狀態，不能把舊值悄悄當成新值。

這條規則把「請求逾時」和「資料過期」分開：單次500 ms逾時不立即宣稱設備斷線，但會增加交易失敗計數；連續失敗達規定次數才進入重連；資料age則獨立依時鐘變化。

## Keepalive設定不可跨作業系統照抄

Linux man 7 tcp記載tcp_keepalive_time、tcp_keepalive_intvl與tcp_keepalive_probes，文件列出的預設值為7200秒、75秒與9次；SO_KEEPALIVE未啟用時不會發送探測。Windows官方文件則說SO_KEEPALIVE預設關閉，可用SIO_KEEPALIVE_VALS設定單一連線的keepalivetime與keepaliveinterval，系統預設與探測次數也受Windows版本影響。這些數字不能當成所有OS、容器、NAT或PLC閘道的共同設定。

若需求是30秒內知道資料失效，不能只把TCP keepalive idle設30秒就結案。探測排程、重試次數、網路設備丟棄、對端ACK與應用程式排程都會改變實際感知時間。應用層仍要用500 ms請求逾時、有效PDU時間戳與30秒age門檻；keepalive作獨立的傳輸層生命跡象或協助釋放半開連線。

| 平台/參數 | 官方文件指出 | 工程限制 |
| --- | --- | --- |
| Linux tcp_keepalive_time | 預設7200 s，SO_KEEPALIVE啟用後才探測 | 不可泛用到Windows或設備OS |
| Linux intvl/probes | 75 s、9次為文件預設 | 實際失效時間還受網路狀態影響 |
| Windows SO_KEEPALIVE | 預設關閉，使用系統設定 | 版本與套接字設定要核對 |
| 應用層timeout | 由程式定義，例如500 ms | 不是TCP keepalive的替代品 |

keepalive探測本身也可能被中間設備或代理回應，甚至在應用服務已停止時仍維持TCP連線。驗收因此要同時檢查封包方向和Modbus交易日誌：探測ACK只能記在transportHealth，功能碼和資料內容通過才記在applicationHealth。兩個健康欄位不能共用一個布林值。

重新連線時若伺服器仍在處理上一筆請求，客戶端不可因TCP重建就立刻重送可能有副作用的寫入。對讀取可在交易識別和設備狀態確認後重試；對寫入則保存原始交易、回覆或未知結果，依設備文件決定是否允許重送，避免重複動作。

服務端Idle Timeout是產品的閒置清除政策。自訂例子：服務在60秒沒有Modbus應用資料時關閉socket，即使OS每20秒收到keepalive ACK，仍可能在60秒關閉，因TCP探測未送進應用資料流。另一種產品可能按所有封包活動重算閒置時間，須查手冊及實測。防火牆的連線狀態保存期限又是第三個計時器，不能拿其中一個設定代表其他兩個。

## 重連狀態機與第二條時間線

連線狀態與品質分開保存。連線狀態只用DISCONNECTED、CONNECTING、WAIT_VALID、READY描述socket與是否已收到重連後第一筆有效PDU；品質只用GOOD、STALE、INVALID描述lastValidPduAt與age。READY不自動等於GOOD，連線建立或重連成功也不能重設lastValidPduAt。

第二條獨立時間線假設t=0取得有效值後，測試排程暫停，直到29.7秒才恢復請求，因此中間沒有未列出的輪詢。時間線案例二以最後有效PDU在t=0為基準：t=29.7 s送出請求，t=30.2 s逾時；t=30.3 s送出第二次，t=30.8 s逾時；t=30.9 s送出第三次，t=31.4 s逾時。三次失敗後退避1 s，到t=32.4 s才開始重連；t=32.5 s TCP握手完成，連線狀態WAIT_VALID，品質仍INVALID；t=33 s收到並驗證有效PDU，才更新lastValidPduAt、age=0、品質GOOD並進入READY。

| 時間 | 連線狀態 | 資料age與品質 | 動作 |
| --- | --- | --- | --- |
| 29.7 s | READY | age=29.7，STALE | 送出第1次 |
| 30.2 s | READY | age=30.2，INVALID | 第1次逾時 |
| 30.3 s | READY | age=30.3，INVALID | 送出第2次 |
| 30.8 s | READY | age=30.8，INVALID | 第2次逾時 |
| 30.9 s | READY | age=30.9，INVALID | 送出第3次 |
| 31.4 s | READY→DISCONNECTED | age=31.4，INVALID | 第3次逾時 |
| 32.4 s | CONNECTING | age=32.4，INVALID | 退避1 s結束 |
| 32.5 s | WAIT_VALID | age=32.5，INVALID | 握手完成 |
| 33 s | READY | age=0，GOOD | 有效PDU恢復 |

重連退避要有上限和可觀測事件。本文案例可採第一次等待1秒、第二次2秒、第三次4秒，上限8秒；這是應用自訂範例，不是TCP標準。每次重連都保存原因、開始/結束時間、socket世代和首次有效PDU時間，避免重連成功卻因舊資料仍被使用而產生假恢復。

## FAQ與官方依據

日誌至少記錄requestId、發送時間、回覆時間、功能碼、Unit ID、結果、TCP狀態、資料age和重連世代。這些欄位能把「連線正常但資料不新」與「交易逾時後重連」分開，並可在30秒門檻附近檢查時鐘、排程和網路延遲是否造成邊界誤判。

驗收報告應列出時間基準、時區、單調時鐘來源和資料age門檻。若控制器重啟，明確標記lastValidPduAt未知並等待新交易，不可把開機時間當成資料取得時間。

測試結果要保存原始封包與狀態轉移，並附上設定版本，便於日後追溯。

重連時避免多個工作同時寫入同一筆資料。用連線世代或sessionId標記請求，晚到的舊回覆若不屬於目前交易就丟棄；重連後收到的第一個回覆也要檢查交易識別、Unit ID、功能碼與資料長度。

FAQ 1：TCP仍是ESTABLISHED，資料可以繼續顯示GOOD嗎？答：不能只依TCP狀態。GOOD要由最近一筆通過應用驗證的有效PDU和age規則決定。

FAQ 2：Keepalive收到ACK是否代表Modbus設備正常？答：不代表。ACK只證明傳輸層回應，遠端Modbus服務可能沒有處理功能碼或資料。

FAQ 3：30秒無資料時要立刻關閉TCP嗎？答：本文規則是先以請求逾時和連續失敗決定重連，資料age在30秒標INVALID；實際門檻應依設備回應時間與控制需求設定。

FAQ 4：Linux的7200秒keepalive預設能套到Windows嗎？答：不能。Linux man page與Microsoft文件的選項、預設和探測次數不同，必須查目標OS及套接字實際設定。

參考：[Linux man-pages《tcp(7)》：TCP_KEEPIDLE、TCP_KEEPINTVL、TCP_KEEPCNT與預設值。](https://man7.org/linux/man-pages/man7/tcp.7.html)

參考：[Microsoft Learn《SIO_KEEPALIVE_VALS Control Code》：Windows單一連線keepalive時間與間隔。](https://learn.microsoft.com/en-us/windows/win32/winsock/sio-keepalive-vals)

## 延伸閱讀

- [Modbus TCP連線重用與併發請求 TID 逾時與MBAP封包邊界](/articles/modbus-tcp-connection-reuse-concurrency)
- [Modbus Security/TLS怎麼導入 802 憑證與角色授權的邊界](/articles/modbus-security-tls-certificates-roles)
