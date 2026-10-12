# 第三十七批：先在頁面判讀多人衝突與逾時草稿

日期：2026-10-12。本批重新閱讀並核對兩篇既有公開文章，公開範圍不變。`reviewed-local` 表示當前文字與固定模型在本機核對；本批沒有連接 HMI、PLC、登入服務或現場設備，也不是 AdSense 核准證據。

## 兩篇文章的讀者任務

- `hmi-concurrent-edit-last-writer-version`：在下載 Node 檔案前，讀者先用 B 的本機基準 500@v7、A 後來的權威設定 550@v8 與 B 草稿 520 判斷提交衝突。頁面列出保留草稿後明確新操作才形成 520@v9，並分開 raw÷10 的工程顯示、本機 SQLite 成功與未連接設備。與雙來源仲裁篇共用儲存模型，本篇負責編輯者看見的三份值及選擇。
- `hmi-session-timeout-unsent-draft`：頁面先判 S 的 95°C 未送草稿在 600000 ms 到期時 writes=0；T 的 92@v2 使舊版本草稿變衝突；S 明確提交 OP9 後再次到期，需查原 ID，得到 `APPLIED value=95 revision=3 writes=2`。數值、期限與計數均來自教材記憶體模型，不是現場登入或 PLC 計數。與 CAS 篇不同，這篇聚焦未送出與已送出操作的界線。

兩篇都在頁面內列出輸入來源與量測點、操作步驟、結果、常見錯誤及下一步；下載模型保留供進階重播。沒有將本機提交說成設備套用，也沒有將測試 session 延期說成真實身分驗證。

## 核對

- `node public/examples/cas-setting/hmi-demo.mjs`：conflict、rebase、520@v9、遺失回覆 unknown 與原 ID 查詢均與正文一致；`self-test.mjs` 通過。
- `node public/examples/authorization/draft-demo.mjs`：逾時未送、版本改變、OP9 查詢與 writes=2 均與正文一致；`draft-self-test.mjs` 通過。
- `node scripts/editorial-review-status.mjs`：117 reviewed-local、333 unreviewed、1 draft。後兩類不因本批而公開。

網站建置、正式部署及線上瀏覽器檢查另由本次發布流程驗證。Google 的審查結果仍須以 AdSense 網站詳情頁為準。
