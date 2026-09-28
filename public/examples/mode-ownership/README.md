# 模式請求與維護退出教材

Node.js 24.19+。將 model.mjs、mode-demo.mjs、maintenance-demo.mjs、practice.mjs、maintenance-practice.mjs、self-test.mjs、README.md 放同一資料夾。

```powershell
node mode-demo.mjs
node maintenance-demo.mjs
node self-test.mjs
node practice.mjs
node maintenance-practice.mjs
```

這是同步記憶體狀態機，沒有輸出位元、PLC連線、身份平台或能源隔離功能。client名稱是測試資料，不是驗證身分；signals/scan由測試驅動器注入完整可信來源快照，不能直接當作HMI可自行填寫的控制條件。

允許路徑：Auto→Manual、Manual→Auto、Manual→Maintenance、Maintenance→Manual。Auto由PLC持有控制權；其他模式由該請求的HMI來源持有。只允許目前持有人離開Manual/Maintenance。相同ID與相同內容回REPLAY，改內容拒絕；最多16筆請求，包含拒絕項，滿後保留歷史且拒絕新ID。

請求受理後仍保留舊確認模式；scan檢查來源Good且age<1000ms、interlock、stopped、autoIdle、manualIdle。退出Maintenance另需testStopped和restoreReviewed；回Auto需sequenceReady。這些只是自訂案例條件，不證明設備安全。5秒截止先於成功條件，只有呼叫scan才推進流程；view不會自動完成或判逾時。

維護工作單WO-17的isolation標示not_verified_in_demo，功能測試not_executed。restoreReviewed是來源提供的復原摘要，不是模型自行驗證設定/能源。維護退出先回Manual，沒有生產啟動命令。

practice改completeAt 4999→5000會從CONFIRMED變TIMEOUT，改interlock=false在截止前會拒絕；maintenance-practice改restoreReviewed false→true，會從等待復原變成確認Manual。
