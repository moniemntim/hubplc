---
title: 設備回應過長被截斷如何拒絕不完整資料
description: 區分TCP分段與應用截斷，以length、maxframe、EOF、deadline、checksum和平台UDP截斷語意拒絕不完整回應，不補零。
date: 2026-09-21
author: 站長
draft: false
category: 工業通訊與網路
---

## 先分TCP分段與應用截斷

TCP是位元組流，網路分段或一次read只拿到部分資料，不等於設備回應被截斷。應用層要依協定 framing 重組：固定長度、長度前綴、換行或明確EOF。只有收齊契約要求的完整frame，才能交給解析器；不能把一次read當成一個回覆。

先讀固定標頭，解析宣告length並檢查是否超過maxframe、是否小於最小合法長度。若宣告長度為800但maxframe=512，立即拒絕並記錄oversize；另在maxframe=1024的案例，宣告800只收到300，保持incomplete直到收齊或逾時，不補零、不拿300交給控制流程。

EOF表示對端關閉傳送方向，是否代表完整資料要看協定。若協定要求length=800而EOF時只收300，結果是不完整；若協定以EOF作唯一邊界且前置格式合法，才可依契約完成。不要把TCP FIN自動當成設備回應成功。

本篇不假稱Q系列PLC提供固定的frame函式、buffer暫存器或截斷旗標。實際socket API、通訊模組和設備協定要依官方文件確認；本文提供的是資料驗證與排查模型。

## 以length maxframe與deadline判定

案例：標頭宣告length=120，maxframe=256；第一次read收到40，第二次收到80，累計120且校驗通過，才是完整回應。若第二次只收到60，累計100，deadline到期便標IncompleteTimeout。兩個案例的TCP都可能正常，差別在應用frame是否完成。

若標頭宣告length=100000，超出maxframe，先標LengthTooLarge並隔離該連線或訊息，避免依宣告無限配置記憶體。若length欄位本身格式錯，標HeaderInvalid；若資料長度足夠但checksum錯，標IntegrityFailure，不要降級成可用資料。

deadline分為header timeout、body timeout和整體response timeout，或依協定採一個明確期限。使用單調時間計算，保存已收bytes、預期bytes、最後收到時間和連線epoch。遲到的完整frame若已超過本次請求期限，也不能直接更新控制結果。

拒絕後不補零、不沿用上一筆、不把短資料右側填空白再解析。若上層需要顯示，回傳invalid與原因、原始長度和request_id；控制流程只能消費valid且完整的快照。

若同一連線同時有多個frame，收齊第一個後要依cursor保留後續bytes，不能因第一個frame失敗就把整個buffer盲目當成下一次資料。若格式錯誤造成邊界無法恢復，隔離或關閉通道比猜測下一個header安全。

完整性檢查應在任何數值轉換、單位換算或控制輸出之前完成。這樣即使截斷資料的前綴剛好能解析，也不會被誤當成合法的低值或零值。

## UDP截斷要查平台語意

UDP是訊息導向，但接收API遇到應用buffer太小時，是否保留、丟棄或標示被截斷，取決於作業系統和API。某些平台會提供truncation旗標或錯誤資訊，某些抽象層可能只回傳可用前綴；不能把某一語言的行為泛化到Q系列PLC或所有socket。

UDP回應要同時核對來源、訊息長度、協定欄位、checksum或應用序號。若平台明確回報truncated，立即拒絕；若平台沒有可靠旗標又無法從length判斷完整，應把結果標unknown/incomplete並改用較大受控buffer、分片協定或TCP，不可猜測剩餘內容。

TCP案例和UDP案例要分開驗收。TCP的多次read只是分段，不能拿read次數判斷截斷；UDP一次接收可能已丟掉超出buffer的尾端，不能靠下一次receive補回同一個datagram。保存transport、API回傳長度、旗標與實際frame length，排查才有依據。

正常結果是完整length與校驗通過；失敗結果是oversize、EOF不足、timeout不足、checksum錯或UDP truncation。每種原因分流，避免全部顯示為「設備沒回覆」而漏掉協定格式問題。

排查報告保存header bytes、宣告length、收到length、maxframe、最後收到時間和連線epoch；敏感payload可只保存摘要。這些欄位足以重現「尚未收齊」與「根本超過上限」的差異。

若回應使用換行作邊界，仍要設定單行maxframe與timeout。收到長度未超限但沒有換行時維持incomplete；換行後若還有下一段bytes，應依cursor分成下一個frame，不把黏包內容丟失。

固定長度協定則不需要等待換行，但要驗證每一筆恰好達到固定大小。多出的bytes可能是下一筆資料，也可能是格式錯誤；若無法判斷邊界，應隔離通道並保留原始摘要。

共享工作佇列在重連後交出舊frame時，除完整性外還要核對connection epoch和request_id。即使長度與checksum都正確，若屬舊連線，也不能更新新連線的控制快照。

若設備協定沒有length、固定大小、換行或EOF等可靠邊界，應先補足協定契約，不要靠讀取間隔猜測一筆回應。任何以時間「剛好沒有更多資料」作為完成條件的做法，都可能在網路延遲或分段時提早交付。

maxframe拒絕後要決定連線是否可繼續。若header宣告已造成邊界失去同步，通常隔離或重建通道較可驗證；若協定能跳過完整oversize frame，才依規格清理並繼續。狀態要回報invalid，不可只記一個警告後交給控制。

超長回應也可能是版本不相容或設備錯把診斷資料送到業務埠，排查時保留header和來源識別。若來源不明，先拒絕並告警，待確認協定後恢復；不要靠猜測繼續交付資料給控制流程。

## 驗收與適用限制

離線驗收至少測：TCP標頭分段、完整length、宣告過大、body少資料後EOF、body少資料後timeout、checksum錯、遲到完整frame、UDP足夠buffer、UDP小buffer加truncation旗標、UDP無旗標但length不明。每列核對valid、原因、已收bytes與是否更新輸出。

maxframe要和記憶體預算、最大合法設備回應及並行請求共同決定。調大buffer只能降低部分截斷風險，不會修復錯誤length、錯誤checksum或設備格式不相容。變更後要重新測試峰值、併發與逾時，不能只測一筆正常回應。

實際平台的UDP截斷旗標、TCP EOF語意、socket錯誤和PLC通訊模組行為必須查官方手冊。本文是協定資料設計。

排查先看協定宣告長度，再看API回傳長度與旗標、EOF、deadline、epoch和checksum。若只有payload前綴且契約要求尚未滿足，結論是資料不完整，不是把缺少部分補成零後繼續。

## 常見問題

問：TCP一次read拿到300 bytes就代表回應只有300嗎？答：不代表；TCP可能分段，應依length或其他framing收齊。

問：宣告800但只收到300可以補500個零嗎？答：不可以；標IncompleteTimeout或EOF不足，拒絕不完整資料。

問：UDP一定有截斷旗標可查嗎？答：不一定；依作業系統和API官方文件確認，沒有可靠證據就標不完整或改用受控協定。

問：TCP收到FIN可以直接把目前buffer交給控制嗎？答：要看協定；若length未收齊，FIN只代表EOF，不能代表回應完整。

參考：[IETF RFC 9293 TCP規範，作為TCP可靠位元組流、分段與FIN背景參考；frame完整性仍由應用協定定義。](https://www.rfc-editor.org/rfc/rfc9293.html)

參考：[Python官方socket文件，作為TCP/UDP接收API與平台差異的通用參考；實際UDP截斷旗標需查目標平台文件。](https://docs.python.org/3/library/socket.html)

## 延伸閱讀

- [封包重送造成重複寫入如何設計冪等鍵](/articles/idempotency-key-duplicate-write)
- [背景通訊任務與主循環共享資料快照](/articles/background-task-main-loop-snapshot)
