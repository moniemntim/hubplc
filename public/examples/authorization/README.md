# 共用授權決策教材

Node.js 24.19+；將七個檔案放同一資料夾：model.mjs、matrix-demo.mjs、downgrade-demo.mjs、practice.mjs、downgrade-practice.mjs、self-test.mjs、README.md。

```powershell
node matrix-demo.mjs
node downgrade-demo.mjs
node self-test.mjs
node practice.mjs
node downgrade-practice.mjs
```

矩陣：V/O/M可讀不可寫A；S/T為同一Supervisor的兩個工作階段，可提交A；所有人不可寫B。值為60～100整數，初始80/revision1。受理QUEUED不增加writes，execute成功才增加。時間是非負單調安全整數，session在600000ms到期（包含等號）。

降權：12→13 Viewer，舊畫面或已排隊操作仍查最新政策；恢復14 Supervisor不自動復活舊操作。即使派送前已恢復，同一排隊操作的policyRevision不符仍拒絕。只允許新操作意圖讀回目前revision後提交。

模型上限16操作、64稽核，滿後拒絕，不自動丟紀錄。相同ID/內容/工作階段回REPLAY；同ID不同內容拒絕。資料讀取與inspect回傳副本。

沒有網路、真正登入、密碼、權杖或PLC。session字元是測試資料，不是驗證身份；changeRole/setAvailable/setDeviceReady/inspect/execute供可信測試驅動器使用，不是可對外開放的API。稽核只有記憶體成功/拒絕決策，重啟不保留。正式授權、設備互鎖與跨系統交易需另行實作與驗證。
