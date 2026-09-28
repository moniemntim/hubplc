---
title: HMI 重連案例：丟棄舊回覆，保留未知命令，放開再按才送出
description: 下載 Node 離線重播，逐步檢查 generation、畫面 token、查詢 ID、unknown 命令與按鈕重新武裝；另以 EventEmitter 驗證十次掛載解除。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

重連後重新讀值，和重新送控制命令，是兩個不同決定。本案例先送出 OP1，收到 accepted 後斷線；重連時刷新畫面並查 OP1 結果。舊畫面回覆不得覆蓋新畫面，查不到 OP1 也不得推論它沒執行。最後查到 applied，仍須放開按鈕再按，才建立 OP2。

**驗證範圍：自訂 JavaScript 離線狀態模型，加上實際 Node EventEmitter 註冊／解除測試。** 沒有連接 HMI、PLC、瀏覽器或命令服務。日誌中的毫秒是輸入的事件處理時間，不是量測重連耗時；`commandSends` 是模型計數，沒有封包送往設備。

## 下載與執行

將以下兩檔存進同一個新資料夾，保留檔名。本機核對環境為 Node.js 24.19.0，不需安裝套件。

- [model.mjs：連線、畫面與命令狀態](/examples/hmi-reconnect/model.mjs)
- [demo.mjs：固定事件與結果斷言](/examples/hmi-reconnect/demo.mjs)

在該資料夾開啟終端機執行：

```powershell
node --version
node demo.mjs
```

程式立即印出 16 筆 JSON 事件，最後應為：

```text
PASS: 10 mount cycles, 10 callbacks, 0 remaining listeners
PASS: reconnect never resent OP1; OP2 required a fresh release and press
```

斷言失敗會以非零結束碼退出。第一行只代表這個 Node 訂閱包裝器通過十次掛載測試，不能當成你的 HMI 畫面已通過驗收。

## 先看懂固定起始條件

模型刻意從「已有一筆成功快照」開始：連線世代 `generation=12`、畫面 `viewToken=1`、值 `7`、資料版本 `revision=4`。這是教材輸入，不是程式從設備讀到的初值。`armed=false`，所以初始化時按鈕已按住，不會產生命令。

| 欄位                   | 本案例用途                           | 不能替代的證據                  |
| ---------------------- | ------------------------------------ | ------------------------------- |
| generation             | 連線失效時先遞增，拒絕舊連線回覆     | 設備端去重或身分驗證            |
| viewToken              | 元件卸載時遞增，拒絕上一個畫面的回覆 | 解除真實 UI listener            |
| queryId                | 同一連線、同一畫面的新查詢也有新 ID  | 資料來源的版本                  |
| revision               | 自訂為不倒退的資料版本               | 任意 PLC 計數器都不會重置的保證 |
| operationId            | 追蹤同一次命令的結果                 | 設備確實提供結果查詢的保證      |
| sourceTime／receivedAt | 分別保留來源時間與本地處理時間       | 兩台機器時鐘已同步的保證        |

模型不拿 `sourceTime` 和 `nowMs` 相減算網路延遲。它們可來自不同時鐘。移植時必須另行定義來源時間、版本重置及服務重啟規則。

## 對照一次重連的完整結果

`demo.mjs` 的 `step(nowMs, type, fields)` 依序送入事件；表中的時間是事件索引式的合成毫秒，沒有真的等待。

| nowMs  | 送入事件                   | 必須看到的結果                                           |
| ------ | -------------------------- | -------------------------------------------------------- |
| 0、1   | 按鈕先 false，再 true      | 建立 OP1，payload 是值 7／版本 4，sends=1                |
| 2      | OP1 回報 accepted          | 顯示處理中；accepted 不等於 applied                      |
| 3      | 發出畫面讀取               | 保存 generation 12 的舊查詢識別                          |
| 4      | disconnect                 | generation 變 13；保留值 7 但 stale=true；OP1 變 unknown |
| 5      | 按鈕仍 true                | button-blocked，sends 仍為 1                             |
| 6      | connect                    | 新建畫面查詢及 OP1 結果查詢，沒有重新送 OP1              |
| 7      | 舊查詢回覆值 99／版本 9    | stale-read-ignored；即使版本較大，也不准寫入畫面         |
| 8      | 新查詢回覆值 9／版本 5     | read-applied，stale=false；OP1 仍 unknown                |
| 9      | 按鈕 true                  | 因 OP1 未解決而被擋住                                    |
| 10     | OP1 查詢回報 not-found     | still-unknown；查不到不等於未執行                        |
| 11、12 | 再查 OP1，這次回報 applied | status-resolved；命令確認完成                            |
| 13     | 按鈕仍 true                | sends 仍為 1，恢復不會製造按下邊沿                       |
| 14、15 | 放開，再按下               | 建立 OP2，sends=2；payload 改為值 9／版本 5              |

查看 JSON 日誌的 `action`、`generation`、`value`、`stale`、`operation`、`status`、`sends`，可以分辨「讀值更新」和「命令結果更新」。新畫面值已更新，並不表示舊命令已完成。

## 三個識別要一起核對

畫面回覆只有在連線有效、元件仍掛載，而且 `generation + viewToken + queryId` 都符合目前查詢時才能套用。數值必須有限、revision 為不倒退的安全整數，來源時間也須是非負安全整數；格式不合仍保留舊值並維持 stale。

- 斷線使 generation 立即失效，阻止「尚未重連」期間的晚到回覆。
- 卸載使 viewToken 失效。命令控制器仍保留，不能隨畫面卸載把 unknown 忘掉。
- 再發一次畫面查詢就換 queryId。舊查詢即使屬於同一世代與畫面，也不能蓋過新查詢。

這個模型同時只保留一個畫面查詢；多面板產品應按查詢資源管理各自的識別與狀態，不能直接把這個單槽擴大解讀成全站查詢管理器。識別計數超過安全整數會拒絕，不實作繞回或跨程式重啟持久化。

## unknown 的解除條件與按鈕重新武裝

`sent` 或 `accepted` 命令遇到斷線，轉為 unknown。重連只建立結果查詢；`applied` 和 `rejected` 才能終結 unknown。`not-found` 或 `timeout` 保留 unknown，之後可明確再查，不能自動變成 rejected，也不會自動重播寫入。

結果回覆還要符合該次 `generation + queryId + operationId`，因此上一輪查詢的晚到結果不能解決新一輪查詢。本範例的 `timeout` 是外部送入的事件，**沒有實作結果查詢的計時器、自動輪詢或人工處理介面**。整合時必須補上查詢期限與操作員處理流程；設備不提供可信的命令歷史時，保留未知狀態。

新命令只在連線有效、畫面已刷新、沒有 sent／accepted／unknown 命令時開放。這些條件不成立時收到的按鈕事件，都會清除 armed；恢復後要再觀察一次放開，才接受下一次按下。禁止期間放開過，不代表恢復後直接把持續 true 當成新操作。

命令 payload 在送出時複製當時的值與版本；後續畫面更新不會改寫 OP1 的 payload。模型沒有登入、權限、服務端版本比較、持久 outbox 或設備去重功能；這些須由實際控制契約處理。[SQLite 冪等鍵案例](/articles/idempotency-key-duplicate-write)可用來理解服務端去重的另一層責任。

## 訂閱十次為什麼只收到十次事件

`buttonBinding()` 保存同一個 handler，重複 `mount()` 不重複註冊；`unmount()` 用相同 handler 呼叫 `off()`。示範每回合故意掛載兩次、emit 一次，再於 `finally` 解除。十回合應收到十次 callback，每回合解除後 listenerCount 都是 0。

這項測試使用真的 Node EventEmitter，但 callback 只增加計數，沒有送命令，也不是瀏覽器 click 或 HMI SDK 訂閱。實際畫面驗收要把相同原則接到產品的掛載／卸載與例外路徑，記錄服務端收到的 operationId，才能核對一次使用者意圖是否只建立一筆命令。

## 修改案例時如何判讀失敗

| 現象                      | 先查哪個欄位                   | 本案例應有的處理                  |
| ------------------------- | ------------------------------ | --------------------------------- |
| 舊值 99 蓋掉新畫面        | generation、viewToken、queryId | 三者先核對，再檢查資料版本        |
| 刷新完成就能再次操作      | command.status                 | unknown 未解決仍禁止送出          |
| not-found 後 OP1 又送一次 | sends、operationId             | sends 保持 1，保留 unknown        |
| 恢復時長按製造 OP2        | armed、pressed 事件順序        | 新的 false → true 才送出          |
| 進出畫面後 callback 倍增  | listenerCount、handler 身分    | 重複 mount 不增註冊，finally 解除 |

可先把 `demo.mjs` 的舊回覆值改為更大的數字，確認仍被丟棄；再把 nowMs=12 那一筆 OP1 查詢結果由 applied 改成 timeout，確認在沒有後續終結結果時不能送 OP2。後者會使原本「最後應有兩筆命令」的斷言失敗，代表事件條件已改變，應同步修改預期，不能只刪掉斷言讓程式通過。

來源：[Node.js EventEmitter 的 on、off 與 listenerCount](https://nodejs.org/download/release/v24.19.0/docs/api/events.html)支持訂閱 API 的用法；本文的 generation、unknown、按鈕政策是明列的教材契約，不是 Node 或任何 HMI 品牌的預設行為。

延伸：[晚到回覆與連線世代](/articles/sequence-reuse-late-response)、[上升沿與按鈕事件](/articles/plc-rising-falling-edge-button-event)。
