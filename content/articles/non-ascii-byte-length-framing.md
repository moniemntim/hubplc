---
title: 非 ASCII 長度以 byte 正確拆包
description: 以中、A中B、emoji與NFC/NFD案例區分 bytes、Unicode code points與UTF-16 code units，建立byte length前綴及strict decode驗收。
date: 2026-09-21
author: 站長
draft: false
category: 工業通訊與網路
---

## 一 先定義長度單位

文字通訊最先要定義長度單位。UTF-8 的中文「中」編碼為 E4 B8 AD，共3 bytes；字串 A中B 有 A(1)+中(3)+B(1)=5 bytes，但只有3個 Unicode code points。emoji 😀 在 UTF-8 是4 bytes、1個 Unicode code point；在 UTF-16 會占2個 code units。length 欄位若不說清楚，接收端就可能少讀或多讀。

本篇自訂 frame 將 length 定義為 payload 的 byte 數，不包含2-byte header。sender 先以 UTF-8 encode，再填 length；receiver 先收滿 header 指定的 bytes，再 strict decode。不能先用畫面看到的「字數」切片，也不能把 UTF-16 code unit 數直接放進 UTF-8 frame。

| 資料 | UTF-8 bytes | code points | 備註 |
| --- | --- | --- | --- |
| 中 | E4 B8 AD / 3 | 1 | 不能以1當byte長度 |
| A中B | 41 E4 B8 AD 42 / 5 | 3 | 長度欄填5 |
| 😀 | F0 9F 98 80 / 4 | 1 | UTF-16為2 code units |
| é NFC | C3 A9 / 2 | 1 | 需先定正規化政策 |
| e+combining NFD | 65 CC 81 / 3 | 2 | 視覺一個grapheme |

字元、code point、grapheme cluster 與 byte 是不同概念。UI 顯示的一個視覺字形可能由多個 code points 組成；協定 framing 通常應以 bytes 定義，文字驗證再以 Unicode 規則處理。規格應寫出 encoding、length 的涵蓋範圍、最大 payload 與錯誤行為。

若目標是 ASCII-only 欄位，就要明訂只允許 0x00–0x7F，不能因測試只送英文便假定所有 UTF-8 都是一 byte。非 ASCII 欄位則保留原始 bytes，待 strict decode 成功後才交給上層。

## 一 先定義長度單位 續 與二 UTF-8 前綴

接收器的 buffer 應以 bytes 保存，不能用 Python 或其他語言的字元索引代替。若 buffer 內有 E4 B8 而下一次才收到 AD，cursor 仍停在 payload 起點；只有收滿 declared_length 才能移除該 frame。每次讀取都記錄 received_length，便能判斷是慢到、斷線或錯誤長度。

長度欄位本身也要驗證 big-endian 順序。00 05 與 05 00 分別代表5與1280；若最大 payload是1024，後者必須在配置前拒絕。不要因為內容看起來像文字就重新搜尋下一個 magic byte，否則會把合法 payload 誤切。

規格文件應明確寫出最大 frame、header byte order、encoding 與錯誤碼，並提供 raw hex 的診斷格式。若不同設備使用不同上限，能力協商要傳 max_payload_bytes，不能只依產品名稱猜測。

在接收流程中先做長度與資源檢查，再等待 payload；收到超過上限的前綴立即拒絕並清理該連線或 frame。這可避免錯誤長度讓程式配置過大緩衝區。

案例 frame 使用兩 bytes big-endian length。送 A中B 時 payload bytes 是 41 E4 B8 AD 42，length=5，完整 frame 為 00 05 41 E4 B8 AD 42。送 😀 時 length=4，不能填1；送 é 時若採 NFC，payload C3 A9 length=2，若採 NFD，payload 65 CC 81 length=3。兩種表示都要在規格中決定。

NFC/NFD 不應在 framing 中偷偷互換。若 sender 先 NFC、receiver 以 byte 長度讀取後再比較文字，應保存原始 payload 與 normalization policy；若需要 canonical comparison，另產生 derived_normalized 欄位，不能覆蓋 raw。

| 步驟 | A中B案例 | 結果 |
| --- | --- | --- |
| encode | UTF-8 | 41 E4 B8 AD 42 |
| count | len(bytes) | 5 |
| prefix | big-endian 2 bytes | 00 05 |
| decode | strict UTF-8 | 成功，3 code points |
| 驗收 | 比較 raw與policy | 不以顯示字數代替5 |

## 二 UTF-8 NFC/NFD 與長度前綴 續

長度前綴也要明訂是否包含 header。本篇不包含；若另一協定包含 header，就必須使用另一個欄位名稱或版本，不能讓接收端猜。最大長度例如 1024 bytes，收到 1025 或 0 時先拒絕，不先依長度配置大緩衝區。

拆包時若 header 收到一半，保留已收到 bytes；若 payload 只收到前三 bytes，保持 partial frame，不能把不完整 UTF-8 當成替代字元後交付。timeout 應分 header deadline 與 payload deadline，並記錄已收 byte 數。

NFC 與 NFD 的差異會影響 byte length 和相等比較。若設備 A 傳 C3 A9、設備 B 傳65 CC 81，兩者可能顯示相同，但 raw bytes 不相等；協定可要求 sender 一律 NFC，也可允許兩者並在應用層正規化，但必須把 policy 和原始資料分開保存。

長度限制若是 10 bytes，A中B 只占5 bytes，五個 ASCII 也占5 bytes；不能以 code point 數量判斷是否超限。若要另限制最多8個 Unicode code points，應使用第二個欄位或驗證規則，不能把兩個上限混成一個 length。

若 application 另有字元數上限，應在 strict decode 成功後計算 code points 或 grapheme，並把結果與 byte length 分開記錄。對 A中B 應是5 bytes、3 code points；兩個數值各自驗證，不能只留一個 length。

完整 payload 收到後才做 strict UTF-8 decode。若 bytes 包含非法起始 byte、截斷的多 byte sequence 或無效 continuation，結果應是 InvalidUtf8；不能以 replacement character U+FFFD 代替後宣稱資料有效。raw bytes、frame_id、length、錯誤位置與接收時間要保留，方便排查編碼錯誤。

案例收到 00 03 E4 B8 00：header 宣告3 bytes，但最後一 byte 不是 AD，strict decode 失敗。接收器應拒絕本 frame 並進入明確錯誤狀態；不能只刪掉錯誤 byte，因為那會改變 payload 語意。下一 frame 是否可繼續，要依協定是否有可靠 frame boundary 決定。

## 三 strict decode 與無效資料 續

若 payload 是 binary，不應強行 decode UTF-8；欄位規格要標成 binary 或 text。混合訊息可先用外層 schema 指出每個欄位型別。把所有 bytes 當字串是常見根因，尤其長度欄與 checksum 都不應經過文字轉換。

| 輸入 | 問題 | 預期狀態 | 保存 |
| --- | --- | --- | --- |
| E4 B8 AD | 合法3-byte字元 | Accepted | raw與decoded |
| E4 B8 00 | invalid continuation | InvalidUtf8 | raw、異常byte索引2 |
| E4 B8 | 截斷序列 | Partial/timeout | 已收2/宣告3 |
| FF | 非法UTF-8起始 | InvalidUtf8 | raw與錯誤原因 |

排查時先看 framing：header 是否正確、實收 bytes 是否等於 length，再看 decode；順序反過來容易把少收資料誤判成編碼故障。若同一 socket 混用不同 encoding，先依 message type 分流，不能依內容猜 encoding。

strict decode 的錯誤位置要以 byte offset 表示，例如E4 B8 00中不合法的接續byte索引為2；解碼API可能回報整段序列的起點0，須另保存API原始錯誤範圍。這比記錄「第三個字錯誤」更可靠，因為一個 code point 可能占多個 bytes。錯誤事件保存 frame_id、header raw、payload raw、expected與received，並限制日誌大小。

若協定允許 binary 與 text 共存，message_type 或 schema 應先指定型別。binary payload 即使恰好可解碼成 UTF-8，也不能因此轉成文字；text payload 若 decode 失敗，則回 InvalidUtf8。這個分流避免資料被不可逆轉換。

接收迴圈應把 timeout、EOF、would-block 分別標示。would-block 只表示目前沒有資料，不是 frame 完成或 EOF；EOF 若發生在 header 或 payload 中，應記錄截斷位置。

具體測試先送 A中B 的 frame 00 05 41 E4 B8 AD 42，在接收函式測試替身中，依序回傳00、05 41 E4、B8 AD 42三段；真實TCP不能由三次send保證三次recv。接收器每次只追加 buffer，讀 cursor 在收滿5 bytes前不交付；第三次收到後才 strict decode 成功，結果為3 code points、5 payload bytes。

## 四 分段接收與驗收流程

第二個測試送兩個連續 frame：00 03 41 42 43 00 04 F0 9F 98 80。一次 recv 可能拿到全部，也可能跨多次；解析迴圈要在 buffer 仍有完整下一個 frame 時繼續，不能把第二個 header 當第一個 payload。

第三個測試送尾端 00 04 F0 9F，然後 deadline 到期。結果是 PartialPayload，保留 frame_id、expected=4、received=2 與 raw；不可 strict decode 部分資料，也不可補零或替換字元。重連後要清楚決定是否丟棄未完成 frame，不能把新連線 bytes 接到舊 buffer。

| 測試 | 分段 | 預期 | 排查欄位 |
| --- | --- | --- | --- |
| A中B | 3 recv | Accepted/5 bytes | buffer與cursor |
| 兩frame | 一次或多次 | 各交付一次 | frame boundary |
| emoji | 4 bytes | Accepted/1 code point | 非1 byte |
| 尾端截斷 | 只收2/4 | PartialPayload | deadline與raw |

驗收紀錄同時列 raw hex、declared_length、received_length、decode_status、code_point_count 與 normalization policy。這些欄位可區分「前綴錯」「傳輸少收」「編碼無效」與「應用層拒絕」，不要只記錄一個 parse failed。

測試還要包含 header 分段：先只送00，超過 header deadline 應是 PartialHeader；送00 05後只送兩 bytes，超過 payload deadline 應是 PartialPayload。兩者都不能誤報 InvalidUtf8，因為尚未有完整資料可解碼。

一次 recv 取得 00 03 41 42 43 00 00 時，第一 frame 應交付後，第二個 length=0 依本案例規格拒絕並記錄 offset；不能把第二個 header 留在已完成 frame 的尾端而造成下一輪錯位。

驗收時加入一個合法的四 bytes emoji 與一個非法 UTF-8 序列，確認同一套 parser 不會依顯示寬度做不同判定。所有拒絕結果都要能由 raw、length 與錯誤 offset 重現。

本文所有 length 都指 UTF-8 payload bytes，不包含2-byte big-endian header；strict decode 在收滿 payload 後才執行。NFC/NFD、grapheme 與 UI 顯示長度另行處理，不能拿來取代 frame byte length。

## 五 驗收 FAQ 與來源

FAQ1：「中」是1個字，length 可以填1嗎？答：本案例不能，UTF-8 payload 是3 bytes，length 必須填3。

FAQ2：emoji 顯示一個字，為何 length 是4？答：😀 是1個 Unicode code point，但 UTF-8 編碼占4 bytes；framing 使用 bytes。

FAQ3：收到半個中文字可以先顯示嗎？答：在協定交付前不行，先保留 partial bytes，收滿並 strict decode 後再交付。

FAQ4：invalid bytes 可用替代字元繼續嗎？答：本案例拒絕 InvalidUtf8 並保存 raw；是否容錯必須另訂協定，不能默認替換。

參考：[RFC 3629：UTF-8 編碼格式與合法序列範圍的官方規範。](https://www.rfc-editor.org/rfc/rfc3629)

參考：[Python Unicode HOWTO：str、bytes、encode/decode 與錯誤處理概念參考。](https://docs.python.org/3/howto/unicode.html)

驗收報表可加入 declared_length、received_length、header_status、frame_status、decode_status、normalization 與交付時間。對 A中B 應為5、5、Complete、Accepted、Valid；對截斷 emoji 應為4、2、PartialPayload、未decode。數值欄位使排查者不用猜畫面上的字數。

若 socket 斷線，保留 partial frame 的紀錄但在新連線建立時清空 framing buffer，除非協定明確允許跨連線重組。跨連線接續會把新訊息前綴誤當舊 payload，是資料串流常見的邊界錯誤。

若規格日後改成 length 包含 header，必須升版或使用不同 framing profile；不能讓舊接收器從數值大小猜測定義。來源文件、測試向量與設備版本要一起保存。

這些測試向量應納入回歸測試，確保 parser 改版後仍維持相同 byte 邊界與錯誤狀態。

## 延伸閱讀

- [協定版本協商失敗如何安全拒絕](/articles/protocol-version-negotiation-reject)
- [封包重送造成重複寫入如何設計冪等鍵](/articles/idempotency-key-duplicate-write)
