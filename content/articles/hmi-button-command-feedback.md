---
title: HMI 按鈕回饋：用原 commandId 查 Unknown，不把逾時當拒絕
description: 開啟單檔離線練習，逐步重播 OP17=55 的 Pressed、Accepted、Executing、Completed、Rejected 與 Unknown。
date: 2026-09-17
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 開啟固定命令演練

[開啟或另存單檔練習](/examples/button-feedback/demo.html)。它以 OP17、值55 的固定 snapshot 演示按鈕回饋，不連 PLC、HMI runtime、登入、網路、資料庫或持久化後端。按「送出 OP17=55」只會在瀏覽器建立教材 commandId，例如 CMD-OP17-01，沒有設備輸出。

本例的自訂狀態是 Pressed、Accepted、Executing、Completed、Rejected 和 Unknown。Pressed 只表示本頁建立 snapshot；Accepted 與 Executing 也不表示完成。只有 matched commandId 的 Completed 才能變成 Completed。明確 Rejected 顯示原因；timeout 沒有結論，必須是 Unknown。

畫面固定顯示 commandId、不可變 request snapshot、虛擬 tick、bounded history 和下一個預期事件。這些都是離線教材欄位，不能當成實機寫入、授權、持久化紀錄或後端 idempotency 的證據。

## 三個可重播情境

| 情境     | 逐步操作                                           | 預期狀態與文字                                     |
| -------- | -------------------------------------------------- | -------------------------------------------------- |
| 正常     | 按新的本機演練，選正常，送出後按三次「下一步」     | Pressed → Accepted → Executing → Completed         |
| 拒絕     | 按新的本機演練，選拒絕，送出後按一次「下一步」     | Rejected，原因 PRECONDITION_NOT_MET                |
| 回覆遺失 | 按新的本機演練，選回覆遺失，送出後按兩次「下一步」 | Accepted → Unknown；送出鈕鎖定，只能查原 commandId |

回覆遺失後，選「明確 Completed」或「明確 Rejected」，再按「查詢原 commandId」。這是手動注入的、可信且 matched commandId 的 lookup result，不是網路查詢；它是本例唯一允許 Unknown → Completed 或 Unknown → Rejected 的路徑。Completed 或 Rejected 進入 terminal 後，按「下一步」所造成的 late Accepted 只記為 TERMINAL_IGNORED，狀態不可回退。

按「新的本機演練」會清空此頁歷史並增加本機 session；下次送出才使用新的 local command number。此頁沒有非同步佇列，所以不會有背景回覆跨 session 套用。可在第二個本機命令按「測試：舊命令回覆」：它記錄 REJECTED_WRONG_ID，保持目前 Pressed，不能套成新命令的 Accepted。這是前端 ID 比對練習，不是跨瀏覽器或服務端競爭處理。

history 最多8筆。第8筆寫入後畫面會明寫「停止狀態推進直到新的本機演練」，並停止處理下一步、lookup 和舊回覆，直到 reset；它不是不可變 audit，也不能用它推論伺服器的完整歷史。

## 畫面判讀邊界

Unknown 時禁止新送，是為了避免把可能已執行、但回覆遺失的原命令和新命令混在一起；本例沒有重送或取消協定。現場若需要重送、認證、結果查詢、持久化、多人競爭、原子更新或設備 write，必須由實際服務與設備契約明訂，不能從這個單頁範例推導。

瀏覽器檢查會在320、768、1440px重播三條主路徑、Unknown 鎖定、原 ID lookup、terminal 不回退、舊 ID 拒絕、history 容量、頁面錯誤與橫向溢位。它不驗證實體操作、真正 server event、PLC完成、權限或可靠日誌。
