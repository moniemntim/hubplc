# 第28批：方向、響應、換件與串擾四篇整改

2026-09-28，四篇全文閱讀後按任務分工整改，保留URL/作者/原日期。

- sensor-polarity-reverse-range：正反向頁面比較，重用analogConvert正向計算，反向為100減正向；8/16mA揭露方向，12mA中點不具識別力；映射、來源與接線證據分開。
- sensor-step-response-acceptance：一階解析模型，可改τ/固定延遲/取樣間隔及上下行；理論、取樣跨越、T10–90與穩定定義分開。MathWorks定義參考已查閱，沒有呼叫MATLAB或宣稱實機測試。
- sensor-replacement-compatibility-calibration-check：子代理全文改寫、主線審核；序號各自對應證書、量程三點與整鏈驗證分開，NIST辨識來源。
- analog-input-channel-crosstalk-single-channel-excitation：子代理全文改寫、主線審核；五筆基線/激勵/回程、比率分母與NI多工鬼影證據。主線將空白讀取改成文件允許的等待比較，參考端排查改為獨立案例避免不明參考混算。
- 刪減重複FAQ與泛用敘述，全部案例明示合成；未量測硬體、未PLC平台模擬。

驗證已執行：

- unit suite：422/422，unit-tests-batch28.log。
- TypeScript noEmit、oxlint、9檔oxfmt --check、git diff --check通過。
- check-batch28-cases.mjs：換件映射與串擾平均/範圍/分母重算通過。
- prepare-articles、prepare-site、Vinext build成功，449公開文章/507 sitemap URLs。
- sensor-lesson-browser.mjs：两篇×320/768/1440，共6組；方向/中點/量程外、延遲/下降、非法值撤下與鍵盤復原；無pageerror與頁面橫向溢出。主線檢視320px階躍截圖。
- layout-browser.mjs：列表、四篇與404共18組通過。

累計104篇reviewed-local、345篇unreviewed、1篇draft。此狀態不是全站整改完成或硬體驗證；未重新提交AdSense，正式站證據另記release。
