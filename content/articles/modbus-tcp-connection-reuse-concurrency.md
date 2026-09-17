---
title: Modbus TCP連線重用與併發請求 TID 逾時與MBAP封包邊界
description: 以C1/C2時間線說明Modbus TCP連線重用、TID逾時晚到、session epoch、單一outstanding與MBAP Length重組。
date: 2026-09-17
author: 站長
draft: false
---

## TCP連線與請求模型

Modbus TCP把MBAP標頭與PDU放在TCP串流上，連線本身不是一筆封包。連線重用可避免每次請求重新建立TCP，但必須管理連線狀態、逾時、取消與舊回覆。本文採自訂client模型，不猜任何函式庫API；欄位只描述應有的狀態。

先建立session epoch、socket狀態、下一個TID與outstanding表。若設備不支援pipelining，outstanding只能有一筆；上一筆成功、明確失敗或逾時取消後，才允許下一筆。重用連線不等於允許同時送多筆。

連線可自訂為Disconnected、Connecting、Ready、Fault；每筆交易另有WaitingReply、Completed、Canceled狀態，不要把兩種生命週期混成同一狀態機。交易保存送出時間、連線世代、TID、目標Unit ID、預期功能和允許回覆長度；長度檢查也須接受合法例外回覆，不能只認正常資料長度。

連線重用的結果不是單純少一次connect，而是把socket生命週期和Modbus交易生命週期分開。socket Ready只能表示TCP仍存在，不能表示目前有可接受的回覆。每次交易都要重新核對TID、Unit ID、功能碼和資料長度，並在成功或取消時清楚結束。

設計評審時把這些狀態與時間線畫在同一張圖，才能讓維護者辨認舊回覆。

## C1時間線 101逾時 102成功

C1為允許在前一交易逾時後繼續送請求、並可依TID接納不同完成順序的測試模型。若產品禁止這種處理，客戶端取消並不等於伺服器已停止執行；應改用C2的關閉重連策略，不能以本機只有一筆等待項目就宣稱遠端沒有重疊操作。

C1在t=0以TID101送出讀取請求，t=80ms超過自訂逾時便標記101取消，但不能立刻把101當成可用回覆。t=90ms在同一TCP連線送TID102；t=120ms收到102且MBAP長度、TID和功能碼正確，完成102。

| 狀態 | 時間 | 處理 |
| --- | --- | --- |
| C1送101 | t=0 | outstanding=101 |
| 101逾時 | t=80ms | 取消並保留已取消識別 |
| C1送102 | t=90ms | 已確認可繼續使用此連線 |
| 102成功 | t=120ms | 匹配後完成 |
| 101晚到 | t=150ms | 丟棄並記錄 |

t=150ms才到的101回覆必須丟棄並記錄late response。丟棄條件是TID101已取消、session仍相同但沒有對應outstanding；不能把它交給目前的102。這條時間線要用測試工具或可控延遲重現，不能由一次正常回覆推論。

C1的101逾時後，取消集合不能立刻清空。即使TCP連線仍重用，也要拒絕同TID舊回覆，且不能只靠任意短等待就重用101；若client只允許一筆outstanding，102送出前仍應確定101已進入取消狀態，而不是把socket讀取執行緒硬切掉。

時間線測試要故意讓101的回覆延遲到102之後，並讓102回覆正常。測試報告寫出t=0、80、90、120、150毫秒各事件，保存每個ADU的TID與Length，才能確認晚到回覆確實被丟棄而不是被錯誤配對。

取消不等於把網路資料刪掉。取消只改變交易是否仍可完成，已進入TCP接收緩衝的bytes仍要被解析或在session重置時整批丟棄。這個區分可避免101晚到時污染102。

## C2才重用101與epoch

C2是另一條獨立測試時間線：C1的101在80 ms逾時後，客戶端關閉舊連線並建立新的C2世代，沒有在C1送102。C2可以重新使用TID101；應用識別鍵為連線世代與TID。舊世代的非同步回呼若稍後執行，應拒絕更新C2；TCP本身不會把舊socket的資料搬到新socket。epoch是本機管理欄位，不是MBAP中傳送的欄位。

| 欄位 | 用途 | 檢查 |
| --- | --- | --- |
| epoch | 區分連線世代 | 重連遞增 |
| TID | 匹配交易 | 16-bit回繞規則 |
| Length | 封包邊界 | buffer重組 |
| Protocol ID | MBAP識別 | Modbus TCP必須為0 |
| Unit ID | 目標單元 | 依設備 |

若只用TID作鍵，C1晚到的101可能被誤認成C2回覆，造成錯誤資料寫入流程。session epoch應在每次新連線或重連時遞增，取消的請求也留下已取消識別集合；無法證明舊回覆不再出現時，重連建立新世代後才重用識別。

C2重連時epoch遞增並重置接收buffer、解析器和outstanding。舊連線的資料即使被作業系統延遲交付，也不能進入C2的交易表。TID回繞前要確認同一epoch沒有尚未終結的相同TID，否則應暫停分配。

若設備重連很頻繁，不能只用新的socket物件當世代識別，因為應用層可能仍有舊佇列。epoch應由client交易管理器產生，並傳給解析與完成回呼；所有回呼都要驗證epoch仍是目前值。

逾時值要按設備回覆時間、網路延遲與處理時間設定，不能用固定掃描週期代替。若逾時後仍要重用session，先完成取消、保護與解析器同步；若無法證明同步，關閉重連較容易驗證。

## TCP分包與MBAP重組

一次TCP read可能拿到半個ADU，也可能包含多個ADU。先累積接收緩衝，至少六byte才能讀到TID、Protocol ID與Length；Unit ID在第七byte，不能只收六byte就讀它。Protocol ID應為0，Length為Unit ID加PDU的byte數，整筆ADU總長為6加Length；資料不足先等，完整才取出。

具體離線正常讀取回覆：00 65 00 00 00 05 01 03 02 00 FD，共十一byte；Length=5包含01、03、02、00、FD。第一次read只收到00 65 00 00，第二次收到00 05 01 03 02，第三次收到00 FD並接著另一筆ADU。解析器前兩次保留緩衝，第三次取完十一byte，再從剩餘部分解析下一筆。

Length不包含它自己，也不包含前面的TID與Protocol ID。依253 byte的PDU上限，Length最多254；仍須按功能檢查最小長度及Byte Count。零長度、超限或Protocol ID錯誤時，本篇模型使連線失效並記錄錯誤，不以任意丟一byte重找邊界的方式繼續接收。

TCP讀取緩衝區應先驗證固定標頭，再依Length取完整ADU。遇到半包時保留原 bytes，遇到黏包時取出一筆後從剩餘位置繼續，不可用一次read的回傳次數作為封包數。

交付前用正常回覆、半包、黏包、錯誤Length、101晚到、C2重用101六種測試，分別確認完成、丟棄、重連和診斷結果。

若現場看到同一個TID兩次完成，先檢查交易表是否在逾時後錯誤重建，或回呼是否沒有攜帶epoch。若MBAP Length解析正常但資料仍錯，查Unit ID、功能碼和回覆資料長度，不要只看TCP連線未中斷。所有錯誤都應記錄原始bytes的摘要與時間，方便重現。

## 排查 FAQ與限制

排查順序是socket連線、session epoch、buffer重組、MBAP Length、TID匹配、功能碼與例外回覆、最後才看資料內容。逾時取消後不應把socket上的下一筆資料當成目前請求；不支援pipeline就維持單一outstanding。連線重用前要確認設備手冊是否允許長連線和多次請求。

FAQ1可用read一次等於一個ADU嗎？不可以。FAQ2逾時後101晚到怎麼辦？標記late並丟棄。FAQ3C2能重用101嗎？可以，但必須連同新epoch識別。FAQ4能同時送101與102嗎？只有設備與client模型明確支援pipelining才可，否則禁止。本文未指定API、PLC函式或硬體執行。

參考：[Modbus Messaging on TCP/IP Implementation Guide V1.0b](https://www.modbus.org/file/secure/messagingimplementationguide.pdf)

參考：[Modbus Application Protocol Specification V1.1b3](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf)

參考：[Modbus specifications page](https://www.modbus.org/modbus-specifications)

若解析器遇到超大Length，先套用產品設定的上限並關閉或重置session；不要配置無限buffer。錯誤資料可能來自連線不同步、協定混線或設備故障，重連後要重新建立epoch。

設備不支援pipelining時，最簡單可靠的模型是每條session只有一筆outstanding。要提高吞吐量可評估多條獨立連線，但每條仍需自己的epoch、buffer、TID和錯誤處理，不能把多連線混成一張交易表。

本文的模型只說明請求生命週期，不提供可直接編譯的函式庫程式。正式實作仍需確認目標平台的socket非同步行為、逾時取消語意、執行緒安全與關閉流程；若平台不支援並行，採單一outstanding是明確限制而非效能承諾。

最終報告須分開列出連線、交易和解析器結果，不能只回報成功率。

## 延伸閱讀

- [Modbus TCP MBAP Header Transaction ID Unit ID 與 Length 欄位判讀](/articles/modbus-tcp-mbap-header-transaction-unit-length)
- [Modbus TCP Idle Timeout 與 Keepalive 把連線 資料新鮮度與重連分開](/articles/modbus-tcp-idle-timeout-keepalive-data-freshness)
