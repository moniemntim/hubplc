---
title: 趨勢游標插值與原始點
description: 以t0=0,v20與t1=10,v30示範t4 linear=24、step=20、nearest與tie policy，區分推導與量測。
date: 2026-09-21
author: 站長
draft: false
category: HMI 畫面與操作
---

## 一 先分清原始點與插值結果

趨勢圖上的線不一定是量測。案例有兩個已收到且品質有效的原始點：t0=0、v0=20，t1=10、v1=30。查詢t=4時，linear插值是20+(30−20)×4/10=24；step20政策得到20；nearest在距離相等時要依規格指定tie policy。本篇所有24、20都是推導結果，不是設備在t=4真的量到的值。

資料模型應分開保存原始點、演算法、輸入點品質與結果狀態。結果至少帶left_point、right_point、query_time、method、derived=true；不能把插值24回寫成原始量測。若使用者需要追溯，應能從兩個原始點重算同一結果。

| 方法 | t=4結果 | 語意 |
| --- | --- | --- |
| linear | 24 | 推導，不是量測 |
| step | 20 | 沿用區間左值 |
| nearest | 20 | 依距離與tie policy |
| raw | 無t=4點 | 不可冒充 |

查詢時間落在原始範圍內才可插值。t=-1或t=12是外插問題，不能自動延長直線；系統應回 OutOfRange 或依明訂 hold policy 顯示最後值並標狀態。

原始點要有point_id、source_time、value、unit與quality。游標查詢若命中原始點，結果可直接引用point_id；若落在兩點之間，必須建立derived result並保存左右端點。只有數值而沒有時間與品質的點不能參與插值。

Bad gap的長度與允許插值距離是兩個政策。即使左右Good，若相隔一小時超過max_gap，也應回Gap；不能只因兩端品質Good便跨越長時間缺測。

step本例採左閉右開區間，從t=0到未滿10沿用20；精確命中t=10的有效原始點則回Raw30。最後點之後才依OutOfRange或另訂LastKnown政策處理。

插值結果的quality應反映端點與gap政策，不要直接複製左點Good。

若使用者要求「最近值」，nearest與LastKnown不是同一政策，前者依距離，後者可能跨越很久。

## 二 linear step與nearest的規則

linear只適合連續量且左右點都有效。t=4時距離左點4、右點6，因此24；t=5正好距離相等，nearest要依tie policy，例如選左點則20，選右點則30。若沒有明訂，不能假設任何一邊。

digital或狀態訊號不可使用linear。開關在t0=0為0、t1=10為1，linear於t=4得到0.4沒有設備語意；step才可能依區間定義回0或1。nearest也只代表選一個最近觀測，不代表中間狀態。

| 資料型態 | 方法 | 規則 |
| --- | --- | --- |
| 溫度 | linear | 兩點Good才可 |
| 開關 | step | 明訂區間歸屬 |
| 狀態碼 | nearest/step | 不可產生中間碼 |
| 缺資料 | 不插值 | 回Unknown/Gap |

結果顯示需標 method 與 derived。若趨勢線視覺上連續，游標仍要能指出原始點與推導點，避免操作員把線段上的每一點當成歷史採樣。

linear計算的比例是(query−left_time)/(right_time−left_time)。案例t=4的比例是0.4，20+0.4×10=24；t=8則是28。這些數字應與原始點一起顯示，避免使用者誤以為24是實際採樣。

重複timestamp、亂序與晚到點要先整理。保存接收順序與source順序，依明訂point_id或sequence去重；不要讓排序函式偶然選取其中一筆。

資料重算需保存演算法版本。日後tie policy或max_gap改變時，舊報表不應被靜默改寫；可用derived_version區分新舊結果。

step方法適合狀態保持，但區間歸屬要在邊界測試中明訂。

所有拒絕結果都需保留原因與原始點，不能只顯示空白。

若資料為累計計數器，linear只可描述趨勢估計，不能解釋成該時間真正的增量；需另定義差分規則。

原始點更新後，受影響derived結果應標過期並重算，避免舊插值繼續顯示。

驗收完成後保存測試向量與結果，下一次演算法升版可比較差異。

結果可追溯。

## 三 Bad gap與邊界

若t0=0的20為Good、t1=10的30為Bad，t=4不能linear。Bad點不提供可用端點，結果應為Unknown或Gap；不能因數值存在就跨越品質缺口。若t2=20為Good，t=4仍不能用t0與t2跨過Bad，除非規格明確允許且另標跨gap。

原始點重複時間也要處理。兩筆t=10一筆20、一筆30時，先依point_id、接收序號或品質規則決定保留；不可讓排序偶然決定結果。單位、量程與濾波版本不一致時，也不能直接插值。

| 情境 | t=4 | 預期 |
| --- | --- | --- |
| 左右Good | 20與30 | 可依方法推導24 |
| 右端Bad | 20與Bad30 | Gap/Unknown |
| 中間Bad | 跨越缺口 | 不跨插值 |
| 重複timestamp | 兩值 | 依明訂去重規則 |
| 單位不同 | °C與°F | 先拒絕混算 |

邊界t=0或t=10可直接回原始點並保留point_id；不要把邊界也標成linear derived。查詢結果要同時保存來源點品質，讓使用者知道結果是否受限。

若左右點的單位相同但filter版本不同，也應拒絕混算或標示版本轉換。point_id相同不保證同一批資料，還要比較資料集、設備世代與校正狀態。

驗收可用t=0、4、5、8、10、12六個游標，逐一檢查method、derived、point_id、quality與邊界。圖表線和查詢表的結果都應使用同一演算法與政策。

查詢結果也要保存query_time的時區與precision，否則相同游標可能因轉換不同而落在不同區間。

顯示表格可同時列原始值與derived值，並提供回看兩端點的連結。

插值器應在資料查詢層明確回傳method與derived旗標，畫面不能自行把空白連線當線性結果。

驗收報告要列原始點清單、方法、tie、max_gap、範圍與結果，確保不同人可重算。

本文未宣稱任何歷史資料庫或HMI趨勢元件的內建插值政策，實作需核對目標平台。

結果頁應同時顯示原始點、推導方法、品質、範圍與版本，讓使用者知道看到的是量測還是計算。

## 四 具體驗收與排查

離線驗收建立t0=0,v20,Good與t1=10,v30,Good。查t=4，linear=24、step=20、nearest=20（距離不等）；查t=5依tie-left=20、tie-right=30。再將t1標Bad，所有跨越t1的查詢預期Gap。

查t=-1與12，預期OutOfRange，不得外插得到19或32。加入digital step案例，確認不會出現0.4。報表列query_time、method、result、derived、left/right point_id與quality。

| 測試 | 輸入 | 預期 |
| --- | --- | --- |
| linear | t4/Good Good | 24 derived |
| step | t4 | 20 |
| nearest tie | t5 | 依tie policy |
| Bad gap | 右點Bad | Gap |
| 外插 | t=-1 | OutOfRange |

排查先確認原始點時間排序、品質、單位與point_id，再看方法和tie policy。若數值看似正確但來源點錯，仍是資料追溯失敗。

nearest的tie policy可選left、right或tie_unknown，但必須在結果中保存。t=5距離兩端各5，若政策是tie_unknown，結果不是20或30，而是Unknown，這比靜默偏向一側可追溯。

若趨勢圖以像素連線造成視覺直線，仍要在資料層標示gap；不能因繪圖元件畫出線段，就宣稱中間時間有量測。

若只有一個原始點，linear不成立；可回RawOnly或Unknown，不要假造斜率。

資料刪除或重採樣後，原本的derived結果可能失效，應重新計算並換版本。

當左右點時間相同時分母為零，應回DuplicateTime或依去重規則處理，不能除零或任意選值。

對查詢t=4的24，應在結果中列出left=(0,20)、right=(10,30)、ratio=0.4；若只列24，操作員不能判斷來源。

任何由方法推導的數值都要與原始量測分欄保存，避免後續統計把derived與raw重複計算。

不要把趨勢線的連續外觀當成中間時間真的有採樣。

## 五 FAQ與來源

當端點值含NaN、Infinity或型別不符，先拒絕資料點，不進演算法。

若趨勢線遇到Bad gap，繪圖應斷線或標示缺口，不能以視覺連線掩蓋資料品質。

游標介面若提供方法選擇，應把政策版本一併記錄，不能只在畫面上換線型。

驗收記錄保存後可重算。

若查詢時間t=10精確命中有效原始點30，即使右側沒有下一個點，也應直接回Raw30並保留point_id；只有t>10才是OutOfRange。nearest本例只在同一有效區間內比較，不跨Bad gap或超過max_gap。

插值結果必須標示derived，不得當成原始量測。linear只對連續且品質有效的端點，Bad gap不跨越；digital step不可linear；nearest tie要有明確政策。

FAQ1：t=4的24是設備量到的嗎？答：不是，是20與30按linear推導。

FAQ2：Bad端點還能插值嗎？答：本案例不能，回Gap或Unknown。

FAQ3：t=5 nearest選哪點？答：依tie policy，本例可明訂選左20或右30。

FAQ4：t=-1可用直線外插嗎？答：本案例OutOfRange，不自動外插。

參考：[NumPy interp：線性插值與邊界概念參考，非PLC API。](https://numpy.org/doc/stable/reference/generated/numpy.interp.html)

參考：[OPC UA Part 13：聚合與資料處理概念參考，非本文特定HMI API。](https://reference.opcfoundation.org/Core/Part13/v105/docs/)

## 延伸閱讀

- [HMI品質Bad如何避免把舊值誤認新值](/articles/hmi-bad-quality-stale-value)
- [即時歷史時間基準校正](/articles/realtime-history-time-basis-correction)
