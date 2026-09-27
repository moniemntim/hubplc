---
title: OPC UA應用憑證的信任與輪替
description: 區分ApplicationUri、URI/DNS SAN、Application Instance Certificate與雙方trust list，建立自訂60天提醒及新舊指紋輪替表，不保存私鑰。
date: 2026-09-17
author: 茂伯
draft: false
---

## ApplicationUri與SAN

OPC UA Application Instance Certificate涉及應用實例身分、憑證SAN、endpoint host與trust list。ApplicationDescription.applicationUri是應用程式實例的全球識別，不等於顯示名稱或主機名；憑證subjectAltName的URI應與它相符。CN相同不能代替URI、DNS與信任鏈驗證。

本文用離線資產表，不放私鑰。Server假設URI為urn:example:line-server，Client為urn:example:line-client；新舊憑證只保存指紋、序號、公開SAN與有效期。實際URI、DNS名稱、信任清單路徑與撤銷方式要由產品文件確認。

| 檢查 | Server | Client |
| --- | --- | --- |
| ApplicationUri | urn:example:line-server | urn:example:line-client |
| DNS SAN | ua-server.example.test | 依Client用途及規格核對 |
| URI SAN | 與ApplicationUri相等 | 與ApplicationUri相等 |
| 指紋 | S-fp-old | C-fp-old |

Endpoint applicationUri應與伺服器應用實例憑證身分一致。TCP能連通只代表網路可達，不能推定憑證有效或已受信任。

URI SAN與DNS SAN要分別核對。URI證明應用實例身分，DNS名稱對應主機名稱；一個欄位正確不能代替另一個。若endpoint使用IP但憑證只有主機名，需依產品驗證規則與部署文件處理，不能靠CN相同放行。

ApplicationUri改變不是普通主機名修改。依規範與產品文件，既有憑證可能因URI不符而失效，應重新申請或更新；不能只改Endpoint URL。

## 雙方trust與指紋

本例Client與Server各自驗證對端的應用憑證。自簽憑證部署通常逐張明確信任，CA簽發則依受信任簽發者、憑證鏈、撤銷及產品規則處理；已信任適當CA時，更新葉憑證不一定需要逐張加入。表中的新舊指紋流程以逐張信任為假設。

| 角色 | 舊指紋 | 新指紋 | 更新責任 |
| --- | --- | --- | --- |
| Server | S-fp-old | S-fp-new | Client先加入新 |
| Client | C-fp-old | C-fp-new | Server先加入新 |
| 鏈 | issuer-old | issuer-new | 核對鏈與有效期 |

輪替不能產生新憑證後立即刪舊信任。先把新公開憑證放入對端trust list，再於維護窗口替換應用憑證並建立SecureChannel；確認新指紋後才移除舊信任。更新順序、並存時間與是否需重啟依產品文件執行。

資產表保存subject、URI SAN、DNS SAN、issuer、serial、fingerprint、notBefore/notAfter與狀態；不保存私鑰、密碼或可重建私鑰的備份。指紋是識別證據，不是單獨信任政策。

雙方信任清單更新要有方向。Client trust Server的新指紋，Server trust Client的新指紋；把新證只放進自己的清單沒有完成互信。資產表用角色欄標示來源、目標與完成時間，避免把Server自己的憑證誤放入Server trust當成對端信任。

私鑰永不進入文章、截圖或資產表。備份由組織PKI或產品安全儲存政策管理，文件只記公開指紋與保管位置識別，不記可解密內容。

輪替完成後保留一個回復窗口，但舊證若已撤銷就不能只靠回復檔恢復；回復策略要符合PKI政策並記錄風險。

憑證指紋要指定演算法，例如完整憑證的SHA-256雜湊；它不等同只對公鑰做雜湊。本例S-fp-old與S-fp-new是識別代號，不是真實指紋。現場比對使用完整輸出並保留原始格式，不能只看畫面截短的前幾碼。

## 60天提醒

本例自訂到期前60天提醒，不是OPC UA固定期限。假設Server notAfter為2026-12-31T00:00:00Z，減60天是2026-11-01T00:00:00Z；Client到期2026-11-20T00:00:00Z，提醒為2026-09-21T00:00:00Z。先用UTC完整時刻計算，再轉成當地顯示，不能只用日期近似。

| 資產 | 到期 | 提醒 | 處置 |
| --- | --- | --- | --- |
| Server old | 2026-12-31 | 約2026-11-01 | 申請新證並更新Client trust |
| Client old | 2026-11-20 | 約2026-09-21 | 申請新證並更新Server trust |
| issuer CA | 依CA政策 | 依CA政策 | 核對鏈與撤銷 |

到期提醒不是自動輪替保證。先核對新憑證ApplicationUri、URI SAN與DNS SAN，再比對新指紋與申請單；任何欄位不符都退回。若產品有自動憑證管理，仍要保存更新事件與結果。

撤銷與到期不同。私鑰疑似外洩應按PKI政策撤銷並更新信任；到期則安排新憑證與雙方trust更新。文件只寫「更新憑證」不足以說明停機影響與回復點。

輪替表還要保存issuer與serial，因為指紋變更可能代表重新簽發或CA鏈變更。若新證由不同issuer簽出，先確認對端是否信任完整鏈，並將舊鏈、新鏈及撤銷查詢結果分開記錄。

離線驗收可用新舊公開憑證指紋與模擬trust清單，逐步確認URI、SAN、有效期與雙向方向；未連產品時只能說檢查邏輯完成，不能宣稱SecureChannel成功。

若產品會自動產生ApplicationUri，匯入新憑證前先讀回實際URI；憑證申請的URI與Server回報不一致時停在待確認，不要用顯示名稱替代。

## 輪替與排查

輪替表列出先做什麼、誰確認與失敗如何回復。若只更新Server憑證而Client仍只信任舊指紋，SecureChannel會失敗；若只更新trust而新憑證URI不符，信任存在仍會被身分檢查拒絕。

| 步驟 | 證據 | 失敗處理 |
| --- | --- | --- |
| 申請新證 | 公開SAN、URI、有效期 | 拒收不符申請 |
| 更新trust | 對端新指紋/鏈 | 保留舊信任 |
| 替換 | 應用狀態與版本 | 依產品回復舊證 |
| 連線 | 雙向指紋與錯誤 | 保存結果 |
| 清理 | 撤銷/刪除紀錄 | 確認無仍用舊證 |

案例：Server換S-fp-new，Client已信任新但Server仍回S-fp-old，不能宣稱輪替完成；記錄實際指紋並停止清理舊證。另一案例是Client新證URI誤寫成urn:example:client-test，Server即使信任指紋也不能把它當正式身分。

產品可能把trusted、issuer與rejected放在不同信任庫，也可能只在重啟後載入；規範不指定檔案夾。排查先查指紋、URI/DNS SAN、有效期、鏈與撤銷，再查產品重載行為。

60天提醒是自訂治理門檻，可再設30天與7天升級通知。提醒本身不改憑證；負責人要確認申請、核發、分發、匯入、建立連線與回復點，每一步都有公開證據。

若憑證進入rejected清單，先比對預期應用身分、完整指紋及拒絕原因，再由授權流程決定是否信任。rejected只是被拒絕憑證的暫存位置，不是待全部批准的清單；URI錯誤、到期或未知來源的憑證不能靠搬進trusted修復。

雙向信任測試要使用測試窗口與公開憑證。先驗證Client看見S-fp-new，再驗證Server看見C-fp-new，最後記錄SecureChannel與Session結果；兩個方向不可合併成一個勾選。

本例範圍是opc.tcp的UA Secure Conversation及簽章加密通道，Client與Server都要驗證對端應用憑證；不要拿一般網站的單向TLS觀念省略其中一端。使用其他傳輸映射或安全模式時，另查對應規格與產品支援，不能假設所有OPC UA都是TLS。

任何「信任完成」都要指向雙方清單、URI SAN、指紋與有效期的具體證據，不能只引用連線畫面。

## FAQ與來源

假設Client已信任S-fp-new，Server仍使用S-fp-old，這時只能證明新信任已準備，不能證明換證完成。切換後檢查實際通道看到的新指紋，再用測試帳號確認Session及唯讀資料。若通道成功但使用者拒絕，回到User Token授權，避免把已完成的應用換證全部撤回。

FAQ1：CN相同就能信任新憑證嗎？不能，還要核對URI SAN、DNS SAN、指紋、鏈與trust list。

FAQ2：ApplicationUri與主機名相同嗎？不一定，它們是不同欄位與身分。

FAQ3：Client信任Server就完成本例的雙方驗證嗎？沒有，Server也要能驗證Client應用憑證。使用者登入憑證或密碼則是另一層身分，還要各自驗證。

憑證資產表只保存公開資訊與指紋，不放私鑰、密碼或私密備份。

輪替報告列出舊證是否仍在使用、何時移除、是否撤銷、誰批准與回復條件，讓到期提醒變成可追溯的維運工作。

公開資產表也應標註檢查日期與文件版本，讓下一次輪替知道哪些值需要重新取得。

到期後的錯誤可能與trust未更新相似，排查時先核對notBefore/notAfter與系統時鐘，再查指紋、URI SAN、issuer與撤銷狀態。不要用重啟掩蓋證書過期。

雙方憑證的有效期可能不同，提醒排程應取各資產最早到期而不是只看Server。若issuer CA期限更短，先處理CA鏈，再處理端點憑證；否則新端點證書可能仍無法建立信任。

參考：[OPC UA Part 4 §7.2 ApplicationDescription。](https://reference.opcfoundation.org/Core/Part4/v105/docs/7.2)

參考：[OPC UA Part 6 §6.2.2 Application Instance Certificate。](https://reference.opcfoundation.org/specs/OPC-10000-6/6.2.2)

參考：[OPC UA Part 12 §7 Certificate Management。](https://reference.opcfoundation.org/specs/OPC-10000-12/7)

參考：[OPC UA Part 2 Security Model。](https://reference.opcfoundation.org/specs/OPC-10000-2/full)

## 延伸閱讀

- [OPC UA端點的安全政策與使用者身分核對](/articles/opcua-endpoint-security-policy-message-mode-user-token)
- [從OPC UA瀏覽結果建立可重連的點位清單](/articles/opcua-browse-nodeid-namespace-uri-persistent-point-list)
