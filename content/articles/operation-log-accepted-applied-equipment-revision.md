---
title: 操作 log 怎麼判讀 accepted、applied 與設備版本
description: 以可下載的 operation-log-v1 離線事件鏈，從固定 seq、accepted、unknown 到關聯 readback 證據，判讀 OP-884 是否真的套用。
date: 2026-09-21
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 先看固定的 OP-884 資料契約

本例分析合成的 operation-log-v1 事件鏈，不連 PLC、不驗證帳號權限、不保存實際日誌，也不證明日誌耐久性。metadata 固定為 `operationId=OP-884`、`user=U17`、`equipment=EQ-A`、`tag=TEMP_SP`、`screen=Recipe`、單位 °C、畫面舊值 50、權威舊值 52、預期 revision 42、新要求值 55。權威值是 fixture 假設，不能當成真實設備讀值。metadata 的所有 own key 與值都必須符合這個固定契約，key 的插入順序不影響判讀；要改 metadata，必須同步修改模型與 fixture，而不是直接拿本例分析任意真實 production log。

事件必須有從 1 起連續的 `seq` 與四位年份、含毫秒的 ISO UTC `serverTime`（例如 `2026-09-28T00:00:01.000Z`），模型依 `seq` 判讀，絕不按時鐘重排。時間倒退會標示 warning，並不表示伺服器時鐘天然可信。事件上限是 12 筆和對「已傳入物件序列」序列化後的 4096 UTF-8 bytes，不是在配置物件前限制任意原始 log 檔。只接受 JSON 形資料；循環引用或 `BigInt` 會是 invalid。未知欄位一律拒絕，避免把 password、token 或其他敏感欄位寫進本例。這些是教材輸入限制，並非正式記錄服務的容量或安全保證。

## 下載並重跑判讀案例

把下列五個檔案放進同一個資料夾，以 Node.js 24.19.0 或更新版執行。沒有 npm 套件、網路或設備連線。

- [判讀模型](/examples/operation-log/model.mjs)
- [合成 fixture](/examples/operation-log/fixtures.mjs)
- [完整 self-test](/examples/operation-log/self-test.mjs)
- [逐案例 demo](/examples/operation-log/demo.mjs)
- [README](/examples/operation-log/README.md)

```powershell
node self-test.mjs
node demo.mjs
```

預期輸出清楚列出結果和原因：

```text
success: result=applied reason=correlated_readback_proof
acceptedOnly: result=accepted reason=accepted_not_applied
disconnectUnknown: result=unknown reason=disconnect_after_send
unknownResolved: result=applied reason=correlated_readback_proof
sameValueWrongOperation: result=unknown reason=readback_proof_incomplete_or_mismatched
revisionConflict: result=rejected reason=VERSION_CONFLICT observed=43 expected=42
malformedMissingProof: result=invalid reason=event_fields_invalid_or_sensitive
missingSequence: result=invalid reason=sequence_missing_duplicate_or_out_of_order
demo: PASS
```

## accepted 與 sent 都不是 applied

模型初始狀態就是 `pending`，所以可省略第一筆顯式 `pending` event；正常鏈可寫成 `pending → accepted → sent → readback`。accepted 只代表本例的服務端接受紀錄；sent 只代表已送出。斷線發生在 sent 後，結果是 unknown，不能重送 OP-884 來賭它尚未執行。應先查相同 operation ID 的結果，或依現場流程交由人工確認。

readback 只有同時符合 operation ID、equipment、tag、值 55、revisionBefore 42、revisionAfter 43 時才是 applied。這套完整來源關聯契約與 `revisionAfter = revisionBefore + 1` 都是本教材的定義，不是所有設備的版本規則。讀到同樣的 55 但 operation ID 或 target 不符，仍是 unknown；缺少版本欄位的 readback 是 invalid。事後讀到不同值也不是 rejected 的證據，模型保留 unknown。本例只實作服務接受後、尚未送設備前的 VERSION_CONFLICT 拒絕，其他拒絕原因不在此教材；例如 `VERSION_CONFLICT observed=43 expected=42`；observed 必須是安全、非負且不同於 expected 的整數。

這讓維護人員可以從已有 log 依序核對：先找 OP-884、看 accepted／sent 是否只停在中間狀態，再找完整關聯 readback，最後比 expected 和 observed revision。非法轉換、重複／缺少 seq 都是 invalid，模型不會從部分事件猜出成功。

## 時間與讀取限制

serverTime 要格式正確，倒退會得到 warning，方便人員發現時鐘或匯入順序問題；但因果仍由 seq 決定。模型不校時、不驗證伺服器來源，也沒有 hash chain、簽章或不可竄改保證。OWASP 對日誌提出事件、時間、使用者、結果及避免記錄敏感資料的建議；本例只採用其中可明示的欄位最小化概念，並不等同完整安全日誌系統。[OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

本例也不把「先讀 revision 再寫值」說成真實設備的原子比較寫入。若需要防止 TOCTOU，設備或權威服務必須提供相符的條件更新契約，再用實機與權限流程驗收。

## 發生 unknown 時下一步

unknown 不是失敗、也不是成功。保存 operation ID、最後 seq、最後 serverTime、equipment、tag 與目前證據，建立結果查詢或人工確認入口；不要直接把同一按鈕重送成新操作。HMI 重新連線、查詢重建與按鈕重新武裝可參考 [HMI 重連案例：丟棄舊回覆，保留未知命令，放開再按才送出](/articles/hmi-reconnect-stale-callback-unknown-write)。服務端用同一識別處理重送，則另看 [重送寫入如何用冪等鍵保護同一筆資料庫效果](/articles/idempotency-key-duplicate-write)。

## 延伸閱讀

- [HMI 重連案例：丟棄舊回覆，保留未知命令，放開再按才送出](/articles/hmi-reconnect-stale-callback-unknown-write)
- [重送寫入如何用冪等鍵保護同一筆資料庫效果](/articles/idempotency-key-duplicate-write)
