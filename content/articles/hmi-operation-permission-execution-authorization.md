---
title: HMI 操作權限頁面如何讓使用者知道自己能做什麼
description: 以虛構 Operator 申請修改配方上限為例，建立檢視、確認、設定、維護矩陣，分開 UI 隱藏、執行端授權、session timeout、角色變更與共用帳號稽核。
date: 2026-09-17
author: 茂伯
draft: false
---

## 把查看與操作分成不同權限

HMI 權限頁的第一個工作是讓使用者知道自己能做什麼，第二個工作是讓未授權操作在執行端真的被拒絕。隱藏或 disable 按鈕只改善介面，不是授權邊界。本文以虛構配方頁為例，將檢視、確認、設定、維護分成四種角色；角色名稱和門檻是案例設計，不是 ISA 或所有產品的強制模型。

| 自訂角色 | 可看 | 可做 | 不可推論 |
| --- | --- | --- | --- |
| Viewer | 摘要、目前值、歷史 | 無寫入 | 看到不代表可操作 |
| Operator | 警報、目前配方 | 確認、填備註 | 不能改上限 |
| Supervisor | 配方與變更記錄 | 改核准範圍 | 不等於 PLC 工程權限 |
| Maintenance | 診斷與維護頁 | 維護命令（另驗證） | 不等於安全旁路 |

Ignition的Security Levels、Users/Roles與元件限制是產品機制。用權限條件控制按鈕可見或可用，仍要驗證實際寫入入口。案例由可信Gateway服務驗證身分、角色及有效工作階段；PLC依命令介面檢查範圍、模式與互鎖。不要假設一般PLC能理解HMI登入權杖，兩層責任要明確對接。

權限矩陣還要列出拒絕時的替代流程。Viewer 需要知道向哪個角色申請，Operator 需要看到 requestId 和目前狀態，Supervisor 需要看到核准期限，Maintenance 需要看到維護模式是否已建立。訊息要說清楚「需要什麼權限、目前誰可處理、下一步怎麼做」，但不要暴露密碼、憑證或其他使用者的敏感資料。

檢視與確認也不必綁在同一角色。某些專案允許 Operator acknowledge alarm，但不允許改 alarm 設定；某些專案允許 Maintenance 看診斷，卻不允許執行製程命令。矩陣應以 operation 為列，而不是只列畫面名稱，因為同一頁上可能同時有查看、確認、寫入和維護按鈕。

把矩陣轉成允許與拒絕案例：同一個寫入入口分別用Viewer、Operator與Supervisor測試，記錄設備是否收到命令及拒絕原因。入口包含畫面、服務呼叫與其他整合路徑，不能只驗證其中一個按鈕。

## 配方上限變更的完整流程

設定離線配方溫度上限允許範圍60至100°C，目前80°C。Operator提出改成95°C的申請，畫面保存原值、新值、單位、原因與申請人；他不能直接寫入。Supervisor以自己的有效身分核准，可信服務再驗證角色、範圍、模式與資料版本。150°C即使由Supervisor提出仍須拒絕。這些數值只是教學契約，不能套到實際製程。

| 步驟 | UI 顯示 | 執行端檢查 | 稽核欄位 |
| --- | --- | --- | --- |
| 1. 開頁 | 角色/權限狀態 | session 是否有效 | user、session、time |
| 2. Operator 送申請 | 顯示需 Supervisor | 建立 request，不寫 PLC | requestId、old/new |
| 3. Supervisor 核准 | 顯示原因與期限 | 角色、範圍、模式 | approver、reason |
| 4. 寫入 | 顯示處理中 | 服務驗授權；PLC驗命令條件 | operationId、結果 |
| 5. 回饋 | 成功或拒絕原因 | 讀回確認版本 | readback、timestamp |

每個新的邏輯操作配一個operationId；同一請求的重送沿用原ID以查詢或去重，不要因網路重試就產生新操作。另設申請有效期10分鐘，09:00建立、09:10到期，09:11不得核准。這是申請期限，不是登入session期限；核准人的session也要獨立檢查。角色撤銷後依專案的失效與刷新機制拒絕後續寫入，並實測失效延遲。

共用帳號會破壞稽核。若多人都用 operator1，事件記錄只能知道帳號，無法知道實際操作者；應使用個人帳號、IdP 或產品允許的可追溯身份。若現場不得不有服務帳號，必須限制用途、保存 session/來源與交接規則，不可把它當成人員授權替代。

核准頁顯示的 old value 和 new value 要帶 unit、schema/version 和來源時間。若資料在申請到核准間被其他人改過，執行端應以版本或讀回值檢查衝突，要求重新載入，而不是無條件覆蓋。這是避免兩個操作員同時編輯時遺失變更的基本證據。

## UI 隱藏 後端拒絕與角色變更

建立三條平行測試：第一條是 Viewer 在畫面看不到設定按鈕；第二條是 Viewer 直接呼叫應用訊息或 Gateway 方法，執行端拒絕；第三條是合法 Supervisor 在數值越界時仍被拒絕。三條都通過，才可說介面提示和執行端政策一致。只截圖按鈕消失，不能證明安全。

| 情境 | 畫面結果 | 執行端結果 | 應記錄 |
| --- | --- | --- | --- |
| Viewer 看配方 | 可讀、寫入鈕隱藏 | 任何寫入拒絕 | role、operation、reason |
| Operator 寫 95 | 可送申請 | 直接寫入拒絕 | requestId、target |
| Supervisor 寫 150 | 可見核准頁 | 範圍拒絕 | limit、readback |
| session 過期 | 顯示重新登入 | 拒絕 operation | sessionExpired |
| 角色被撤銷 | 頁面更新提示 | 下一次操作拒絕 | roleChanged |

成功訊息要依執行結果及讀回版本，不以accepted當完成。輸入95但尚無設備回覆，顯示處理中或結果未知；服務明確拒絕才顯示拒絕。讀回不同時先查版本、同時編輯及設備限制，不能自行猜成clamped。若產品明確回傳限幅結果，才顯示實際套用值與原因。

Ignition 文件指出 Users/Roles 與 Security Levels 是分開設定來源，project 中的 role name 也是字串。改 Gateway role 名稱不會自動更新 project 內限制，因此變更角色時要做回歸矩陣：每個角色重新登入，測試查看、確認、設定、維護四類操作。

## 操作稽核與失敗排查

稽核事件至少保存 actor/user、獨立稽核用session識別碼（不是可重用的登入權杖）、role snapshot、operationId、request time、target、old value、new value、unit、reason、authorization result、execution result、readback、source time 與 server time。私密憑證、密碼和完整敏感內容不應放一般畫面或普通 log。時間要統一 UTC，另顯示值班時區，避免角色變更與 timeout 順序錯判。

| 症狀 | 先查 | 不能直接下結論 |
| --- | --- | --- |
| 按鈕不見 | 角色、security level、component binding | 不是後端安全完成 |
| 顯示成功但值未變 | operation result、readback、PLC mode | 不是一定寫入成功 |
| 合法者被拒 | session、role mapping、範圍 | 不是只重開畫面 |
| 共用帳號稽核不清 | login/session/交接 | 不能把人名猜回來 |
| 角色改名後失效 | project 字串與 Gateway role | 不是產品自動同步 |

排錯先分 UI 權限、服務授權、設備寫入、讀回一致性四層。若 UI 隱藏但直接操作仍可成功，應立即視為執行端缺口；若後端拒絕但畫面顯示成功，則是回饋契約錯誤。所有測試都要用明確的 operationId 和時間線，不能只依肉眼判斷。

稽核紀錄要能回答誰、何時、以哪個 session、哪個角色、對哪個 target、提出什麼 operation、結果為何。若 operation 被拒，拒絕原因要可分類為 session timeout、role denied、range denied、mode denied、device rejected 或 readback mismatch。這些分類比一個通用 failed 更能支持值班排查。

## FAQ 來源與限制

FAQ1：隱藏按鈕就能防止未授權寫入嗎？不能，執行端仍需身份、角色、session、範圍與設備狀態驗證。

FAQ2：Supervisor 角色是否能繞過數值上限？不能，角色授權與工藝範圍是兩個檢查。

FAQ3：session 過期後頁面還開著，可以繼續操作嗎？不應該；每次 operation 都要重新檢查有效 session。

FAQ4：多人共用帳號可以稽核嗎？只能稽核到帳號，無法可靠識別個人；應改用個人身份或明確交接機制。

案例只做離線權限矩陣與測試設計，Ignition 官方可核對 Security Levels、Users/Roles、Alarm Status Table 的 enableAcknowledge；這些產品行為不代表其他 HMI 的 API 或安全認證。

參考：[Ignition Security Levels。](https://www.docs.inductiveautomation.com/docs/8.1/platform/security/identity-provider-authentication-strategy/security-levels)

參考：[Ignition Managing Users and Roles。](https://docs.inductiveautomation.com/docs/8.1/platform/security/classic-authentication-strategy/managing-users-and-roles)

交付前逐項重測：登入後權限、session 到期、角色撤銷、共用帳號、直接後端呼叫、數值越界、設備拒絕與讀回不一致。每項都要留下 request/operation id 和時間線，並確認畫面文字沒有把「請求送出」誤稱為「設備已完成」。若結果未知也要明示，供後續追查。

參考：[Restrict acknowledgement on Perspective Alarm Status Table。](https://docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-display-palette/perspective-alarm-status-table/restrict-acknowledgement)

## 延伸閱讀

- [HMI儀表板的三層狀態顯示](/articles/hmi-dashboard-three-level-cooling-water)
- [HMI 確認警報的流程怎麼避免只按掉提示](/articles/hmi-alarm-ack-clear-reset-workflow)
