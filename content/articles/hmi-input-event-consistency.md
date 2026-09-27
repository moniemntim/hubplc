---
title: 鍵盤與觸控輸入事件一致性
description: 以單一提交入口、IME 規則與操作 ID 避免重複命令。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 把鍵盤與觸控收斂成一個操作

同一個Save元件可經鍵盤或觸控收到不同事件序列，應先區分使用者意圖與框架產生的後續事件。若每個事件都直接送命令，一次觸控可能造成兩筆寫入；若focusout被當取消，使用者先點Save使輸入框失焦，草稿反而被刪除。本文把原生button或form的submit當唯一送出入口，其他事件只負責觸發它。 事件記錄的目的不是收集所有瀏覽器細節，而是證明一次使用者意圖只產生一個request。

鍵盤Enter在輸入法組字期間不送出。compositionstart後收到的Enter留給IME完成候選，compositionend後，使用者再按一次Enter才可觸發submit。觸控pointerup只更新手勢結果，瀏覽器產生的click再由原生button統一處理；不可同時在pointerup和click各寫一份提交程式。 submit gate應在同步事件與非同步回呼之間都有效，不能只靠按鈕暫時disabled。

每次可送出的動作建立op_id、target、command_type、payload與version。狀態由Editing進入Pending，再進Submitting與Completed；Pending期間重複keydown、click或重繪事件都回DuplicatePending。一次完成後，真正的新按才建立新的op_id，不能永遠重用舊ID。 若框架自動觸發click，仍以同一個表單入口去重，不額外註冊第二條送出路徑。

同一op_id若target或payload改變，回Conflict並保留原請求；若版本已被別人更新，回VersionConflict。這些是資料一致性結果，不是輸入事件順序。操作紀錄要保存事件類型、monotonic時間、op_id與最終狀態，才能分辨雙擊、重送和真正的新操作。 文章中的狀態是自訂教學模型，實作時須映射到目標HMI可用的事件機制。

## 草稿 焦點與提交狀態機

Editing狀態只更新本地draft與draft_version。focusout本身不取消draft，因為焦點從數字框移到Save是正常表單流程；只有離開頁面、切換設備或明確按Cancel才依產品政策處理。若離頁要丟棄未送出資料，先提示並保存稽核，不把一般失焦誤判成取消。 draft與request snapshot分開可防止使用者修改65時覆蓋仍在處理的60。

按下Save時，submit handler先檢查IME composing旗標、必填欄位、型別、範圍與版本，再以目前draft建立不可變的request snapshot。送出後即使畫面欄位被再次編輯，正在處理的request仍使用舊snapshot；新的編輯留在下一個draft，避免回應覆蓋使用者新輸入。 focusout的來源、去向與是否離頁要分開判斷；同頁移動不能等同離開。

以target=PumpA、payload=60、version=7為例，第一次submit產生op-17並進入Pending。pointerup不提交，click經唯一submit入口提交；同意圖的其他觸發若已Pending則回DuplicatePending。伺服器完成後回Completed；使用者把值改成65再按Save，建立op-18。若重送op-17卻把target改成PumpB，必須回Conflict而非當成新命令。 版本檢查失敗要把目前版本呈現給操作員，不能偷偷以舊版本重試。

測試要刻意在四個時機移動焦點：輸入中失焦到Save、組字中按Enter、Pending中再次點擊、Completed後新按。預期第一個保留draft、第二個不送出、第三個只有一筆請求、第四個產生新op_id。若使用者按Cancel，僅Pending前的draft可取消；已送出的命令不能假裝被撤回。 op_id要能在畫面、伺服器與稽核檔中互相查找。

## 事件排序與例外處理

事件時間用monotonic clock記錄，不能用會校時的牆上時間判斷先後。pointercancel、視窗失焦或頁面切換代表手勢可能中止，但若submit已進入Submitting，只能停止尚未送出的手勢，不可撤回已送達的設備命令。pending request的結果仍要入帳。 同一時鐘原點的monotonic時間用來分析本地事件，顯示給人看的時間仍可另存牆上時間與時區。

多指觸控時先取得pointer ownership；非owner的第二指事件標為Ignored，不取消owner，也不觸發第二次submit。若owner收到pointercancel，回到Editing並保留draft；若系統已在Pending，則維持Pending等待結果。這些規則必須在鍵盤與觸控測試中一致。 第二指Ignored的紀錄有助於排查誤觸，但它不應改變owner的狀態。

IME測試使用中文候選：compositionstart、keydown Enter、compositionupdate、compositionend。組字期間Enter只完成候選，submit計數仍為零；compositionend後再按一次Enter才建立op_id。若瀏覽器同時派發keyup與click，兩者都不得繞過submit gate。 對未知副作用的寫入，先查詢結果比自動重送更能避免恢復風暴。

網路逾時不等於設備未執行。請把結果標為Unknown或TimedOut，依命令類型由工程規格決定是否查詢狀態；不可因使用者再次按Save就盲目重播。對可重試讀取可建立新op_id並引用前一筆，對可能造成副作用的寫入則先查詢或人工確認。 逾時後保留Pending或轉Unknown必須由命令契約決定，不能用網路錯誤碼代替設備結果。

## 驗收矩陣與可追溯紀錄

建立事件序列測試而非只測按鈕外觀。序列A是draft=10、focusout到Save、click一次，應有一個op_id；序列B是在composition中按Enter，應無op_id；序列C是pointerup後click，仍只能一筆；序列D是Completed後把值改成11再按，應產生新op_id。每列都保存預期與實際狀態。 測試人員應把事件序列和預期request數量先寫在表格，測完再比對log，而不是只看最後提示。

版本衝突案例先讓另一個操作者把version 7改成8，再送原本的op-17。服務端回VersionConflict，畫面保留使用者draft並顯示目前版本；使用者重新載入後才可建立新op_id。若op-17的payload被改寫成65，服務端回Conflict，不能用相同ID覆蓋稽核資料。 版本衝突案例要確認原draft仍可編輯，避免拒絕後使用者只能重新輸入。

成功、拒絕、逾時與取消都要有結束狀態。Pending不是永遠的鎖；完成或明確失敗後才開放新的使用者意圖；仍需保留已消費手勢或提交識別，避免第一筆很快完成後，該手勢的晚到事件被錯當新操作。若頁面重新載入，應從服務端查詢未完成op_id，而不是把本地click再送一次。沒有特定HMI API時，這些是可在測試替身中驗證的狀態契約。 頁面重載後查詢未完成工作是恢復流程，不是再次模擬click。

驗收完成的證據包括事件log、request snapshot、response、版本與使用者提示。只看到畫面顯示Saved不足以證明設備接受；也不能用一次測試推論所有瀏覽器事件順序。應在目標瀏覽器、觸控裝置與鍵盤配置下重跑矩陣，並把未驗證的平台行為列為限制。 任何未在目標瀏覽器驗證的composition或pointer行為，都應在交付限制中列出。

## FAQ與來源

FAQ1：pointerup和click都能呼叫送出函式嗎？答：不應如此。把原生button或form的submit設為唯一入口，pointer事件只更新手勢，並以op_id與Pending gate防止瀏覽器事件重複。 FAQ答案以狀態機為準，若產品元件有不同事件語意，應先做小型事件記錄實驗。

FAQ2：輸入框focusout就取消draft是否安全？答：不安全。移到Save是正常流程，應保留draft；只有明確離頁或Cancel才依政策處理，且要提示使用者與留下必要稽核。 原生規範是事件模型參考，並不保證某HMI提供相同的composition事件。

FAQ3：組字時按Enter為何不提交？答：Enter可能是IME選字事件。composition期間應消耗它，待compositionend後再按一次才提交，否則中文輸入會被截斷並誤發命令。 同一op_id的冪等只適用相同請求內容，不能成為永遠不建立新操作的捷徑。

FAQ4：Completed後重按可否沿用同一op_id？答：真正的新操作要新op_id；只有同一請求的重複傳遞才可用相同ID作冪等辨識。若同ID換target或payload，回Conflict。 完成驗收後保留一份含事件時間與request快照的報告，供日後排查。

參考：[W3C UI Events：鍵盤、焦點與composition事件的通用事件模型；不是特定PLC/HMI的提交API。](https://www.w3.org/TR/uievents/)

參考：[W3C Pointer Events：pointerdown、pointerup、pointercancel與pointer capture概念；實際觸控產品仍須查其支援範圍。](https://www.w3.org/TR/pointerevents/)

## 延伸閱讀

- [HMI數值顯示溢位與診斷](/articles/hmi-numeric-overflow)
- [畫面回上一頁時如何保留或清除暫存篩選](/articles/restore-filter-navigation-state)
