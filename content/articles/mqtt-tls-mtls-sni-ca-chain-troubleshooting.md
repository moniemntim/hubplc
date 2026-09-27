---
title: MQTT憑證與TLS連線排查
description: 以三張虛構Server leaf憑證及其信任鏈案例，依DNS、SNI、SAN、信任鏈、mTLS與MQTT ACL順序排查TLS連線問題。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先分清TLS mTLS與ACL

MQTT over TLS至少有三層判斷。第一層是 client 驗證 broker server certificate，回答「我連到的是否是這個hostname」；啟用mTLS時第二層是broker驗證client certificate，回答「這個client身分是否被接受」；第三層是 MQTT CONNECT 後的帳號、角色與 topic ACL。前一層成功不會自動代表後兩層成功，TLS handshake成功也不代表命令可發布。

本文採虛構 hostname mqtt.factory.example與私有根CA Factory-Root-2025，憑證與指紋採匿名範例，不含私鑰。SNI是TLS ClientHello帶給伺服器的目標名稱，可讓同一IP選擇虛擬主機；SNI本身不是信任，也不取代SAN hostname比對。

server leaf certificate通常要檢查issuer、鏈、有效期、用途與dNSName SAN。連線程式實際使用 mqtt.factory.example，就要用該名稱比對SAN；只因CN相同、IP可連或指紋看似正確，都不能跳過hostname驗證。本篇依RFC9525的SAN規則，該規範已取代RFC6125；舊產品可能仍採早期行為，部署前查版本，不能為相容而默認只比對CN。

公開資訊表中的fingerprint只用於比對版本，不能取代trust store。輪替時若同一hostname同時存在舊leaf與新leaf，要記錄每次連線實際收到哪張，並確認兩張都由允許的鏈簽發。若只看到其中一張，可能是負載平衡或SNI路由尚未一致。

| 檢查層 | 主要問題 | 證據 | 失敗例 |
| --- | --- | --- | --- |
| TLS server identity | 是不是目標broker | client TLS log、SAN、issuer | SAN不含實際hostname |
| TLS client identity | broker是否接受client | client cert、broker audit | client CA不在trust store |
| MQTT authorization | 能否使用topic | CONNACK與ACL log | TLS成功但ACL拒絕 |
| 資料路徑 | DNS/SNI是否一致 | 解析、ClientHello、端點 | 連到錯誤虛擬主機 |

## CA鏈與三張匿名憑證

先建出leaf經中繼到受信任根的驗證路徑，核對簽章、CA約束、用途、期限及產品撤銷政策；issuer名稱相同不等於簽章驗證成功。根是信任錨，其期限處理依平台政策，不能把根與路徑中的leaf、中繼完全混為一談。可信鏈也不取代SAN身分比對。

離線假設信任庫有 Factory-Root-2025，連線名稱是 mqtt.factory.example。A的issuer是Factory-Intermediate-2025，SAN含mqtt.factory.example，鏈可回根且期限有效，在簽章、用途、限制與撤銷政策等其他檢查也通過的假設下，可通過本例Server身分檢查。B的SAN相同但issuer是Unknown-Root，不能因SAN正確而接受。C由可信根簽發但SAN只有broker.factory.example，hostname mismatch。

| 憑證 | issuer與鏈 | SAN | leaf有效期 | 預期 |
| --- | --- | --- | --- | --- |
| A Server leaf | Intermediate-2025→Root-2025 | mqtt.factory.example | 2026-01-01至2026-12-31 UTC | 可通過identity |
| B Server leaf | Unknown-Root，鏈不受信 | mqtt.factory.example | 同A | trust failure |
| C Server leaf | Intermediate-2025→Root-2025 | broker.factory.example | 同A | hostname mismatch |

中繼憑證缺失時，根CA可能仍在trust store，但client未必能自行取得中繼，結果會是鏈建立失敗。排查要保存leaf、intermediate、root的subject、issuer、序號、有效期與fingerprint等公開欄位；不要把私鑰、私鑰密碼或可直接使用的憑證命令寫入紀錄。

中繼CA與根CA的角色也要分開。root通常是信任錨，intermediate負責簽發leaf；client trust store是否需要放intermediate取決於伺服器送出的鏈與平台驗證方式。文章案例不假設任何平台會自動下載缺少的中繼，因為離線環境常沒有這條路徑。

三列A、B、C是三張候選Server leaf，並非根、中繼、leaf各一張。離線檢查日固定2026-09-17 UTC，三張leaf皆未到期，所以B與C要分別由不受信任鏈和SAN不符判斷。指紋欄位應在實際盤點填入憑證摘要，本例不編造可用憑證。

## SNI DNS與SAN不匹配的排查

排查先確認應用設定的hostname、DNS解析結果與實際TCP端點，再確認TLS ClientHello送出的SNI。多個虛擬主機共用IP時，錯誤SNI可能讓伺服器送出另一張合法但不適用的certificate。修正SNI不能取代SAN檢查，因為最終仍要以實際連線hostname比對server certificate。

離線案例：DNS把 mqtt.factory.example解析到203.0.113.20，伺服器有兩個虛擬主機。Client送SNI=broker.factory.example，伺服器回C；鏈有效但SAN不含原本設定的mqtt.factory.example，預期hostname failure。若改送正確SNI後回A，還要確認client確實以mqtt.factory.example驗證，而不是關閉驗證。

若系統用IP連線，certificate SAN必須包含該IP的iPAddress型別才可能通過；不能以dNSName文字代替。工程文件應固定一種正式名稱，避免DNS、SNI、SAN、ACL中的名稱各自不同。時鐘錯誤也會造成not yet valid或expired，先核對UTC與NTP狀態。

| 症狀 | 先查 | 預期分流 |
| --- | --- | --- |
| 收到未知或錯誤leaf | SNI、虛擬主機、DNS | 修正端點後重比SAN |
| certificate expired | 系統UTC、notAfter | 修正時鐘或輪替 |
| unknown issuer | chain與trust store | 補正信任鏈，不能關驗證 |
| hostname mismatch | 實際hostname與SAN | 改正名稱或換正確leaf |

hostname驗證和IP路由是兩件事。TCP能連到203.0.113.20只表示封包到達某端點；它不能證明端點是mqtt.factory.example。若網路設計必須用IP，文件應要求certificate SAN含正確iPAddress，並確認客戶端的驗證API真的以IP類型比對。

不應用「允許任意certificate」「跳過hostname」「只固定fingerprint」作為未知產品的通用修復。若產品提供pinning、hostname verify或trust store選項，要依該版本官方文件建立設定與回復方式。本文不提供未指定broker或client的CLI。

## mTLS與MQTT ACL分流

mTLS是雙向身分驗證：client驗證server，server也要求client送client certificate並驗證其issuer、期限、用途與政策。client certificate的SAN或subject可能用於映射帳號，但映射規則是broker產品政策，不是MQTT規範自動替你決定。即使client certificate通過，仍要看CONNECT身份與topic ACL。

驗收要保存三種證據。TLS handshake log顯示鏈、SAN、SNI、client cert要求與錯誤；broker audit log顯示client subject映射、CONNECT結果與ACL決策；client log顯示它使用的hostname、trust store來源與錯誤分類。只看到一行TLS failed，無法分辨不信任CA、SAN不符、client被拒或後續ACL拒絕。

匿名client cert表可公開記錄 subject、issuer、SAN、EKU、notBefore、notAfter、fingerprint、trust-store path與rotation batch。私鑰只在受控存放區，不放文章範例。若client certificate被接受但發布plant/pump/P-01/command被ACL拒絕，應保持拒絕；不能為了證明mTLS成功而放寬topic權限。

| 階段 | 成功證據 | 失敗處理 |
| --- | --- | --- |
| server TLS | server SAN與hostname相符、鏈可信 | 查DNS、SNI、時鐘、trust store |
| client TLS | client鏈與用途符合broker政策 | 查client issuer、期限、EKU與broker要求 |
| MQTT CONNECT | CONNACK成功 | 查帳密/映射與reason code |
| PUBLISH/SUBSCRIBE | ACL允許該topic | 查topic規則與角色，不改TLS驗證 |

驗證時間要使用一致的UTC。notBefore尚未到或notAfter已過都應在TLS層拒絕；把系統時間往回調來繞過期限會破壞日誌排序與安全政策。排查只修正已確認錯誤的NTP或時區，不把關閉期限檢查當作替代方案。

未知產品時用概念性檢查表與官方文件，不猜測設定檔名稱、憑證旗標、埠號或CLI選項。MQTT規範提到TLS服務常見8883，但實際埠由部署決定；埠號不是證明TLS或mTLS已生效的依據。

## 輪替 驗收與FAQ

私有CA輪替可先在client與broker trust store同時放舊Root與新Root，再以小批次換server leaf，接著換client leaf。每一批都記錄憑證指紋、SAN、issuer、期限、信任庫版本與broker audit結果。確認新舊連線都能按預期通過或拒絕後，才移除舊Root；移除前保留回復窗口。

輪替驗收分成正常與負面案例：舊leaf在舊信任鏈可用、新leaf在雙CA期間可用、未知根拒絕、SAN錯誤拒絕、過期leaf拒絕、client cert用途不符拒絕、TLS成功但ACL拒絕。每列標示規範預期、產品文件依據、實測證據或待驗證，不能把讀到文件寫成已實測。

fingerprint適合辨識拿到的憑證版本，不是hostname授權的替代品。A與另一張同SAN但不同指紋的leaf可能都是合法輪替版本，也可能尚未被信任；要同時看鏈、SAN、用途、期限、trust store與broker政策。

FAQ1：根CA有效，server就一定可用嗎？不一定，leaf仍須有正確SAN、完整鏈、有效期限與用途。

FAQ2：SNI等於SAN嗎？不等於。SNI選擇虛擬主機；client仍要以實際hostname驗證server SAN。

FAQ3：mTLS成功能否發布所有topic？不能，broker仍依CONNECT身份與MQTT ACL授權。

FAQ4：能否只看fingerprint或關閉hostname檢查？不能作通用修復；應依官方文件修正名稱、鏈、trust store或輪替。

本文三張憑證、hostname、指紋與時間為案例資料。

參考：[OASIS MQTT Version 5.0，§5.4.1–§5.4.7安全、認證、授權、TLS、SNI與憑證 hostname關係。](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html)

參考：[RFC 9525：TLS服務身分、SAN DNS-ID及IP-ID；取代RFC6125。](https://www.rfc-editor.org/rfc/rfc9525.html)

正式報告應把「TLS handshake失敗」「MQTT CONNECT拒絕」與「ACL拒絕」分列，並保存錯誤發生時間、連線hostname、SNI、certificate公開欄位與broker audit識別。這樣輪替後若只有部分節點失敗，可以定位是DNS、負載平衡、信任鏈、client身分或topic規則，而不是用一個模糊的連線失敗結論覆蓋所有原因。

參考：[Eclipse Mosquitto mosquitto.conf，TLS listener、CA、certificate與client certificate相關產品設定說明。](https://mosquitto.org/man/mosquitto-conf-5.html)

## 延伸閱讀

- [MQTT Payload格式與版本相容](/articles/mqtt-payload-schema-version-json-cbor-protobuf)
- [MQTT共享訂閱的分工與去重](/articles/mqtt-shared-subscription-consumer-dispatch-deduplication)
