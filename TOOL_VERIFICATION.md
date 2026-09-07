## 世界時間與台北日期工具（2026-09-07）

- 新增 world-clock、timestamp-converter、date-calculator 三個工具，登錄總數 52；sitemap 由登錄自動產生 57 個網址。
- 世界時間預設台灣・台北，420 筆 IANA 國家／地區時區資料（含 UTC），國家選單獨立列出台灣。國家對照資料隨網站部署；瀏覽器未支援的新時區明確提示，不套用其他時區。
- 時間依裝置時鐘及瀏覽器 IANA 資料運算，不宣稱網路校時。搜尋、選擇與日期輸入皆不傳送、不儲存。
- 台北時間戳依 Asia/Taipei 轉換，處理歷史夏令時間；日期計算使用格里曆日，台北今日於操作時取得。
- 專用回歸腳本：tests/world-clock-browser.mjs、tests/date-browser.mjs；桌面 1280px、手機 390px／320px，並使用不同裝置時區驗證台北預設。
- 回復基準：842991ec0ee0325d30f07c239e63949439f5943b。正式部署結果另存 outputs，保留既有 GitHub／Cloudflare 流程與 ads.txt。

# 工具區驗證紀錄（2026-09-07）

## 換算工具擴充

- 依提供的換算工具圖片新增 15 個獨立入口，總數 49：長度、溫度、質量、面積、體積、壓力、功率、時間、角度、電容量、速度、儲存容量、人民幣大寫、英文大小寫、匯率。12 個單位頁共用同一計算器與公式，不複製計算邏輯；一般單位頁保留原 `1 bar → kPa` 預設與流量分類，新增分類捷徑。
- 單位資料擴充為 13 類；溫度提供五溫標並檢查絕對零度，儲存區分十進位與二進位、bit 與 byte，馬力區分機械 hp 與公制 PS，Mach 明確以 343 m/s 為參考音速，不聲稱環境通用。各頁支援例值、清空、交換方向、相容單位限制與公式说明。
- 人民幣以字串與 BigInt 精確處理 0～999999999999.99、元角分、跨萬／億的零位，支援簡繁財務字形；多於兩位小數、負數、逗號、指數及超長輸入會拒絕，不自動四捨五入。英文大小寫提供五種 ASCII 模式，保留中文與其他字元；標題模式保留字內撇號，句首模式明示標點與換行規則，上限 100,000 Unicode 碼點。
- 匯率支援 TWD／USD／CNY 等 20 幣別，使用 Frankfurter v2 的每日綜合參考匯率；固定下載 USD 對 19 個報價幣別，金額與使用者選擇的組合不放入請求。只有明確按鈕操作會連線，請求省略 Cookie／Referer；隱私頁補充第三方連線資訊說明。支援完全本機的手動匯率，示範值清楚標示，不冒充目前價格。
- 匯率回應驗證筆數、幣別唯一性、日期與正有限數；交叉匯率保留兩端資料日期，資料超過 7 天提示。取得失敗、格式錯誤、取消／清空或逾時時不保留舊結果，可重試或手動輸入。獨立審查建議保留上次成功匯率；本次明確維持清除舊結果，避免失敗時誤用舊查價。未新增後端、登入、資料庫、依賴或廣告碼。
- `npm test`：91 項通過，含新單位錨點、相容單位往返、五溫標邊界、精確大寫金額、文字模式、匯率交叉與往返、無效回應／日期／金額。`tsc --noEmit`、30 個變更程式檔 scoped `oxlint`、格式與 Git 空白檢查通過；未修改既有 lint 規則，原有未修改檔案問題見先前紀錄。
- `npm run build`：55 個靜態路由、0 跳過；Wrangler 部署乾跑通過，188 個資產。`scripts/verify-site.mjs`：54 頁、canonical、sitemap、robots、真正 404、精確 ads.txt／檔尾換行／200／text/plain 通過。
- `tests/browser-smoke.mjs`：49 工具 × 桌面／手機共 98 組檢查通過，搜尋、分類、鍵盤與原 QR／Big5／類比回歸正常。`tests/conversion-browser.mjs`：實際 Frankfurter 跨域查詢與日期通過；1280／390／320 px 測試新增單位、溫標、Mach、人民幣與文字複製下載，以及模擬匯率回應、HTTP 失敗、格式錯誤、清空時取消與手動交換。Windows 剪貼簿換行按平台 CRLF 正規化比對，下載檔仍精確比對 LF 位元組。零頁面例外、零非 GET 請求；匯率請求固定且不含 Cookie／Referer。
- 已檢視桌面匯率與手機速度工具截圖；正式站發布後以相同 HTTP／換算腳本複查。部署前回復基準為 `b998eda8d5404fe5992e1decd5991bce1e860f07`，正式結果另存忽略版控的 `outputs/production-conversion-verification.json`。

## SHA-3、密鑰派生與編碼補齊

- 新增 `/tool/key-derivation` 與 `/tool/byte-encoding`，工具總數 34。加密、雜湊、密鑰派生、編碼頁提供共同切換入口，保留原生連結、搜尋、分類、canonical 與 sitemap。
- SHA-3 與 Keccak 各提供 224／256／384／512 bits 摘要及 HMAC。明確區分 FIPS SHA-3 與參考站 CryptoJS SHA3 的 Keccak 行為；新依賴僅 `@noble/hashes@2.4.0`，鎖檔其餘套件版本未變。未變更先前的 AES-GCM 封包或舊密文行為。
- PBKDF2 使用原生 Web Crypto，支援 HMAC-SHA1／256／384／512，預設 SHA256、600,000 次。EvpKDF 以 CryptoJS 支援 MD5／SHA1／256／384／512，預設 MD5、1 次，只供舊格式相容。輸出長度 128／192／256／384／512 bits；UTF-8 密碼與文字／HEX 鹽值各限 1,024 bytes。密碼不得為空，空鹽值允許相容測試並明確提示。可產生原生安全亂數 16-byte 鹽值。
- 迭代次數嚴格正整數，PBKDF2 上限 2,000,000、EvpKDF 上限 100,000；輸入變動、清空、取消及離頁會終止 Worker 並清除結果。派生輸出只有密鑰，不包含參數或 IV。獨立檢查找到的 Web Crypto 不可用錯誤已改為中文 HTTPS 提示，並加入回歸測試。
- 編碼支援 UTF-8 文字、Base64、無 padding Base64URL、HEX、Latin-1 及 UTF-16BE／LE 文字 HEX。嚴格檢查 canonical padding、偶數 HEX、Latin-1 範圍、Unicode 與 UTF-16 surrogate；不默默補字或截斷。UTF-16 選項為透過 UTF-8 中介的文字轉碼，介面明示與原始位元組檢視不同。輸入解碼限 1 MiB，輸出有界，保留 BOM／換行／空白，空結果有效。
- `npm test`：82 項通過。SHA-3／HMAC 對照 Node，Keccak／HMAC 對照另一套 CryptoJS 實作；PBKDF2 對照 Node，EvpKDF 以 Node 雜湊獨立實作區塊遞推核對全部支援長度／算法。編碼使用 Buffer 驗證格式、UTF-16 位元序、BOM、無效值與大小邊界。
- `tsc --noEmit`、17 個變更程式檔案 scoped `oxlint`、變更檔案 `oxfmt --check` 通過。鎖檔保持原 CRLF；以 `git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --check` 檢查空白。全專案既有 lint 與 11 個依賴警示見前輪紀錄，本輪沒有自動升級或停用檢查。
- `npm run build`：40 個靜態路由、0 跳過；Wrangler `deploy --dry-run` 通過，153 個資產。`scripts/verify-site.mjs`：39 頁、sitemap、robots、真正 404 與 ads.txt 精確內容／換行／200／text/plain 通過。
- `tests/browser-smoke.mjs`：34 工具 × 桌面／手機共 68 組檢查通過，含搜尋分類、鍵盤、類比、Big5 與 QR PNG／SVG 獨立解碼。`tests/crypto-browser.mjs` 原有 GCM、七種舊加密、雜湊等完整操作在 1280／390／320 px 通過。
- `tests/crypto-extras-browser.mjs` 在 1280／390／320 px 驗證 SHA3／Keccak／HMAC、PBKDF2／EvpKDF、隨機鹽、取消與清空、UTF-16、Base64 正反向、無效格式、複製／下載、鍵盤與版面；零瀏覽器錯誤、零非 GET 請求。測試等待既有 smooth scroll 與選單關閉動畫完成，避免自動操作期間 popup 被捲動關閉。
- 部署前回復基準：`505ce80e5a00fcacceeeb4391a9c8996e9d0e1f8`。正式驗證另記錄於忽略版控的 `outputs/production-crypto-extras-verification.json`；不新增追蹤、廣告碼、登入、資料庫或文章內容。

## 文字加密／解密與雜湊 HMAC

- 參考 [菜鳥加密工具](https://www.jyshare.com/crypto/)，新增 `/tool/crypto` 與 `/tool/hash`，總數 32；沿用本站分類、搜尋、獨立頁面、SEO、canonical 與 sitemap。
- 新加密預設 AES-256-GCM；HPLC1. 格式固定 PBKDF2-HMAC-SHA-256 600,000 次、16-byte salt、12-byte IV、128-bit tag 與 HPLC1. AAD。Salt 與 IV 每次使用原生安全亂數產生。版本固定 KDF 工作量，密文不能指定任意迭代次數。最大 1 MiB 原文與 1,024-byte UTF-8 密碼，不截斷或正規化原文／密碼。
- 舊格式支援 CryptoJS 密碼字串模式的 AES／DES／TripleDES（CBC＋PKCS7）、RC4、RC4Drop、Rabbit、RabbitLegacy；嚴格檢查 Base64、Salted__、salt 長度、區塊長度、PKCS7 每個填充位元組與 UTF-8。RC4Drop 0～4096 個 32-bit 字，預設 192。舊格式無驗證標籤，不能可靠識別所有錯誤密碼或篡改，介面有明確限制說明。
- 雜湊與 HMAC 支援 SHA-224／256／384／512、SHA-1、MD5、RIPEMD-160；原文允許空字串，HMAC 金鑰使用非空 UTF-8 文字。HEX 大小寫與 Base64 只用於摘要輸出，不會對密文轉大寫。不把雜湊誤稱為可解密，不把 CryptoJS Keccak 誤稱為標準 SHA-3。
- 參考頁的其他模式／填充選項、獨立 PBKDF2／EvpKDF、SHA-3 與編碼轉換項目未納入本輪；不是完整複製參考站。既有文字修復、Big5 與密碼產生器維持原功能。
- 共用背景 Worker 僅在操作時啟動；文字、密碼與金鑰不送往外部服務、不寫入網址或儲存空間。修改輸入／設定、清空或離頁會終止作業，修訂序號防止過期回覆恢復結果。複製／下載均為使用者明確操作。文字加密提供密碼確認及結果帶入反向操作。
- `npm test`：71 項通過；AES-GCM 與 Node crypto 雙向互通、隨機 salt／IV、錯誤密碼、修改 salt／IV／密文／tag 均驗證。七個舊式 wrapper 與 CryptoJS passphrase helpers 雙向互通；AES 另以 Node EVP_BytesToKey MD5 衍生驗證。七個摘要與 HMAC 全部對照 Node；另實際執行 1 MiB AES-GCM 正反算通過。
- `tsc --noEmit`、所有變更程式 `oxlint`、變更檔案格式檢查通過。鎖檔保留原有 CRLF，Git 空白檢查將 CR 視為行尾，其餘預設空白檢查維持；JSON 已解析驗證。`npm run build` 輸出 38 個靜態路由、0 跳過，Wrangler 部署乾跑通過（145 個資產）。
- `tests/crypto-browser.mjs` 在 Wrangler 正式輸出通過 1280／390／320 px 的密碼確認、加密／解密、錯誤密碼、損壞格式、複製、下載、反向帶入、空摘要、HEX／Base64、HMAC、清空、重載與取消；七個舊演算法皆經 UI 往返驗證，無瀏覽器錯誤或非 GET 請求。
- `scripts/verify-site.mjs`：37 頁、sitemap、robots、真正 404，及 ads.txt 精確內容／檔尾換行／200／text/plain 通過。
- `tests/browser-smoke.mjs`：32 工具 × 桌面／手機共 64 組路由檢查，搜尋分類、鍵盤、類比預設、Big5 複製與 QR PNG／SVG 獨立解碼通過；無瀏覽器錯誤。
- 新依賴僅 `crypto-js@4.2.0` 與 `@types/crypto-js@4.2.2`；既有所有套件版本與部署前鎖檔相同。CryptoJS 已停止維護，只供舊格式及摘要相容實作；AES-GCM／PBKDF2 使用原生 Web Crypto。`npm audit` 仍有 11 個警示（1 low、2 moderate、8 high），涉及既有 Vinext、Vite、Wrangler 等套件，未在本次升級或自動修復；新加入套件沒有列入該次警示。完整 JSON 存於忽略版控的 outputs/crypto-npm-audit.json。
- 部署前回復基準：`6e07ef8564b05a7e6115e7cc13e8428233b5b32a`。

## 密碼產生器

- 新增 `/tool/password-generator`，工具總數 30；納入搜尋、編碼分類、SEO、canonical 與 sitemap。參考 [1Password 密碼產生器](https://1password.com/zh-tw/password-generator)的產生、刷新、複製及密碼類型概念，沿用本站版型。
- 隨機字元 4～128（預設 20）、好記片語 4～10 個單字（預設 6）、數字 PIN 4～32（預設 6）。大小寫、數字、符號可選，支援排除易混淆字元、滑桿、顯示／隱藏、複製、清空與恢復預設。修改設定即清除舊結果。
- 僅在使用者按下產生後呼叫 Web Crypto；整數拒絕取樣避免取餘數偏差，整組候選拒絕取樣確保已選字元類別至少出現一次且不固定位置。安全亂數失敗即停止，沒有 Math.random 後備。PIN 保留前導零；片語可重複抽中同一單字。
- EFF Short Wordlist #1 共 1,296 個唯一單字依 CC BY 4.0 隨網站提供，保留作者、來源、授權及轉換說明。沒有新增依賴或外部字庫請求。密碼不寫入網址、儲存空間、日誌或伺服器輸出；僅明確按下複製才寫入剪貼簿，介面說明清空頁面不會清除系統剪貼簿。不宣稱密碼絕對安全或估計破解時間。
- `npm test`：59 項通過；新增測試涵蓋所有 15 種字元類別組合、上下限、空值／錯誤設定、亂數拒絕尾端、候選拒絕、失敗關閉、易混淆字元、前導零及完整字庫。
- `tsc --noEmit`、變更程式 `oxlint`、格式檢查與 `git diff --check` 通過；未修改既有 lint 問題檔案或依賴。
- `npm run build`：36 個靜態路由、0 跳過；Wrangler 部署乾跑通過（137 個資產）。
- `tests/password-browser.mjs` 在 Wrangler 正式輸出通過 1280／390／320 px 的三種模式、鍵盤產生、複製、隱藏、長值、所有選項取消、輸入無效、清空、重載、亂數失敗與剪貼簿拒絕；無瀏覽器錯誤或 POST 請求。截圖只留隱藏密碼狀態，不保存產生的密碼值。
- `scripts/verify-site.mjs`：35 頁、sitemap、robots、真正 404 與 ads.txt 精確內容／檔尾換行／200／text/plain 通過。
- `tests/browser-smoke.mjs`：30 工具 × 桌面／手機共 60 組路由檢查，搜尋分類、鍵盤、類比預設、Big5 與 QR PNG／SVG 獨立解碼通過，無瀏覽器錯誤。
- 部署前回復基準：`167cb4bd1e155c63af288489a1abbdba87387ec4`。

## 文字亂碼修復與常用電力工具

- 工具區由 25 增加至 29：文字亂碼修復與檔案轉碼、電池續航估算、電容放電、dBm／W。路由、搜尋分類、SEO 與 sitemap 由工具登錄資料統一更新。
- 參考 [DigiKey 工具清單](https://www.digikey.tw/zh/resources/online-conversion-calculators)及 [ifreesite 文字亂碼轉換](https://www.ifreesite.com/textconvert.htm)。DigiKey 多數基礎電路功能已有對應頁，本輪補上上述三個常用缺項，未宣稱涵蓋其全部工具或所有進階模式。
- 亂碼工具包含候選比較、手動指定、原文保留、背景 Worker、鍵盤快捷鍵、複製、12 種編碼下載及 UTF-8 BOM。檔案上限 1 MiB，貼上文字上限 20,000 UTF-16 字元單位；ISO-2022-CN／KR 不支援。候選需要使用者確認，遺失字元不能保證恢復。
- 所有資料在瀏覽器處理；未增加依賴、登入、後端、資料庫或追蹤。原 Big5 工具與既有公式未修改。新工具使用既有套件編碼器及原生嚴格 TextDecoder，避開套件 EUC-KR 無效位元組會產生 NUL 的問題。
- `npm test`：53 項通過，包括 12 種編碼、已知位元組、BOM、不可表示字元、EUC-KR 無效資料、電池單位、放電正反算、dBm 邊界與溢位。
- `tsc --noEmit`、全部變更檔案 `oxlint`／`oxfmt --check`、`git diff --check` 通過。Vite `?worker` 的預設匯出由編譯器提供，僅該匯入行針對靜態分析誤判加註 `import/default` 例外；型別、實際瀏覽器與正式組建均驗證其可用性。全專案舊 lint 問題見下方紀錄。
- `npm run build`：35 個靜態路由、0 跳過；Wrangler 部署乾跑通過（134 個資產）。背景轉換程式獨立輸出，只在執行轉換時載入。
- 正式輸出經本機 Wrangler 執行 `tests/text-and-power-browser.mjs`，1280／390／320 px 全通過。涵蓋候選選取、下載位元組、UTF-8 BOM、Big5 CRLF、UTF-16、複製、無效／超大檔案、清空時取消非同步讀取、文字當文字顯示、電池單位、放電反算及 dBm 雙向切換；沒有上傳請求或瀏覽器錯誤。
- `tests/circuit-browser.mjs`：23 組互動情境通過；另驗證極大 RC 時間常數圖中不產生 NaN／Infinity，以及容量換單位溢位時清除結果。
- `tests/browser-smoke.mjs`：29 工具 × 桌面／手機共 58 組路由檢查通過，含搜尋、分類、鍵盤、類比預設、Big5 複製／快捷鍵及 QR PNG／SVG 獨立解碼；無瀏覽器錯誤。
- `scripts/verify-site.mjs`：34 頁、sitemap、robots、404 及 ads.txt 的精確內容、檔尾換行、200／text/plain 通過。
- 部署前回復基準：`3c6302381c247fb7f1066f76bccd0169dca17df3`，保留 Git 歷史。

## 元件圖示與代碼文字修正

- SMD 電容與電阻改用無長接腳的片狀封裝 SVG；電容外觀與代碼拆解分開，文字改為可換行的 HTML 說明格。電阻印字在聚焦時保持原字型且不加底線。
- 軸向電阻調整本體比例，色環裁切於本體內，容差環保留間距；清空後顯示中性外觀與空值說明。
- 外觀／標示参考 Murata 陶瓷電容產品圖、Vishay D/CRCW 規格與電阻色碼圖、KYOCERA 容量代碼文件；來源連結放在各工具公式說明。
- `npm test`：42 項通過。`tsc --noEmit`、變更檔案 `oxlint`、`oxfmt --check`、`git diff --check` 通過。
- `npm run build`：31 個靜態路由、0 跳過；Wrangler `deploy --dry-run` 通過。
- 正式輸出經本機 Wrangler 驗證：`tests/marking-browser.mjs` 在 1280／390／320 px 通過三頁重載、長代碼、104K、R50、各電阻格式、文字邊界、焦點、四色／五色環、反算及無效值清除。已人工檢視桌面與手機截圖。
- `tests/circuit-browser.mjs`：21 組互動情境通過，無瀏覽器錯誤。`scripts/verify-site.mjs`：30 頁、sitemap、robots、404 與精確 ads.txt 回應通過。
- 本輪只執行變更檔案 lint；全專案原有 lint 問題見下方紀錄。未改動計算公式、部署設定或依賴。
- 部署前回復基準：`199e8129b66e0c4f6e8acd376792a0cc8f28b30b`。

## 25 個工具與互動圖示擴充

- 新增 10 個工具頁；升級既有 6 個電路工具的單位輸入、範例／清空、SVG 即時數值與焦點連動。
- 電阻色碼與 SMD 電容改為有層次的元件圖，保留四／五環、代碼拆解與鍵盤操作。
- `npm test`：42 項通過，含 990 組電容代碼往返、完整已支援 EIA-96 對照、2～20 元件、守恆、頻率與分流正反算、空值／錯誤／溢位、原工具回歸。
- `node node_modules/typescript/bin/tsc --noEmit`：通過；變更檔案 `oxlint` 與 `oxfmt --check` 通過；`git diff --check` 通過。
- `npm run build`：31 個靜態路由，0 跳過。Wrangler 部署乾跑通過。
- 正式輸出在本機 Wrangler 上通過 `tests/browser-smoke.mjs`：25 工具 × 1280px／390px 共 50 組路由、重載、SEO、版面與清空檢查；搜尋、分類鍵盤、原功能及 QR PNG／SVG 獨立解碼均通過，無瀏覽器錯誤。
- 正式輸出通過 `tests/circuit-browser.mjs`：21 組互動情境，包含 16 個電路工具的圖示焦點、單位切換保持物理量、清空／恢復範例、20 元件手機版、SMD 各格式、電容反算、分流零值、555 邊界與三相交流。無瀏覽器錯誤。
- `scripts/verify-site.mjs`：30 個頁面、sitemap、robots、真正 404，以及 ads.txt 的完整內容／檔尾換行／200／text/plain 通過。
- 全專案 lint 保留 25 個原有未修改檔案問題，沒有新增 lint 問題；未變更規則。文章仍為 0 篇已發布內容。
- 本輪回復基準為 `4fcf3779dee90a44bf807b15f751307b2897bb54`，保留 Git 歷史供 revert 後重新部署；無資料迁移。
- EIA-96 查表依 Bourns CR0603 文件的 Y、X、A–F 格式，E 系列依 ROHM IEC 60063 文件。電容通用代碼與 J/K/M 容差另依 KYOCERA 文件；不辨識廠商專用標記。

以下保留前一輪驗證紀錄。

## 通過的檢查

- `npm test`：29 項通過，包含原函式相容性、文章草稿排除、計算邊界與往返、CRC、暫存器排列、QR 獨立解碼、Big5、所有相容單位往返。
- `node node_modules/typescript/bin/tsc --noEmit`：通過。
- 對全部變更的 TS／TSX／MJS 執行 `oxlint`：通過。
- 對全部變更檔案執行 `oxfmt --check`：通過。
- `npm run build`：21 個靜態輸出路由（含 404），0 跳過。
- `wrangler deploy --config deployment/wrangler.jsonc --dry-run`：通過。
- `npm run test:browser` 對 Wrangler 靜態輸出執行：1280px、390px 共 30 組工具頁直接開啟、重新整理、SEO、無橫向溢出與無效輸入檢查；導覽、搜尋、鍵盤分類、類比預設、Big5 複製／快捷鍵及 PNG／SVG 實際下載通過，下載的兩種格式均經 jsQR 獨立解碼。無瀏覽器錯誤。
- 原 4–20 mA WebMCP 以 `{current:12,low:-50,high:150}` 驗證返回 `{value:50,percent:50,outside:false}` 並同步介面。
- `node --experimental-strip-types scripts/verify-site.mjs`：20 個正常頁面、canonical、sitemap、robots、真正 404 通過。`ads.txt` 精確比對含檔尾換行，200、`text/plain; charset=utf-8`。

## 既有檢查限制

全專案 `npm run lint` 仍回報 25 個既有問題，位於未修改的 `components/ui`、`hooks/use-mobile.ts`、`tests/articles.test.mjs` 及 `tests/calculators.test.mjs`。已以 Git 差異確認這些檔案沒有變更；未停用規則或降低檢查標準。新增與修改程式的 scoped lint 通過。

鎖定版本的本機 Wrangler runtime 最高支援 2026-05-22，故本機 `npm start` 使用此日期；正式部署設定保留原日期。正式輸出採標準頁面連結，避免 Vinext beta 的 RSC 預載錯誤。

測試圖片、下載檔案與 JSON 報告放在忽略版控的 `outputs/`。正式網站部署後另以相同 HTTP 與瀏覽器腳本驗證。

## 回復基準

本次更新前 GitHub main 為 `27fdc6756a1536e5a9100bf877c430c8508b15da`。透過 revert 本次提交並重新部署可回復；不需資料遷移。
