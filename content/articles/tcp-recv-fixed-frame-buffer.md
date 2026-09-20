---
title: TCP分次recv如何組成完整固定長度訊息
description: 以固定5 byte HELLO 分成 HE、L、LO 示範 TCP recv 分段、buffer/cursor、EOF截斷、WouldBlock與總deadline。
date: 2026-09-21
author: 站長
draft: false
category: 工業通訊與網路
---

## 一 TCP recv 不等於一個完整訊息

本篇用固定 5 byte 的 toy frame「HELLO」說明 TCP 組包。以下是假設接收觀察切分成「HE」、「L」、「LO」三段；即使發送分三次，也不保證接收切法相同。接收端可能第一次 recv 只拿到 2 bytes，第二次拿到 1 byte，第三次才拿到 2 bytes。TCP 提供的是有序位元組串流，不替應用程式保留訊息邊界；一次 recv 的長度不能當成一個完整 frame。

接收器要有 buffer、read cursor、expected_length=5 與 frame 狀態。每次 recv 得到 bytes 後附加到 buffer，從 cursor 取尚未消費的資料；累積長度小於 5 就保留，不能把「HE」解碼成半個文字，也不能丟掉等待下一段。湊滿 5 bytes 後才驗證 frame，再把 cursor 前移 5。

byte 數和 UTF-8 字元數不同。固定長度協定若寫 5 bytes，就以位元組計算；只有在完整 frame 取出後，且規格說明 payload 是 UTF-8，才做解碼。不能先把每次 recv 當字串再用字元長度補齊，否則多位元組字元可能被切在兩次讀取之間。

| 讀取次序 | recv結果 | buffer狀態 | 動作 |
| --- | --- | --- | --- |
| 1 | HE | 2 bytes | 保留，未完成 |
| 2 | L | 3 bytes | 保留，未完成 |
| 3 | LO | 5 bytes | 取出 HELLO |
| 4 | 空bytes/EOF | — | 依狀態判斷完整或截斷 |

固定長度不表示固定次數。若應用規格要求每個工作包含三個 5 byte frame，接收器仍要以 frame_count 和工作識別分組；不能收到任意 15 bytes 就當成三個有效 frame。frame 邊界先由 byte 數決定，工作邊界再由上層狀態決定。

本案例 frame 沒有 magic、長度或校驗欄位，只有固定 5 bytes；實際協定若還有 header，應另寫 framing 規則。toy frame 的目的只是展示 recv 分段，不應把「收到 5 bytes」誤當成任何工業協定已驗證。

## 二 buffer 與 read cursor 的實作順序

每次讀取先判斷 socket 結果：收到正數 bytes 就附加到 buffer；在要求讀取正數byte時，收到 0 bytes 表示對端有序關閉，只有在 buffer 沒有未完成資料時才可視為正常結束；若 buffer 尚有 1 至 4 bytes，應標 TruncatedFrame。非阻塞 socket 若暫時沒有資料，應標 WouldBlock/暫停，不是 EOF。

取 frame 時使用 cursor，而不是每次成功後把整個 buffer 複製成字串。若一次 recv 收到「HELLO」再接著收到下一個固定 frame「WORLD」，同一 buffer 可在迴圈中取出兩個 5 byte frame；剩餘 bytes 先留在 buffer，直到下一個完整 frame。

read cursor 只在完整消費後前移。若驗證失敗，記錄 frame_offset、原始 bytes 與錯誤原因，再依協定決定關閉連線；本篇沒有 magic resync 規則，因此不能任意搜尋下一個 H 來「自動復原」。未知的位元組排列應視為 framing error，不可悄悄刪除前綴。

| buffer內容 | cursor | 可做的事 | 不可做 |
| --- | --- | --- | --- |
| HE | 0 | 等待 | 補成HELLO或轉文字 |
| HEL | 0 | 等待 | 提前交付 |
| HELLO | 0 | 交付並cursor=5 | 重複交付 |
| HELLOWORLD | 0 | 交付兩個frame | 只讀第一個後丟尾端 |
| HEL | 0且EOF | TruncatedFrame | 當成正常空讀 |

buffer 可採 bytearray 或環形區，但驗收時要觀察 邏輯已消費byte數的單調增加；實體環形索引可能回繞。每次交付 HELLO 後，cursor 必須正好增加 5；若只增加 4，下一次會把最後一個 O 與新資料錯拼。日誌可記錄 buffer_length_before、take=5、cursor_after。

接收迴圈也要限制單次 append 的最大輸入，避免對端一次送來遠大於預期的資料使記憶體無界增長。固定 5 bytes frame 若累積超過可接受的未處理 frame 數，應標 BufferLimitExceeded，保存已知完整 frame 數與剩餘長度後依規格關閉。

為避免無限累積，應設定 partial frame 上限與總 deadline。固定長度 frame 在 deadline 前仍未湊滿，就回報 PartialTimeout 並保留診斷資訊；deadline 到達後不能無限 recv。每個 recv 的短 timeout 與整體 deadline 是兩個不同概念。

## 三 timeout EOF 與非阻塞排查

假設總 deadline 為 500 ms：t=0 收到 HE，t=100 收到 L，t=500 仍缺 LO，應標 PartialTimeout，並記錄累積 3 bytes。若 t=300 收到 LO，湊滿 HELLO 後交付，下一個 frame 的 deadline 重新依協定建立。不要把每次短 timeout 都當作整體失敗，也不要跨 frame 無限延長。

對串流socket要求正數讀取長度後，成功回傳0 bytes才表示EOF。若在收到 HE 後對端關閉，這是中途截斷；若在 cursor 已經消費完且 buffer 為空時關閉，才是 clean EOF。非阻塞模式的 WouldBlock 代表當下沒有資料，接收器可等待事件或重試，不能清空 buffer，也不能標 connection closed。

若連線突然重置，應把當時 buffer、cursor、已交付 frame 數與 socket error 一起記錄。已完整交付的 HELLO 不需撤回，但未完成的資料不能拼到下一條連線。重新建立連線時建立新的 buffer、cursor、frame sequence，避免把舊尾端誤接到新串流。

| 時間/事件 | buffer | 狀態 | 預期 |
| --- | --- | --- | --- |
| t0 recv HE | HE | Partial | 等待 |
| t100 recv L | HEL | Partial | 等待 |
| t300 recv LO | HELLO | Complete | 交付 |
| t500 無資料 | 未滿5 | PartialTimeout | 結束本次等待 |
| recv=0且未滿 | HE | EOF | TruncatedFrame |
| WouldBlock | 原buffer保留 | 暫停 | 不是EOF |

短 timeout 不應把 partial frame 重設成空。若 t=100 ms 只收到 HE，短 timeout 到期時狀態仍是 Partial，下一次事件到達可繼續；只有總 deadline、EOF、連線錯誤或明確取消才結束本次 frame。

排查時先看原始 recv 次序與回傳長度，再看 buffer/cursor 日誌。若每個 frame 都少最後一個 byte，可能是把 recv 的回傳長度當成 frame 長度；若第二條 frame 開頭缺字，可能是成功取第一條後誤清空剩餘 buffer。

## 四 完整驗收與適用限制

離線驗收建立三組輸入：HE、L、LO；一次 recv 直接收到 HELLO；以及一次收到 HELLOWORLD。預期第一組交付一個 HELLO，第二組也交付一個，第三組在同一讀取迴圈交付 HELLO 與 WORLD。再測 HE 後 EOF，必須是 TruncatedFrame；測 HE 後 WouldBlock，必須保留等待狀態。

加入總 deadline 測試：HE 在 0 ms、L 在 100 ms、LO 在 600 ms，而 deadline=500 ms，應在 500 ms 標 PartialTimeout，不等待到 600 ms。若規格允許晚到資料另行丟棄，日誌仍保留 timeout 時的 buffer；不能把晚到 LO 接到新 frame。

固定 5 bytes 的 toy frame 沒有長度、校驗與版本欄位，無法檢查內容是否真的是 HELLO。可增加應用層驗證，例如完整取出後比較 內容屬於HELLO或WORLD；驗證失敗需標 PayloadMismatch。這是內容規則，和 TCP 是否完整是兩個階段。

| 驗收項目 | 輸入/事件 | 預期結果 |
| --- | --- | --- |
| 分段組包 | HE、L、LO | 一個HELLO |
| 多frame | HELLOWORLD | 兩個frame |
| 中途EOF | HE後recv=0 | TruncatedFrame |
| 短暫無資料 | HE後WouldBlock | 保留buffer |
| 超時 | 3 bytes超過500ms | PartialTimeout |
| 內容錯誤 | ABCDE | PayloadMismatch |

驗收還要測試 payload「ABCDE」：它有 5 bytes，所以 framing 完整但內容不是本測試允許的HELLO或WORLD。這時應先標 PayloadMismatch，再依應用規則關閉或回錯；不能把內容錯誤混成 Partial。

把測試結果寫成 frame_seq=1 HELLO、frame_seq=2 WORLD，並記錄每次 recv 長度，可驗證順序與邊界。若測試只檢查最後字串，可能漏掉中途重複交付或遺失尾端的錯誤。

本篇只教 TCP byte stream 的接收狀態，不提供 PLC 指令、設備寄存器或安全控制程式。實際 socket API 的 timeout、非阻塞事件與錯誤型別要依目標語言和作業系統核對；不可把 Python 行為直接宣稱為 PLC 通訊保證。

## 五 驗收 FAQ 與來源

本題固定 frame 長度為 5 bytes，分段 HE、L、LO 必須組成 HELLO；一次 recv 少於 5 bytes 不是錯誤本身。只有湊滿後才交付，EOF 中途標 TruncatedFrame，WouldBlock 保留等待，總 deadline 超過標 PartialTimeout；本例隨即關閉連線，禁止把遲到尾端拼進新訊息。

FAQ1：每次 recv 回傳 5 bytes 就一定是一個 frame 嗎？答：若目前 buffer 正好只剩一個 frame 可以取，才可交付；一次 recv 也可能包含多個 frame 或半個 frame，必須依 buffer 與固定長度迴圈處理。

FAQ2：recv 回傳 0 和暫時沒有資料一樣嗎？答：不一樣。0 是有序 EOF；非阻塞 WouldBlock 只是當下沒有資料，不能清掉未完成 buffer。

FAQ3：為何不能把半個 UTF-8 字串先解碼？答：byte 邊界可能切在多位元組字元中間。先按 byte 組完整 frame，再依協定解碼。

FAQ4：連線重建後可以接續舊 buffer 嗎？答：不能，除非應用協定明確提供跨連線續傳。一般情況建立新 buffer 與 sequence，舊尾端標截斷。

參考：[RFC 9293：TCP byte stream 與連線語義的官方規範，非應用層 framing 定義。](https://www.rfc-editor.org/rfc/rfc9293)

參考：[Python Socket HOWTO：socket recv、阻塞與資料讀取概念參考，非 PLC API。](https://docs.python.org/3/howto/sockets.html)

## 延伸閱讀

- [Socket半開心跳逾時如何回收連線](/articles/socket-half-open-heartbeat-recovery)
- [長度前綴如何拆解多個變長訊息](/articles/tcp-length-prefixed-multiple-frames)
