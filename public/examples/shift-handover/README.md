# 離線交班紀錄

Node.js 24.19+。將 model.mjs、fixtures.mjs、demo.mjs、self-test.mjs、practice.mjs 放同一資料夾。

```powershell
node demo.mjs
node self-test.mjs
node practice.mjs
```

demo 會在目前資料夾寫入/覆寫 `handover-report.json`，是可供檢查的教材輸出，不是正式交班資料庫。身份是fixture字串，沒有登入、授權、持久化交易或設備連線。

最多8項、16次成功操作；容量滿時拒絕且不刪歷史。每項必須有owner、dueAt、nextAction、evidence。期限使用Unix毫秒，來源snapshot最多60秒；Good並在新鮮期限內才可接班。Bad/Unknown/過期時明示待核對，不更改設備active/acked。附加note會保留舊操作並要求該項重新接受，expectedRevision過期即拒絕。

practice預設把H1 quality改成Bad，預期NEEDS_CLARIFICATION。改回Good預期ACCEPTED，但H2尚未接班，所以整張表仍AWAITING_ACCEPTANCE。
