---
title: HMI事件時間線：把警報、操作與備註放進可重建的證據窗口
description: 用固定六列離線資料重建事件時間線，保留來源時間、收取時間、重送收據與可追加的操作備註。
date: 2026-09-17
author: 茂伯
draft: false
---

## 可下載、固定的六列時間線

本頁的模型是離線 Node.js 教材，不是 HMI、PLC、歷史資料庫、時鐘同步或網路量測。將下列六個檔案下載到同一資料夾，使用 Node.js 24.19.0 或更新版本執行：

- [model.mjs](/examples/event-timeline/model.mjs)
- [fixture.json](/examples/event-timeline/fixture.json)
- [demo.mjs](/examples/event-timeline/demo.mjs)
- [self-test.mjs](/examples/event-timeline/self-test.mjs)
- [practice.mjs](/examples/event-timeline/practice.mjs)
- [README.md](/examples/event-timeline/README.md)

```powershell
node demo.mjs
node --test self-test.mjs
node practice.mjs
```

資料集固定窗口為 `2026-09-17T05:57:00.000Z` 到
`2026-09-17T06:00:00.000Z`，採 `[start,end)`：含起點、不含終點。它在
UTC+08 顯示為 13:57:00 到 14:00:00。固定輸出會有六列、八筆收據與一個
註記版本：

```text
rows=6 receipts=8 notes=1
windowed=PLC_A/TR2039,PLC_A/TR2041,PLC_A/TR2044,HMI_A/TR2048,PLC_A/TR2049
unlocated=HMI_NOTE/NOTE17-V1
observed_source_receive_difference_ms=520
```

每列有 `transitionId`、`sourceId`、`cycleId`、`sourceTime`、
`receiveTime`、`clockComparable`、`precision`、`kind`（`source`、
`command` 或 `note`）與 `actor`。`sourceTime` 是來源原值；模型不修正它。
`receiveTime` 來自收據，代表此模型收到資料的時間，不能換成現場發生時間。

`NOTE17-V1` 沒有 `sourceTime`，因此放到未定位區，不用收取時間硬塞進來源
時間窗口。這條規則也避免把事後寫下的操作備註，誤報為設備在該寫入時間發生。

## 重送、時間差與排序

`TR2041` 的固定轉換資料被重送兩次。它們使用相同的 `sourceId`、
`transitionId` 與不可變資料，只新增收據 `R07`、`R08`；主時間線仍是六列、
收據變成八筆。若同一鍵的固定資料改成不同 payload，模型回傳
`PAYLOAD_CONFLICT_REJECTED`，不會覆蓋已保存的事件或收據。

這份資料由外部時鐘檢核明示 `TR2041` 的來源與收取時間可比較，且精度為毫秒，所以可以計算
`05:57:12.920 - 05:57:12.400 = 520 ms`。欄名是「觀測來源至收取時間差」，不是
網路延遲；它沒有拆出時鐘偏差、排隊、傳輸或處理。`clockComparable=false` 的列
會保留原始時間並不產生這個差值，不能據此宣稱先後或因果。

有來源時間的列，依來源時間、kind、source ID、transition ID 形成固定總排序；
未定位列另排。`clockComparable=false` 的原始來源時間在這個展示排序中仍可見，但不代表
真實時間順序。匯出不加入執行當下的時間，所以同一 state 的 JSON 可完全重建。
窗口空白也不表示設備沒有動作：fixture 以固定 `coverage` metadata 明示
05:58:30–05:58:40 的 `SOURCE_CAPTURE_GAP`，而不是從「沒有列」推論缺測。

## 備註是追加版本，不改來源文字

`appendNote` 要求目標 `targetKey` 已存在、不是 note，並且與 note 同一
`cycleId`。note 有 `author`、`reason`、`createdAt`、`version`、`reference`
（模型欄位名為 `targetKey`）與文字。執行 `node practice.mjs` 會追加 NOTE17
版本 2，版本 1 保留；新版明示是交班補充，不冒稱為來源事件的發生時間。它也示範只把
TR2041 的 `clockComparable` 改為 `false`：原 `sourceTime` 保留、觀測差變成 null，
不修時鐘、更不宣稱事件先後或因果。

模型限制為 32 列事件、64 筆收據與八個 note versions。輸入必須是精確的 plain
object、有限長 ID 與完整 ISO UTC 時間；唯一例外是未知的 `sourceTime`，它只能是
`null`，並同時標記 `clockComparable=false` 與 `precision=unknown`。缺欄、額外欄、
無效時間與非法引用都會被拒絕。事件容量滿時設為 fault，其餘容量限制拒絕新增資料，既有資料不變。這些是
教材的資料邊界，不是平台的保留、驗證、認證、併發寫入、時鐘同步或因果分析實作。

## 延伸閱讀

- [HMI警報確認、清除與發生紀錄要分開](/articles/alarm-acknowledge-clear-occurrence)
- [警報嚴重度、時間與穩定排序](/articles/alarm-severity-time-stable-order)
