---
title: HMI載入狀態：用 epoch 拒絕舊回覆，分開 partial、empty、error 與 cancel
description: 單檔離線教材以固定 A/B 回覆驗證查詢身份、分頁快照、晚回覆拒絕與有界診斷。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 固定初始狀態與身份

下載 [demo.html](/examples/loading-states/demo.html) 後以 Edge 開啟。初始為「尚未查詢」、rows=0、diagnostic=0。每次「查 A」或「查 B」會建立新 `epoch + query + snapshotVersion`，清除畫面 rows，並保存該 query 最近一次的凍結身份；所以按鈕不假設 A 永遠 epoch 1 或 B 永遠 epoch 2。

| 回覆    | 分頁契約           | 預期                                            |
| ------- | ------------------ | ----------------------------------------------- |
| A、B    | 固定 2 頁          | 收到任一單頁都是 partial；兩頁都收到才 complete |
| EMPTY   | 固定 1 頁、零 rows | 成功 empty，不是假 error                        |
| UNKNOWN | rows 總數未知      | 只寫已收到 N 筆，不顯示百分比                   |

## 可重現的操作

1. 按「查 A」→「A 第1頁 partial」：顯示 A、`pages=1/2`、A-1。
2. 按「查 B」：epoch 增加、rows 清空。再按 B 第1頁，顯示 B partial。
3. 按「晚到 A 第2頁」：仍是 B，diagnostic 為 `STALE_REJECTED`。這是 A 舊身份，不是把畫面上的 B 偽裝成 A。
4. 按 B 第2頁：顯示 complete 與 B-1、B-2、B-3。接著按 exact duplicate，rows 不增；按 conflict，出現 `PAGE_CONFLICT_REJECTED`，已收頁不會覆寫。
5. 按成功 empty 後立刻按「取消後晚回覆」，或按固定 error 後立刻按同一鈕：它會使用目前身份，記錄 `TERMINAL_REJECTED`，不會把 empty/error 改成 partial。身份不相符的其他回覆則是 `STALE_REJECTED`。
6. 按查 B→取消目前查詢→取消後晚回覆：畫面保持 cancelled，晚回覆為 `STALE_REJECTED`。這只表示本畫面不再接受資料，未宣稱遠端工作已停止。
7. 按未知總數：只顯示「已收到 1 筆（總數未知）」。

重試練習：先完成 A/B 一輪，再重新按「查 A」與「查 B」，重複步驟 1–4。按鈕會使用最新凍結身份；不要手改 epoch 或把舊 rows 當作新 snapshot。這個例子不做通用 retry、fetch、遠端取消、後端快照或 PLC/HMI 平台保證。

rows 上限為 4；超出時記錄 `ROW_LIMIT_REJECTED` 並保留既有 rows。diagnostic 只有最近 16 筆，採 rolling 丟棄最舊項，不能作稽核紀錄。

本批以 Edge 驗證 A/B 晚回覆、partial/complete、terminal empty/error、cancel、duplicate/conflict、未知總數與 320/768/1440px。請將這些畫面 state 與設備命令、安全控制分開判讀；可搭配[事件時間線](/articles/hmi-event-timeline-alarm-operation-note)追溯資料身份。
