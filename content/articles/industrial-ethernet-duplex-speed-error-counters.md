---
title: 乙太網路錯誤計數器怎麼看
description: 以15分鐘虛構counter快照計算FCS與discard增量、每秒速率及流量分母，分流FCS、CRC、pause、queue drop、duplex與應用timeout。
date: 2026-09-17
author: 站長
draft: false
---

## 先定義每個計數器

診斷交換器port時，先把連線協商、實體錯誤、佇列壅塞與應用逾時分開。speed是連線速率，duplex是收發方向模式，link flap是連線上下反覆變化；FCS或CRC通常表示收到的框架完整性檢查失敗，但欄位名稱與累計規則依設備MIB和手冊不同。discard可能是入口策略、出口壅塞或佇列滿，不能只看名稱下結論。

雙工與速率不可由一個總counter猜測。Gigabit Ethernet許多產品只支援全雙工或由自動協商決定，硬把一端改成half duplex可能造成協商失敗；是否可固定速率、是否支援pause、FEC或不同媒介，都要查型號文件。本文數字是計算範例，沒有連接交換器。

先保存port identity、介面狀態、協商結果、counter世代、採樣時間與流量基線。counter重開機或被clear後，總值可能變小；若不知道世代，就可能把清零誤認為網路改善。

若FCS與CRC是同一計數器的不同顯示名稱，報告只保留設備原文並註明映射依據；若兩欄同時存在，不能相加成總錯誤。對端的輸出錯誤與本端輸入FCS也要分開，因為錯誤可能在途中被丟棄而只在一端留下紀錄。

| 類別 | 常見欄位 | 可提出的問題 | 不可直接推論 |
| --- | --- | --- | --- |
| 協商 | speed、duplex、link | 兩端是否同意模式 | 不是應用可達 |
| 完整性 | FCS、CRC、alignment | 收到的frame是否損壞 | 不等於對端一定故障 |
| 流量 | octets、packets、pause | 是否有擁塞或流控 | 不是丟包證明 |
| 丟棄 | discard、queue drop | 哪個方向或佇列丟 | 不等於FCS錯 |

## 15分鐘counter差分與秒換算

假設同一port在14:00:00取得快照：FCS=120、discard=40、inOctets=8,400,000；15分鐘後14:15:00：FCS=150、discard=70、inOctets=98,400,000。計數增量分別為30、30、90,000,000。觀察時間900秒，所以FCS速率是30÷900=0.0333筆/秒，或2筆/分鐘；discard也是0.0333筆/秒。不要把累積值150除以15當成觀察期間速率。

若計數器在第二次快照變成FCS=5，先標記疑似reset或wrap，不可直接算5−120=-115並宣稱負速率。查uptime、counter reset time、設備重啟log及計數器位寬；確認世代後重新建立基線。若知道是32位wrap，應以模數重算，但仍要證明這是wrap而非clear。

| 欄位 | t0 | t1 | 增量 | 15分鐘速率 |
| --- | --- | --- | --- | --- |
| FCS | 120 | 150 | 30 | 0.0333/s |
| discard | 40 | 70 | 30 | 0.0333/s |
| inOctets | 8,400,000 | 98,400,000 | 90,000,000 | 100,000/s |

再加流量分母才能比較嚴重程度：FCS per million received frames需要packet counter；假設另有定義清楚、包含正常及錯誤接收框架的總數600,000 frames，30÷600,000×1,000,000=50 FCS errors/Mframe。若產品packet counter只含正常框架，須調整分母定義，不能直接套用。這是統計比率，不代表每一筆錯誤都來自同一條線。

差分前先核對採樣世代、位寬及可能最大增量。只有確定未重置且最多回繞一次時，才可用32位模數差值；current大於previous也不能排除已回繞一整圈。高速octet計數優先使用支援的64位欄位及較短採樣間隔，重置則另建基線。

duplex協商結果要保存本端與對端兩份。若一端顯示full、另一端顯示half，可能是手動設定、協商能力或媒介問題；此時應依型號文件修正，不能只把兩邊都改成full。變更後重取link、FCS、alignment與應用事件，確認沒有引入新的link flap。

秒換算必須使用兩個明確時間戳，不要假設採樣正好15分鐘。若t0=14:00:03、t1=14:15:21，差值918秒；30÷918=0.03268/s。監測系統時間回撥或跨時區時先修正時間基準，再計算。

## FCS CRC discard與pause分流

FCS/CRC錯誤通常指向frame在接收路徑被判定不完整，可能與線材、光模組、接頭、干擾、速率/雙工不匹配或對端傳送異常有關；不能只憑counter指定根因。RFC3635的dot3StatsAlignmentErrors專指長度不是完整octet且FCS失敗；dot3StatsFCSErrors有自己的長度排除條件。產品畫面的alignment或CRC是否映射到這些欄位，必須另查。

discard與FCS是不同證據。RFC2863的ifInDiscards是未偵測到阻止交付的錯誤卻被捨棄的封包；畫面中的discard是否包含ACL、VLAN或buffer丟棄要查產品，不能把所有政策丟棄都保證加進這一欄；queue drop尤其要看方向、佇列與瞬間流量。pause frame表示流控活動，不等於已丟包，也不代表交換器一定有錯。將每個欄位和設備手冊名稱逐項對照。

link flap時，要確認產品是否重置相關counter；link flap本身不必然建立新counter世代；若只看目前值，會把斷線期間的累積錯誤與現在狀態混在一起。應把port up/down時間、對端port、光模組告警與應用timeout放在同一時間軸。

| 症狀 | 優先交叉證據 | 合理下一步 |
| --- | --- | --- |
| FCS持續增加 | 本端/對端FCS、光功率、link flap | 查媒介與兩端物理路徑 |
| discard增加 | queue、出口利用率、ACL/VLAN | 確認方向與壅塞原因 |
| pause增加 | pause TX/RX、流量尖峰 | 查流控與接收端處理能力 |
| timeout但counter不變 | 應用log、TCP重傳、DNS | 分流到上層與路由 |

pause frame增加而queue drop沒有增加，可能表示流控抑制了傳送但尚未丟棄；pause與discard同時增加，則增加交叉線索，應查接收能力、出口速率與burst。這些只是診斷假設，不是任何廠牌的固定因果，仍要以資料表和封包時間驗證。

不要把沒有FCS錯誤解讀成沒有丟包；應用timeout可能來自服務忙碌、TCP重傳、路由或防火牆。反過來，FCS增加也不證明每次應用timeout都由它造成。

## Duplex 變更與時間交叉

速率或duplex變更前先保存兩端設定、協商狀態與回復條件。Gigabit介面是否可手動固定、是否需要兩端一致、產品是否只允許auto，要按型號手冊。不要為了消除警告就硬改一端；這可能讓鏈路down或形成更難查的協商狀態。

做離線變更計畫：先記錄14:00至14:15基線，單次只改一項，等待指定觀察窗，再取相同欄位與應用時間戳。若FCS沒有增加但discard上升，結論應是物理錯誤未在該窗觀察到，而不是宣稱問題已修復。

把應用timeout時間與counter增量對齊。例如14:05:10、14:07:44、14:11:02出現應用請求逾時，另以一分鐘採樣確認FCS只在14:00至14:01增加30後穩定，兩者時間不一致，應查服務、路由或重傳。若每次timeout前數秒都有FCS與link flap，才有較強關聯，仍需對端與封包證據。

應用timeout要記錄request開始、TCP重傳、回覆到達與服務錯誤。15分鐘counter差分只能說鏈路在觀察窗出現何種計數變化，不能把所有timeout平均分配給FCS。以時間戳重疊、對端counter和封包capture建立關聯強度。

診斷報告應列port、counter名稱原文、採樣世代、增量、速率、觀察窗、對端、應用事件與待查假設。不要把CRC、FCS、alignment在不同廠牌的同名欄位直接相加，也不要用一個總error數掩蓋方向與時間。

## FAQ 來源與驗證

FAQ1：FCS=150代表15分鐘有150個錯誤嗎？不一定，150是累積值；要用前後快照差值，本例增量是30。

FAQ2：discard增加就是CRC錯嗎？不是，discard可能由壅塞、ACL、VLAN或佇列策略造成，需看產品定義與方向。

FAQ3：counter變小可以算負速率嗎？不可以，先查reset、wrap與counter世代；有效差分不能是負數。

FAQ4：Gigabit有問題就把兩端固定全雙工嗎？不能泛用。依型號文件確認auto、手動速率與duplex支援，並設回復條件。

報告的單位要固定：errors/s、errors/min、errors per million frames與percent不可混用。若只知道octets而不知道frames，就不要假算FCS比例；可先報絕對增量與每秒增量，待packet counter補齊再算分母。觀察窗短於一次burst時也要標示取樣限制。

本文快照、流量、事件與速率都是離線手算。

參考：[RFC2863：ifInDiscards、64位計數器與ifCounterDiscontinuityTime。](https://www.rfc-editor.org/rfc/rfc2863.html)

參考：[RFC3635：Ethernet-like MIB的FCS及alignment定義。](https://www.rfc-editor.org/rfc/rfc3635.html)

## 延伸閱讀

- [Wireshark 判讀 Modbus TCP 與 OPC UA 從連線到應用回覆](/articles/wireshark-modbus-tcp-opc-ua-offline-packet-walkthrough)
- [VLAN與Trunk不通的排查順序](/articles/vlan-trunk-native-vlan-diagnosis)
