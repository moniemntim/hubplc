'use client';
import { useEffect, useState } from 'react';
import { hashAlgorithms, type HashAlgorithm } from '@/lib/tools/crypto-options';
import { toBase64 } from '@/lib/tools/crypto-bytes';
import { Choice } from '../_components/controls';
import { CryptoOutput } from '../_components/crypto-output';
import { useCryptoJob } from '../_components/use-crypto-job';

export default function HashTool() {
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('sha256');
  const [mode, setMode] = useState('hash');
  const [text, setText] = useState('');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [format, setFormat] = useState('hex');
  const job = useCryptoJob();
  useEffect(() => {
    const wipe = () => {
      setText('');
      setKey('');
    };
    window.addEventListener('pagehide', wipe);
    return () => window.removeEventListener('pagehide', wipe);
  }, []);
  const hmac = mode === 'hmac';
  const result =
    job.result === null
      ? null
      : format === 'hex'
        ? job.result
        : format === 'upper'
          ? job.result.toUpperCase()
          : toBase64(
              Uint8Array.from(job.result.match(/../g) ?? [], (value) =>
                parseInt(value, 16),
              ),
            );
  function clear() {
    job.invalidate();
    setText('');
    setKey('');
  }
  return (
    <div className="crypto-tool">
      <p className="crypto-private">
        雜湊是單向摘要，HMAC 是帶金鑰的訊息驗證碼，兩者都不能解密還原原文。
      </p>
      <div className="crypto-grid">
        <section className="crypto-inputs" aria-label="雜湊設定">
          <div className="fields-grid">
            <Choice
              label="計算類型"
              value={mode}
              onChange={(value) => {
                job.invalidate();
                setMode(value);
                setKey('');
              }}
              options={[
                { value: 'hash', label: '雜湊摘要' },
                { value: 'hmac', label: 'HMAC（帶金鑰）' },
              ]}
            />
            <Choice
              label="雜湊演算法"
              value={algorithm}
              onChange={(value) => {
                job.invalidate();
                setAlgorithm(value as HashAlgorithm);
              }}
              options={hashAlgorithms}
            />
          </div>
          <div className="tool-field">
            <label htmlFor="hash-text">原文（UTF-8，允許空字串）</label>
            <textarea
              id="hash-text"
              value={text}
              onChange={(event) => {
                job.invalidate();
                setText(event.target.value);
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder="abc"
            />
          </div>
          {hmac && (
            <>
              <div className="tool-field">
                <label htmlFor="hash-key">HMAC 金鑰（UTF-8 文字）</label>
                <input
                  id="hash-key"
                  type={showKey ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  value={key}
                  onChange={(event) => {
                    job.invalidate();
                    setKey(event.target.value);
                  }}
                />
              </div>
              <label className="crypto-check">
                <input
                  type="checkbox"
                  checked={showKey}
                  onChange={(event) => setShowKey(event.target.checked)}
                />
                顯示金鑰
              </label>
            </>
          )}
          <Choice
            label="輸出格式"
            value={format}
            onChange={setFormat}
            options={[
              { value: 'hex', label: 'HEX 小寫' },
              { value: 'upper', label: 'HEX 大寫' },
              { value: 'base64', label: 'Base64' },
            ]}
          />
          {['md5', 'sha1'].includes(algorithm) && (
            <p className="crypto-warning">
              MD5／SHA-1
              已有已知碰撞問題，只作舊系統相容或非安全用途；新用途請選擇 SHA-256
              等演算法。
            </p>
          )}
          <div className="action-row">
            <button
              type="button"
              className="action"
              disabled={job.busy || (hmac && !key)}
              onClick={() =>
                job.run({ kind: 'hash', algorithm, text, hmac, key })
              }
            >
              {job.busy ? '處理中…' : '計算摘要'}
            </button>
            {job.busy && (
              <button
                type="button"
                className="action secondary"
                onClick={job.invalidate}
              >
                取消處理
              </button>
            )}
            <button
              type="button"
              className="action secondary"
              onClick={() => {
                job.invalidate();
                setText('abc');
              }}
            >
              載入範例
            </button>
            <button type="button" className="action secondary" onClick={clear}>
              清空
            </button>
          </div>
          <output className="crypto-status" aria-live="polite">
            {job.status}
          </output>
        </section>
        <section className="crypto-result" aria-label="摘要結果">
          <p className="eyebrow">DIGEST / 摘要結果</p>
          <CryptoOutput value={result} name={hmac ? 'hmac' : 'hash'} />
        </section>
      </div>
      <div className="tool-foot">
        <span>算法與使用說明</span>
        <div>
          <p>
            原文上限 1 MiB，HMAC 金鑰上限 1,024 bytes，皆以 UTF-8
            編碼。空白、換行與大小寫都會影響結果；空字串亦有有效摘要。金鑰欄位輸入的是文字，不是
            HEX 位元組。
          </p>
          <p>
            HEX 大小寫只改變摘要的顯示方式；Base64 也是編碼，沒有加密保護。純
            SHA 或 MD5 不適合直接作為帳戶密碼儲存方式。HMAC
            的金鑰需要另外安全保存，不會包含在輸出中。
          </p>
          <p>
            所有運算在瀏覽器完成，不上傳、不儲存原文或金鑰。參考{' '}
            <a href="https://www.jyshare.com/crypto/">菜鳥加密工具</a>
            ，提供本頁所列雜湊演算法及對應 HMAC。SHA-3 是 FIPS 標準，與 CryptoJS
            的 SHA3（實際為 Keccak）不同；兩者均提供 224、256、384、512
            位元輸出。
          </p>
        </div>
      </div>
    </div>
  );
}
