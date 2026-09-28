# Tick 與週期排程：離線教材

Node.js 22.13 以上，不需 npm 套件。以下八檔放同一資料夾：tick.mjs、scheduler.mjs、tick-demo.mjs、schedule-demo.mjs、tick-practice.mjs、schedule-practice.mjs、self-test.mjs、README.md。

```
node tick-demo.mjs
node schedule-demo.mjs
node self-test.mjs
node tick-practice.mjs
node schedule-practice.mjs
```

所有單位均為虛擬毫秒，一個 tick=1ms。bits 允許1..32。elapsed 的 gapBound 是外部提供的真實間隔上限；不能從兩個tick反推。boot也是fixture提供，不代表實作了重啟偵測。缺乏少於一圈的保證時回傳INVALID，而非把差值當零。

samples(times) 把已知虛擬時間表轉成有限位元的tick、啟動世代及相鄰間隔；它知道模擬真值，不能拿來證明實機上限。run使用相鄰合法差值建立從第一筆開始的累計時間軸；時基失效就停止模擬，不自動換起點。事件仍RUNNING表示缺乏後續完成觀察，不是實際設備仍運轉的證據。

phase：從0起每period一期；同次觀察有多個到期目標，空閒時只執行最新一期，舊期計COALESCED；忙碌時全部計BUSY missed。completion：觀察工作完成後，再等period，不建立被跳過的固定相位目標。每次掃描最多啟動一件，沒有補做迴圈。工作完成時間由注入duration決定，observedFinish是下次掃描看見完成的時刻。duration=0仍到下一個scan才觀察完成。

最多2000個scan、32種duration、32個事件，超出事件容量回傳EVENT_CAPACITY並停止。期長與duration範圍為整數ms 1..1e9與0..1e9。所有模型、結果與記錄僅存在記憶體；沒有PLC、原廠模擬器、實體I/O或非同步工作。別把start/finish當成設備測量。
