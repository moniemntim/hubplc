---
title: OPC UA斷線後如何恢復資料
description: 重連四層生命週期與三條離線時間線。
date: 2026-09-17
author: 站長
draft: false
---

## 先分清四層狀態

畫面重新出現數字，不代表斷線期間的資料已經補齊。處理OPC UA重連時，先分開TCP傳輸、SecureChannel安全通道、Session會話與Subscription訂閱；每一層都有自己的識別、生命週期及失敗原因。不要一看到socket連上，就把整套系統改成正常。

| 層級 | 要確認的證據 | 恢復後仍未保證 |
| --- | --- | --- |
| TCP | 連線建立及收送 | 憑證與身分合法 |
| SecureChannel | 安全模式、Policy及憑證 | 既有Session仍有效 |
| Session | ActivateSession結果 | 舊Subscription仍存在 |
| Subscription | 識別、通知及服務結果 | 所有來源樣本皆已補齊 |

離線案例固定Server修訂後publishing interval為一秒、lifetimeCount為六十、maxKeepAliveCount為十。六十符合至少三倍keep-alive count的要求，但不是任一產品的預設值。現場先保存CreateSubscription回覆的revised值，不能拿請求值直接計算或宣稱斷線六十秒就一定刪除訂閱。

本篇採一般Client/Server重連概念，不指定廠商SDK，也不假設支援durable Subscription。若PLC透過閘道提供OPC UA，還要分清PLC到閘道、閘道到Client兩段故障。Client連到閘道成功，只能證明後一段連線，不代表PLC來源品質恢復。

開始排查先留下最後有效資料、最後收到及已持久化的通知序號、SessionId、SubscriptionId和Server啟動世代。收到、寫入資料庫、送出確認是三個不同時間點；記錄只有最後收到序號，程式崩潰後就可能無法判斷哪筆尚未保存。

## 短斷線先嘗試恢復既有會話

假設斷線前通知100已完整寫入，Client已確認至99；100的確認尚未完成。TCP恢復後先重建所需SecureChannel，嘗試ActivateSession恢復既有Session。不要在每次短斷線都主動刪除會話，否則會失去利用既有訂閱與重送佇列的機會。

這次離線預設Server重送佇列仍保存101和102。Session恢復後，Client從下一個預期序號101依序Republish：101成功、102成功，查103得到Bad_MessageNotAvailable，之後恢復正常Publish流程。這裡明確假設101和102曾成為保存的NotificationMessage；不是依兩秒斷線時間推論一定有兩筆通知。

| 步驟 | 收到什麼 | 應用結果 |
| --- | --- | --- |
| 斷線前 | 100已持久化 | 保留待確認狀態 |
| Republish 101 | 保存的通知101 | 持久化並記錄 |
| Republish 102 | 保存的通知102 | 持久化並記錄 |
| Republish 103 | Bad_MessageNotAvailable | 結束本次循環並恢復Publish |
| 100再送達 | 相同通知 | 辨識重複，不重算業務 |

Bad_MessageNotAvailable表示該通知目前無法從重送佇列取得，不能單憑這個碼斷言歷史沒有缺口。如果後續收到105而103、104未曾保存，缺口仍要列出。Republish補的是已保存通知，不會重新採樣，更不會找回在MonitoredItem佇列中早已被捨棄的變化。

NotificationMessage可含多筆DataChange資料；用同一sequence作每個數值的唯一鍵會錯刪同訊息中的其他值。可先整包去重並原子保存全部內容，再依訊息內位置及MonitoredItem對應拆開；鍵另含來源Server世代和Subscription世代，避免重啟後識別重用。長期運作還需處理序號回繞，不能永遠只用大於比較。

## 訂閱消失時重建並保留缺口

Subscription lifetime依連續publishing cycles內沒有可用Publish請求的情況推進。TCP斷線可能使Client停止提供請求，但伺服器內仍可能有排隊請求；因此不能直接以牆上時間判斷。假設本例連續耗盡六十個一秒週期，Server刪除Subscription42及其MonitoredItems，重連時服務結果確認42不存在。

這時停止對失效42反覆Republish，重新建立訂閱與監看項目，保存新Subscription43及各項目建立結果。依Client保存的NodeId、ClientHandle、監看模式、filter和queue設定重建；NodeId若使用namespace index，先依NamespaceUri重新解析，避免Server重啟後索引變動監錯點位。

| 重建項目 | 保存的結果 | 失敗時處理 |
| --- | --- | --- |
| Subscription | revised interval/lifetime/keep-alive | 核對資源與產品限制 |
| MonitoredItem | 逐項StatusCode及識別 | 失敗點單獨標示 |
| Sampling及queue | revisedSamplingInterval與revisedQueueSize | 比較能否滿足用途 |
| DataChangeFilter | 原請求及逐項結果 | 依實際通知驗證，不虛構回讀欄位 |

DataChangeFilter沒有自己的result structure，不能把filterResult說成可讀回修訂deadband的通用介面。新的首批值標recreated，只作恢復後基線。如果恢復前最後值21、之後看到25，只能說中間過程未知，不能憑數字差推論一定漏了22、23、24三筆。

需要補歷史時另查HistoryRead支援與保存範圍。把歷史回補資料標出來源並與即時通知核對，缺口無法補齊就保留未知區間。對事件及累計量採不同補資料規則，不能用目前值向前填滿整段斷線時間，再宣稱資料完整。

## 新會話的Transfer與憑證排查

若既有Session無法Activate，依失敗原因處理後才評估新Session。新Session可嘗試TransferSubscriptions，但前提是訂閱仍存在且Server支援服務；已刪除的訂閱無法靠Transfer復活。Transfer回覆要看每個Subscription的結果，不能只看服務層總結果。

身分條件依規範核對：一般檢查相同非Anonymous ClientUserId；Anonymous情況則另要求相同ApplicationUri及Sign或SignAndEncrypt模式。這不是要求沿用同一SecureChannel，也不能只因帳號文字一樣就略過產品身分對應與授權檢查。

sendInitialValues不是歷史回放開關。它針對Reporting狀態的資料監看項目依規則提供初始值；若佇列有值，使用下一個佇列值，否則重送最後送出的值。收到這些值後仍須檢查品質與時間，不能自動當成恢復當下的新採樣。

憑證問題可能在安全通道建立或Session相關步驟就阻擋。保存Endpoint、安全模式、Policy、ApplicationUri、憑證指紋、期限及實際StatusCode，分辨未受信任、到期與身分不符。應用程式憑證和使用者Anonymous是不同層，換成Anonymous不能修復憑證信任問題。

修復前先確認哪一端拒絕哪一張憑證，再按照既定信任程序更新。不能把trust全部放行當成恢復測試成功。恢復後重新以預定身分與安全模式連線，記錄通道、Session及資料通知結果；若只消除彈窗而沒取得資料，仍標部分恢復。

## 驗收練習與常見問題

練習安排三輪隔離測試：短斷線確認既有Session與Republish；訂閱逾時確認重建及缺口；未受信任憑證確認阻擋與修復。每輪先寫預期再測，保存斷線時間、revised參數、服務結果、通知身分與持久化結果。本文只有離線時序。

完成後應分別看到連線恢復時間、首筆有效資料時間、補送結束時間與未補缺口。若資料庫少一筆但畫面正常，先查通知是否已確認卻未持久化；若每次短斷線都變新Subscription，先查重連程序是否過早刪除舊Session。

FAQ1：TCP連上就算完成嗎？還須確認安全通道、Session、Subscription及資料品質，四層各自留下證據。

FAQ2：Republish能補所有採樣嗎？不能，它只取回仍保存的NotificationMessage；MonitoredItem篩選或佇列捨棄可能早已減少資料。

FAQ3：Transfer成功就沒有缺口嗎？不能保證。還要核對可重送通知、去重及缺口，初始值不等於歷史。

FAQ4：目前值合理，可以清掉斷線事件嗎？應新增恢復事件並保留原斷線區間，讓報表使用者知道哪些資料曾未知。

參考：[OPC UA Part 4 重連流程。](https://reference.opcfoundation.org/specs/OPC-10000-4/6.7)

參考：[OPC UA Part 4 Subscription model。](https://reference.opcfoundation.org/specs/OPC-10000-4/5.14.1)

參考：[OPC UA Part 4 Republish與TransferSubscriptions。](https://reference.opcfoundation.org/specs/OPC-10000-4/5.14.7)

## 延伸閱讀

- [OPC UA品質碼與最後可用值](/articles/opcua-statuscode-quality)
- [工業MQTT資產階層與十二條Topic命名範例](/articles/mqtt-topic-taxonomy-industrial-asset-hierarchy)
