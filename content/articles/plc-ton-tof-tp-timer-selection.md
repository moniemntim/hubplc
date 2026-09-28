---
title: TON、TOF、TP 怎麼選：先把兩秒 TON 做出來
description: 直接操作逐掃描 TON 模型，測試連續成立、提前放開與重新計時，再用時間線區分 TOF 和 TP。
date: 2026-09-28
author: 茂伯
draft: false
---

## 用輸出需求選計時器

| 你要的行為 | 選擇 | 輸出何時變 1 |
| --- | --- | --- |
| 訊號連續成立兩秒才允許 | TON，延時接通 | IN 維持 1 到設定時間後 |
| 訊號消失後再保持兩秒 | TOF，延時斷開 | IN=1 時即為 1；下降後延遲關閉 |
| 一次觸發產生兩秒脈衝 | TP，脈衝 | 上升緣開始即為 1 |

本篇以 CODESYS Standard 文件定義說明三者。**上方模型只實作固定 PT=2000 ms 的 TON**，不是 TOF／TP 模擬，也不是 CODESYS 執行環境。模型結果不能當成 PLC 計時精度或掃描時間的量測。

## 認清 IN、PT、Q、ET

| 名稱 | 意義 | 本例設定 |
| --- | --- | --- |
| IN | 計時條件，BOOL | 勾選為 1、取消為 0 |
| PT | 設定時間，TIME | 固定 2000 ms，不在執行中變更 |
| Q | 計時完成輸出，BOOL | 初始 0 |
| ET | 自本次 IN 上升起的經過時間 | 初始 0；本模型顯示上限 2000 ms |

第一次掃描在虛擬時間 0 ms，之後每次增加 100 ms。計時從第一次取樣到 IN=1 的掃描開始，不從滑鼠勾選的瞬間開始。

## 操作一：連續 ON，剛好到兩秒

1. 按「全部重設」，勾 IN，按一次「執行 1 掃描」。第 1 掃描、0 ms，ET=0、Q=0。
2. 按「執行 10 掃描」。第 11 掃描、1000 ms，ET=1000、Q=0。
3. 再按一次「執行 10 掃描」。第 21 掃描、2000 ms，ET=2000、Q=1。
4. 取消 IN 並掃描一次，ET=0、Q=0。

| 觀察時間 | IN | ET | Q |
| --- | --- | --- | --- |
| 0 ms，第一次看見 ON | 1 | 0 ms | 0 |
| 1000 ms | 1 | 1000 ms | 0 |
| 1900 ms | 1 | 1900 ms | 0 |
| 2000 ms | 1 | 2000 ms | 1 |
| 2100 ms，取消 IN 後掃描 | 0 | 0 ms | 0 |

這是從起點經過 2000 ms，不是沒有起點的「掃描二十次」。如果輸入只在兩次取樣之間短暫變化，模型不會看到。實機還須另外核對輸入更新、硬體濾波與任務週期。

## 操作二：ON 一秒就放開

重新開始，IN=1 掃描一次，再執行 10 掃描到 1000 ms。取消 IN 並掃描，時間 1100 ms、ET=0、Q=0。保持 OFF 執行 10 掃描，Q 仍為 0，不會在原定期限突然輸出。

再勾 IN 並掃描，ET 從 0 重新開始。先前的一秒不會累加；若需要累積 ON 時間，那是保持型計時需求，不能用本例 TON 代替。

## PLC 程式每次呼叫同一個實例

以下採 CODESYS Standard 的 TON 名稱與介面。先在 ST 程式宣告兩個 BOOL 及一個 TON 實例，再由週期任務執行。這是文件語法對照，本站未在 CODESYS 或目標 CPU 編譯／執行，沒有宣稱是可直接匯入的專案。

```iecst
VAR
    Condition : BOOL := FALSE;
    AllowRun  : BOOL := FALSE;
    DelayOn   : TON;
END_VAR

DelayOn(IN := Condition, PT := T#2s);
AllowRun := DelayOn.Q;
```

不要把整個 DelayOn 呼叫放在 `IF Condition THEN` 裡，導致 Condition=FALSE 時功能塊不再被呼叫。本例需要功能塊看到 IN=FALSE 才能重置。監看表至少放 Condition、DelayOn.ET、DelayOn.Q、AllowRun。

依據：[CODESYS Standard TON](https://content.helpme-codesys.com/en/libs/Standard/Current/Timer/TON.html)的型別、上升開始、下降重置規則。其他 PLC 的 T 裝置或時間基數不能只因名稱相似就照抄。

## TOF 和 TP：同一條輸入時間線，結果不同

以下依文件推導，**沒有在上方模型執行**。PT=2 s，初始 IN=0；t=0 上升、t=1 下降，之後維持 0：

| 時間 | IN | TON Q | TOF Q | TP Q |
| --- | --- | --- | --- | --- |
| 0 s，剛上升 | 1 | 0 | 1 | 1 |
| 1 s，已下降 | 0 | 0 | 1 | 1 |
| 2 s | 0 | 0 | 1 | 0 |
| 3 s | 0 | 0 | 0 | 0 |

TON 未連續滿兩秒，所以從未輸出；TOF 從 t=1 的下降開始等兩秒；TP 從 t=0 的上升開始輸出兩秒。這張表不能推論重觸發或執行中修改 PT 的規則。

依據：[CODESYS Standard TOF](https://content.helpme-codesys.com/en/libs/Standard/Current/Timer/TOF.html)、[CODESYS Standard TP](https://content.helpme-codesys.com/en/libs/Standard/Current/Timer/TP.html)。時間表是本篇範例；實機輸出還包含任務取樣與輸出更新。

## 結果不對時，先看這三項

| 故障 | 先觀察 | 下一步 |
| --- | --- | --- |
| Q 永遠不到 1 | IN 是否每次掃描都維持 1 | 查是否有一掃描掉訊號，使 ET 歸零 |
| IN 已 OFF，ET／Q 像卡住 | 同一 TON 是否仍被呼叫 | 查呼叫是否藏在條件分支，或監看了另一實例 |
| 約兩秒但每次略有差異 | 任務週期及實際輸入／輸出時間 | 區分邏輯門檻、取樣與實體反應，不用本模型估計實機誤差 |

完成後應能解釋：為什麼中途 OFF 不能接續前一次 ET，以及 TOF 和 TP 為何在同一條時間線上於不同時間關閉。若要把「超過兩秒還沒完成」視為故障，接著做[帶逾時的順序控制案例](/articles/plc-state-machine-three-step-sequence)。
