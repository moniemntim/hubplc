---
title: HMI 手動與自動模式怎麼在畫面上清楚區分
description: 以輸送線案例分開modeRequest、modeConfirmed、controlOwner與互鎖，設計手自動切換、品質、逾時、復歸與HMI文字狀態。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先分模式 控制權與允許

手動與自動不是一個畫面字串，而是三個要分開的狀態：modeRequest是使用者提出的要求，modeConfirmed是控制器確認的目前模式，controlOwner是目前允許送出命令的來源。按下手動按鈕不等於PLC已切換，也不會自動解除互鎖或安全條件。

虛構輸送線把目前模式Auto/Manual、轉移狀態Stopping與故障狀態Fault分欄保存。操作員提出Manual時先顯示請求中，實際控制權尚未交接；可信服務檢查使用者授權，控制器依已定義的停止、步驟及互鎖條件決定能否轉移。若故障或拒絕，不把畫面上的請求值當作目前模式。

登入或按鈕disable只控制介面權限與操作入口，不是安全功能。Ignition 8.1可用Security Levels、Roles、Zones限制Perspective視圖、事件動作與Tag讀寫，但仍需由控制器驗證模式與互鎖。本文所有狀態與欄位都是範例設計，不代表Ignition原生模式機制。

交接順序要由控制契約定義：先完成自動流程的可中斷處理與停止確認，再授予Manual控制權，不能先宣告Manual後才取消自動輸出。兩個HMI同時開啟時，可信服務驗證個人身分，控制器仲裁命令來源。controlOwner應表示具體來源或控制權代碼，不只寫Operator角色。

測試人員也要驗證錯誤訊息是否能指向下一步，而不是只顯示禁止。模式請求被拒時，畫面列出目前modeConfirmed、controlOwner、interlock與quality，並提供重新讀取狀態的動作。

| 狀態 | HMI顯示 | 控制權 | 按鈕行為 |
| --- | --- | --- | --- |
| Auto confirmed | 自動／控制器 | Auto sequence | 手動按鈕可請求 |
| Manual requested | 切換請求中 | 尚未轉移 | 禁止重複請求 |
| Manual confirmed | 手動／操作員 | 允許手動請求 | 仍受互鎖 |
| 請求Rejected／設備Fault分欄 | 拒絕理由及實際故障 | 保留可確認的目前控制權 | 依設備規格允許停止或復歸 |

## 切換前確認與復歸

本例切Manual需輸送線停止、無未完成自動命令、回饋有效且互鎖允許。服務端另驗使用者是否可申請；控制器檢查設備條件及可信命令介面，不假設PLC能讀懂瀏覽器session。畫面資料必須品質合格且未逾期，僅「不是Bad」不足以讓Uncertain或陳舊資料取得操作許可。

離開Manual回Auto也需要條件：所有手動命令已停止或明確取消、輸出回到安全的待命值、感測器品質正常、自動流程重新建立起點、控制權已交還控制器。若自動流程仍在中間步驟，不應因按鈕啟用就直接跳回Auto。

成功、拒絕與逾時都要有不同結果。成功時modeConfirmed改變並記錄操作者與時間；拒絕時保留原模式和拒絕原因；逾時時顯示控制器未回覆，不重送無限次。復歸按鈕只清除可復歸的請求，不清除仍存在的互鎖。

| 請求 | 服務／控制器分層檢查 | 成功 | 失敗 |
| --- | --- | --- | --- |
| Manual | 停止、權限、互鎖、品質 | confirmed=Manual | 保留Auto並列原因 |
| Auto | 手動命令停止、流程起點 | confirmed=Auto | 保留Manual或Fault |
| 手動測試請求 | Manual、控制權及條件有效 | 依明確測試契約回饋 | 拒絕，無直接輸出捷徑 |
| Reset | 故障可復歸 | 故障清除 | 保留故障證據 |

復歸條件要和故障來源對應。若互鎖是回饋遺失，恢復後先重新讀取quality與現場狀態；若是流程步驟未知，需重新建立起點，不能單按Reset跳過。每個拒絕原因要有文字、時間與requestId，方便交接。

若兩個使用者同時請求Auto與Manual，控制器按明確仲裁規則處理並回覆兩個requestId；HMI不可用最後一次按鈕事件假定結果。

控制器每次回覆都應帶requestId或sequence，HMI用它對應結果。若HMI重開，先讀modeConfirmed、controlOwner、active interlock與品質，再決定顯示，不能把本機最後一次按鈕值當目前模式。

## 畫面如何避免誤操作

模式頁頂端固定顯示modeConfirmed、controlOwner、lastTransitionAt、quality與interlock summary；按鈕旁顯示目前請求、剩餘等待與拒絕原因。使用者不必猜顏色：用完整文字「手動已確認」「手動請求中」「控制器拒絕」「資料品質不良」。

手動頁只列目前允許的命令與前置條件。手動測試按鈕可在控制器拒絕時保持可見但不可執行，並顯示「互鎖未滿足：護罩回饋無效」；把按鈕整個隱藏會讓值班者無法知道為何不能操作。

品質Bad、通訊中斷或modeConfirmed未知時，畫面不可顯示可操作的綠色就緒。Ignition官方品質與Tag權限文件說明無權限可能看到AccessDenied、品質可用來分流；這些是資料/權限狀態，不等於設備已安全。

| 顯示欄 | 正常例 | 異常例 | 操作限制 |
| --- | --- | --- | --- |
| modeConfirmed | Manual | Unknown/Auto | 不可依HMI猜測 |
| quality | Good | Bad_AccessDenied/失聯 | 禁止命令 |
| controlOwner | HMI-01獲授控制權 | Controller/None | 拒絕手動 |
| interlock | 全部允許 | Door not proven | 控制器拒絕 |

有效session與角色由可信服務檢查，控制器依命令來源、有效期限、模式及互鎖判斷。通訊在命令送出後中斷時，HMI顯示結果未知；控制器對失聯如何處置需另有設備規格。恢復後先查原requestId與實際狀態，不盲目重送可能有副作用的操作。

操作按鈕的使能條件與控制器接受條件要列成兩欄，兩者不同時畫面顯示不一致待確認。

顯示設計要在黑白、色盲與不同尺寸下可讀。文字、圖示、位置與狀態欄共同表達；紅色不代表安全鎖定，灰色也不代表輸出已斷能。實際安全隔離要由安全設計、LOTO與設備程序完成。

## 案例驗證與限制

離線時間線：09:00發送模式請求M17，因未完成工作被拒，確認模式仍Auto；09:05停止及回饋有效後發M18，收到Manual確認。09:06提出手動測試J19，因護罩回饋無效遭拒。三筆ID代表不同操作，不能把模式請求回覆錯配到測試動作。

另設失聯分支：09:05發送M18後連線中斷，畫面顯示切換結果未知。重連後以M18查結果，再取得新的modeConfirmed、controlOwner與版本；若已切Manual，就更新畫面，不再發一次切換。若服務沒有查詢或去重能力，列為介面限制並採核准的人工查證程序。

測試矩陣要覆蓋Auto→Manual成功、權限不足、互鎖不滿足、品質Bad、逾時、同時Auto/Manual請求、HMI重開、控制器重開與Manual→Auto取消。每列記預期模式、控制權、按鈕、原因與回饋。

成功驗收不只看模式字串。要同時證明畫面、控制器、輸出回饋、互鎖與歷史記錄一致；任一層不同步，顯示「模式不一致」並停止操作入口。

若設備需要按住才動的Jog，不能照一般按鈕點一下的範例實作。按下、放開、離頁、session中斷、通訊失聯及控制器看門狗都需明確定義，並依設備安全設計驗證。本篇僅設計狀態顯示，沒有提供可直接驅動運動的Jog程式。

驗收報告保存每次模式轉移前後快照，不能只保留最後狀態。

這些是模式介面與控制契約範例，不是任何PLC品牌的指令或位址。手動模式不解除互鎖；安全門、急停、扭力限制與能源隔離另依機械與安全規格驗證。

## FAQ 來源與驗證

FAQ1：按下Manual就算切換成功嗎？不算，必須等待控制器以modeConfirmed回覆。

FAQ2：按鈕disable能防止設備動作嗎？不能，它只限制HMI入口；控制器、互鎖與安全功能仍要獨立設計。

FAQ3：手動模式會解除互鎖嗎？不會。Manual只是控制來源狀態，所有互鎖仍有效。

FAQ4：HMI重開後可用最後按鈕值恢復模式嗎？不可，應重新讀控制器確認模式、控制權、品質與互鎖。

本文輸送線、requestId、狀態與互鎖為離線範例。

參考：[Ignition 8.1 Security：Authentication、Roles、Security Levels與Zones的產品授權範圍。](https://www.docs.inductiveautomation.com/docs/8.1/platform/security)

參考：[Ignition 8.1 Tag Security Properties：Tag讀寫權限、Read Only與品質/AccessDenied顯示。](https://docs.inductiveautomation.com/docs/8.1/platform/tags/tag-properties/tag-security-properties)

參考：[Ignition 8.1 Security in Perspective：View、事件動作與Session權限；UI權限不替代設備安全。](https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/security-in-perspective)

## 延伸閱讀

- [HMI 趨勢游標與事件標記如何協助回看一次異常](/articles/hmi-trend-cursor-event-marker-time-alignment)
- [HMI 設定值變更畫面怎麼降低輸入錯誤](/articles/hmi-setting-value-change-confirm-readback)
- [HMI 維護模式的畫面與一般操作畫面要怎麼分開](/articles/hmi-maintenance-mode-screen-permissions)
