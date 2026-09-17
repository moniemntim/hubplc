---
title: OPC UA歷史讀取的分頁續傳與資料品質
description: 以一小時每10秒資料分成四頁的離線案例，說明OPC UA HistoryRead時間範圍、numValuesPerNode、opaque ContinuationPoint、釋放、失效重查、排序去重與品質缺口。
date: 2026-09-17
author: 站長
draft: false
---

## HistoryRead先確認能力與範圍

HistoryRead請求Server實際保存的歷史，不能把即時Variable自動倒帶。先確認AccessLevel的HistoryRead位元及目前使用者的UserAccessLevel，再查Profile和產品保存範圍。Historizing表示目前是否正在收集歷史；即使false，過去已存資料仍可能可讀，不能只憑這個布林值判定有無歷史。

| 檢查項 | 教學例子 | 失敗處理 |
| --- | --- | --- |
| Node | ns=2;s=Tank.Temp | 確認歷史能力 |
| 時間範圍 | 10:00:00至11:00:00 | 保存UTC與方向 |
| numValuesPerNode | 120 | 依Server回覆分頁 |
| returnBounds | true或false | 依Details支援判讀 |
| Timestamp | Source與Server | 分開保存品質 |

時間範圍要用UTC和明確的起訖方向保存。returnBounds不是所有HistoryReadDetails都會回首尾界限；收到的Bounds、Good_NoData或Bad_NoData都要依該服務和歷史型別解讀。歷史Variable value與歷史Event有不同Details、欄位與filter，不能用同一套假設。

完成後應能列出節點、UTC範圍、Details型別、每點上限、Timestamp選擇與權限。能力未知就標待確認，收到明確不支援或拒絕再保存原始StatusCode；不要事先把未知寫成Unsupported或AccessDenied，也不能將空資料直接解讀為該時段沒有製程事件。

## 一小時資料分成四頁的時序

本例採ReadRawModifiedDetails的原始值讀取，isReadModified=false、returnBounds=false、numValuesPerNode=120。10:00至11:00每10秒一筆，含兩端共361筆，理想分成120、120、120、1四頁。C1等是token代號。Server可少回甚至零筆加token，不能只看本頁未滿120就停止；還要檢查結果與ContinuationPoint。

| 頁次及筆數 | 資料時間範圍 | 回傳token | 後續 |
| --- | --- | --- | --- |
| 1／120 | 10:00:00–10:19:50 | C1 | 原樣續讀 |
| 2／120 | 10:20:00–10:39:50 | C2 | 原樣續讀 |
| 3／120 | 10:40:00–10:59:50 | C3 | 原樣續讀 |
| 4／1 | 11:00:00 | 空 | 完成 |
| 合計361 | 含兩端且無額外bounds | 無 | 檢查品質 |

ContinuationPoint是不透明bytes。Client只能把Server回傳的token原樣帶回下一次HistoryRead，不能把它解碼成時間、頁碼、offset或自行加一。續讀時HistoryReadDetails、時間範圍、TimestampsToReturn應與原請求一致；改參數可能被忽略、報錯或被當成新查詢，依Server行為判讀。

每頁合併時保存pageIndex只是Client自己的紀錄，不是token內含頁號。每筆資料另存SourceTimestamp、ServerTimestamp、StatusCode、原始值與查詢世代。若同一時間戳有不同修改版本，必須依Server提供的版本或StatusCode欄位處理，不可只用timestamp刪掉其中一筆。

## 釋放ContinuationPoint與無效邊界

若Client在第二頁收到C2後取消，不要把未用的token留在Server。要再呼叫HistoryRead，帶原本的ContinuationPoint並將releaseContinuationPoints=true；這次不取資料，只要求釋放資源。Session關閉也會使token終止，但應用程式仍要在正常取消時明確釋放並記錄結果。

| 情況 | Server回應／狀態 | Client動作 |
| --- | --- | --- |
| 正常續讀 | 回Data與新token | 原樣保存新token |
| 最後一頁 | ContinuationPoint空 | 完成、統計缺口 |
| 取消查詢 | 釋放token | release=true，不合併資料 |
| token過期 | Bad_ContinuationPointInvalid | 接受失效，不解碼重組 |
| Server token上限 | 舊token被reset | 重新查詢並去重 |

若Server每Session最多支援一個ContinuationPoint，先建立C3再建立C4可能讓C3被reset。續讀C3收到Bad_ContinuationPointInvalid時，不能從C3內容自行推算下一頁，也不能把「從10:40重新查」當成無縫續讀。應記錄缺口、以原時間範圍重新查詢，再用來源時間和值鍵去重。

重查時先訂資料識別規則。本例每個Node每10秒只存一筆且不允許歷史修改，因此可用穩定Node身分加SourceTimestamp識別重疊。同鍵而值或品質不同就保留兩次原始回覆並報衝突；若產品允許同時刻多筆或修改歷史，需另用其記錄識別與修改資訊，不能照抄本例刪資料。

一次查多個Node時，各節點的ContinuationPoint與結果要分開管理。某點已完成、另一點還有token很正常；取消時只釋放仍有效的續傳資源，不能拿A點的token放到B點欄位。

## 資料品質 排序與失敗先查

不要按Client收到頁面的時間排歷史。保存原始回傳順序與指定時間戳，再按查詢契約呈現；ServerTimestamp不是通用的資料庫儲存時間，不能直接用它估計磁碟延遲。保留每點HistoryRead結果與每筆DataValue品質，沒有值就明示缺口，不要補零。

失敗先查歷史讀取能力與目前使用者權限，再核對Details、UTC範圍及時間戳選擇，最後看每點結果與ContinuationPoint。Historizing=false不能單獨證明舊歷史不可讀；Bad_ContinuationPointInvalid則要按token失效處理，不重送相同無效bytes等待奇蹟恢復。

前兩頁已保存到10:39:50，C2遺失後，本例保守從10:20重新查到11:00，刻意重疊整個第二頁120筆。依本例唯一鍵識別重疊，記錄新queryId與原頁來源。正常四頁的最後一筆應為11:00:00，合計361；不能把第三頁120上限寫成121來湊總數。

產品的歷史最大範圍、每點上限、aggregate、modified data、事件欄位與token數量都是能力限制。本文只提供離線資料模型，沒有指定PLC函式、OPC UA Client API或Server預設值。

查詢程式可把每一頁寫入暫存表，欄位包括queryId、generation、pageOrder、continuationPoint雜湊、request range、response range與讀取時間。token本身仍只以安全方式保存或短期記憶，不把opaque bytes顯示成可操作頁碼。完成合併後再產生給報表的排序資料，避免半頁結果被誤當完整結果。

NoData先按具體回覆層次與查詢條件解讀，不能單靠Bad_NoData認定沒有歷史能力或沒有權限。保留服務層、每Node結果與每筆值狀態，將空時間窗、欄位缺值、不支援及拒絕存取分開。事件歷史的欄位結果也不等同Variable DataValue結構。

## FAQ 驗收與官方依據

FAQ1：ContinuationPoint可以轉成頁碼保存嗎？答：只能把它當opaque bytes原樣保存，頁碼是Client自己的紀錄。

FAQ2：即時點位存在就一定有歷史嗎？答：不一定，要查Historizing、AccessLevel、Profile和Server資料保存。

FAQ3：token失效可以把時間加一頁繼續嗎？答：不可以，應接受Bad_ContinuationPointInvalid並重新查詢去重。

FAQ4：returnBounds一定會回首尾值嗎？答：不一定，要看HistoryReadDetails與Server支援。

驗收以10:00到11:00每10秒361筆、每頁120筆為離線案例，逐頁記錄資料數、token、時間戳、StatusCode與合計筆數；另測取消後釋放C2、token上限重置、重查重疊與NoData。完成條件是沒有自行解析token，缺口和去重都有可稽核紀錄。

參考：[OPC UA Part 4 §5.11.3 HistoryRead](https://reference.opcfoundation.org/specs/OPC-10000-4/5.11.3)

參考：[OPC UA Part 11 §6.3 Continuation Points](https://reference.opcfoundation.org/specs/OPC-10000-11/6.3)

參考：[OPC UA Part 11 §6.5 HistoryReadDetails](https://reference.opcfoundation.org/specs/OPC-10000-11/6.5)

參考：[OPC UA Part 13 Aggregates](https://reference.opcfoundation.org/specs/OPC-10000-13)

官方規範說明HistoryRead、ContinuationPoint、釋放與歷史Details；Server是否保存歷史、上限和事件欄位仍須查目標產品文件。本文案例為離線分頁與品質模型。

正式報告還要列出查詢使用的時區、時間方向、權限角色與資料來源。若同一節點同時有原始值和聚合值，分別保存Details與結果，不能把平均值混入原始序列。這些欄位能讓日後重查時知道差異來自查詢條件，而不是誤把Server資料遺失。

遇到部分成功時，逐Node保存每個StatusCode，不要只用整體服務狀態覆蓋所有資料。某一點Bad_NoData不應讓其他點的Good歷史被丟掉；但整個ContinuationPoint失效時，要把受影響的範圍列為缺口，等待重新查詢和人工確認。

重查去重規則也要版本化。若Server資料在兩次查詢間被修訂，同一時間戳的值可能不同；保存兩次原始回應和修改狀態，讓分析者知道是資料修訂而非程式重複。

當查詢跨越夏令時間或時區切換，仍以UTC作邊界並把顯示時區另存。報表可轉為操作員時區，但HistoryRead請求的起訖和去重鍵不可依畫面字串猜測。

## 延伸閱讀

- [OPC UA方法呼叫的參數與結果判讀](/articles/opcua-method-call-arguments-executable-audit)
- [OPC UA資料分發架構選型](/articles/opcua-pubsub-client-server-data-distribution-selection)
