---
title: OPC UA端點的安全政策與使用者身分核對
description: 以三列虛構GetEndpoints摘要，分開核對SecurityPolicy、MessageSecurityMode、User Token與Application Certificate，建立可追溯的端點選擇表。
date: 2026-09-17
author: 茂伯
draft: false
---

## 三層欄位先分開

OPC UA Endpoint選擇不能只看URL。EndpointDescription同時列出endpointUrl、securityMode、securityPolicyUri與userIdentityTokens；它們分屬端點位置、訊息保護模式、政策與使用者身分。UserName是登入權杖，不是MessageSecurityMode；SecurityPolicy名稱也不能直接推導伺服器允許的token。

本文使用虛構GetEndpoints摘要，假設內部政策要求SignAndEncrypt、指定政策清單與UserName token。Policy-A及Policy-B只是教學代號，不是可填入產品的OPC UA SecurityPolicyUri；正式設定必須保存伺服器回傳的完整URI，並確認Client與Server共同支援。

| 欄位 | 要保存的證據 | 常見誤讀 |
| --- | --- | --- |
| endpointUrl | opc.tcp://192.0.2.60:4840 | URL不是完整安全設定 |
| securityMode | SignAndEncrypt | 不是UserName登入方式 |
| securityPolicyUri | Policy-A | 不能只看短名稱 |
| userIdentityTokens | UserName、Anonymous | 伺服器實際回傳才算 |
| applicationUri | urn:example:server | 憑證與應用身分核對 |

選定後保存GetEndpoints原始摘要、取得時間、server applicationUri、端點安全欄位與憑證指紋。若產品會動態產生EndpointDescription，版本化這些證據，不能只保存最後勾選的畫面。

GetEndpoints的候選列還要保存transportProfileUri與securityLevel，但securityLevel只是端點比較用的相對欄位，不是加密強度的替代。若兩列同為SignAndEncrypt，不能只挑數字較高者就忽略政策清單、token與ApplicationUri。

## 逐列排除候選

三列依「模式、政策、使用者token」排列：A是None、Policy-None、Anonymous；B是SignAndEncrypt、Policy-A、UserName；C是SignAndEncrypt、Policy-B、Anonymous。本例只允許Policy-A及UserName，因此A、C排除，B保留候選。每一列只有一個MessageSecurityMode，不能把Sign和SignAndEncrypt寫成同一列的兩個模式。

| 候選 | 摘要 | 判斷 |
| --- | --- | --- |
| A | None、Policy-None、Anonymous | 排除：不符合訊息模式 |
| B | SignAndEncrypt、Policy-A、UserName | 保留候選：待信任與部署證據 |
| C | SignAndEncrypt、Policy-B、Anonymous | 排除：政策與token不在允許清單 |

「保留候選」不是宣稱一定可連。還要核對transportProfileUri、server applicationUri、securityLevel、伺服器憑證指紋與Client端應用憑證配置。若GetEndpoints列出的URL與部署文件主機名不同，先處理DNS、SAN與端點描述一致性。

Application Certificate用來識別應用實例，User Token表示使用者身分。選擇UserName時還要讀UserTokenPolicy的policyId及securityPolicyUri；token保護政策與端點政策有各自規則，不能看到端點None就直接斷定密碼一定明文，也不能因為有密碼就認定傳送受到適當保護。交由相容SDK依實際政策處理。

內部政策要求SignAndEncrypt是本案例的組織決策；另一組織可能允許不同模式，文章不把它升格成所有OPC UA產品的通用最佳。政策表應寫批准人、版本、例外期限與撤銷方式。

變更端點時可先離線產出候選表，再由維護窗口套用一列。保留舊設定與回復點，並在政策清單更新後重跑三列排除理由，避免端點默默降級。

候選A的排除應先在Client選擇階段完成。本例Client政策禁止匿名，不表示Server一定拒絕匿名；Server可能仍按部署設定提供匿名讀取。測試報告分開記錄本機選擇政策與Server實際授權，避免把「未嘗試」寫成「伺服器拒絕」。

若Client快取EndpointDescription，伺服器端點清單變更後要重新取得，不應只依歷史URL與policy名稱。快取失效規則應寫入整合文件。

## Anonymous UserName與憑證證據

Anonymous只有在端點的userIdentityTokens明確列出且產品政策允許時才可用。UserName除了帳密管理，還要看該token政策要求的加密與安全模式。X.509 UserCertificate token與Application Instance Certificate是不同角色：前者是使用者身分，後者是應用程式實例；文件與信任清單不能混成一張「憑證已安裝」。

| 身分方式 | 需要保存 | 不能推定 |
| --- | --- | --- |
| Anonymous | 端點token、政策核准 | 不代表無限制匿名 |
| UserName | token policy、帳號與保護條件 | 不代表Application Certificate |
| X.509 user token | 使用者憑證與信任鏈 | 不代表伺服器已信任Client app |
| Issued token | issuer與產品支援 | 不因名稱存在就可用 |

測試時先做靜態比對，再建立Session。若CreateSession或ActivateSession失敗，保存錯誤、選定端點、token類型與憑證指紋；不要改成Anonymous直到連線成功，因為那會破壞政策驗收的意義。

直連TCP成功只證明傳輸層可達，不表示SecurityPolicy、Application URI、信任或User Token正確。端點選擇表要把「網路可達」「SecureChannel建立」「Session建立」「使用者驗證」分成四個狀態。

若Server回傳的userIdentityTokens包含UserName但部署文件要求停用帳密，候選列仍應排除；反過來，文件允許UserName也不代表每個帳號都能登入。要保存帳號授權範圍與測試結果，不把「token存在」當作「登入已成功」。

Application Certificate的指紋與User Token的帳號證據分開歸檔，文件不放密碼或私鑰；若產品只提供畫面狀態，仍應保存可公開驗證的端點欄位與憑證指紋。

若GetEndpoints列出相同URL但不同安全設定，保存完整EndpointDescription與所選UserTokenPolicy，至少核對transportProfileUri、securityPolicyUri及securityMode。使用者token清單是端點提供的選項，不是每種token都獨立構成一個伺服器端點。

所有「符合」都應指向具體證據欄位，所有「待確認」都列出責任人與文件來源，避免用安全用語掩蓋缺口。

## 版本化選擇與失敗排查

變更前保存原始GetEndpoints、server部署文件版本、政策允許清單與Client設定版本。若伺服器移除Policy-A或改變token清單，重新跑候選表；不能沿用舊端點名稱。若連線突然失敗，先比較端點描述與憑證指紋，再查信任、時間有效期與User Token。

| 症狀 | 先查 | 不要直接做 |
| --- | --- | --- |
| TCP不可達 | URL、DNS、路由 | 不要改token |
| SecureChannel失敗 | 模式、政策、雙方憑證 | 不要降級None |
| Session失敗 | applicationUri、信任清單 | 不要只換密碼 |
| 登入失敗 | UserTokenPolicy、帳號 | 不要宣稱憑證壞 |

政策交集也要記錄缺少證據。例如B符合內部模式與Policy-A，但若沒有server applicationUri或憑證公開指紋，狀態應是待補證據，不是已驗證。產品UI的預設端點排序、匿名開關與信任庫路徑都必須由產品文件確認。

本篇不提供可直接套用的品牌指令或密碼。所有候選URL與Policy名稱是虛構教學代號；正式設定需以目標server GetEndpoints和部署指南為準。

CreateSession回覆包含serverEndpoints與serverCertificate等資料，Client要核對其與先前發現及選定的端點是否一致；應用URI可從EndpointDescription中的server ApplicationDescription核對。不要發明回覆最外層的applicationUri欄位，也不要因通道已建立就略過SDK要求的端點與憑證驗證。

產品可能隱藏某些端點或只在特定網卡發布，這是產品行為，需用官方部署文件確認。文章中的三列只是閱讀練習，沒有宣稱伺服器真實排序。

完成後應能用三個勾選結果說明B為何入選：模式符合、完整政策URI位於允許清單、UserName政策可被Client支援。接著才另記憑證信任、Session啟用及讀取授權結果。若一項仍缺證據，保留候選並標出待補欄位，不把離線篩選寫成實際連線成功。

## FAQ與官方來源

FAQ1：SignAndEncrypt是否等於UserName？不是，前者是訊息安全模式，後者是使用者身分權杖。

FAQ2：看到Anonymous就能使用嗎？不一定，還要符合內部政策與server部署文件。

FAQ3：Application Certificate能代替UserName嗎？不能，兩者是不同層級與管理責任。

FAQ4：securityLevel最高就一定是最佳端點嗎？不能只靠securityLevel判斷，仍要核對政策、token、憑證與產品限制。

失敗排查應依層次記錄時間：URL解析、TCP建立、SecureChannel、CreateSession、ActivateSession。每層保存錯誤與設定版本，才能避免把網路ACL問題誤判成UserName密碼錯。

若端點URL使用IP而證書SAN只有主機名，不能自行假設一定通過；需依產品驗證規則與部署文件補齊DNS名稱、URI或憑證。這項檢查雖與User Token不同，卻是SecureChannel階段的重要證據。

驗收交付包含原始摘要、政策版本、保留/排除理由、applicationUri、憑證公開指紋、測試時間與待補證據，讓下一位維護者不必靠猜測重選端點。

本文GetEndpoints三列為離線摘要。

參考：[OPC UA Part 4 §7.14 EndpointDescription：端點安全欄位與UserIdentityTokens。](https://reference.opcfoundation.org/Core/Part4/v105/docs/7.14)

參考：[OPC UA Part 4 §5.7.2 CreateSession：Client選定端點與建立Session的核對背景。](https://reference.opcfoundation.org/specs/OPC-10000-4/5.7.2)

## 延伸閱讀

- [工業閘道遠端管理的角色權限與稽核](/articles/industrial-gateway-remote-management-roles-audit)
- [OPC UA應用憑證的信任與輪替](/articles/opcua-application-uri-trust-list-certificate-rotation)
