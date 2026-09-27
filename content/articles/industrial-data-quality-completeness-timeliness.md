---
title: 工業資料品質的完整性即時性一致性與有效性
description: 以1440個日槽檢查完整性、即時性、一致性與有效性；1410個unique中20個invalid，10個late可與有效資料重疊，另有30筆duplicate，分母分開計算。
date: 2026-09-17
author: 茂伯
draft: false
---

## 先分開四種品質問題

資料品質檢查不能只報一個百分比。完整性問「應有的時間槽是否有資料」，即時性問「資料是否在期限前到達」，一致性問「同一欄位與跨來源規則是否一致」，有效性問「值是否符合型別、範圍與允許集合」。唯一性另計重複鍵，不能把duplicate直接從每個分母扣兩次。

本例一天應有1440個一分鐘slot。實際收到1410個unique鍵，其中20個invalid；另有10筆late；為了算出本例唯一答案，這10筆全部是valid。一般資料中late也可能與invalid重疊，需要交叉計數；還有30筆duplicate。先把唯一鍵與重複列分開，才能知道是缺槽、壞值、遲到還是重送。

Microsoft Purview公開資料品質說明把completeness、accuracy、consistency、reliability、timeliness與uniqueness分開呈現。本文以四個工程維度示範，不把該平台的報表分數當成所有系統的標準。

| 指標 | 分子 | 分母 | 案例結果 |
| --- | --- | --- | --- |
| slot存在率 | 1410 unique slot | 1440 expected | 97.92% |
| 有效覆蓋率 | 1390 valid unique | 1440 expected | 96.53% |
| 準時有效率 | 1380 valid on-time | 1440 expected | 95.83% |
| 重複率 | 30 duplicate rows | 1440 received rows | 2.08% |

計數流程可拆成四個階段：先依來源ID與slotKey去除完全相同的重送；再檢查schema與時間窗；接著套用量程、單位與狀態規則；最後才依late截止時間分組。每階段輸出筆數，便能解釋1410、20、10與30的關係，不會在單一SQL條件中重複排除。

## 把案例數字拆乾淨

1410個unique表示1410個不同slot鍵，不等於1410個都有效。扣除20個invalid後，有效unique為1390；本例lateValid=10，因此準時有效數為1380。這裡不能把late再從1390扣一次後又扣invalid，因為分類維度不是互斥集合。

30筆duplicate應保留原始事件供排查，但唯一性計算只將它們作為重複列。若一天共收到1440列，也不可直接由「1410 unique+30 duplicate」推導缺槽，因為收到列數不是槽位數；確認1410個唯一鍵都對應當日1440個應有槽後，才得到缺30槽。若混入窗外或額外設備的鍵，還要先排除。

有效性規則要寫成可執行條件，例如timestamp落在當日窗口、value可解析為數字、壓力介於0與10 bar(g)、status在允許集合、quality欄不是未知代碼。失敗列保留invalidReason與原值，不能刪掉後再宣稱資料完整。

| 集合 | 數量 | 是否可重疊 | 計算用途 |
| --- | --- | --- | --- |
| expected slot | 1440 | 基準 | 完整性分母 |
| unique key | 1410 | 與duplicate互斥 | 槽位存在 |
| invalid unique | 20 | 可與late重疊 | 有效性 |
| late valid | 10 | 與invalid互斥，本例全部late有效 | 即時性 |
| duplicate row | 30 | 獨立列集合 | 唯一性 |

完整性分母也可能不是固定1440。若設備在02:00至03:00停機且契約明定停機不要求資料，應先產生excludedSlots=60，再以1380 required slots計算完整性；停機不能在報表結尾才用備註解釋。expected slot的產生規則、停機證據與時區都要版本化，否則兩個團隊會對同一天算出不同分母。

對回補資料要區分原始到達日與資料所屬日。10筆late若屬昨天的slot，昨天的完整性可以在重算版提高，但昨天的on-time仍保持原先結果；今天收到晚到列不應偽裝成昨天準時到達。報表標示publishedAt、dataWindow與revision，避免使用者把修正版當初版。

## 即時性與一致性規則

即時性要先定義截止時間，例如sourceTimestamp後30秒內到達算on-time；late由receivedAt減sourceTimestamp超過門檻判定。若設備時鐘不準，不能只看主機收到時間，應保存sourceTimestamp、receivedAt、clockQuality與校時狀態。晚到資料可以補入歷史，但補入不會把原本的on-time統計改成即時到達。

一致性可檢查同一asset在同一slot是否有兩個互相衝突的值、單位是否固定、序號是否遞增，以及跨來源的設備ID是否可對應。若重送內容相同，可依idempotencyKey合併；若相同鍵payload不同，應標記Conflict，交由來源owner判定，不可任意採最後到達值。

資料品質結果要同時輸出事件級與日級。事件級保存每列valid、late、duplicate與reason；日級輸出slot存在率、有效覆蓋率、準時有效率與重複率。只發布日級96.53%而不留分子分母，後續無法知道是缺資料還是壞資料造成下降。

一致性檢查應在聚合前完成。若同一slot同時收到bar與kPa，先依單位契約轉換並保留reference；若同一序號出現兩個數值，不能以最後到達值掩蓋衝突。無法判定時將該slot標為Conflict，從有效覆蓋排除，但仍把它計入原始收到與衝突統計。

若資料品質失敗會影響控制或安全決策，品質結果應阻止下游自動動作，改送人工確認或安全預設。一般趨勢報表可顯示部分有效資料，但必須把缺槽、invalid與late標記在同一時間軸上；不可用平均值掩蓋資料沒有覆蓋的時段。

## 驗收 修復與限制

驗收可建立五組測試：完整的一天1440列；少一個slot；同slot重送30列；20列越界；10列晚到。逐組確認unique、invalid、late、duplicate計數，不把late補入當日準時率。再測同一鍵相同payload與不同payload，前者只產生一次有效業務事件，後者進Conflict佇列。

修復順序先修來源時鐘與schema，再處理無效值與重複鍵，最後才回補晚到資料。回補應建立revision或reprocessRunId，保留原先發布的日報與重算後版本；不能直接覆寫讓人誤以為當初就收到。任何修復都不應把原始資料刪掉。

本案例數字是離線設計：1440 expected、1410 unique、20 invalid、10 late、30 duplicate。實際系統的截止秒數、量程、唯一鍵與回補窗口必須由資料契約決定，不能因為計算式看似通用就宣稱已驗證某PLC或平台。

品質儀表板應提供趨勢而非只給紅綠燈。連續七日列出required、unique、valid、late、duplicate與conflict，能分辨網路延遲、來源量程錯誤或重送策略改變。門檻例如有效覆蓋率95%可以是本組織的發布條件，但不能寫成Microsoft或NIST規定；每個門檻都應有owner與處置流程。

對一天資料可建立可重算的核對式：required=1440、unique=1410、invalid=20、valid=1390、lateValid=10、onTimeValid=1380、duplicate=30。報表同時列出valid/required=96.53%與onTimeValid/required=95.83%，讀者就能看出晚到造成的差距，而不會把兩個百分比誤看成同一個品質分數。

唯一鍵要包含來源、設備、日期與slot，不能只用分鐘數。兩台設備都在00:05送資料時，若鍵只有00:05會被錯誤合併，造成unique下降或錯誤覆蓋。鍵規則改版時要保留舊鍵與mapping，重算報表才能說明品質指標為何改變。

若來源在同一slot提供多筆不同值，先依採樣序號與品質規則選定或標記Conflict，不能用平均值假裝它們是同一筆可靠觀測。

## FAQ與來源

日結束時另保存品質快照，包含計算時間、契約版本與門檻，隔日修正時仍可追查當時發布的分母、分子與處置決定。

每日快照也要保留計算版本與發布者。

再做交叉集合練習：維持late總數10，但其中4筆同時invalid，則lateValid只有6，onTimeValid＝1390−6＝1384，準時有效率1384÷1440約96.11%。若仍扣10而得到1380，就把無效且晚到的四筆重複扣了。這組是替代情境，不改動主案例10筆晚到都有效的設定。

FAQ1：late資料要從完整性扣掉嗎？若它有對應unique slot，仍算slot存在；它只影響即時性，不能重複扣除。

FAQ2：invalid資料算收到嗎？可算收到的原始列，但不算有效覆蓋；報表要分開列出兩個分子。

FAQ3：duplicate可以直接刪掉嗎？原始重複列應保留供稽核，業務聚合則依唯一鍵去重並留處理結果。

FAQ4：品質分數低於多少就算不合格？沒有跨工廠通用門檻，應由用途、風險與資料契約設定。

參考：[Microsoft Purview Data Quality health report：accuracy、completeness、consistency、reliability、timeliness與uniqueness等維度。](https://learn.microsoft.com/en-us/purview/data-quality-health-report)

參考：[Microsoft Purview資料治理入門：資料品質規則與完整性、及時性、唯一性概念。](https://learn.microsoft.com/en-us/purview/data-governance-get-started)

參考：[RFC 3339：網際網路日期時間格式，供來源時間戳與時區欄位設計參考。](https://www.rfc-editor.org/rfc/rfc3339)

## 延伸閱讀

- [不等距採樣資料的時間加權與前值保持](/articles/time-weighted-industrial-data-aggregation)
- [工業事件去重與重啟世代](/articles/industrial-event-dedup-generation)
