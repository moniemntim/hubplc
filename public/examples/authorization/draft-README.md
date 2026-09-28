# 未送出草稿：離線教材

Node.js 22.13 或以上；六個附件放在同一資料夾：model.mjs、draft.mjs、draft-demo.mjs、draft-practice.mjs、draft-self-test.mjs、draft-README.md。

執行 `node draft-demo.mjs`、`node draft-self-test.mjs`、`node draft-practice.mjs`。

所有時間為可信測試程式注入的虛擬單調毫秒。S/T 是同一使用者的不同測試 session；renewFixtureSession 只延長 fixture，不實作身分驗證。reviewDraft 的輸入是本例 createDraft 及 authority.read 產生的資料；不是接收不可信 JSON 的通用安全驗證器。

草稿有效期 300000ms；session 600000ms，等號即過期。OTHER_USER_HIDDEN 是回傳投影，不是清除記憶體或儲存加密。sentOperationId 由呼叫端保留；有 ID 時必須查原操作，不自動重送。lookup 的 value 是請求值，只有 status=APPLIED 加上 appliedRevision 才是本模型的套用證據。最多 16 個操作及 64 筆 audit，滿時拒絕，不會自動淘汰。

本例無網路、密碼、PLC、持久儲存或真實登入畫面；writes 是記憶體模型計數。
