---
title: 多站輪詢如何隔離單站故障仍服務其他站
description: 用60ms正常三站與故障站500ms案例，設計單一outstanding、單站budget、隔離探測及late RTU frame處理。
date: 2026-09-21
author: 站長
draft: false
category: 工業通訊與網路
---

## 一 多站輪詢先分離服務與故障

多站串列輪詢的目標不是讓一條RS485線同時傳送，而是在單站故障或延遲時，讓其他站仍能依排程獲得服務。半雙工總線同一時間只能有一個合法傳送者；若把三站請求同時送出，回覆會互撞，無法用多執行緒把它變成真正並行。設計要把線路仲裁、每站budget、重試與隔離探測分開。

案例有站A、B、C，正常每站交易耗時20ms，D為可能故障站，單站超時budget500ms。每一輪先依順序A、B、C，再給D一次受控探測；D超時後移出一般排程，但仍需滿足後述接收隔離條件，才能恢復其他站傳送。正常三站可在60ms完成一輪，壞站若占滿budget，理想輪次約560ms；額外隔離等待必須另計，這是排程設計數字，不是協定保證。

每站保存station、request_id、send_time、response_time、frame_status、retry_count、quality與next_due。總線狀態只能有一個outstanding frame；當回覆未完成，其他站保持queued。若D稍後恢復，不要因一次成功就釋放全部積壓，先讓它以低頻率加入，再觀察連續成功。

先把時間拆成wire傳輸、站點等待與切換空檔。A、B、C各20毫秒時正常週期為60毫秒；D失聯且占滿500毫秒，簡化輪次上界為560毫秒。若D採原始請求加兩次重試，每次可占500毫秒，D最多1500毫秒，連同三站為1560毫秒；若500毫秒是所有attempt共用的D總budget，則不能再乘次數，規格必須寫清楚。

建立budget時同時寫站點預算與整輪預算：前者限制單一request等待，後者限制下一輪A開始前的最大間隔。超時記錄D失敗並保存本輪結果，不能把D舊值冒充新回覆。

| 項目 | 正常站A/B/C | 故障站D | 設計結果 |
| --- | --- | --- | --- |
| 單次budget | 20ms | 500ms | 每站獨立 |
| 一輪服務 | 20×3=60ms | 另加500ms | 其他站先完成 |
| 狀態 | Good | Timeout/Quarantined | 不互相覆寫 |
| 恢復 | 照排程 | 隔離探測 | 逐步加入 |

## 二 單站budget與隔離探測

每站要有自己的deadline與attempt上限，總線也要有輪次deadline。若A在t=0送出、t=20完成，B在t=20送出、t=40完成，C在t=40送出、t=60完成，D從t=60開始，t=560超時；下一輪不必等待D再次重試。若D的原始請求加兩次重試都各可等待500ms，D可能占1500ms，連同A、B、C的60ms，簡化上界為1560ms；若三次attempt共用單站500ms總budget，則上界仍只增加500ms。下一輪是否等待，要由輪次deadline決定。

隔離探測可設定為每10輪最多一次，只送一個讀取請求，禁止寫入；收到符合站號、功能碼、長度、CRC及時間關聯的回覆才考慮恢復。D在隔離期間仍顯示Unreachable，並保留最後成功時間與原因。探測也要受靜默與frame budget約束。

若某站回覆慢但有資料，不要把它誤判為線路衝突；保存byte數、首byte時間、完整frame時間、CRC與站號。若回覆站號錯、功能碼錯或CRC錯，整個frame交給錯誤處理，不要配給當前request，也不要立即假設目標站故障。

輪詢器不要用掃描次數假裝經過時間，應由單調時鐘取得deadline。假設t=0送A、t=20送B、t=40送C，t=60才開始D；若系統採固定slot，D在t=540收到合法回覆仍可等到t=560才結束，這是刻意保持週期的選擇；若採提前完成，完成frame並滿足quiet後即可進入下一站，不應把560宣稱為協定必然時間。若t=560仍無回覆，固定slot才在此刻寫入timeout；提前完成策略則在deadline到達時寫入timeout。這個時間線也能讓測試人員重算每個狀態的進入與離開時間。

當D的回覆在t=590才到，不能把它填入下一輪的A或B。接收層先驗證站號、功能碼、長度與CRC，再以預先定義的最大回覆期限與當時唯一未完成交易作關聯；找不到仍在有效期限內的交易就標記LateDiscard並保存原始時間。service_epoch與request_id只能作為本地稽核欄位，RTU線上沒有這些欄位，不能靠它們證明晚frame屬於哪次交易。quiet_until可防止正常frame黏接，但不能保證已逾期的舊frame未來不會到達，因此必須用有限回覆期限、隔離接收或重新同步策略提供可證明的邊界；若沒有已知最大期限，就不能宣稱完全隔離。

| 時間線 | 站 | 事件 | 狀態 |
| --- | --- | --- | --- |
| 0–20ms | A | 請求/回覆 | 完成 |
| 20–40ms | B | 請求/回覆 | 完成 |
| 40–60ms | C | 請求/回覆 | 完成 |
| 60–560ms | D | 探測至timeout | 隔離 |

## 三 RTU quiet與late frame

Modbus RTU不是收到任意幾個byte就能配對。V1.02描述frame間至少3.5個character time的靜默；接收途中若字元間沉默超過1.5個character time，frame應視為不完整。實際baud rate、字元格式與模組計時要依目標設備手冊核對。排程器必須等前一frame結束並完成inter-frame quiet，才可發下一站請求。

若D在budget到期後才送回RTU frame，不能把它配給下一站E。保存frame到達時間、預期station、request_id、epoch與CRC結果只是稽核；RTU原生沒有request_id，quiet也不能保證舊frame未來不來。若同站同功能且格式相同，沒有已核定最大回覆期限或隔離接收時，應標UnknownOutcome並交人工分析，不能宣稱已安全配對。

當timeout後重用總線，先完成接收狀態清理與quiet，再建立新epoch。若舊frame剛好落在新request之後，即使CRC正確，也不能只靠CRC接受；CRC只驗證內容完整，不驗證它屬於哪一次交易。因RTU沒有request_id，若同站同功能且資料格式相同，單靠站號、功能碼、長度和本地epoch可能無法消除歧義；必須用已核定的回覆時間上限、隔離接收或應用層序號，否則結果只能標UnknownOutcome。對寫入類請求尤其要保留UnknownOutcome，避免晚回覆造成重複動作。

串列總線只有一個共享媒介，所謂多站並行通常只是把解析、記錄或下一站排程並行化，不能讓兩台從同一對線同時發送。若要縮短輪詢時間，先減少不必要資料長度、固定合理baud與輪詢順序，再評估多個獨立port；不可用兩個執行緒同時寫同一port來冒充並行。

| 條件 | 觀察 | 處理 |
| --- | --- | --- |
| 超過1.5字元沉默 | frame中斷 | Incomplete，保存片段 |
| frame間不足3.5字元 | 邊界不明 | 依V1.02與模組手冊核對 |
| timeout後晚到 | CRC可正確 | LateDiscard，不配新request |
| 新站回覆 | 站號/功能碼匹配 | 才可交付 |

## 四 驗收與故障排查

離線驗收先用正常A/B/C建立60ms基準，再把D模擬成不回覆、延遲480ms、晚到RTU frame、CRC錯與錯站號。每個案例保存輪次、站、request_id、epoch、send/receive時間、frame長度、CRC與狀態。在回覆期限及隔離假設成立時，預期其他三站可恢復服務；晚回覆可能與下一站物理碰撞，僅檢查錯站號不足以消除碰撞。

全部站變慢時，先查單站budget是否鎖住總線、多層重試，以及是否等待應用queue而非wire response；只有D失敗時，查D電源、地址、鮑率、終端與回覆時間。E收到D內容時，查late frame隔離、quiet/interframe計時與回覆期限，不要先調大所有timeout。

正常結果是A/B/C的last_success持續更新，D有清楚的last_error和next_probe，總線同一時間只有一個outstanding。這是教學用排程模型，不是安全控制；實際站號、功能碼、串列模組buffer與錯誤旗標必須依設備手冊和工程軟體核對。

| 症狀 | 先查 | 預期修正 | 不可推論 |
| --- | --- | --- | --- |
| 全站飢餓 | 重試/總線鎖 | 單站budget | 線路必壞 |
| D獨壞 | 供電/參數/回覆 | 隔離探測 | 立即刪站 |
| E收到D frame | epoch/quiet | LateDiscard | CRC正確即接受 |
| 回覆慢 | 首byte/完整時間 | 調整站級政策 | 固定加大全線timeout |

## 五 FAQ與官方來源

在適用的鮑率與字元格式下，Modbus RTU的t1.5與t3.5要依V1.02計算；規格對高於19200 baud的情況給出固定建議值t1.5=750微秒、t3.5=1.75毫秒，但仍須核對目標模組手冊與實際驅動器計時。20ms交易budget也必須包含request、wire bytes、回覆、靜默與調度餘量，不能把它當成純設備處理時間。可用一張故障矩陣驗證隔離策略：無回覆只消耗站點budget；CRC錯誤表示收到了但內容不可用，不能直接當成無回覆；錯站號即使CRC正確也必須丟棄；超時後才到的合法frame屬LateDiscard。四種結果的重試間隔、品質標記和事件代碼應分開，否則維修人員無法判斷是線路斷開、干擾、接錯設備，還是舊frame污染。

FAQ1：RS485可以多站同時傳送嗎？答：不能；同一半雙工總線同時只允許一個合法傳送者。

FAQ2：D超時要立刻重試三次嗎？答：不要讓單站重試阻塞其他站，使用budget與隔離探測。

FAQ3：CRC正確的晚到frame能交給下一站嗎？答：不能；須核對期限、站號、功能碼與quiet邊界。

FAQ4：500ms是Modbus標準timeout嗎？答：不是；是本文案例的單站budget。

參考：[Modbus Organization：Serial Line V1.02，RTU frame、1.5/3.5 character time與錯誤frame處理。](https://www.modbus.org/file/secure/modbusoverserial.pdf)

參考：[Modbus Application Protocol V1.1b3：功能碼與PDU定義；不含本文排程budget。](https://www.modbus.org/file/secure/modbusprotocolspecification.pdf)

## 延伸閱讀

- [封包時間戳如何量測往返時間而不混用設備時鐘](/articles/round-trip-time-clock-domain-packet-timestamps)
- [通訊服務停止後怎麼保持資料品質與時間可信](/articles/communication-stop-data-quality-watchdog)
