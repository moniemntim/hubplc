---
title: 自保持電路與 SET RESET 的差別 狀態如何建立與解除
description: 用虛擬風扇把自保持線圈與 SET／RST 的差異拆開，先定義停止優先，再用逐掃描表驗證啟動、保持、停止、同時命令與重新 RUN。文章也把程式保持、CPU 重啟初值與斷電保持分開，避免把一般 M 位元誤當成可斷電保存的 L 裝置。
date: 2026-09-17
author: 站長
draft: false
---

## 先把問題說清楚 你要記住的是運轉請求 不是把按鈕黏住

按下啟動按鈕後，按鈕放開，風扇仍要維持運轉；按下停止後，風扇要停止，這就是自保持。PLC 裡常見兩種寫法：用一般線圈搭配自己的回授接點，或用 SET 建立狀態、用 RESET（在三菱 Q 系列指令中寫作 RST）解除狀態。兩者都能記住一個掃描週期以上的狀態，但命令位置、停止優先、開機初值和除錯方式不同。本文先用不接真實輸出的虛擬風扇 M100 示範，本篇練習只在監看表觀察 M100，不指定實體輸出接線。

先定義三個訊號：Start 是啟動請求，Stop 是停止請求，FanReq 是程式內的運轉請求。本文採停止優先：同一掃描若 Start 與 Stop 同時為 1，FanReq 必須為 0。這個決定要先寫進規格，不能等到程式跑出結果才猜哪一段比較後執行。FanReq 只是控制狀態；真正的接觸器、馬達或安全回路仍需依設備風險另行設計。

| 名稱 | 本篇教學用法 | 不要混淆成 |
| --- | --- | --- |
| Start | 一個掃描內的啟動請求 | 永久保持的狀態 |
| Stop | 停止條件；優先清除 FanReq | 只在按鈕放開時才有效 |
| FanReq | 虛擬風扇的內部運轉狀態 | 真正馬達輸出或安全功能 |
| M100／L100 | 示範用內部裝置；實際裝置要查型號與參數 | 所有 PLC 都相同的保持記憶體 |

參考：[MELSEC-Q/L Programming Manual (Common Instruction), SH-080809ENG-X，SET／RST 指令章節與指令適用裝置表](https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh080809eng/sh080809engx.pdf)

## 第一種寫法 一般線圈自保持 讓停止條件先切斷整條回路

自保持電路的重點不是把同一線圈到處寫，而是把「允許運轉」放在一個清楚的決策點。通用梯形圖可讀成：Stop 的常閉條件串在最前面，Start 與 FanReq 的常開接點並聯，最後只寫一次 FanReq 線圈。以下是教學用文字表示；接點符號與實際軟體畫面仍應依工程軟體操作。

FanReq_next = (NOT Stop) AND (Start OR FanReq_current)

公式中的 current 是本行執行前值，next 是本行計算後值。Stop=1 時結果必為 0；Stop=0 且 Start=1 時建立狀態，之後 Start=0 仍可由回授維持。這不是說內部位元要等下一掃描才改變：同一掃描後續程式可讀到本行寫入的新值。QnUCPU 的 refresh mode 在程式執行前批次更新 I/O，內部狀態與實體端子反應要分開看。

| Stop | Start | FanReq 前值 | FanReq 下一值 | 判讀 |
| --- | --- | --- | --- | --- |
| 0 | 0 | 0 | 0 | 尚未啟動 |
| 0 | 1 | 0 | 1 | 建立運轉請求 |
| 0 | 0 | 1 | 1 | 自保持 |
| 1 | 0 | 1 | 0 | 停止優先 |
| 1 | 1 | 0 或 1 | 0 | 同時命令仍停止 |

1. 先在監看表建立 Start、Stop、FanReq 三個虛擬位元，不接 Y 輸出。

2. 只讓 Start 變成 1 一次，確認 FanReq 變成 1；再把 Start 放回 0，確認 FanReq 仍為 1。

3. 讓 Stop 變成 1，確認 FanReq 下一次程式處理後變成 0。

4. 最後同時測試 Start=1、Stop=1；預期 FanReq 仍為 0。若不是，先查 Stop 是否真的進到最前方的允許條件。

## 第二種寫法 SET 建立狀態 RST 解除狀態

SET／RST 是明確的狀態命令。當 SET 的執行條件成立，指定位元被設為 ON；當 RST 的執行條件成立，指定位元被清為 OFF。三菱 Q 系列的 Common Instruction 手冊將 SET／RST 列為序列指令，並列出可指定的位元與裝置限制。Q 系列工程師常把 Start→SET M100、Stop→RST M100 分成兩段，閱讀上很直白；代價是同一個裝置的寫入點分散，搜尋和衝突檢查更重要。

```text
Start AND (NOT Stop)  →  SET M100
Stop  →  RST M100
FanReq = M100（僅作虛擬狀態觀察）
```

為了確保停止優先，SET 的條件要明確排除 Stop；RST 則直接由 Stop 觸發。即使你知道某一版本的執行順序，也不要把安全要求建立在兩段程式誰先誰後。若同一掃描同時有 Start 和 Stop，這個寫法不會執行 SET，會執行 RST，因此 M100 保持 OFF。若專案規範要求用原始 Start 而非 Start AND NOT Stop，應在設計審查時明訂同時命令的結果，並依目標 CPU 的 Common Instruction 手冊核對。

| 項目 | 自保持線圈 | SET／RST | 實務影響 |
| --- | --- | --- | --- |
| 狀態建立 | 由同一條回路計算 | SET 命令直接置 ON | SET／RST較容易對照命令 |
| 解除狀態 | Stop使回路失電 | RST 命令直接置 OFF | 要找到所有寫入點 |
| 同時Start／Stop | 公式可直接保證停止優先 | 需用條件排除SET並執行RST | 不要靠程式段順序猜結果 |
| 除錯 | 看接點與回授 | 看SET／RST是否被觸發 | 兩者都應監看狀態與命令 |

參考：[Mitsubishi Electric MELSEC-Q FAQ：Duplicated coil error；說明同一裝置同時被 SET 與 RST 使用時，程式檢查會偵測重複線圈錯誤](https://fa-faq.mitsubishielectric.com/faq/show/22534)

## 不要把三種 保持 混在一起 程式狀態 RUN 重啟與斷電保持

看到 FanReq 在 Start 放開後仍為 ON，只能說程式在掃描中維持了狀態；這不等於斷電後還會保留。第一層是程式保持：一般 M 位元透過回授或 SET／RST 在程式內維持。第二層是 STOP→RUN 或 RESET 後的初始處理：CPU 重新從程式起點執行，裝置值是否沿用要看裝置種類、初始值與參數。第三層是電源失效後的資料保存：QnUCPU 的 L latch relay 屬於可由電池保持的裝置，但是否使用、範圍如何設定，必須在 PLC 參數的 Device 設定和電池維護條件下確認。

| 情境 | 本篇應觀察 | 不能直接推論 |
| --- | --- | --- |
| Start 放開 | M100 是否仍為 ON | 電源重開也一定為 ON |
| CPU STOP→RUN | 程式從 step 0 重新執行；查 M100 初值 | 所有裝置都清零或都保留 |
| CPU RESET | 查 RESET、初始裝置值與 latch 設定 | SET 過一次就永久保存 |
| 斷電再上電 | 分辨 M 與參數設定的 L 裝置 | 用 M 位元冒充斷電保持 |
| Latch clear | 只在允許範圍並依程序清除 | 一般 RUN 中隨手清除 |

對 QnUCPU，官方手冊說明 STOP→RUN 時 CPU 從 step 0 執行；裝置記憶體的處理仍要看裝置種類和初始值設定。手冊也區分一般內部繼電器 M 與 latch relay L：M 在上電或 reset 時會 OFF，L 的資料可由電池在電源失效期間保持，且 latch clear 範圍由參數設定。這些描述是 QnUCPU 手冊的裝置定義，不應擴寫成所有 Q 系列、所有版本都相同；換 CPU 或工程軟體版本時先核對相應手冊。

參考：[QnUCPU User's Manual (Function Explanation, Program Fundamentals), SH-080807ENG-AF，§3.4 STOP／RUN、§2.7 Data Clear、§4.2.3 M 與 §4.2.4 Latch relay](https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh080807eng/sh080807engaf.pdf)

## 完整測試 用虛擬風扇逐掃描驗證停止優先

以下用狀態判讀表逐次核對掃描結果。請把 FanReq 連到虛擬指示位元或監看表，暫時不要連接真實 Y 輸出、接觸器或馬達。每列代表一次程式掃描的輸入值與預期狀態；若工程軟體的輸入更新、測試寫入或任務配置不同，請以目標 CPU 手冊及實際監看結果修正。

| 掃描 | Start | Stop | FanReq 前值 | FanReq 預期 | 操作意義 |
| --- | --- | --- | --- | --- | --- |
| S1 | 0 | 0 | 0 | 0 | 待機 |
| S2 | 1 | 0 | 0 | 1 | 按下啟動 |
| S3 | 0 | 0 | 1 | 1 | 放開啟動，保持 |
| S4 | 0 | 1 | 1 | 0 | 按下停止，停止優先 |
| S5 | 1 | 1 | 0 | 0 | 同時命令仍停止 |
| S6 | 0 | 0 | 0 | 0 | 停止後待機 |
| S7 | 1 | 0 | 0 | 1 | 再次啟動 |
| S8 | 1 | 1 | 1 | 0 | 持續啟動但停止優先 |
| S9 | 1 | 0 | 0 | 1 | 啟動仍按住時解除停止會再啟動 |

1. 先在兩個虛擬狀態位元上各實作一種寫法，使用相同 Start、Stop，依 S1～S9 核對。

2. 若結果不同，搜尋所有 SET、RST、OUT 寫入點並檢查停止條件；狀態位元應各自獨立。

3. 另行記錄 STOP→RUN、RESET 前後的狀態；這與表中的啟動按鈕測試不同。

完成後應看到：Start 單獨成立能使狀態 ON，放開仍保持；Stop 成立時為 OFF，同時命令也為 OFF。還要測一個邊界：若 Start 持續為 1，Stop 從 1 解除成 0，這兩種電平寫法都會再次 ON。要限定必須放開再重新按下，需另設重新允許條件或邊緣事件，本文公式尚未實作這項功能。這些是虛擬狀態的預期結果，不代表實體設備驗證完成。

## 失敗時先查哪裡 由寫入點 條件到啟動設定逐層定位

排查時不要先改成另一種寫法。先把症狀固定，再找證據。症狀是「按一下不保持」時，先看 Start 是否真的只在預期掃描為 ON，再看回授接點或 SET 條件是否引用錯位元。症狀是「按停止仍運轉」時，先看 Stop 的常閉／常開邏輯、裝置位址與 RST 條件，再搜尋 FanReq 是否還在別的程式段被 SET、OUT 或 MOV 改寫。Q 系列 GPP 的程式檢查可能將同一裝置的 SET／RST 視為重複線圈錯誤，先處理檢查結果，不要靠現場猜測。

| 症狀 | 先取得的證據 | 第一個檢查位置 |
| --- | --- | --- |
| 按Start後立即掉回OFF | Start、FanReq逐掃描監看 | 回授接點是否用錯位元；是否有其他OUT覆寫 |
| Stop成立但仍ON | Stop與RST執行條件 | Stop邏輯、位址、RST目標是否相同 |
| Start與Stop同時時變ON | 同時輸入下的逐掃描表 | SET是否被Start直接觸發；是否缺少NOT Stop |
| 重新RUN後狀態不同 | RUN前後M/L與參數 | 初始裝置值、裝置種類、PLC參數與啟動方式 |
| 程式檢查報重複線圈 | 檢查訊息與所有寫入點 | 同裝置的SET、RST、OUT及其他指令 |

1. 先停止對外部設備的測試，保留虛擬位元與監看表。

2. 用交叉參照或搜尋找出 FanReq 目標裝置的所有寫入指令。

3. 逐掃描記錄 Start、Stop、狀態前值、執行條件和狀態後值。

4. 核對 CPU 型號、程式語言、裝置保持設定與工程軟體版本。

5. 修正一個原因後重跑完整 S1～S7 測試，並保存測試表；不要只測「剛好成功」的一列。

## 適用型號 限制與三個常見問題

### 適用型號與限制

本篇的邏輯概念適用於多數具備一般位元裝置、SET／RST 或等效狀態指令的 PLC；文中引用的 M、L 裝置、RUN／STOP 行為與手冊章節則以 Mitsubishi MELSEC-QnUCPU 文件為依據，並以 Q06UDVCPU 作為常見背景。Q06UDVCPU、較舊 Q CPU、不同 CPU 序號、不同 GX Works2／GX Developer 版本，可能在可用裝置、初始值、保持範圍、指令支援或參數畫面上不同。若改用 FX、iQ-R、L 系列或 IEC 功能塊，請把程式視為概念示意，不要直接複製裝置位址。真正的馬達啟停須依設備風險配置適當的外部保護、互鎖及安全功能，並完成電氣設計審查；本篇虛擬風扇沒有執行這些安全功能。

### 常見問題

問題一：SET 之後是不是一定要用 RST？答：若狀態是由 SET 建立，就要設計明確的解除路徑；可以是 RST，也可能是初始化、復歸流程或其他已定義命令。沒有解除條件的 SET 會變成難以恢復的狀態。

問題二：用 L 裝置就能保證風扇斷電後自動運轉嗎？答：不能。L 是資料保持機制，不是設備安全允許。斷電後是否恢復、輸出模組如何動作、外部接觸器是否吸合，都要依 CPU 參數、輸出模式、設備電路和啟動規範確認。

問題三：自保持線圈和 SET／RST 哪個比較好？答：先看狀態是否需要分開的建立與解除命令、團隊是否需要單一寫入點，以及同時命令如何定義。簡單運轉請求常用停止優先的單一公式；跨多段流程且需要明確命令時可用 SET／RST，但要限制寫入點並做程式檢查。

完成後應看到什麼結果：兩種寫法都能依 S1～S9 表得到相同 FanReq 結果，且沒有未定義的同時命令行為。失敗時先查哪裡：先查目標裝置的所有寫入點、Stop 邏輯與 CPU／參數設定，再查外部輸出。

## 補充參考資料

參考：[MELSEC-Q Series QnUCPU 產品下載頁，可依 CPU 型號選擇相應版本的 User's Manual 與 Programming Manual](https://www.mitsubishielectric.com/fa/products/faspec/download.page?category=ex&formNm=QnUCPU_Q01UCPU_3886&id=spec&kisyu=/plcq&lang=2)

## 延伸閱讀

- [上升緣與下降緣怎麼用 避免按鈕長按造成重複動作](/articles/plc-rising-falling-edge-button-event)
- [兩個命令同時成立怎麼辦 PLC 優先順序與互斥條件設計](/articles/plc-command-priority-mutual-exclusion)
