---
title: 通訊停止後：600 ms 心跳、2000 ms 資料年齡與重啟世代
description: 下載 Node.js 虛擬時鐘案例，重播 graceful 停止、外部 watchdog、lastGood 保留、epoch 重啟與資料新鮮度邊界。
date: 2026-09-21
author: 茂伯
draft: false
category: 工業通訊與網路
---

## 先下載重播固定時間線

這是 Node.js 24.19.0 的離線虛擬時鐘模型，沒有背景 timer、process monitor、網路、OPC UA stack、HMI、PLC 或設備寫入。將下列五個檔案放進同一資料夾：

- [model.mjs](/examples/data-quality/model.mjs)
- [demo.mjs](/examples/data-quality/demo.mjs)
- [self-test.mjs](/examples/data-quality/self-test.mjs)
- [README.md](/examples/data-quality/README.md)
- [practice.mjs](/examples/data-quality/practice.mjs)

```powershell
node self-test.mjs
node demo.mjs
```

`demo.mjs` 立即印出：

```text
initial state=RUNNING quality=GOOD value=23.4 last_good=23.4
without-external-tick quality=GOOD now=0
abrupt-at-600 state=WATCHDOG_EXPIRED quality=BAD reason=HEARTBEAT_EXPIRED last_good=23.4
graceful state=STOPPED quality=UNCERTAIN reason=GRACEFUL_STOP value=23.4 last_good=23.4
restart epoch=2 state=CONNECTED_WAITING_DATA quality=BAD
old-epoch=OLD_OR_UNEXPECTED_EPOCH quality=BAD
fresh-current-epoch state=RUNNING quality=GOOD value=24.1
receive-age-1999 quality=GOOD automatic=true
receive-age-2000 quality=BAD reason=RECEIVE_AGE_EXPIRED automatic=false last_good=23.4
data-quality demo: PASS
```

## 停止、品質與最後有效值是三件事

本例固定自訂 `connection`、`quality` 與 `reason`，不是 OPC UA `StatusCode` 實作。quality 只有 `GOOD`、`UNCERTAIN`、`BAD`；它們的理由例如 `GRACEFUL_STOP`、`HEARTBEAT_EXPIRED` 與 `RECEIVE_AGE_EXPIRED` 也都是教材 enum。

每份狀態保存 `value`、`lastGoodValue`、`lastGoodAtMs`、最後接收／來源時間與 clock ID、epoch 和 reason。故障時保留 value 與 lastGoodValue，絕不填入 0；0 可能本來就是有效製程值。畫面可顯示保留值，但應同時顯示 quality、reason、age 與 epoch，不能當成即時量測。

| 情境                      | connection             | quality   | value／lastGoodValue |
| ------------------------- | ---------------------- | --------- | -------------------- |
| 正常 current-epoch 新資料 | RUNNING                | GOOD      | 以新值更新           |
| graceful stop             | STOPPED                | UNCERTAIN | 保留                 |
| 外部監視器發現心跳停      | WATCHDOG_EXPIRED       | BAD       | 保留                 |
| 重啟、尚未收新資料        | CONNECTED_WAITING_DATA | BAD       | 保留舊值             |

## 600 ms 是外部 tick 的邊界

模型不會自行推進時間。最後心跳在 0 ms，若監視器完全沒有呼叫 `tick()`，狀態仍停在 now=0、GOOD；這不是服務仍健康的證據。外部監視器下一次以 now=600 呼叫 `tick()` 才會將心跳 age 視為過期，因為規則是 `age >= 600`。所有帶 `nowMs` 的事件都先做同一判斷，因此不能在600 ms剛好送 heartbeat 或資料來把已逾期的狀態偷偷續命；逾期後只有 `restart()` 才能開始新 epoch。

graceful stop 用 `gracefulStop()` 明確寫入 STOPPED／UNCERTAIN；它只代表本例已收到停止完成事件，沒有實作 drain 交易。abrupt stop 沒有收尾事件，只能等待某個外部執行的 `tick()` 以 WATCHDOG_EXPIRED／BAD 標記。兩條路徑的 lastGoodValue 都可同為23.4，卻有不同 reason，不能以一個 Bad 旗標取代事件原因。

## 2000 ms 資料年齡與來源新鮮度

`receiveAgeMs` 是 `nowMs - receivedAtMs`，只在 receive clock ID 等於 monitor clock ID 時計算。`sourceFreshnessMs` 是收件當刻的 transport age：`receivedAtMs - sourceAtMs`，只在 source clock ID 等於 receive clock ID 時計算。它不會因為現在時間推進而改變；會增加的是 `sourceAgeMs = nowMs - sourceAtMs`。三者是不同問題：剛收件不代表來源剛採樣。

receive age 和 total source age 都必須小於 2000 ms；1999 仍可 GOOD，**2000 剛好也失效**。clock ID 不同、來源時間晚於接收時間、或資料過期，都不會產生 GOOD；同一 epoch 的 source timestamp 也必須嚴格遞增，避免延遲或重送樣本刷新 age。持續收到 heartbeat 只證明服務還活著，不會把已經因資料年齡過期的 BAD 自動升回 GOOD。STOPPED 後外部仍可 tick 來更新畫面上 age，但會保留 STOPPED／GRACEFUL_STOP；沒有 tick 的 `inspect()` 只是最後事件時刻的快照。

`ordinaryAutomaticUse()` 只是普通資料使用閘門：RUNNING、GOOD，且 receive age 與 total source age 都 <2000 才回 true。拒絕舊 epoch 或其他不合格資料事件時，模型仍先更新既有樣本的 age，不能讓拒絕事件凍結舊值在 GOOD。它不實作安全控制、急停、PLC 互鎖、命令回覆遺失或自動重送；這些操作狀態可看[離線畫面案例](/articles/offline-hmi-non-operable-controls)與[HMI 重連、舊回覆與未知命令](/articles/hmi-reconnect-stale-callback-unknown-write)。

## 改時間重跑一次

執行 `node practice.mjs`，預設只觀察 599 ms，應印出：

```text
now=599 connection=RUNNING quality=GOOD receiveAge=599 sourceAge=599 lastGood=23.4
```

把檔案唯一的 `observeAtMs = 599` 改成 `600` 再跑，預期 connection=WATCHDOG_EXPIRED、quality=BAD、兩個 age=600，而 lastGood 仍是23.4。改成900則要到900 ms才觀察到故障，不會假装程式在600 ms已執行。這份練習沒有固定輸出斷言，修改後請逐欄核對；完整回歸測試仍由原始 self-test 執行。

所有 age 欄位都描述保留值的時間；不合格候選樣本不會把它自己的時間覆蓋上去。逾時後外部 tick 仍更新 age，graceful stop 也不能解除已鎖定的 watchdog，需明確 restart。

## 重啟後連線不等於新鮮

`restart()` 會將 epoch 加一，並回到 CONNECTED_WAITING_DATA／BAD。舊 epoch 資料回 `OLD_OR_UNEXPECTED_EPOCH`，不改為 GOOD；只有 current epoch、clock 可比較、來源與接收皆未過期的新資料，才會回 RUNNING／GOOD。

這是單程序的自訂教學模型，不證明時鐘同步、網路封包順序、任一設備的 native quality 欄位或重啟恢復。若實際接 OPC UA，應另保存原始 DataValue／StatusCode 與對應產品文件，不能將本例 enum 當成 OPC UA 標準碼。實機驗收還需測量真正的 heartbeat、時間來源、restart 行為及設備安全策略。
