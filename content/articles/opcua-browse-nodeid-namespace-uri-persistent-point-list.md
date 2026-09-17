---
title: 從OPC UA瀏覽結果建立可重連的點位清單
description: 從OPC UA Browse結果建立可追溯點位契約，分清NodeId、BrowseName、DisplayName、Namespace URI與會變動的NamespaceIndex，並設計重連與升級後失效檢查。
date: 2026-09-17
author: 站長
draft: false
---

## 先分清NodeId 名稱與命名空間

OPC UA點位清單不能只抄畫面上的名稱。NodeId是伺服器位址空間中識別節點的身分，BrowseName用於瀏覽路徑，DisplayName是給人看的文字；Namespace URI描述命名空間身分，NamespaceIndex只是本次伺服器上下文中指向URI的數字。這幾個欄位可能同時出現相似文字，卻不代表它們可以互換。

| 欄位 | 例子 | 持久化用途 |
| --- | --- | --- |
| NodeId | ns=3;i=1201 | 連線後讀值的候選身分 |
| BrowseName | Temperature | 路徑與模型閱讀 |
| DisplayName | 溫度 | 操作員顯示，可重名 |
| Namespace URI | urn:example:line | 跨Session對照 |
| NamespaceIndex | 3 | 只在當次NamespaceArray有效 |

實作第一步是Browse目標資料夾，讀取每個節點的NodeId、BrowseName、DisplayName、NodeClass與ReferenceType。不要看到DisplayName=Temperature就直接寫入設定；同一個顯示名稱可能分別屬於Line1與Line2，NodeId也可能完全不同。清單要把父節點路徑和來源伺服器ApplicationUri一起記錄，才能在重連後追查選到哪個變數。

完成後的最小點位契約至少能回答：這個點位在哪個BrowsePath、使用哪個Namespace URI、識別部分是numeric、string、GUID或opaque、資料型別是什麼、是否可讀寫。這份契約是後續重新瀏覽與人工審查的基準，不是把一次Browse結果當永久真理。

若清單要給資料庫或SCADA使用，建議把serverApplicationUri、endpointUrl、namespaceUri、identifierType、identifierValue和displayName分欄保存。endpointUrl可能因部署改變，ApplicationUri是應用實例識別，兩者不可混成一個名稱。欄位分開後，換網段仍能追溯同一模型。

## NamespaceIndex會變 URI要一起保存

NamespaceArray是URI陣列，NodeId中的NamespaceIndex只是陣列索引。假設第一次Session中index 3對應urn:example:line，重啟或模型更新後index 4才對應同一URI，裸寫ns=3;i=1201就可能讀到另一個模型，甚至變成無效節點。客戶端在建立Session後要重新讀NamespaceArray，將歷史URI與目前index重新對照。

| 版本 | NamespaceArray對照 | 歷史NodeId解讀 |
| --- | --- | --- |
| V1 | 3→urn:example:line | ns=3;i=1201為Line1溫度 |
| V2 | 4→urn:example:line | 應改用ns=4;i=1201 |
| V2另一URI | 3→urn:vendor:old | 不能沿用裸ns=3 |
| 對照失敗 | URI不存在 | 點位標記Invalid等待重新Browse |

自訂NamespaceIndex不可當成跨伺服器固定值。保存namespaceUri、identifierType與identifierValue，連線時以URI解析出目前索引，再組成Read等服務需要的NodeId。ExpandedNodeId可保存URI形式的識別資訊，但不是把它直接塞入所有要求NodeId的欄位；具體轉換由SDK提供的型別與API處理。

支援UrisVersion的伺服器可提供URI陣列變更的輔助訊號，但要先核對規格版本及產品是否提供該節點；它不能代替實際NamespaceArray內容。未提供時照樣可重新讀陣列並逐項比對，不能因讀不到可選能力就判定所有點位失效。

持久化時可把原始NodeId和解析後的ExpandedNodeId同時保留。原始值方便對照設備日誌，URI加identifier則方便跨Session重建。若Server只提供opaque識別，保存Base64時要同時記錄編碼方式和長度，避免不同工具把二進位資料誤當文字。

## 同DisplayName不同NodeId的具體案例

離線Browse結果有兩個名為Temperature的變數。Line1路徑是Objects/AreaA/Line1，NodeId為ns=3;s=Line1.Temp；Line2路徑是Objects/AreaA/Line2，NodeId為ns=3;s=Line2.Temp。它們DisplayName相同，卻是兩個不同點位。若只用名稱建立字典，後寫入的Line2會覆蓋Line1，畫面看似有值，實際資料已接錯。

| 欄位 | Line1 | Line2 |
| --- | --- | --- |
| BrowsePath | Objects/AreaA/Line1/Temperature | Objects/AreaA/Line2/Temperature |
| DisplayName | Temperature | Temperature |
| BrowseName | Temperature | Temperature |
| NodeId | ns=3;s=Line1.Temp | ns=3;s=Line2.Temp |
| 工程單位 | °C | °C |
| 契約鍵 | AreaA/Line1/Temperature | AreaA/Line2/Temperature |

本例完整路徑可當人工契約鍵，真正連線識別仍保存伺服器、namespace URI與identifier。正式BrowsePath每一段以QualifiedName表達，包含名稱及命名空間；表內斜線字串只是閱讀表示。TranslateBrowsePathsToNodeIds可能得到多個目標，要逐一驗證，不能假設顯示路徑永遠唯一。

同一點位的identifier也可能是numeric、string、GUID或opaque。numeric要保存整數值與namespace URI；string要保存原始大小寫與編碼；GUID要保存完整格式；opaque要保存可逆的Base64或產品文件指定表示法。不要把所有identifier轉成顯示字串後再拼回NodeId，這會遺失型別資訊。

人工審查時可先以契約鍵排序，再逐列看NodeClass和父子Reference。若兩個同名節點的工程單位不同，或一個有CurrentRead另一個只有歷史存取，應將它們列為不同用途。名稱相似只能幫助瀏覽，不能作為自動合併條件。

讀值前核對NodeClass、DataType、ValueRank、AccessLevel及UserAccessLevel，後者才反映目前使用者的存取條件。兩個Temperature可以合法具有不同型別；只有與各自既定契約不符時才報ContractChanged，不能因同名就要求型別相同。

## 重連 升級與失效點檢查

重新連線後先確認伺服器身分，再讀NamespaceArray，視支援情況讀UrisVersion，最後解析URI與identifier並比對型別及用途。URI不存在標NamespaceMissing，已解析NodeId不存在標NodeMissing，型別改變標ContractChanged；這些是應用自訂診斷名稱，不是假造OPC UA標準StatusCode。

案例：第一次清單記錄Line1溫度為urn:example:line、string Line1.Temp、Double、°C。伺服器升級後index從3變5，URI不變，Browse後找到同一identifier且DataType未變，可更新本次index並通過。若升級後同URI下Line1.Temp變成Boolean，則即使NodeId文字相同也應拒絕自動綁定，等待模型審查。

失敗先查伺服器Endpoint與ApplicationUri，再查NamespaceArray是否讀取成功；接著比對identifierType、BrowsePath和DataType。不要先嘗試把index加一或減一，也不要用DisplayName相同的節點補洞。這些作法會讓錯誤延後到資料趨勢或控制邏輯才被發現。

規範沒有規定所有產品的Browse UI、快取檔案或自動重新綁定方式。實際Server可能有模型版本欄位、節點別名或額外限制，仍需讀目標產品的address space文件。本文的清單格式是運作模型，不宣稱某個PLC或OPC UA client API一定提供相同欄位。

若升級後只新增Namespace URI，舊URI和索引仍須逐項比對；若產品刪除或重建節點，不能用數字identifier相同作為同一點位證明。把這類變更交給模型審查人員，並在資料流恢復前保持Invalid，避免新舊點位混寫同一歷史序列。

## FAQ 驗收與官方依據

FAQ1：DisplayName相同就能共用NodeId嗎？答：不能，必須用BrowsePath與NodeId區分。

FAQ2：NamespaceIndex每次都一樣可以只存index嗎？答：不行，Index是上下文對照，仍要存Namespace URI。

FAQ3：URI沒變就能保證DataType沒變嗎？答：不能，仍要檢查DataType、ValueRank、AccessLevel與工程單位。

FAQ4：重連找不到原NodeId能自動找同名點嗎？答：只有在完整路徑、URI、identifier與契約欄位通過比對時才可提出候選，不能靜默替換。

驗收時用離線Browse結果建立兩個同DisplayName不同NodeId的案例，再模擬NamespaceIndex變更、URI缺失、DataType改變和伺服器升級。報告保存原始Browse結果、NamespaceArray、UrisVersion、ApplicationUri、模型版本和每個失效原因。完成結果是重連後能明確判定可更新、需重Browse或需人工停用。

參考：[OPC UA Part 3 Address Space Model](https://reference.opcfoundation.org/specs/OPC-10000-3/full)

參考：[OPC UA Part 5 Information Model](https://reference.opcfoundation.org/specs/OPC-10000-5/full)

參考：[OPC UA Part 4 Services](https://reference.opcfoundation.org/specs/OPC-10000-4/full)

上述官方規範說明Address Space、NamespaceArray、NodeId與服務互動原則；產品的索引排列、快取位置、自動重綁和模型版本欄位仍須另查。本文僅以離線Browse與契約比對示範。

交付清單最後應附一份失效演練紀錄：改變NamespaceIndex、改變DataType、刪除BrowsePath並恢復原模型，分別確認程式會更新暫存索引、停用契約或重新啟用。這些結果是驗收條件，不是本文已對任何特定Server實測得到的保證。

若資料庫已有歷史點位，更新契約時不要直接改寫舊NodeId。新舊對照表應保存生效時間、模型版本、Namespace URI、identifier和停用原因；查詢歷史時依事件時間選用當時契約，才能在模型升級後仍解釋過去的數值來源。

報表也應顯示目前綁定狀態與最後成功Browse時間，讓維護者知道資料是現行模型還是等待審查。

## 延伸閱讀

- [OPC UA應用憑證的信任與輪替](/articles/opcua-application-uri-trust-list-certificate-rotation)
- [OPC UA取樣發布間隔與通知佇列設計](/articles/opcua-subscription-sampling-publishing-queue-overflow)
