# 第26批：五點誤差判讀整改

2026-09-28，全文閱讀 4-20ma-zero-offset-span-errors 後重寫。另閱讀 analog-raw-quality-filter-overrange 作為後續候選，未列入本批完成數。

- 保留網址、作者及原日期。刪除重複換算及不相關延伸閱讀，與前批換算／品質兩課分工。
- 新增頁面五點比對器：五組合成資料、可修改五個讀值及判讀容差，列出帶正負號的誤差、% span、端點倍率及直線殘差。
- 正文提供四組可重現案例，電流注入與壓力基準分開追查；五點形狀不自動推論故障元件，容差不宣稱設備合格。
- 工具限定0–10 bar教學量程，無設備通訊、平台模擬或硬體驗證。Fluke官方參考已查閱五點線性檢查段落，未照搬其設備接線或調整流程。

驗證：

- node --experimental-strip-types --test tests/*.test.mjs：418/418；新測試覆蓋模式、正負誤差、修改中點、浮點門檻、非法輸入與容差。
- tsc --noEmit、oxlint、6檔oxfmt --check、git diff --check通過。
- prepare-articles、prepare-site、Vinext build通過：449發布文章、507 sitemap URLs。
- tests/five-point-lesson-browser.mjs：320/768/1440三組操作，五個預設、修改中點、空白及無效容差撤下結果、鍵盤復原；無pageerror或頁面橫向溢出；已檢視320截圖。
- tests/layout-browser.mjs：列表／本文／404三頁乘三尺寸，共9組通過。
- 303正文附件本機HTTP與檔案逐位元組相同。正式站發布證據另記release。

累計96篇reviewed-local、353篇unreviewed、1篇draft。舊審查狀態不表示均符合新整改標準；全站工作仍未完成，未重新提交AdSense。
