---
title: HMI 斷線與資料暫停的顯示及驗收
description: 以泵浦斷線時間線分開Good、暫停、零值、lastSourceChange、lastAcquired與receivedAt，設計恢復刷新與新鮮度驗收。
date: 2026-09-17
author: 茂伯
draft: false
---

## Good不等於新鮮

畫面收到Good品質只表示該筆資料在來源或通訊層被標為可用，不能單獨證明現在仍有新資料。要分開顯示value、quality、lastAcquired、lastSourceChange、receivedAt與connectionState。source change是來源值最後改變的時間；lastAcquired是系統最後成功從指定資料來源取得資料的時間，來源值不變時兩者可以相差很久。

虛構泵浦P-01在09:00:00收到value=62.0、quality=Good，09:00:30來源值改成63.0並取得，09:01:00通訊中斷。畫面可保留前一分鐘的62/63歷史，但在09:01:10必須顯示資料暫停、lastAcquired=09:00:30與age=40秒，不可只顯示63.0和綠色Good。

零值、載入中、來源不可用與暫停不同。value=0可能是有效流量，也可能是尚未載入的預設；以空白、灰色或零代替Bad會掩蓋問題。畫面要有文字狀態與最後有效時間。

新鮮度計算可用 age=now−lastAcquired，並顯示計算時間與時區。source change只用來描述來源內容何時變動；若value長期不變但每10秒成功讀取，lastAcquired持續更新、source change不變，這是正常而非停更。

| 狀態 | 值 | 品質/連線 | 畫面語意 |
| --- | --- | --- | --- |
| 有效新資料 | 63.0 | Good/Connected | 目前值 |
| 值不變但持續取得 | 63.0 | Good/Connected | source change較早 |
| 暫停 | 63.0 | 最後取得於40秒前 | 保留值但不可用於控制 |
| 未載入/失聯 | 無或舊值 | Bad/Disconnected | Unknown，不當零 |

## 斷線時間線與刷新

沿用案例：09:00:30最後一次取得63.0，09:01:00連線中斷，09:01:10畫面收到connection Lost。預期顯示lastAcquired、age=40秒（以取得時間計）、connection=Disconnected、quality保留來源原碼，freshness=Stale。若系統只收到斷線事件而沒有新值，不能更新lastAcquired為現在。

09:02:00連線恢復但資料尚未重新取得，畫面顯示Connected、data pending；不要立刻把舊值標Good。09:02:05取得64.0且quality Good，才更新value、lastAcquired、receivedAt並清除暫停提示。恢復事件要記錄從何時中斷、持續多久與是否有資料缺口。

另做一個正常通訊測試：09:00:30取得63.0後，09:00:40再成功取得同值。此時lastAcquired應更新成09:00:40，lastSourceChange仍是09:00:30。這是另一組測試，不改動前述中斷案例的最後取得時間。

| 時間 | 事件 | 預期顯示 | 不可做的事 |
| --- | --- | --- | --- |
| 09:00:30 | 取得63.0 Good | 更新value與lastAcquired | 同步核對連線狀態 |
| 09:01:00 | 連線中斷 | Disconnected/暫停 | 不以舊值冒充目前值 |
| 09:02:00 | 連線恢復無資料 | Connected pending | 不立刻標Good |
| 09:02:05 | 取得64.0 Good | Fresh/清除提示 | 不遺漏中斷區間 |

斷線後的保留值可協助操作員了解最後狀態，但不應送入閉迴路或手動命令判斷。畫面以「最後有效值」標籤、灰階、斜線或鎖定提示表示，並把可用性與數值分欄。

時間回撥時age可能變負，系統要標Clock invalid或使用單調時間計算持續時間。不要把負age當新鮮，並在事件中保存來源時鐘與HMI時鐘差異。

斷線事件本身也要有來源與receivedAt，否則操作員無法知道是資料停止還是HMI停止刷新。若connection仍Connected但lastAcquired老化，查資料源取得流程或新鮮度欄位更新；若connection Disconnected且lastAcquired剛更新，查狀態事件排序與時鐘。

若資料來源只停止變化但仍可取得，畫面可顯示Good與source change age；這和斷線的Disconnected/Stale不同，排錯要保留差異。

新鮮度門檻要按用途定義。例如趨勢顯示可在120秒標Stale，控制操作可能在10秒就禁止；這些是工程策略，不是HMI通用預設。每個畫面要顯示門檻與時間基準。

## 排錯與適用限制

若畫面仍顯示綠色Good，先查quality來源、lastAcquired是否真的更新、連線事件是否送達、時鐘是否同步與元件是否快取。若value變化但lastAcquired不變，查資料綁定；若lastAcquired更新但來源不變，這可能是正常週期取得，不應誤報資料未更新。

Ignition 8.1 Tag Diagnostics可區分目前值、quality、timestamp、最後儲存時間與subscription value；Tag Historian也保存quality與毫秒timestamp，並可能只在值超過deadband時儲存。歷史最後一筆不等於即時取得時間，需在畫面契約中分列。

恢復後不應只刷新畫面文字。重讀目前值、quality、來源時間與connection，標記中斷窗口，並依需求補查歷史。若恢復期間有控制命令，不要因畫面重新變Good就自動重送；先查控制器或服務結果。

來源重連可能先回傳舊快取再取得新值。恢復流程要記錄receivedAt與source timestamp，若source timestamp早於中斷前最後值，不可直接當恢復資料；先依序號、版本或來源規則判斷。

恢復後若中斷期間沒有資料，頁面顯示Data gap起訖與筆數未知，不能以插值填滿目前值。歷史趨勢可用空白或明顯斷線標記，避免圖線把缺口畫成真實連續值。

畫面恢復時要避免瞬間把多筆補送資料排序錯誤。依source timestamp、sequence與取得時間顯示，若順序不確定，標記out-of-order並保留原始順序。

quality欄應保留來源原始品質碼；Stale、Disconnected與Data paused是應用層新鮮度或連線狀態，不可把它們寫回成Bad而丟失原始證據。lastSourceChange只是來源變化時間欄位，除非指定資料源文件明確定義，不能泛稱等同OPC SourceTimestamp。

未指定HMI平台時，不假定PLC能讀取HMI登入session或連線旗標。資料來源、Gateway、HMI與控制器的狀態各自記錄；UI顯示只能根據可驗證的資料欄位。

## 斷線畫面驗收補充

把總覽、設備詳情、趨勢與控制頁放在同一條09:00:30至09:02:05時間線驗收。總覽在09:01:10顯示資料暫停，詳情保留63.0與lastAcquired，趨勢對中斷區間留白，控制頁禁止使用舊值。恢復後四頁都要在取得64.0 Good後更新，且保留中斷起訖。

若不同畫面刷新週期不同，必須顯示各自snapshotAt，不能因總覽已Connected就假設控制頁已拿到新值。排錯時保存畫面、資料源與Gateway三方時間，分開判斷綁定快取、通訊延遲與來源品質。

零值驗收要用真實可為零的訊號，例如流量0，並搭配取得時間與品質；載入中則顯示Loading，不使用0佔位。恢復後若真值仍0，畫面應由Loading轉Fresh zero，而不是沿用斷線時的Unknown。

適用限制包括資料來源是否提供source timestamp、quality code與connection事件；若只得到裸值，HMI只能標示取得時間，不能聲稱來源品質或設備在線。

測試成功不代表所有型號具相同quality語意；實作前補入指定HMI、通訊驅動與資料源文件。

當畫面顯示最後有效值時，旁邊同時顯示「不可用於控制」比單純灰色更清楚。若操作員仍能按下控制按鈕，先檢查控制器的來源品質與模式，不要依UI顏色判斷。

顯示策略要與警報、歷史趨勢及控制頁一致，避免一頁標Fresh、另一頁用舊值執行。

## 驗收 FAQ與來源

驗收用固定序列：Good新值、Good不變值、來源停更、連線中斷、恢復無資料、恢復取得新值、quality Bad與時間回撥。每列保存value、quality、lastSourceChange、lastAcquired、receivedAt、age與畫面文字。

成功結果是舊值可被看見但明確標示不可用於目前判斷；失敗結果包括舊值只顯示Good卻未提示老化、斷線變成零、恢復未重新取值或時間欄互相矛盾。排錯先對比資料來源記錄，再查HMI綁定與快取。

FAQ1：Good就是新鮮嗎？不是，Good與資料年齡是不同維度。

FAQ2：source change能當最後取得時間嗎？不能，來源值不變時仍可能被週期取得。

FAQ3：斷線時可把值清成0嗎？不可，除非工程契約明確定義0且另保留不可用狀態。

FAQ4：連線恢復就能清除暫停提示嗎？不能，要等有效新資料取得並通過品質檢查。

本文泵浦、時間與門檻為離線案例。

參考：[Ignition 8.1 Tag Diagnostics：目前值、quality、timestamp、Last Stored Value與訂閱診斷欄位。](https://www.docs.inductiveautomation.com/docs/8.1/platform/tags/tag-diagnostics)

參考：[Ignition 8.1 Tag Historian：quality、毫秒timestamp、on-change/deadband與Store and Forward。](https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/tag-historian)

若quality仍Good但lastAcquired超過門檻，畫面應顯示Good/STALE兩個欄位或明確顯示資料老化。Good是品質碼，STALE是應用新鮮度策略，不能改寫成Good=false而失去原始證據。

多個畫面要使用同一freshness policy，避免總覽顯示Fresh而詳細頁顯示Stale。版本化門檻與欄位定義，變更時重新檢查控制、趨勢、警報與報表。

品質旗標、連線旗標與freshness可用不同欄位呈現，必要時在總覽用一句話合成「資料暫停」，但詳細頁仍要能展開各來源。

若lastAcquired與receivedAt差距很大，查store-forward或Gateway延遲，不能把HMI收到時間當來源取得時間。

參考：[Ignition 8.1 Database Table Reference：歷史資料quality與t_stamp欄位說明。](https://docs.inductiveautomation.com/docs/8.1/appendix/reference-pages/ignition-database-table-reference)

## 延伸閱讀

- [HMI 多語系排版 避免標籤 按鈕與警報被截斷](/articles/hmi-multilanguage-translation-key-layout)
- [HMI 班次交接頁應該留下哪些現場資訊](/articles/hmi-shift-handover-information)
