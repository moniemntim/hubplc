---
title: HMI數值更新但動畫不動的排查
description: 從資料值、綁定型別、品質、可見條件與層級遮蔽逐步排查動畫不動。
date: 2026-09-17
author: 站長
draft: false
---

## 一 先證明數值真的更新

數值更新但動畫不動時，先把問題拆成資料到達、屬性重繪和顯示條件三層。監視畫面上的bound value、quality、timestamp與元件實際property，不要先改動畫時間。Ignition Perspective的Tag binding在標籤變化時會更新綁定屬性，但若綁到錯誤屬性，數字可變而燈仍不變。

案例中Flow=25.0、26.0、27.0持續變化，LED仍灰色。監視器顯示tag值更新，表示通訊不是首要嫌疑；檢查後燈的style class綁到另一個Stale旗標。

先記錄三個時刻的value、quality、bound property與畫面時間，形成可重現證據。

| 層次 | 觀察欄位 | 結論 |
| --- | --- | --- |
| 資料 | value/quality/time | 是否到達 |
| 綁定 | target property | 是否寫對 |
| 顯示 | visible/z-order | 是否看得見 |

數值更新的證據最好同時顯示來源時間與畫面刷新時間；兩者不同時，先確認是正常輪詢延遲還是綁定卡住。不要只看人眼感覺動畫沒有動。

把數值顯示和動畫條件暫時綁到同一測試標籤，可快速判斷是來源標籤錯誤還是元件條件錯誤。

監視值頁要同時顯示綁定的實際路徑與目標property名稱，工程師才不會只看標籤值。正式畫面可用權限限制診斷資訊。

若動畫依賴多個條件，先分別顯示每個布林結果，再組合最終條件；這能定位是哪一項阻止顯示。

驗收資料應包含正常、邊界、Bad、斷線和恢復五類，並保存畫面與監視值對照。

## 二 檢查綁定與型別

檢查元件綁定路徑、資料型別、更新週期和品質。布林動畫若接到整數1/0，要確認平台是否自動轉型；字串True不一定等於布林true。Expression binding若引用多個值，任一更新或錯誤都可能改變結果。

把FlowHighLimit=25.0、Flow=27.0、AlarmEnable=true作為測試資料，預期high=true。若畫面條件用字串比較27 > '25'，型別錯誤可能讓結果不成立。

品質Bad時應明確定義燈顯示灰色、紅色或維持最後狀態；不要用Bad資料觸發正常動畫。

若綁定經過轉換，逐步查看轉換前值、轉換後值和錯誤狀態。空字串、null、Bad品質與數字零不能在條件式中混為一談。

當動畫是style class時，測試class本身可獨立套用，先證明CSS或樣式定義有效，再查條件綁定。

檢查更新週期時用固定測試波形，不用手動快速改值，避免改值速度高於輪詢而造成誤判。

最後把故障排查步驟寫成可重複的測試案例，包含輸入值、品質、模式、預期條件和畫面結果。下一次版本變更時直接重跑，避免只憑工程師記憶判斷動畫是否正常。

若輪詢週期為一秒，兩次畫面更新間不應以人眼短暫未變判定故障；記錄至少三個週期再分析。

## 三 檢查顯示條件

接著查可見條件、門檻、模式和遮蔽層級。元件可能已被父容器visible=false，或另一個不透明元件蓋住。門檻要寫清楚是>、>=還是區間。

另一個獨立故障分支在Auto模式燈可閃，Manual模式固定灰色；現場說數值變了卻不動，最後發現Mode=Manual是設計條件。改成Auto後仍不動才查style class名稱拼字。

在離線HMI副本將條件輸出到custom properties，例如isHigh、isAuto、isGood，暫時顯示在維修頁；修復後移除或限制權限。

本例明定動畫條件為數值大於25.0 L/min、AlarmEnable為true、來源Good且模式Auto。因此24.9與25.0不動畫，25.1動畫。這是示意邏輯而非可直接貼入的平台語法；單位不同先完成工程值換算，不把不同單位的數字直接比較。

HMI重連後常有初始品質Unknown，條件式要明確處理Unknown，不應立即當成Good或零。

畫面初始化時確認綁定已啟用，停用Binding或預覽快取可能讓設計器結果與執行結果不同。

若動畫仍不符合預期，保存診斷值、綁定設定和畫面版本後再交由平台支援，不用未核實的語法或寄存器猜測修復。

Expression的錯誤要在診斷頁顯示，不要將錯誤轉成0，否則0可能誤觸發低值動畫。

## 四 用測試標籤隔離

在隔離HMI副本用測試資料把數值、品質、模式與啟用旗標分開注入，不把Bad文字寫進數值欄。數值測27及24，品質另測Good和Bad，模式另測Auto和Manual；保持AlarmEnable=true。品質故障以測試來源或專用測試屬性模擬，不能把本篇狀態名當PLC可寫寄存器。

結果表應記27/Good/Auto預期動畫、24/Good/Auto不動畫、27/Bad灰色、27/Good/Manual固定、通訊中斷顯示品質狀態。若測試標籤能動而真標籤不動，回頭查來源品質或型別。

修復後做冷開頁、重新連線和條件恢復測試，確保不是只在設計器預覽有效。

父容器不可見時，子元件即使條件正確也不會顯示。檢查畫面模式、權限、視窗覆蓋與z-order，並以暫時邊框確認實際元件位置。

若數值正常更新但動畫仍不動，保留修復前後設定差異與測試輸出，方便下一次版本回歸。

完成後把診斷頁的測試標籤與臨時樣式移除，重新開頁確認生產畫面仍按正式設定運作。

再測AlarmEnable=false：即使27、Good、Auto，最終動畫仍應關閉。先看debugIsHigh=true，再看enable=false，便可判斷比較式正常而抑制條件生效。恢復enable=true後應重新計算。把這組反例與Manual分支分開保存，避免修好一個條件又把另一個正確抑制刪掉。

style class名稱大小寫和拼字須與定義完全一致；條件有值但樣式不存在時仍不會呈現動畫。

診斷頁可在元件custom properties建立debugValue、debugQuality、debugIsHigh和debugMode，分別顯示綁定原值、品質、條件結果與模式。這些custom properties只供畫面診斷，不寫入PLC，也不改變正式控制邏輯。當數值27而debugIsHigh為false，查條件或型別；若debugIsHigh為true但指示燈不變，查style class、父容器與不透明遮蔽物。

## 五 驗收與限制

驗收用三段：值更新、條件切換、恢復顯示。

問：數值會動就代表綁定正確嗎？答：不一定，要確認目標property與quality。

問：Bad時可沿用最後正常值嗎？答：可作顯示策略但要標品質，不能假裝新值。

問：動畫閾值用>還是>=？答：依需求固定並在測試表列出邊界。

問：遮蔽元件怎麼查？答：檢查父子可見條件、堆疊與不透明覆蓋；純透明元件可能攔點擊，不等於遮住影像。

| 測試狀態 | 預期燈色 | 排查重點 |
| --- | --- | --- |
| 27/Good/Auto | 動畫 | 門檻與style |
| 24/Good/Auto | 正常色 | 條件 |
| 27/Bad | 品質色 | Bad策略 |
| 27/Good/Manual | 固定色 | 模式條件 |

恢復測試先中斷來源再恢復，確認品質從Bad回Good、數值更新、動畫條件重新計算；只重開頁面不能代表通訊恢復正確。

多個動畫同時修改同一style屬性時，檢查優先順序和最後寫入者，避免互相覆蓋。

驗收時逐欄記值、品質、模式、enable、isHigh與最終動畫。若數值27而isHigh=false，先查型別、單位與大於條件；若isHigh=true但動畫false，先看enable與模式；若最終動畫true而畫面仍不動，才查樣式名稱、父容器、資源載入與覆蓋。這個順序能把資料問題、正確抑制與繪圖問題分開，避免為了讓燈閃而刪除必要條件。

恢復驗收要涵蓋Bad到Good的狀態轉換，確認動畫不會因舊品質或舊樣式殘留而錯誤閃爍。

測試報告保存邊界值和斷線恢復結果，便於版本比較。

參考：[Ignition Tag Bindings in Perspective](https://docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/working-with-perspective-components/bindings-in-perspective/tag-bindings-in-perspective)

參考：[Ignition Expression Bindings in Perspective](https://docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/working-with-perspective-components/bindings-in-perspective/expression-bindings-in-perspective)

## 延伸閱讀

- [HMI畫面與報表的相依性矩陣](/articles/hmi-dependency-matrix)
- [PLC故障影響分級與操作員處置](/articles/q06udvcpu-maintenance-fault-triage)
