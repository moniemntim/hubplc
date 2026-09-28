# 角度與查表：離線教材

Node.js 22.13以上；八檔放同一資料夾，無npm依賴：angle.mjs、curve.mjs、angle-demo.mjs、curve-demo.mjs、angle-practice.mjs、curve-practice.mjs、self-test.mjs、README.md。

執行 `node angle-demo.mjs`、`node curve-demo.mjs`、`node self-test.mjs`；兩個practice可按正文修改重跑。

角度單位degree，時間為虛擬單調ms。角度與表格數值只接受有限Number且絕對值不大於1e9。normalize回傳[0,360)，shortest回傳(-180,180]；半圈+180只是幾何平手規則。極小負值因浮點捨入變成360時改為0，沒有宣稱任意小角度仍保有解析度。

AngleTracker的maxSpeed是外部宣告的物理速度上限，預設360deg/s，允許(0,1e6]。兩筆間最大位移必須嚴格小於180；observed差大於速度上限加1e-9度的數值容差也拒絕。拒絕會清除基準與區段累計，下一筆有效資料只建基準。segmentTotal只代表最近連續區段，絕非完整多圈位置。quality/boot/時間由fixture提供，並非真實通訊診斷。

Curve固定X單位count、Y單位EU；候選2..32點、X嚴格遞增，Y可下降。超量程不裁切或外插。換表使用預期版本並先驗證整表再複製，不保留呼叫者可變陣列。此原子切換只指單一JS執行流程，未實作PLC跨任務同步、HMI傳輸、校正量測或持久化。

所有數據為合成資料，模型沒有馬達/PLC/感測器I/O。Node.js Number不是目標PLC REAL/LREAL的相容性證據；現場需另驗證型別、精度、取樣、單位與安全控制。
