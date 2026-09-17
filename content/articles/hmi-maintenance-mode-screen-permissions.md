---
title: HMI 維護模式的畫面與一般操作畫面要怎麼分開
description: 以週末更換執行器案例分開UI授權、Maintenance模式、控制器確認、互鎖、品質與能源隔離，建立維護頁、測試與復原記錄。
date: 2026-09-17
author: 站長
draft: false
---

## 維護模式不是能源隔離

維護模式是流程與介面狀態，讓合資格人員看到診斷欄位、測試請求與復原步驟；它不等於斷電、上鎖掛牌、排空壓力或解除安全功能。週末更換虛構執行器時，HMI可顯示Maintenance requested與測試狀態，但真正能源隔離要依現場LOTO與安全程序。

把權限、頁面、控制器狀態與設備安全條件分開。登入或看不到按鈕不是安全隔離；Ignition 8.1 Security Levels、Roles、Security Zones可限制專案、View、事件動作與Tag讀寫，但控制器仍須拒絕未授權或不安全的請求。

維護申請的Requested、Confirmed、Rejected與設備目前模式要分欄。Active表示本案維護工作狀態已建立，不表示可動作或已隔離；Exit requested也不是已退出。畫面必須同時顯示工作階段、設備確認狀態與現場許可，不能用單一maintenance旗標包辦。

維護頁與一般頁可共用狀態資料，但不應複製兩套互相矛盾的控制邏輯。一般頁顯示運轉摘要，維護頁顯示診斷與請求歷史；所有寫入仍走同一個控制器驗證入口，避免維護頁繞過互鎖。

維護測試的結果要區分已執行、未執行、逾時、取消與回饋矛盾，避免用一個Pass/Fail掩蓋未知。復原表也要記錄未完成項目與下一個責任人。

角色、登入或來源位置變更由可信服務重新檢查授權；控制器只依既定命令介面與設備條件處置。HMI不能假設PLC原生知道Security Zone，也不能因使用者登出就宣稱設備已停止。失聯及授權撤銷時的運轉處置需另有控制規格。

| 維度 | 範例狀態 | 由誰確認 | 不能代替 |
| --- | --- | --- | --- |
| UI permission | Maintenance role | HMI/Gateway | 能源隔離 |
| Mode | Maintenance Active | 控制器 | 安全功能 |
| Energy state | isolated/proven | 現場程序/安全系統 | 畫面隱藏 |
| Tag quality | Good/Bad | 資料來源 | 人員資格 |

## 維護頁的欄位與危險操作

維護頁顯示source、quality、last update、interlock summary、active test、requestId、操作者與時間。診斷值若quality為Bad，要顯示Bad與來源，不把0當正常。需要寫入的測試請求要有範圍、持續時間、回饋與取消，不能提供沒有上限的Force或直接輸出按鈕。

提出測試請求與確認執行分成兩階段。可信服務驗授權，控制器驗測試前置條件；必要的現場許可依設備程序處理。明確拒絕才標Rejected；送出後逾時或失聯則標Unknown，因為測試可能已執行。取消也要等停止回饋，不以取消按鈕取代確認。

一般操作頁只顯示運轉所需資訊；維護頁可提供診斷但不因此授予寫入權。Ignition Tag Security可按Security Level限制read/write，Perspective也可依View與事件動作限制，但設定錯誤、角色改名或權限來源變更都要在部署驗收檢查。

| 欄位 | 正常 | 異常/限制 | 處置 |
| --- | --- | --- | --- |
| quality | Good | Bad/AccessDenied | 禁止依值測試 |
| mode | Maintenance Active | Requested/Rejected | 不可執行測試 |
| interlock | Proven | Not proven | 控制器拒絕 |
| test feedback | Expected | Timeout/Contradictory | 停止並記錄 |

若Tag讀取出現Bad_AccessDenied，畫面要顯示權限/品質問題而不是0。若Gateway或控制器失聯，維護頁可保留最後值但標示last update與stale，不能讓維護人員把舊值當目前回饋。

任何能量隔離證明都必須來自現場程序、鎖具或安全系統紀錄；HMI可顯示其狀態，但不能自行宣稱已隔離。

維護模式的每個危險測試都要有預期回饋與停止條件，沒有回饋時標Unknown並保留現場檢查，不以逾時當成功。

UI的disable狀態只是提示。即使維護人員能看到按鈕，也不能把按鈕事件當成控制器已執行；每次操作都要顯示控制器結果、回饋與時間。

## 進入 測試與離開步驟

先建立維護工作單與唯讀診斷頁，保存原模式及目前命令。停機、能源隔離與更換工作依現場設備程序執行，由有資格人員留下證據；HMI只呈現記錄，普通PLC旗標不能驗證所有殘留能源。隔離期間的工作不得因Maintenance顯示Active就取得動作測試許可。

把測試分成兩階段：隔離期間只做該程序允許的檢查；需要能量的功能測試必須另經核准程序轉入測試階段，確認人員、防護與設備條件後才評估。畫面列出測試許可、目標、停止條件及回饋。本文不提供重新送能或解除隔離步驟，也不把已隔離當可驅動執行器。

退出前確認測試停止、最後回饋有效、暫存請求已處理，以及需要復原的設定逐項核對。控制器可回報Normal待命，但不應因此自動開始生產；重新啟動另依設備程序及明確操作。回饋矛盾時保留維護未完成或結果未知，不能僅切回一般頁。

| 步驟 | 成功證據 | 失敗結果 |
| --- | --- | --- |
| 進入 | 角色、位置、控制器Confirmed | Rejected並記原因 |
| 測試 | request accepted、回饋符合 | Timeout/Bad quality |
| 取消 | 控制器確認停止 | 保留Active/Fault |
| 離開 | Normal confirmed、輸出待命 | 維持Maintenance/Fault |

維護進入與退出應有審核與時間限制。超過期限未完成，系統可要求重新請求，但不能默默把Active改成Normal；設備仍需控制器確認停止與復原。

維護頁的診斷欄位也要標明資料來源與時間，防止人員把歷史值誤認目前值。

這些欄位與流程是專案設計範例，需與設備維護文件、能源隔離程序和控制器規格共同審查。

週末更換執行器案例：09:00工作單建立，畫面顯示已授權但隔離證據待確認；09:20由現場程序完成隔離並登錄，進入更換階段，動作測試仍不可用。更換完成後另申請功能測試許可。若測試回覆逾時，顯示結果未知、待現場確認，不能寫成已停止或更換成功。

## 記錄 復原與權限限制

維護記錄包含user、role、security zone、requestId、進入/離開時間、設備狀態、測試項、結果、取消或拒絕原因、quality與復原確認。歷史紀錄讓交接人知道哪些操作已做、哪些仍待現場確認；只記「maintenance on/off」不足以追溯。

復原表要列每個暫存設定的舊值、新值、核准者、回復步驟與驗證欄。若測試改變配方或限值，離開Maintenance不應自動假設已還原；控制器回報與人工檢查都要完成。

Ignition 8.1 Security Zones能按來源位置限制服務政策，Security Levels可形成階層；Tag Security則可限制Read/Write。這些都是平台授權工具，文章中的Maintenance role與zone名稱是設計假設，不代表所有專案已有同名設定，也不取代能源隔離。

控制器重開或HMI重開後，先重新讀取Maintenance confirmed、active test、quality與interlock，再恢復畫面。不要以session本地旗標自動恢復維護或保留上次測試命令。

離開維護後仍需查看測試記錄與復原項目，不能因頁面切回一般就刪除維護證據。

測試矩陣覆蓋角色不足、位置不符、品質Bad、互鎖未證明、進入逾時、測試逾時、HMI重開、控制器重開、離開回饋矛盾與復原遺漏。每列記畫面、控制器、記錄與現場程序結果。

完成後應有三份可對照結果：工作單列出隔離、更換與功能測試各階段；設備快照顯示實際模式及回饋；復原表列出逐項確認人與時間。若三者不一致，先查對應工作單和requestId，不靠重開畫面清掉異常。

## FAQ 來源與驗證

FAQ1：有Maintenance role就代表設備已安全嗎？不代表，角色只是授權條件；能源隔離與安全程序必須獨立完成。

FAQ2：把一般頁按鈕隱藏可以防止誤動作嗎？不能只靠UI；服務驗授權，控制器依介面驗模式、互鎖與設備條件。

FAQ3：維護模式會自動解除互鎖嗎？不會。維護模式仍應受互鎖與安全條件限制。

FAQ4：離開維護頁就算復原完成嗎？不算，需確認測試停止、設定回復、輸出待命與控制器Normal。

本文執行器、角色、狀態與復原表為離線設計。

參考：[Ignition 8.1 Security Levels：階層式授權；不提供能源隔離證明。](https://www.docs.inductiveautomation.com/docs/8.1/platform/security/identity-provider-authentication-strategy/security-levels)

參考：[Ignition 8.1 Tag Security Properties：Tag讀寫權限、Read Only與AccessDenied品質。](https://docs.inductiveautomation.com/docs/8.1/platform/tags/tag-properties/tag-security-properties)

參考：[Ignition 8.1 Perspective Security：Session、View與事件動作授權；UI權限不等於設備安全隔離。](https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/security-in-perspective)

## 延伸閱讀

- [HMI 設定值變更畫面怎麼降低輸入錯誤](/articles/hmi-setting-value-change-confirm-readback)
- [HMI 批次流程畫面如何呈現步驟 等待和失敗原因](/articles/hmi-batch-step-wait-failure-reason)
