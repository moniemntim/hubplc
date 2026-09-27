---
title: 序號重用遇到舊回覆如何安全丟棄
description: 處理有限交易序號回捲與舊回覆，使用connection epoch、peer、可得協定欄位及pending狀態，避免只比較seq造成late response誤配。
date: 2026-09-21
author: 茂伯
draft: false
category: 工業通訊與網路
---

## 先承認有限序號會回捲

請求序號不是永久唯一。若欄位只有有限位元，送出足夠多次後一定會wrap；Modbus TCP的Transaction Identifier是16位元，也不能把它當成跨重啟、跨連線永不重複的全域交易ID。只比較seq相等，就可能把舊回覆誤配給新請求。

安全配對至少考慮connection epoch、peer、function或操作類型、資料位址與長度，以及該筆是否仍在pending。epoch由本端每次建立新應用連線或重置通道時遞增；它不是TCP規格自動提供的欄位，而是本端資料模型。

回覆能核對哪些欄位，取決於協定實際帶出的欄位。不能假設每種回覆都echo請求地址，也不能擅自把猜出的欄位當作協定證據。以Modbus TCP為例，應依實際封包和例外回覆核對Transaction Identifier、Protocol Identifier、Unit Identifier、功能碼、長度與可得資料；地址是否出現在回覆中要看功能與PDU格式。

TCP連線關閉後，不能把舊連線位元組直接想成會跑進新socket；但應用層callback、排程佇列或共享buffer仍可能把舊結果交給新邏輯。因此epoch和pending狀態要在callback入口再次驗證，不能只依socket物件地址或seq。

## 建立可核對的交易鍵

可將待回覆鍵設計為(epoch, peer, protocol, transaction_id, function, address, length)，但只有協定真正提供或本端確實保存的欄位才可比較。送出時保存請求摘要、建立時間、deadline和狀態pending；回覆到達時先找epoch和peer，再依可用欄位核對，最後確認尚未完成且未過期。

具體案例：epoch=12曾送出TID=0讀取，逾時後關閉並建立epoch=13，新連線重新使用TID=0。舊讀取工作的callback帶epoch=12與TID=0回來，即使功能碼相同也被拒絕；只有epoch=13對應的pending可完成。另一項邊界測試再獨立檢查65535回捲至0，不混成同一請求。

另一案例是在同一連線內TID=41完成後，序號回捲再出現TID=41。若舊pending已是completed，任何第二個TID=41結果都不能再次更新輸出；若重用前沒有安全隔離，也不能只靠數字相等判定它是新的。

function、address和length可協助發現錯配，但不能把未由協定保證的欄位當成唯一ID。若回覆沒有地址，只核對協定確實帶出的欄位，並在序列化之外明訂逾時後通道隔離策略。

## 逾時與重用前的安全策略

逾時不是立即表示對端沒有執行。舊請求可能已在服務端完成，只是回覆晚到。因此late response要進入獨立分流：保存證據、不可更新新請求、不可自動重放有副作用的write。需要重試時，先用結果查詢、冪等request或人工確認，不能只換一個TID繼續寫。

若逾時後無法界定遲到回覆上限，本例選擇關閉舊TCP連線、終止其讀寫工作，再建立新連線世代；僅增加本地epoch而不隔離原串流無法辨識無世代欄位的舊回覆。單筆outstanding能避免同時請求混淆，卻不能單獨解決逾時後重用識別的問題。

安全窗口要用單調時間計算，包含最長網路延遲、服務處理和callback排隊時間。若無法證明舊回覆已不可能到達，就不能在同一epoch中安全重用容易碰撞的鍵。關閉socket可降低風險，但不能替代應用層epoch和狀態檢查。

若TID欄位回捲但仍有多筆pending，應暫停產生可能碰撞的新TID，或等待舊項目完成、取消並完成隔離。取消也要有明確結果，不能把本端刪除pending當成對端已停止。若對端沒有取消語意，晚到回覆仍可能出現，必須保留epoch判斷。

地址和長度的比對要注意方向與編碼。請求的起始地址可能不會原樣出現在回覆，資料長度也可能以位元組或暫存器數表示；未經協定確認不可把兩者直接相等。配對邏輯應記錄使用了哪些欄位、哪些欄位不可用，便於審查。

正常結果是新回覆只讓對應pending從sent轉completed一次；失敗結果是舊epoch回覆被記錄為late而不改變新資料。排查時先看epoch、TID、建立與完成時間、socket或callback來源，再查function和長度，不要只看TID。

## 驗收向量與限制

離線驗收至少測：TID 65535後回到0、同TID不同epoch、同TID同epoch但已completed、回覆function錯、長度錯、peer錯、逾時後晚到、例外回覆、共享callback延遲，以及重連後第一筆回覆。每列要寫接受、丟棄或待人工查詢及理由。

Modbus TCP的標頭欄位可作協定核對參考，但不同功能的PDU回覆格式仍要依Modbus規格確認。不可泛化成所有TCP或所有PLC通訊都會echo地址、長度或自訂request_id。若協定欄位不足，降低併發或加一層已驗證的代理。

本文只描述回覆配對與資料狀態，不提供特定PLC函式、寄存器或socket API。實際Q系列PLC的通訊模組、逾時行為、重連和資料保持要查目標手冊。內容已做案例核對。

若日誌缺少連線世代、peer和請求摘要，先補可觀測性再調整序號策略。能證明的結論應寫到欄位層級，例如「TID相同但epoch不同而丟棄」，不要只寫「收到舊封包」。

對於讀取類請求，晚到結果通常可丟棄並重新查詢；對於寫入類請求，晚到結果可能代表設備已改變，必須把未知結果交給業務層處理，不可一律當成無害資料。

## 常見問題

若採單一outstanding策略，正常完成後可送下一筆；若逾時或只有本地取消，仍需完成舊回覆隔離，不能立即重用通道與識別。這會降低吞吐量，但在協定沒有足夠識別欄位時，通常比猜測配對更容易驗證。

連線epoch的儲存也要跨callback一致。重連函式先遞增epoch再發布新socket，舊socket的任何錯誤或回覆都只能結束舊流程，不得把新epoch標成healthy或完成新請求。

若設備只回傳功能碼與資料，且沒有足夠欄位辨識請求，應將同時請求限制為一筆，逾時後先隔離舊通道再送下一筆，並記錄這項限制。吞吐量降低是可說明的取捨，錯配寫入則可能造成不可逆製程結果。

每次丟棄late response仍要記錄來源、TID、epoch、收到時間和摘要，避免為了清理資料而失去證據。若同類事件持續增加，先調查服務延遲與重連，再考慮擴大安全窗口。

問：TID不同就一定是不同交易嗎？答：仍需配合peer、epoch、功能與pending狀態；TID只是有限欄位。

問：關閉舊TCP連線後還要檢查epoch嗎？答：要；共享callback、排程或buffer仍可能把舊結果交給新邏輯。

問：Modbus TCP回覆一定會帶回請求地址嗎？答：不能泛化，依功能的實際PDU核對可得欄位，不能自行假設。

問：逾時後換TID重送write安全嗎？答：不一定；舊write可能已完成，應先查結果或使用已定義的冪等策略。

參考：[Modbus Messaging on TCP/IP Implementation Guide V1.0b §3.1.3：MBAP與兩byte Transaction Identifier。](https://www.modbus.org/file/secure/messagingimplementationguide.pdf)

參考：[IETF RFC 9293 TCP規範，說明TCP連線與位元組流背景；應用層交易世代與pending策略由本文資料設計。](https://www.rfc-editor.org/rfc/rfc9293.html)

參考：[Modbus Application Protocol V1.1b3：功能碼與各種回覆PDU欄位。](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf)

## 延伸閱讀

- [CRC驗證失敗時如何保存原始封包供追查](/articles/crc-failure-raw-frame-evidence)
- [非同步亂序回覆如何用待回覆表配對](/articles/async-out-of-order-pending-map)
