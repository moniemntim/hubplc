---
title: 即時歷史時間基準校正
description: 區分source UTC、receive UTC與bucket start，示範台北UTC+8、clock offset、DST歧義與late/reorder分桶。
date: 2026-09-21
author: 站長
draft: false
category: HMI 畫面與操作
---

## 一 三種時間基準要同時保存

即時歷史資料至少有source timestamp、receive timestamp與bucket start。source是設備採樣時間，receive是系統收到時間，bucket start是報表區間標籤，三者不能互換。台北UTC+8的10:00代表02:00Z；若只保存10:00而不帶offset，跨系統比較會出錯。

案例設備在02:00:00.200Z採樣，02:00:00.450Z收到，報表10:00 bucket代表區間[10:00,10:10)，不是一筆恰好10:00的sample。資料列應同時保存source_utc、received_utc、bucket_start_utc與timezone policy。

| 欄位 | 案例 | 語意 |
| --- | --- | --- |
| source | 02:00:00.200Z | 設備採樣 |
| receive | 02:00:00.450Z | 系統收件 |
| bucket start | 02:00:00Z | 區間起點 |
| display | 台北10:00 | 格式化呈現 |

若設備只送local time，先取得offset或時區規則再轉UTC；不能把所有local時間當UTC。來源時間與收件時間都要保留原始值及轉換狀態。

每筆歷史資料應至少保存raw_source_timestamp、source_timezone或offset、source_utc、receive_utc與point_id。轉換失敗時保留raw並標TimeParseError，不把無法判讀的local字串當UTC。

lateness可用receive_utc−source_utc估算，但若兩端時鐘未同步，只能標估計或未知。watermark允許前一桶重開時，需保存重算版本與原先報表差異。

bucket的左閉右開規則要固定。10:00 bucket涵蓋10:00:00至未滿10:10:00；恰好10:10:00進下一桶。label是區間起點，不能當成sample_time。

local時間字串應保留原樣，轉換後的UTC是衍生欄位，避免失去來源證據。

若資料落在不存在的DST local時間，拒絕比自動向前調整更容易稽核。

late資料若觸發桶重算，應讓下游知道資料版本改變，不能在同一報表名稱下靜默變更。

## 二 clock offset不能覆蓋原時間

若設備clock比標準慢18秒，收到source_local=10:00:00不代表可以直接把原始timestamp改成10:00:18。應保存raw source timestamp、估計offset、校正後衍生時間與offset取得時間。校正值是估計，不應覆蓋證據。

offset也可能漂移或在設備重啟後失效。每次校時要有source、reference、uncertainty與有效期間；沒有可靠校時證據時，source quality應標Unknown或Uncertain，而不是強行平移全部歷史資料。

| 欄位 | 範例 | 處理 |
| --- | --- | --- |
| raw source | 10:00:00 local | 原樣保存 |
| offset | +18s estimate | 衍生校正 |
| corrected | 10:00:18 | 標estimate |
| receive | 10:00:20 | 獨立保存 |

報表可選擇用corrected time分桶，但查詢仍能回到raw timestamp與offset版本。若重新估計offset，不應默默改寫已發布的歷史bucket。

台北標準時間10:00+08:00換成02:00Z；若資料只寫10:00，必須先知道來源時區。資料庫若以UTC保存，UI再依使用者timezone格式化，不能在資料庫中混存local與UTC。

同point_id、unit、filter與資料集才可直接比較。°C與°F、原始點與10分鐘平均、不同校正版本都應分開；只比時間相同不代表資料可比。

若校時服務中斷，不要直接把品質改成Good；可保留raw與最後offset並標Uncertain，直到取得新證據。本文不提供任何自動改時計畫。

設備重啟可能重設clock offset或sequence，需用boot_id或校時事件分隔資料世代。

報表標籤要說明timezone與bucket寬度，避免讀者把10:00誤認成單一採樣。

若receive時間早於source時間，先檢查時鐘偏差與解析錯誤，不要直接把負lateness當成零。

clock offset估計有不確定度時，lateness與source age也應標示估計，不要輸出看似精確的單一數字。

## 三 時區 DST與bucket

台北固定案例可用UTC+8轉換：local10:00→02:00Z。對有DST的時區，local 01:30可能出現兩次或不存在；資料必須帶offset或fold/transition資訊。只有字串01:30沒有offset時，應標AmbiguousLocal並要求補充，不能猜。

bucket label只表示區間。10:00 bucket若寬度10分鐘，涵蓋[10:00,10:10)，10:09:59的資料仍屬同一桶；不能把label當成每一筆source sample。邊界規則要固定且寫入報表。

| 情境 | 表示 | 預期 |
| --- | --- | --- |
| 台北10:00 | 02:00Z | 轉換正確 |
| DST重複01:30 | 需offset/fold | Ambiguous若缺 |
| bucket10:00 | [10:00,10:10) | 區間標籤 |
| sample10:09:59 | 同一桶 | 不改source |

顯示timezone變更只改呈現，不改UTC canonical。報表若按使用者時區重新分桶，應保存bucket policy與版本，避免同一批資料因設定改變而無法重現。

clock offset是估計值，不是事後真理。保存offset_source、measured_at、uncertainty與calibration_version；重新校時後的新offset只影響新衍生結果，除非有明確的歷史重算程序。

亂序資料先依source時間排序，sequence或event_id處理重送。晚到事件不能因receive順序覆蓋較新的source事件；衝突需記錄而非靜默丟棄。

source與receive時鐘不同時，lateness只是一個估計，不可拿來當設備延遲精確量測。

同一point_id若unit變更，應視為資料契約變更，不能在同一平均桶內直接合併。

source timestamp的精度要保存，例如毫秒或微秒；不能把未知精度補成整秒再宣稱精確排序。

驗收應同時測正常、晚到、亂序、重送、DST歧義與offset失效，不能只測單一UTC路徑。

實際能力與政策需依目標環境驗證。

結果頁應同時顯示三種時間、時區、offset狀態、bucket寬度與lateness，讓使用者知道圖上的標籤不是單一採樣。

DST不存在的local時間不能靠補一個fold值救回；fold只處理重複時間，spring-forward造成的invalid local必須拒絕或要求來源提供offset/UTC。

## 四 lateness reorder與驗收

即時資料可能晚到或亂序。sample 假設來源與接收時鐘均可信，source=02:09:59Z、receive=02:10:05Z，則source仍屬前一桶、receive已在下一桶，lateness=6s；不能因收到時間落在下一桶就直接改入receive bucket。系統要定義watermark或允許重開前一桶。

比較資料時先比same point_id、unit、filter與時間基準。溫度°C與°F不能直接比，平均值和原始點也不能混用。若同一point_id重送，依sequence或event_id去重，不能只看receive順序。

| 測試 | 輸入 | 預期 |
| --- | --- | --- |
| UTC轉換 | 台北10:00 | 02:00Z |
| clock offset | 慢18s | 保存raw+estimate |
| late sample | source早、receive晚 | 依source分桶 |
| DST | 重複local | 缺offset拒絕 |
| 重送 | 同point/event | 去重 |

排查先看原始三種時間與offset，再看timezone、bucket邊界與lateness政策；最後才看圖表。校時精度與資料庫重開桶能力需依平台確認。

DST fall-back的01:30可能有兩個offset，spring-forward的02:30可能不存在。沒有offset或fold資訊時，系統應回AmbiguousLocal/InvalidLocal，要求補充，不用當下電腦時區猜。

驗收要同時查UTC、顯示local、bucket、lateness與offset欄位。圖表顯示10:00時，工程師應能查回02:00Z區間、原始時間與收件時間。

bucket重算要記錄誰觸發、使用哪個watermark與版本，否則報表前後不一致。

receive時間適合監測系統延遲，source時間適合資料排序，bucket時間適合報表聚合。

時間校正只產生衍生欄位，原始timestamp不可被覆蓋，否則日後無法重新評估offset。

台北時間換算案例還要保存+08:00原始offset；只寫Z而沒有來源時區時，報表無法確認轉換是否正確。

時間基準的欄位名稱應避免使用模糊的time；明確使用source_utc、receive_utc、bucket_start與display_timezone。

不要把報表桶標籤當成設備的單一採樣時間。

## 五 FAQ與來源

驗收完成後保存轉換、分桶與重排結果，下一次時區或校正規則升版可比較差異。

結果可追溯。

若設備clock慢18秒且兩端都以同一reference比較，source local 10:00:00可產生corrected 10:00:18；receive時間仍應以主機實際收到時刻保存，例如10:00:20，不可將設備未校正時間與主機時間直接相減。corrected欄位標示estimate，不覆蓋raw。

同一bucket內若資料有不同unit或filter版本，應拆成不同聚合，不可僅依point_id合併。

若需要校正歷史資料，另產生新資料集與版本，原始資料集保持可回溯。

轉換記錄保存後可重算。

source、receive、bucket start各自有不同語意；UTC canonical與顯示timezone分離。台北10:00=02:00Z，clock offset只產生校正衍生值，不覆蓋raw；DST歧義需offset，late資料依source時間與政策處理。

FAQ1：bucket10:00代表設備10:00整點採樣嗎？答：不一定，它通常代表一個區間。

FAQ2：設備慢18秒可直接把所有timestamp加18嗎？答：不可，保存raw並標示offset估計與有效期間。

FAQ3：local01:30沒有offset能轉UTC嗎？答：DST可能歧義，應拒絕或要求補充offset。

FAQ4：晚到資料收到在哪桶就放哪桶嗎？答：本案例依source timestamp分桶並記lateness。

參考：[RFC 3339：UTC與offset時間戳表示規範。](https://www.rfc-editor.org/rfc/rfc3339)

參考：[IANA Time Zone Database：時區與DST規則資料來源。](https://www.iana.org/time-zones)

## 延伸閱讀

- [趨勢游標插值與原始點](/articles/trend-cursor-interpolation-raw-points)
- [畫面載入慢怎麼設計 loading partial empty error與cancel](/articles/hmi-loading-partial-empty-error-cancel)
