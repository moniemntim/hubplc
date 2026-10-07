---
title: XCA 建立 ECU HTTPS 憑證完整教學
description: 依 XCA 中文介面建立根 CA、簽發含固定 IP SAN 的 ECU 伺服器憑證、匯出 PEM 私鑰檔，並在 Windows 匯入與驗證信任鏈，附 19 張實際操作截圖。
date: 2026-10-07
author: 茂伯
draft: false
category: 工業通訊與網路
tags: XCA, HTTPS, 憑證, ECU
---

這篇帶你完成一條可重複使用的設備 HTTPS 憑證流程：先在 XCA 建立一張 `ECU-Network-CA`，再用它簽發範例設備 `192.168.0.40` 的伺服器憑證。Windows 端只需信任這張 CA；之後增加 ECU 時，替新設備簽發自己的憑證與私鑰，不必在每台電腦逐張匯入設備憑證。

本文畫面採 XCA 中文介面，範例設備名稱為 `ECU-1051`，組織名稱填 `auto-corp`。CA 有效期示範 10 年，設備憑證示範 365 天；實際日期由建立當天起算，不要照抄畫面日期。

<a href="/images/xca-ecu-https-certificate-setup/image1.png"><img src="/images/xca-ecu-https-certificate-setup/image1.png" alt="圖 1　XCA 憑證清單中 ECU-Network-CA 位於上層，ECU-1051 位於下層。" width="1231" height="933" loading="eager"></a>

圖 1　完成後，`ECU-Network-CA` 位於上層，設備憑證 `ECU-1051` 位於下層。

## 先分清楚三種檔案

| 檔案 | 放在哪裡 | 用途 |
| --- | --- | --- |
| `ECU憑證管理.xdb` | 憑證管理電腦 | 保存 XCA 資料庫、CA 關係與私鑰；需備份並保護密碼。 |
| `ECU-Network-CA.cer` | 要連線設備的 Windows 電腦 | 匯入受信任的根憑證授權單位，建立對這張 CA 的信任。 |
| `webserver.pem` | 對應的 ECU | 包含設備憑證與設備私鑰，只交給該設備的管理人員。 |

`.xdb` 與 CA 私鑰不能交給設備或一般使用者。`webserver.pem` 也含有設備私鑰，不能當成公開憑證散發。每台設備都要使用自己的私鑰；新增第二台設備時，沿用同一張 CA，重新建立設備憑證、SAN 與私鑰。

## 01 建立 XCA 資料庫

1. 開啟 XCA，選左上角「文件 → 新建数据库」，也可以按 `Ctrl + N`。
2. 選擇受保護的儲存位置，檔名輸入 `ECU憑證管理.xdb`。
3. 設定資料庫密碼並妥善記錄。之後新增或更新設備憑證，都從這個資料庫開啟。
4. 切到「证书」分頁，按右側「创建证书」。

## 02 建立根 CA 的來源與主題

在「来源」選「创建自签名证书」，簽章算法保留 `SHA256`。範本選 `[default] CA`，再按「应用所有信息」。只有建立 CA 時才選自簽名；設備憑證要由這張 CA 簽發。

<a href="/images/xca-ecu-https-certificate-setup/image2.png"><img src="/images/xca-ecu-https-certificate-setup/image2.png" alt="圖 2　XCA 建立 CA 時的來源設定，選自簽名與預設 CA 範本。" width="1309" height="1159" loading="lazy"></a>

圖 2　CA 來源選自簽名，範本使用 `[default] CA`。

切到「主题」，依序填入：

| 欄位 | 範例值 | 說明 |
| --- | --- | --- |
| 内部名称 | `ECU-Network-CA` | XCA 清單中的管理名稱。 |
| countryName | `TW` | 國碼只能空白或兩個英文字母。 |
| organizationName | `auto-corp` | 組織名稱。 |
| organizationalUnitName | `Automation IT` | 管理單位。 |
| commonName | `ECU-Network-CA` | 這張 CA 的名稱。 |

<a href="/images/xca-ecu-https-certificate-setup/image3.png"><img src="/images/xca-ecu-https-certificate-setup/image3.png" alt="圖 3　CA 主題欄位填入 ECU-Network-CA、TW、auto-corp 與 Automation IT。" width="1309" height="1159" loading="lazy"></a>

圖 3　`内部名称` 與 `commonName` 都填 `ECU-Network-CA`。

在「主题」最下方按「生成新密钥」，名稱填 `ECU-Network-CA`，類型選 `RSA`，長度選 `2048 bit`，再按「创建」。回到主題頁後，確認「私钥」已選到剛建立的 CA 金鑰。

<a href="/images/xca-ecu-https-certificate-setup/image4.png"><img src="/images/xca-ecu-https-certificate-setup/image4.png" alt="圖 4　建立 ECU-Network-CA 專用 RSA 2048 bit 私鑰。" width="788" height="599" loading="lazy"></a>

圖 4　這把私鑰只給 CA 使用。名稱是 XCA 內的金鑰管理標籤。

先不要按建立憑證視窗最下方的「确定」，下一步還要完成 CA 擴展與金鑰用途。

## 03 設定 CA 擴展與金鑰用途

切到「扩展」，依序設定：

- 类型選 `CA`。
- `CA路径长度` 留空。
- `Critical` 勾選。
- `X509v3 Subject Key Identifier` 與 `X509v3 Authority Key Identifier` 維持勾選。
- 指定時間跨度填 `10`，單位選「年」，再按旁邊「应用」。
- `Subject Alternative Name` 保持空白；設備 IP 不填在 CA 內。

<a href="/images/xca-ecu-https-certificate-setup/image5.png"><img src="/images/xca-ecu-https-certificate-setup/image5.png" alt="圖 5　CA 的 Basic Constraints、Key Identifier 與十年有效期設定。" width="1309" height="1159" loading="lazy"></a>

圖 5　CA 類型與有效期設定完成後，要按「应用」更新起訖日期。

再切到「密钥用法」：左側只選 `Certificate Sign` 與 `CRL Sign`，右側不選。被選取的用途會顯示底色；如果範本帶入其他用途，點一下取消。

<a href="/images/xca-ecu-https-certificate-setup/image6.png"><img src="/images/xca-ecu-https-certificate-setup/image6.png" alt="圖 6　CA 金鑰用途只選 Certificate Sign 與 CRL Sign。" width="1309" height="1159" loading="lazy"></a>

圖 6　CA 用途只保留簽發憑證與簽發撤銷清單。

回到「主题」確認 CA 私鑰仍正確，再按「确定」建立。XCA 清單中應出現 `ECU-Network-CA`，CA 欄顯示「是」。接著備份資料庫與密碼。即使名稱相同，重新建立的 CA 仍是另一張憑證，原本的 Windows 電腦也必須重新匯入。

## 04 建立由 CA 簽發的 ECU 憑證

回到「证书」按「创建证书」。在「来源」選 `[default] TLS_server`，按「应用所有信息」，再選「使用此CA证书签名」，指定 `ECU-Network-CA`，簽章算法使用 `SHA256`。

<a href="/images/xca-ecu-https-certificate-setup/image7.png"><img src="/images/xca-ecu-https-certificate-setup/image7.png" alt="圖 7　設備憑證來源使用 TLS_server 範本，並由 ECU-Network-CA 簽發。" width="1309" height="1159" loading="lazy"></a>

圖 7　設備憑證不能再選自簽名，簽發者必須是 `ECU-Network-CA`。

切到「主题」，填入：

| 欄位 | 範例值 |
| --- | --- |
| 内部名称 | `ECU-1051` |
| countryName | `TW` |
| organizationName | `auto-corp` |
| organizationalUnitName | `Automation IT` |
| commonName | `ecu1051-5fb4f3` |

<a href="/images/xca-ecu-https-certificate-setup/image8.png"><img src="/images/xca-ecu-https-certificate-setup/image8.png" alt="圖 8　ECU-1051 設備憑證的主題欄位與 auto-corp 組織名稱。" width="1309" height="1159" loading="lazy"></a>

圖 8　`commonName` 是設備名稱；瀏覽器實際連線的固定 IP 要另外寫入 SAN。

按下方「生成新密钥」，名稱填 `ECU-192.168.0.40-Key`，類型選 `RSA`，長度選 `2048 bit`，再按「创建」。確認「私钥」選到這把設備專用金鑰，不要選 CA 私鑰。

如果「使用此CA证书签名」是灰色，或清單找不到 CA，先確認資料庫中同時有 CA 憑證、對應私鑰，以及 `Certificate Sign` 用途。只有 CA 公開憑證而沒有私鑰，無法替設備簽名。

## 05 把設備固定 IP 寫入 SAN

切到「扩展」，类型選「终端实体（End Entity）」，`CA路径长度` 留空。指定時間跨度填 `365`，單位選「天」，再按「应用」。

找到 `X509v3 Subject Alternative Name`，把範本帶入的 `DNS:copycn` 全部換成 `IP:192.168.0.40`。不要改到上方 `Name Constraints` 或下方 `Issuer Alternative Name`。

<a href="/images/xca-ecu-https-certificate-setup/image9.png"><img src="/images/xca-ecu-https-certificate-setup/image9.png" alt="圖 9　設備憑證為 End Entity，SAN 填入 IP 192.168.0.40。" width="1309" height="1159" loading="lazy"></a>

圖 9　SAN 這一行必須是 `IP:192.168.0.40`；換設備時要改成該設備自己的固定 IP。

按該行右側「编辑」，確認类型為 `IP`、內容為 `192.168.0.40`，且「复制通用名称（CN）」未勾選。先按「验证」，再按「应用」，回到主畫面後重新核對該行。

<a href="/images/xca-ecu-https-certificate-setup/image10.png"><img src="/images/xca-ecu-https-certificate-setup/image10.png" alt="圖 10　SAN 編輯視窗中選 IP 並輸入 192.168.0.40。" width="830" height="447" loading="lazy"></a>

圖 10　SAN 類型選 `IP`，內容只填單一完整 IP。

`192.168.0.*` 與 `192.168.0.0/24` 不能當作 HTTPS 憑證的 IP 萬用範圍。每個實際連線 IP 都要明確列入 SAN。若設備 IP 改變，而且新 IP 不在原憑證 SAN，就要重新簽發設備憑證；資料庫或金鑰名稱含有 IP，不代表 SAN 已包含它。

## 06 完成設備用途並核對憑證

切到「密钥用法」，左側只保留 `Digital Signature` 與 `Key Encipherment`。若範本同時選到 `Non Repudiation` 或 `Key Agreement`，點一下取消。右側只選 `TLS Web Server Authentication`，不要選 `Certificate Sign` 或 `CRL Sign`。

<a href="/images/xca-ecu-https-certificate-setup/image11.png"><img src="/images/xca-ecu-https-certificate-setup/image11.png" alt="圖 11　設備憑證左側選 Digital Signature、Key Encipherment，右側選 TLS Web Server Authentication。" width="1309" height="1159" loading="lazy"></a>

圖 11　設備憑證的左側兩個用途、右側一個用途。

回「来源」確認簽發者為 `ECU-Network-CA`；回「主题」確認使用設備專用私鑰，最後按「确定」。在清單選 `ECU-1051`，按「查看详情」，核對：

- 簽發者為 `ECU-Network-CA`。
- 主體名稱是 `ecu1051-5fb4f3`。
- SAN 含 `IP Address 192.168.0.40`。
- 這是一般設備憑證，CA 欄為「否」。
- 有效期已開始，且尚未到期。

新增第二台設備時，重做設備憑證、SAN、用途與匯出流程，換成新設備名稱、固定 IP 與新私鑰，CA 仍沿用 `ECU-Network-CA`。

## 07 分別匯出 Windows 與 ECU 使用的檔案

先匯出 Windows 要信任的 CA 公開憑證：在「证书」選 `ECU-Network-CA`，按「导出」，格式選 `DER`，檔名存成 `ECU-Network-CA.cer`。

<a href="/images/xca-ecu-https-certificate-setup/image12.png"><img src="/images/xca-ecu-https-certificate-setup/image12.png" alt="圖 12　將 ECU-Network-CA 匯出為 DER 格式的 ECU-Network-CA.cer。" width="1176" height="713" loading="lazy"></a>

圖 12　Windows 端只需要 CA 的 `.cer` 公開憑證。

接著選設備憑證 `ECU-1051`，按「导出」，格式選「PEM 格式+私钥」（PEM + key），檔名填 `webserver.pem`。

<a href="/images/xca-ecu-https-certificate-setup/image13.png"><img src="/images/xca-ecu-https-certificate-setup/image13.png" alt="圖 13　將 ECU-1051 匯出為含設備私鑰的 webserver.pem。" width="1176" height="713" loading="lazy"></a>

圖 13　必須選設備憑證，不是 CA；這個檔案只交給對應 ECU。

如果找不到 `PEM + key`，先確認設備憑證已配對私鑰。把 `.cer` 副檔名直接改成 `.pem`，不會產生含私鑰的檔案。匯出前再次確認目前選取的是設備憑證，避免把 CA 私鑰交給 ECU。

## 08 在 Windows 匯入 CA

把 `ECU-Network-CA.cer` 複製到要使用的 Windows 電腦，雙擊開啟。確認「發給」與「簽發者」都是 `ECU-Network-CA`，再按「安裝憑證」。初次尚未匯入時顯示根憑證不受信任，屬於正常狀態。

<a href="/images/xca-ecu-https-certificate-setup/image14.png"><img src="/images/xca-ecu-https-certificate-setup/image14.png" alt="圖 14　Windows 憑證檢視畫面，核對 ECU-Network-CA 後按安裝憑證。" width="587" height="734" loading="lazy"></a>

圖 14　先核對憑證名稱，再啟動匯入精靈。

在匯入精靈選「目前使用者」，按「下一步」。這只會讓目前登入的 Windows 帳號信任該 CA；要讓同一台電腦的所有帳號都信任，需由管理員選「本機電腦」。

<a href="/images/xca-ecu-https-certificate-setup/image15.png"><img src="/images/xca-ecu-https-certificate-setup/image15.png" alt="圖 15　Windows 憑證匯入精靈選擇目前使用者。" width="767" height="722" loading="lazy"></a>

圖 15　本例選「目前使用者」。

選「將所有憑證放入以下的存放區」，按「瀏覽」，選「受信任的根憑證授權單位」，再按「確定」。不要放到「個人」或「中繼憑證授權單位」。

<a href="/images/xca-ecu-https-certificate-setup/image16.png"><img src="/images/xca-ecu-https-certificate-setup/image16.png" alt="圖 16　選擇受信任的根憑證授權單位存放區。" width="767" height="722" loading="lazy"></a>

圖 16　CA 必須進入「受信任的根憑證授權單位」。

回到精靈後，確認存放區名稱正確，再按「下一步」。

<a href="/images/xca-ecu-https-certificate-setup/image17.png"><img src="/images/xca-ecu-https-certificate-setup/image17.png" alt="圖 17　匯入精靈顯示受信任的根憑證授權單位。" width="767" height="722" loading="lazy"></a>

圖 17　畫面必須顯示正確的根憑證存放區。

最後確認內容為「憑證」、存放區為「受信任的根憑證授權單位」，按「完成」。若 Windows 跳出根憑證安全提示，先核對這是自己建立與管理的 CA，再同意安裝。

<a href="/images/xca-ecu-https-certificate-setup/image18.png"><img src="/images/xca-ecu-https-certificate-setup/image18.png" alt="圖 18　Windows 匯入精靈的最後確認頁。" width="767" height="722" loading="lazy"></a>

圖 18　完成前再次核對憑證存放區。

如果雙擊 `.cer` 只出現選擇應用程式，按 `Win + R`，輸入 `certmgr.msc`。展開「受信任的根憑證授權單位 → 憑證」，按右鍵選「所有工作 → 匯入」，再從精靈選取 `ECU-Network-CA.cer`。

## 09 確認 Windows 信任與設備憑證

匯入完成後，完全關閉再重開 Chrome 或 Edge。接著按 `Win + R`，輸入 `certmgr.msc`，展開「受信任的根憑證授權單位 → 憑證」，確認 `ECU-Network-CA` 已存在。

<a href="/images/xca-ecu-https-certificate-setup/image19.png"><img src="/images/xca-ecu-https-certificate-setup/image19.png" alt="圖 19　certmgr.msc 中受信任的根憑證授權單位與憑證清單。" width="782" height="555" loading="lazy"></a>

圖 19　Windows 端確認 CA 已進入根憑證存放區。

請依 ECU 的實際部署流程安裝 `webserver.pem`。只完成 Windows 匯入 CA，設備不會自動換成新憑證。設備套用後，用 `https://192.168.0.40` 連線，從網址列的憑證資訊核對：

1. 簽發者是 `ECU-Network-CA`。
2. SAN 包含 `192.168.0.40`。
3. 憑證有效期正確。
4. 瀏覽器沒有顯示名稱不符、過期或信任鏈錯誤。

目前 Chrome 的 DevTools 可按 `F12`，再按 `Ctrl + Shift + P`，輸入 `Show privacy and security` 開啟 Privacy and security 面板。到 Security 區段查看憑證、連線與來源安全狀態；若有 mixed content，從非安全來源清單開啟 Network 面板，找出仍使用 HTTP 或憑證異常的資源。

## 憑證有效但頁面仍顯示不安全

依序檢查，不要略過瀏覽器警告：

1. 開無痕視窗重新連線，排除先前略過錯誤留下的狀態。
2. 確認網址使用的 IP 與 SAN 完全一致。
3. 確認 ECU 實際送出的憑證是剛部署的設備憑證，不是舊憑證或 CA 憑證。
4. 到 DevTools 的 Security、Console 與 Network 查看資源網址。
5. 修正仍使用 HTTP、SAN 不符、過期或信任鏈不完整的資源。

完成條件是三項同時成立：Windows 信任 CA、ECU 實際提供正確的設備憑證，以及頁面所有資源都通過 HTTPS 檢查。

## 參考資料

- [XCA Step by Step guides](https://hohnstaedt.de/xca-doc/html/step-by-step.html)
- [XCA Certificate Input Dialog](https://hohnstaedt.de/xca-doc/html/certificate-input.html)
- [Chrome DevTools Privacy and security panel](https://developer.chrome.com/docs/devtools/security)
