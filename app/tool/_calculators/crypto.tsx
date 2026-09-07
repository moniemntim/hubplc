'use client';
import { useEffect, useState } from 'react';
import {
  cipherAlgorithms,
  type CipherAlgorithm,
  type CryptoDirection,
} from '@/lib/tools/crypto-options';
import { Choice } from '../_components/controls';
import { CryptoOutput } from '../_components/crypto-output';
import { useCryptoJob } from '../_components/use-crypto-job';

export default function CryptoTool() {
  const [algorithm, setAlgorithm] = useState<CipherAlgorithm>('aes-gcm');
  const [direction, setDirection] = useState<CryptoDirection>('encrypt');
  const [text, setText] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [drop, setDrop] = useState('192');
  const job = useCryptoJob();
  useEffect(() => {
    const wipe = () => {
      setText('');
      setPassword('');
      setConfirm('');
    };
    window.addEventListener('pagehide', wipe);
    return () => window.removeEventListener('pagehide', wipe);
  }, []);
  const modern = algorithm === 'aes-gcm';
  const matching = direction !== 'encrypt' || password === confirm;
  const disabled = job.busy || !text || !password || !matching;
  function clear() {
    job.invalidate();
    setText('');
    setPassword('');
    setConfirm('');
  }
  function run() {
    job.run({
      kind: 'cipher',
      algorithm,
      direction,
      text,
      password,
      drop: /^\d+$/.test(drop) ? Number(drop) : NaN,
    });
  }
  function reverse() {
    const value = job.result;
    if (value === null) return;
    job.invalidate();
    setText(value);
    setDirection(direction === 'encrypt' ? 'decrypt' : 'encrypt');
    setConfirm('');
  }
  return (
    <div className="crypto-tool">
      <p className="crypto-private">
        文字與密碼在瀏覽器內處理，不上傳、不寫入網址，也不儲存紀錄。
      </p>
      <div className="crypto-grid">
        <section className="crypto-inputs" aria-label="加解密設定">
          <div className="fields-grid">
            <Choice
              label="演算法／格式"
              value={algorithm}
              onChange={(value) => {
                job.invalidate();
                setAlgorithm(value as CipherAlgorithm);
              }}
              options={cipherAlgorithms}
            />
            <Choice
              label="操作"
              value={direction}
              onChange={(value) => {
                job.invalidate();
                setDirection(value as CryptoDirection);
                setConfirm('');
              }}
              options={[
                { value: 'encrypt', label: '加密文字' },
                { value: 'decrypt', label: '解密文字' },
              ]}
            />
          </div>
          <div className="crypto-format-note">
            {modern
              ? 'AES-GCM 會驗證密文是否遭修改，輸出 HPLC1. 開頭的 HubPLC 格式。'
              : '舊格式相容模式：使用 CryptoJS 密碼字串及 Salted__ Base64 格式，不是原始 HEX 金鑰。舊格式没有完整性驗證，無法可靠判斷所有錯誤密碼或篡改。'}
          </div>
          {!modern && (
            <p className="crypto-warning">
              僅供舊資料互通與測試，新資料建議使用 AES-GCM。AES／DES／TripleDES
              固定為 CBC＋PKCS7；請確認來源使用相同設定。
            </p>
          )}
          {algorithm === 'rc4drop' && (
            <div className="tool-field">
              <label htmlFor="crypto-drop">
                RC4Drop 丟棄字數（每字 4 bytes，0～4096）
              </label>
              <input
                id="crypto-drop"
                inputMode="numeric"
                value={drop}
                onChange={(event) => {
                  job.invalidate();
                  setDrop(event.target.value);
                }}
              />
            </div>
          )}
          <div className="tool-field">
            <label htmlFor="crypto-text">
              {direction === 'encrypt' ? '原文（UTF-8）' : '密文'}
            </label>
            <textarea
              id="crypto-text"
              value={text}
              onChange={(event) => {
                job.invalidate();
                setText(event.target.value);
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder={
                direction === 'encrypt'
                  ? '貼上要保護的文字…'
                  : modern
                    ? '貼上 HPLC1.…'
                    : '貼上 U2FsdGVkX1…'
              }
            />
          </div>
          <div className="tool-field">
            <label htmlFor="crypto-password">
              密碼（保留空白，區分大小寫）
            </label>
            <input
              id="crypto-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              value={password}
              onChange={(event) => {
                job.invalidate();
                setPassword(event.target.value);
              }}
            />
          </div>
          {direction === 'encrypt' && (
            <div className="tool-field">
              <label htmlFor="crypto-confirm">再次輸入密碼</label>
              <input
                id="crypto-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                value={confirm}
                onChange={(event) => {
                  job.invalidate();
                  setConfirm(event.target.value);
                }}
              />
              {confirm && !matching && (
                <output className="crypto-warning">兩次密碼不一致。</output>
              )}
            </div>
          )}
          <label className="crypto-check">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            顯示密碼
          </label>
          <div className="action-row">
            <button
              type="button"
              className="action"
              disabled={disabled}
              onClick={run}
            >
              {job.busy ? '處理中…' : direction === 'encrypt' ? '加密' : '解密'}
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
            <button type="button" className="action secondary" onClick={clear}>
              清空
            </button>
          </div>
          <output className="crypto-status" aria-live="polite">
            {job.status}
          </output>
        </section>
        <section className="crypto-result" aria-label="加解密結果">
          <p className="eyebrow">RESULT / 處理結果</p>
          <CryptoOutput
            value={job.result}
            name={direction === 'encrypt' ? 'encrypted' : 'decrypted'}
            onReuse={reverse}
          />
        </section>
      </div>
      <div className="tool-foot">
        <span>格式與使用說明</span>
        <div>
          <p>
            請妥善保管密碼；本站無法找回。原文上限 1 MiB（UTF-8），密碼上限
            1,024 bytes。原文與密碼不會自動修剪空白或正規化
            Unicode；貼上的密文可含排版用空白與換行。
          </p>
          <p>
            AES-GCM 使用 256 位元金鑰、PBKDF2-HMAC-SHA-256（600,000
            次）、每次全新 16-byte salt 與 12-byte IV，並包含 16-byte
            驗證標籤。相同原文與密碼每次加密也會產生不同密文。
          </p>
          <p>
            <code>HPLC1.</code> 後接 Base64(salt || IV || 密文 || tag)，以{' '}
            <code>HPLC1.</code>{' '}
            作為驗證附加資料。參數由版本固定，密碼不包含在密文中。此格式與
            CryptoJS／OpenSSL 密碼格式不同，解密時請選擇相符選項。
          </p>
          <p>
            舊格式使用 CryptoJS 4.2.0
            的密碼衍生慣例，僅支援本頁列出的預設模式。參考{' '}
            <a href="https://www.jyshare.com/crypto/">菜鳥加密工具</a>與{' '}
            <a href="https://github.com/brix/crypto-js">CryptoJS 文件</a>
            ；CryptoJS 已停止維護，僅用於相容功能。
          </p>
        </div>
      </div>
    </div>
  );
}
