'use client';
import { useEffect, useState } from 'react';
import { hashAlgorithms, type HashAlgorithm } from '@/lib/tools/crypto-options';
import { toBase64 } from '@/lib/tools/crypto-bytes';
import { Choice } from '../_components/controls';
import { CryptoOutput } from '../_components/crypto-output';
import { useCryptoJob } from '../_components/use-crypto-job';
import { useToolLanguage } from '@/components/tool-language';

export default function HashTool() {
  const { tr } = useToolLanguage();
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
        {tr(
          '雜湊是單向摘要，HMAC 是帶金鑰的訊息驗證碼，兩者都不能解密還原原文。',
          'A hash is a one-way digest and HMAC is a keyed message authentication code; neither can decrypt and recover the original text.',
        )}
      </p>
      <div className="crypto-grid">
        <section
          className="crypto-inputs"
          aria-label={tr('雜湊設定', 'Hash settings')}
        >
          <div className="fields-grid">
            <Choice
              label={tr('計算類型', 'Calculation type')}
              value={mode}
              onChange={(value) => {
                job.invalidate();
                setMode(value);
                setKey('');
              }}
              options={[
                { value: 'hash', label: tr('雜湊摘要', 'Hash digest') },
                { value: 'hmac', label: tr('HMAC（帶金鑰）', 'HMAC (keyed)') },
              ]}
            />
            <Choice
              label={tr('雜湊演算法', 'Hash algorithm')}
              value={algorithm}
              onChange={(value) => {
                job.invalidate();
                setAlgorithm(value as HashAlgorithm);
              }}
              options={hashAlgorithms}
            />
          </div>
          <div className="tool-field">
            <label htmlFor="hash-text">
              {tr(
                '原文（UTF-8，允許空字串）',
                'Text (UTF-8; empty string allowed)',
              )}
            </label>
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
                <label htmlFor="hash-key">
                  {tr('HMAC 金鑰（UTF-8 文字）', 'HMAC key (UTF-8 text)')}
                </label>
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
                {tr('顯示金鑰', 'Show key')}
              </label>
            </>
          )}
          <Choice
            label={tr('輸出格式', 'Output format')}
            value={format}
            onChange={setFormat}
            options={[
              { value: 'hex', label: tr('HEX 小寫', 'Lowercase HEX') },
              { value: 'upper', label: tr('HEX 大寫', 'Uppercase HEX') },
              { value: 'base64', label: 'Base64' },
            ]}
          />
          {['md5', 'sha1'].includes(algorithm) && (
            <p className="crypto-warning">
              {tr(
                'MD5／SHA-1 已有已知碰撞問題，只作舊系統相容或非安全用途；新用途請選擇 SHA-256 等演算法。',
                'MD5 and SHA-1 have known collision issues. Use them only for legacy compatibility or non-security uses; choose SHA-256 or another modern algorithm for new use.',
              )}
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
              {job.busy
                ? tr('處理中…', 'Processing…')
                : tr('計算摘要', 'Calculate digest')}
            </button>
            {job.busy && (
              <button
                type="button"
                className="action secondary"
                onClick={job.invalidate}
              >
                {tr('取消處理', 'Cancel')}
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
              {tr('載入範例', 'Load example')}
            </button>
            <button type="button" className="action secondary" onClick={clear}>
              {tr('清空', 'Clear')}
            </button>
          </div>
          <output className="crypto-status" aria-live="polite">
            {job.status}
          </output>
        </section>
        <section
          className="crypto-result"
          aria-label={tr('摘要結果', 'Digest result')}
        >
          <p className="eyebrow">{tr('DIGEST / 摘要結果', 'DIGEST')}</p>
          <CryptoOutput value={result} name={hmac ? 'hmac' : 'hash'} />
        </section>
      </div>
      <div className="tool-foot">
        <span>{tr('算法與使用說明', 'Algorithm and usage notes')}</span>
        <div>
          <p>
            {tr(
              '原文上限 1 MiB，HMAC 金鑰上限 1,024 bytes，皆以 UTF-8 編碼。空白、換行與大小寫都會影響結果；空字串亦有有效摘要。金鑰欄位輸入的是文字，不是 HEX 位元組。',
              'Text is limited to 1 MiB and HMAC keys to 1,024 bytes, both UTF-8 encoded. Whitespace, line breaks, and case affect the result; an empty string also has a valid digest. The key field accepts text, not HEX bytes.',
            )}
          </p>
          <p>
            {tr(
              'HEX 大小寫只改變摘要的顯示方式；Base64 也是編碼，沒有加密保護。純 SHA 或 MD5 不適合直接作為帳戶密碼儲存方式。HMAC 的金鑰需要另外安全保存，不會包含在輸出中。',
              'HEX casing changes display only; Base64 is encoding, not encryption. Plain SHA or MD5 is unsuitable for direct account-password storage. Store HMAC keys securely and separately; they are not included in output.',
            )}
          </p>
          <p>
            {tr(
              '所有運算在瀏覽器完成，不上傳、不儲存原文或金鑰。參考',
              'All operations run in the browser; text and keys are neither uploaded nor stored. Reference:',
            )}{' '}
            <a href="https://www.jyshare.com/crypto/">
              {tr('菜鳥加密工具', 'Rookie Encryption Tool')}
            </a>
            {tr(
              '，提供本頁所列雜湊演算法及對應 HMAC。SHA-3 是 FIPS 標準，與 CryptoJS 的 SHA3（實際為 Keccak）不同；兩者均提供 224、256、384、512 位元輸出。',
              ', which provides the hash algorithms and HMAC variants listed here. SHA-3 is a FIPS standard and differs from CryptoJS SHA3 (actually Keccak); both offer 224, 256, 384, and 512-bit output.',
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
