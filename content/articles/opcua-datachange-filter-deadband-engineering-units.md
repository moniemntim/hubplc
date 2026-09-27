---
title: OPC UA Deadband門檻與工程單位核對
description: 以溫度序列說明last queued value、嚴格大於門檻、StatusCode例外，並比較Absolute、Percent與EURange及品質更新策略。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先定義deadband比較基準

OPC UA DataChangeFilter的deadband不是把每次取樣直接四捨五入。AbsoluteDeadband的比較基準是最後推入queue的值，通知條件是abs(last queued value-current value)嚴格大於門檻。被deadband擋下的樣本不會成為新的基準，因此下一筆仍和原本最後入隊值比較。

本文用離線溫度序列與0.5工程單位門檻。假設最初推入10.0，current=10.5時差值正好0.5，不因值變化通知；current=10.5001時差值大於0.5，通知且10.5001成為新的last queued value。這是計算案例，不是Server排程實測。

| current | last queued | 差值 | 通知 |
| --- | --- | --- | --- |
| 10.2 | 10.0 | 0.2 | 否 |
| 10.5 | 10.0 | 0.5 | 否，等號不超過 |
| 10.5001 | 10.0 | 0.5001 | 是，更新基準 |
| 10.8 | 10.5001 | 0.2999 | 否 |

未通知不代表來源沒有變動。若應用要知道最後採樣時間或品質，需另外讀取或設定通知策略；不能把「沒有DataChange」解讀成「溫度保持不變」。

設定前先核對DataType及Server支援能力，再保存CreateMonitoredItems或ModifyMonitoredItems的每項statusCode。DataChangeFilter沒有專用的result structure，不能憑空要求回讀revised filter或宣稱Server會自動改成另一門檻。保存實際送出的filter，另核對revisedSamplingInterval與revisedQueueSize，最後以固定序列驗證行為。

## Trigger與狀態例外

STATUS只看StatusCode，STATUS_VALUE看狀態及經篩選的值。STATUS_VALUE_TIMESTAMP在沒有deadband時還考慮SourceTimestamp；指定deadband後，其行為與STATUS_VALUE相同。狀態Good變Bad仍要通知，不受數值門檻抑制；這是DataChangeNotification中的資料品質，不是Subscription層的StatusChangeNotification。

| Trigger | 值差小於門檻 | StatusCode改變 | 適用情境 |
| --- | --- | --- | --- |
| STATUS | 不通知 | 通知 | 只要品質狀態 |
| STATUS_VALUE | 不通知 | 通知 | 值或品質 |
| STATUS_VALUE_TIMESTAMP | 有deadband同STATUS_VALUE | 通知 | 無deadband才額外看時間 |

驗收時保存DataValue的Value、StatusCode、SourceTimestamp與ServerTimestamp。若只保存Client收到Publish的時間，無法知道是取樣沒變、deadband擋掉、來源停更，或網路延遲。

last queued value不是Client最後收到的值。佇列內可能已經有新的比較基準，但Publish尚未送到Client；某些已入列通知又可能因容量被淘汰。先按取樣、篩選、入列、移出四個時點列出紀錄，再判斷為何畫面相鄰兩值沒有超過門檻。

last queued value的概念會影響連續小變化。基準10.0時，10.4被擋下，下一筆10.7與10.0差0.7，應通知；不能拿10.4作基準而判斷差0.3。通知後基準才改成10.7，後續10.9與10.7差0.2又被擋下。

單獨練習時間變化：值10.0且Good不變，只有SourceTimestamp更新。trigger為STATUS_VALUE_TIMESTAMP且deadbandType=None時應通知；改成Absolute 0.5後，不能靠timestamp變化保證每次通知。這個對照能抓出把時間觸發誤當成deadband旁路的設定錯誤。

EURange的單位與來源也要保存。若變數目前顯示bar但EURange被設定成kPa，PercentDeadband的數字雖能計算，實際工程意義已錯；映射表應列EngineeringUnits與量程版本。

若StatusCode從Bad回Good，即使數值仍未超過門檻，也應依trigger產生品質恢復通知。消費者應保存恢復時間，不能只更新畫面數值而丟掉狀態轉移。

資料品質與流量統計應分開報告：通知數下降不等於來源變化下降，可能只是deadband過濾更多樣本。

## Absolute Percent與EURange

AbsoluteDeadband使用變數工程單位，0.5代表0.5°C或0.5 bar，不能直接套到所有DataType。PercentDeadband需依EURange換算，假設EURange為0到100、percent=1%，有效門檻是1工程單位；若EURange為-20到80，範圍仍是100，1%也是1，但若工程範圍改成0到1000，門檻就變10。

| 設定 | 假設量程 | current與基準 | 判斷 |
| --- | --- | --- | --- |
| Absolute 0.5 | 溫度工程單位 | 10.0→10.5 | 不通知 |
| Absolute 0.5 | 溫度工程單位 | 10.0→10.6 | 通知 |
| Percent 1% | EURange 0..100 | 50→51 | 差1，等號不超過 |
| Percent 1% | EURange 0..1000 | 500→511 | 差11，大於10才通知 |

EURange不是目前值範圍，而是工程量程描述；若變數沒有有效EURange，PercentDeadband不能自行猜滿刻度。目標Server是否支援Percent、是否要求EURange與DataType限制，要以Part 8及產品文件核對。

把10.0到10.5列為不通知時，要確認比較結果沒有浮點表示誤差造成意外；正式驗收使用Server實際型別與已被接受的filter請求，不以文字計算取代實機證據。

若數值先從10.0變10.6而通知排隊，接著10.2到來，queue與discard policy可能保留不同項目；工程師要保存每筆DataValue與StatusCode，不能只看最後Publish畫面猜測比較基準。

品質通知與控制使用要分開。若Bad值通知到達，應保存Bad狀態並依工程規格禁止閉迴路使用；deadband只是流量過濾，不是安全或控制失效保護。

初始MonitoredItem值可能觸發一筆初始通知，這筆不能和deadband比較結果混為連續變化。驗收報告要標記建立監視項目、初始值、後續取樣的時間順序。

測試保存送出的filter、各項建立或修改狀態、revised sampling、revised queue及通知DataValue。若要讀產品另外提供的設定節點，先確認文件；不能把這種產品擴充寫成所有OPC UA Server的標準回讀服務。

## 噪聲與驗收設計

deadband選擇要看噪聲、控制用途與可接受漏報幅度。若溫度噪聲約±0.2°C而控制不需看到0.5°C內的變化，Absolute 0.5可能合適；若保護邏輯需要0.1°C變化，就不能為省流量任意放大門檻。這是工程取捨，不是標準預設。

| 用途 | 噪聲假設 | 門檻問題 | 驗收 |
| --- | --- | --- | --- |
| 趨勢顯示 | ±0.2°C | 0.5可能隱藏小變化 | 保留品質/最後更新 |
| 控制回授 | 需0.1°C | 0.5可能漏報 | 縮小門檻或不用deadband |
| 告警狀態 | 值差可小 | Status變化不可漏 | 用STATUS_VALUE |
| 品質監視 | 值可不變 | Bad仍要通知 | 測Good→Bad |

值經過deadband仍須監看品質與來源有效性。StatusCode變化本來就不受deadband抑制；若來源停更卻沒有改變StatusCode，需另用產品診斷或明確的更新監視辨識。不要以為加上timestamp trigger和deadband就必然形成週期心跳。

離線測試包含10.2、10.5、10.5001、10.8與Good→Bad。每列記錄last queued value，不能把10.5未通知後誤當成新基準。若Server實際結果不同，先查filter請求及回覆狀態、DataType、EURange、queue與產品deadband支援。

AbsoluteDeadband適合已明確工程單位的變數；PercentDeadband適合依EURange比例判斷的量測，但EURange若被錯誤設定，通知門檻也會跟著錯。量程變更應升版並重新驗證，不要只改百分比。

離線算表完成後，實機驗收應以固定取樣序列或可控模擬值測等號邊界、剛超過門檻、Status Good到Bad、EURange讀回與queue溢位。未實測項目在報告寫待驗證，不能把公式結果稱作Server行為。

queue size與discardOldest會改變保留資料。queue size 1只留下最新值；較大queue仍不等於歷史保存，Overflow或丟棄狀態要由StatusCode證據確認。

## FAQ與來源

FAQ1：差值等於0.5會通知嗎？依AbsoluteDeadband嚴格大於條件，不因值變化通知。

FAQ2：未通知是否代表來源沒變？不代表，可能被deadband擋下。

FAQ3：PercentDeadband能直接當0.5工程單位嗎？不能，要依EURange換算並確認Server支援。

FAQ4：Status變Bad會被deadband壓掉嗎？不應因數值門檻壓掉StatusCode變化。

STATUS trigger只通知StatusCode改變，不是週期性心跳。若需要知道來源仍活著，要另設heartbeat、讀取或最後更新監視；不能把沒有DataChange當成連線正常。

通知間隔與品質更新是兩個問題。若使用者只訂閱大門檻值，長時間沒有通知時仍可能需要低頻讀取StatusCode、SourceTimestamp或診斷資料；頻率與節省流量的取捨要寫在需求表。

若消費者要求每筆溫度，deadband就不適合當作資料保存策略；應改用歷史、批量讀取或提高通知容量。deadband的目的只是減少不必要通知，不能補回已被過濾的樣本。

對於噪聲呈現慢速漂移的量測，last queued value可能長時間不更新，使一次較大的累積差異突然觸發通知。這不是計算錯誤，而是deadband設計的結果；控制工程師要以可接受漏報幅度與反應時間評估。

若產品不支援PercentDeadband，不能用手算門檻後假裝已設定；改以AbsoluteDeadband或由產品能力決定替代方案，並在驗證欄標示限制。

本文序列、量程與門檻為離線案例。

參考：[OPC UA Part 4 §7.22.2 DataChangeFilter：deadband與比較值。](https://reference.opcfoundation.org/specs/OPC-10000-4/7.22.2)

參考：[OPC UA Part 4 §7.10 DataChangeTrigger：STATUS、STATUS_VALUE與時間觸發。](https://reference.opcfoundation.org/specs/OPC-10000-4/7.10)

參考：[OPC UA Part 8 Data Access：EURange與資料存取模型。](https://reference.opcfoundation.org/specs/OPC-10000-8/full)

## 延伸閱讀

- [OPC UA取樣發布間隔與通知佇列設計](/articles/opcua-subscription-sampling-publishing-queue-overflow)
- [OPC UA告警的確認恢復與狀態同步](/articles/opcua-event-condition-alarmcondition-ack-refresh)
