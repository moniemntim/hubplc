---
title: 長度前綴如何拆解多個變長訊息
description: 以2 byte big-endian length前綴示範多訊息迴圈、尾端保留、0/超限拒絕、EOF與跨連線清buffer。
date: 2026-09-21
author: 站長
draft: false
category: 工業通訊與網路
---

## 一 2 byte 長度前綴的契約

本篇把變長訊息定義為 2 byte big-endian unsigned length 加 payload，length 不包含 header，合法範圍限定 1 至 1024。收到 00 03 ABC 時，前兩 bytes 00 03 代表 payload 長度 3，接著取 ABC；不能把 3 當成整個 frame 的總長，也不能以小端序解成 768。

接收器維護 buffer、cursor、needed_length 與 frame 狀態。先確保至少有 2 bytes header，再讀 big-endian length；length=0、未知格式或大於 1024 先拒絕，不能先配置相應大小的記憶體。通過檢查後，才等待 length bytes payload。

案例串流「00 03 ABC 00 02 DE」包含兩個訊息：第一個 ABC，第二個 DE。一次 recv 可能收到完整串流，也可能把 header 和 payload 分開；每次補資料後都在迴圈重新檢查，若 buffer 還有下一個完整 frame 就繼續取，不能一個 recv 只處理一個訊息。

| bytes | 解讀 | 結果 | 剩餘 |
| --- | --- | --- | --- |
| 00 03 | length=3 | 建立待取3 bytes | 等待payload |
| ABC | payload3 | 交付ABC | 空 |
| 00 02 | length=2 | 建立待取2 bytes | 等待payload |
| DE | payload2 | 交付DE | 空 |

長度的端序要以 byte 級測試確認。00 03 代表 3；若錯當小端序會變成768，仍在1024上限內，可能錯等更多資料；單靠上限檢查抓不出這個錯誤。測試 01 00 代表 256，也能區分兩種端序；00 01也可辨別1與256；真正無法分辨的例子是01 01，兩端序都為257。

length 前綴是本篇自訂應用協定，不代表任何標準 Modbus、OPC UA 或 PLC 通訊格式。實際協定若有 magic、版本、校驗或壓縮欄位，應依其規格另行解析，不能任意套用這個兩位元組格式。

## 二 多訊息與尾端保留

若串流是「00 03 ABC 00 02 DE 00 04 XY」，前兩個訊息可交付，最後00 04表示payload需要四個bytes，目前XY只有兩個；測試預先指定後兩個bytes為ZW。接收器應保留 header 與 XY，狀態是 Partial；下一次收到 ZW 後才交付 XYZW。不能因目前 payload 只有 XY 就交付半個訊息。

一次 recv 可能帶有「00 03 ABC 00 02 DE」，處理迴圈先取 ABC，再看剩餘 buffer 是否足夠取 DE，兩者都完成才離開迴圈。若一次收到半個 header，例如只收到 00，必須保留 00 等待下一次，不可把它當長度 0，也不可搜尋下一個 00 來猜測。

read cursor 只在完整 frame 消費後前移。本例header已解析但payload未滿時，cursor仍停在header起點，另存needed_length；收齊後一次前移2+length；若 buffer 中有下一個 frame，先完成目前 frame 再繼續。為避免複製大量資料，可用索引或環形 buffer，但資料語義不變。

| 目前buffer | 狀態 | 動作 |
| --- | --- | --- |
| 00 | HeaderPartial | 等待第2個header byte |
| 00 03 AB | PayloadPartial | 尚缺1 byte |
| 00 03 ABC 00 | 下一header不完整 | 交付ABC，保留00 |
| 00 03 ABC 00 02 DE | 兩frame完整 | 交付ABC、DE |
| 00 04 XY | PayloadPartial | 保留待ZW |

當一次 buffer 有多個 frame，交付事件要按照原始順序產生：ABC 先於 DE。若上層處理 ABC 花費時間，接收層仍需保留 DE，不能覆寫或重新排序；每個事件附 connection_id、frame_seq 和 payload_length。

payload 本身可以包含 00 或看似下一個 header 的 bytes；因為長度已經界定範圍，解析器只在目前 payload 需要的 bytes 中取資料。不能在 payload 內搜尋 00 03 來切割，否則二進位資料會被錯誤拆開。

frame_seq 應在成功交付時增加，拒絕或截斷的 frame 也要保留診斷序號，不能用下一個成功訊息覆蓋錯誤紀錄。

每個 frame 要有 payload deadline 與整體連線 deadline。長度合法不代表可以無限等待；若 payload 只到 XY 後超時，標 PartialPayloadTimeout，保留診斷資訊並依協定關閉或重建連線。

## 三 拒絕未知長度與跨連線清理

length=0000 立即拒絕，因本契約要求至少 1 byte；length=1025 或 0xFFFF 也立即拒絕，不能配置 1025 或 65535 bytes 後再判斷。本版header只有長度，沒有版本欄；任何兩bytes都能解成整數，所以只靠header能判定的錯誤是長度超出1至1024，不能宣稱可自動偵測所有未知格式。拒絕原因要包含原始兩 bytes，方便辨認端序錯誤。

連線 A 若收到 00 04 XY 後斷線，新的連線 B 不能把 ZW 接到 A 的尾端，除非應用協定明確有 session resume 與序號。一般接收器在建立 B 時清空 buffer、cursor、needed_length 與 frame state，建立新的 connection_id；A 的 partial frame 標 TruncatedFrame。

不能用 magic 任意 resync。這個自訂格式沒有 magic，任意搜尋 00 03 或下一個看似合理的長度可能把 payload 內容誤當 header。若需要錯誤復原，應另外設計不可混淆的 magic、版本、長度、校驗與重同步規則；本篇選擇拒絕並重建連線。

| 事件 | 狀態 | 正確處理 | 禁止 |
| --- | --- | --- | --- |
| length=0 | HeaderRejected | 記錄原始header | allocate後再猜 |
| length=1025 | HeaderRejected | 立即拒絕 | 接受超限payload |
| A:00 04 XY後EOF | TruncatedFrame | 結束A | 把ZW接B |
| B新連線 | NewState | 清空所有buffer | 沿用A cursor |
| 內容錯誤 | PayloadRejected | 依規格關閉 | 搜尋任意下一個header |

partial payload 的 deadline 應從合法 header 被完整解析時開始，連線總 deadline 則從本次接收工作開始。這兩個時鐘都要記錄；若 header 等待太久與 payload 等待太久，排查時可分辨是對端未送長度還是未送完內容。

排查時先核對端序、header 讀取位置與最大長度，再看是否清理跨連線狀態。若所有長度都大得離譜，常見原因是把 big-endian 當 little-endian；若新連線第一個訊息缺頭，常見原因是沿用了舊 buffer。

## 四 完整測試與限制

離線測試一使用「00 03 ABC 00 02 DE」，可一次或分段送入，預期兩個 payload。測試二使用「00 04 XY」再送 ZW，第一階段不得交付，第二階段交付 XYZW。測試三把 header 拆成 00、03，確認第一段只保留 header partial。

拒絕測試包含 00 00、04 01（長度 1025）與 FF FF。每筆都要在 allocate 前標 HeaderRejected，buffer 內容、連線 ID、raw header 與時間寫入診斷。不要把拒絕的兩 bytes 丟掉後繼續掃描，因為本格式沒有可安全重同步的標誌。

EOF 測試在完整訊息後關閉，預期 clean EOF；在 00 04 XY 後關閉，預期 TruncatedFrame。非阻塞 WouldBlock 則保留已收到資料，不能清空或誤標 EOF。若總 deadline 到達仍缺 ZW，標 PartialPayloadTimeout，並與中途 EOF 分開。

| 測試 | 輸入/事件 | 預期 |
| --- | --- | --- |
| 多frame | 00 03 ABC 00 02 DE | 交付ABC、DE |
| 分段payload | 00 04 XY→ZW | 先Partial，後交付XYZW |
| 零長度 | 00 00 | HeaderRejected，不allocate |
| 超限 | 04 01或FFFF | HeaderRejected |
| 跨連線 | A尾XY，B送ZW | A截斷，B不接續 |
| 非阻塞 | WouldBlock | 保留buffer |

若需要真正復原能力，應在新版本協定加入 magic 與校驗並定義 resync 規則；不能在本版本臨時搜尋任意 00。無 magic 的格式遇到未知長度時關閉連線雖較保守，但能避免把合法 payload 誤切成後續訊息。

每次拒絕都要停止後續 frame 解析，除非協定有經過驗證的重同步程序。記錄 raw header、connection_id、cursor 與 buffer 長度，重新連線後再從全新狀態開始，可避免錯誤資料連鎖污染。

驗收報告應把每個 payload 的原始 bytes 或安全摘要、長度、frame_seq 與交付時間列出。若應用層解碼成文字，也要保留解碼前長度，避免多位元組字元數被誤當成 framing 長度。這些欄位能分辨端序錯誤、截斷、內容拒絕與文字解碼問題。

本篇只說明長度前綴的 byte framing；payload 是否文字、JSON 或二進位需另訂。實際 socket 的阻塞、錯誤、deadline 與記憶體安全策略要依目標語言和平台驗證，不能把 Python socket 範例當 PLC 通訊指令。

## 五 驗收 FAQ 與來源

本題契約是 2 byte big-endian、length 不含 header、合法 1–1024。00 03 ABC 00 02 DE 產生兩則訊息；尾端 00 04 XY 只保留等待 ZW。length=0、超限或未知格式先拒絕且不配置，跨連線清空 buffer，不做任意 magic resync。

FAQ1：length=3 是否代表整個 frame 三 bytes？答：不是。本契約 length 只代表 payload，完整 frame 是 2 byte header 加 3 byte payload，共 5 bytes。

FAQ2：一次 recv 收到兩個 frame 可以只處理第一個嗎？答：不能丟掉尾端。交付第一個後，迴圈應繼續從 buffer 取第二個完整 frame。

FAQ3：為什麼不把超限長度截成 1024？答：截斷會改變訊息邊界並掩蓋協定錯誤。應在配置前拒絕並記錄 header。

FAQ4：新連線收到舊連線剩餘 payload 可以接續嗎？答：一般不可以。除非另有 session resume 與序號規格，否則清空舊 buffer 並將舊 frame 標截斷。

參考：[RFC 9293：TCP byte stream、EOF 與連線語義的官方規範，非本篇應用 framing。](https://www.rfc-editor.org/rfc/rfc9293)

參考：[Python Socket HOWTO：socket 讀取與完整資料組裝概念參考，非 PLC API。](https://docs.python.org/3/howto/sockets.html)

## 延伸閱讀

- [TCP分次recv如何組成完整固定長度訊息](/articles/tcp-recv-fixed-frame-buffer)
- [二進位協定的大小端如何用已知封包驗證](/articles/binary-protocol-endianness-known-frame)
