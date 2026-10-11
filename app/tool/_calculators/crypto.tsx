'use client';
import { useEffect, useState } from 'react';
import {
  cipherAlgorithms,
  type CipherAlgorithm,
  type CryptoDirection,
} from '@/lib/tools/crypto-options';
import { Choice } from '../_components/controls';
import { useToolLanguage } from '@/components/tool-language';
import { CryptoOutput } from '../_components/crypto-output';
import { useCryptoJob } from '../_components/use-crypto-job';

export default function CryptoTool() {
  const { tr } = useToolLanguage();
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
        {tr(
          '文字與密碼在瀏覽器內處理，不上傳、不寫入網址，也不儲存紀錄。',
          'Text and passwords are processed in the browser only; they are not uploaded, written to the URL, or saved.',
        )}
      </p>
      <div className="crypto-grid">
        <section
          className="crypto-inputs"
          aria-label={tr('加解密設定', 'Encryption/decryption settings')}
        >
          <div className="fields-grid">
            <Choice
              label={tr('演算法／格式', 'Algorithm / format')}
              value={algorithm}
              onChange={(value) => {
                job.invalidate();
                setAlgorithm(value as CipherAlgorithm);
              }}
              options={cipherAlgorithms.map((item) => ({
                ...item,
                label: tr(
                  item.label,
                  item.value === 'aes-gcm'
                    ? 'AES-256-GCM (recommended)'
                    : item.value === 'aes'
                      ? 'AES-CBC (CryptoJS compatible)'
                      : `${item.label.split('（')[0]} (legacy format)`,
                ),
              }))}
            />
            <Choice
              label={tr('操作', 'Operation')}
              value={direction}
              onChange={(value) => {
                job.invalidate();
                setDirection(value as CryptoDirection);
                setConfirm('');
              }}
              options={[
                { value: 'encrypt', label: tr('加密文字', 'Encrypt text') },
                { value: 'decrypt', label: tr('解密文字', 'Decrypt text') },
              ]}
            />
          </div>
          <div className="crypto-format-note">
            {modern
              ? tr(
                  'AES-GCM 會驗證密文是否遭修改，輸出 HPLC1. 開頭的 HubPLC 格式。',
                  'AES-GCM verifies whether ciphertext was modified and outputs the HubPLC format beginning with HPLC1.',
                )
              : tr(
                  '舊格式相容模式：使用 CryptoJS 密碼字串及 Salted__ Base64 格式，不是原始 HEX 金鑰。舊格式沒有完整性驗證，無法可靠判斷所有錯誤密碼或篡改。',
                  'Legacy compatibility mode uses CryptoJS password strings and Salted__ Base64, not raw HEX keys. Legacy formats lack integrity verification and cannot reliably detect every wrong password or tampering.',
                )}
          </div>
          {!modern && (
            <p className="crypto-warning">
              {tr(
                '僅供舊資料互通與測試，新資料建議使用 AES-GCM。AES／DES／TripleDES 固定為 CBC＋PKCS7；請確認來源使用相同設定。',
                'For legacy interoperability and testing only; use AES-GCM for new data. AES/DES/TripleDES use CBC + PKCS7; confirm the source uses the same settings.',
              )}
            </p>
          )}
          {algorithm === 'rc4drop' && (
            <div className="tool-field">
              <label htmlFor="crypto-drop">
                {tr(
                  'RC4Drop 丟棄字數（每字 4 bytes，0～4096）',
                  'RC4Drop words to discard (4 bytes each, 0–4096)',
                )}
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
              {direction === 'encrypt'
                ? tr('原文（UTF-8）', 'Plaintext (UTF-8)')
                : tr('密文', 'Ciphertext')}
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
                  ? tr('貼上要保護的文字…', 'Paste text to protect…')
                  : modern
                    ? tr('貼上 HPLC1.…', 'Paste HPLC1.…')
                    : tr('貼上 U2FsdGVkX1…', 'Paste U2FsdGVkX1…')
              }
            />
          </div>
          <div className="tool-field">
            <label htmlFor="crypto-password">
              {tr(
                '密碼（保留空白，區分大小寫）',
                'Password (spaces preserved, case-sensitive)',
              )}
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
              <label htmlFor="crypto-confirm">
                {tr('再次輸入密碼', 'Re-enter password')}
              </label>
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
                <output className="crypto-warning">
                  {tr('兩次密碼不一致。', 'Passwords do not match.')}
                </output>
              )}
            </div>
          )}
          <label className="crypto-check">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            {tr('顯示密碼', 'Show password')}
          </label>
          <div className="action-row">
            <button
              type="button"
              className="action"
              disabled={disabled}
              onClick={run}
            >
              {job.busy
                ? tr('處理中…', 'Processing…')
                : direction === 'encrypt'
                  ? tr('加密', 'Encrypt')
                  : tr('解密', 'Decrypt')}
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
          aria-label={tr('加解密結果', 'Encryption/decryption result')}
        >
          <p className="eyebrow">
            RESULT / {tr('處理結果', 'PROCESSED RESULT')}
          </p>
          <CryptoOutput
            value={job.result}
            name={direction === 'encrypt' ? 'encrypted' : 'decrypted'}
            onReuse={reverse}
          />
        </section>
      </div>
      <div className="tool-foot">
        <span>{tr('格式與使用說明', 'Format and usage notes')}</span>
        <div>
          <p>
            {tr(
              '請妥善保管密碼；本站無法找回。原文上限 1 MiB（UTF-8），密碼上限 1,024 bytes。原文與密碼不會自動修剪空白或正規化 Unicode；貼上的密文可含排版用空白與換行。',
              'Keep your password safe; this site cannot recover it. Plaintext is limited to 1 MiB (UTF-8) and passwords to 1,024 bytes. Plaintext and passwords are not automatically trimmed or Unicode-normalized; pasted ciphertext may include formatting spaces and line breaks.',
            )}
          </p>
          <p>
            {tr(
              'AES-GCM 使用 256 位元金鑰、PBKDF2-HMAC-SHA-256（600,000 次）、每次全新 16-byte salt 與 12-byte IV，並包含 16-byte 驗證標籤。相同原文與密碼每次加密也會產生不同密文。',
              'AES-GCM uses a 256-bit key, PBKDF2-HMAC-SHA-256 (600,000 iterations), a fresh 16-byte salt and 12-byte IV every time, and a 16-byte authentication tag. The same plaintext and password produce different ciphertext each time.',
            )}
          </p>
          <p>
            <code>HPLC1.</code>
            {tr(
              '後接 Base64(salt || IV || 密文 || tag)，以',
              ' followed by Base64(salt || IV || ciphertext || tag), using',
            )}{' '}
            <code>HPLC1.</code>{' '}
            {tr(
              '作為驗證附加資料。參數由版本固定，密碼不包含在密文中。此格式與 CryptoJS／OpenSSL 密碼格式不同，解密時請選擇相符選項。',
              ' as authenticated additional data. Parameters are fixed by version and passwords are not included in ciphertext. This format differs from CryptoJS/OpenSSL password formats; select the matching option when decrypting.',
            )}
          </p>
          <p>
            {tr(
              '舊格式使用 CryptoJS 4.2.0 的密碼衍生慣例，僅支援本頁列出的預設模式。參考',
              'Legacy formats use CryptoJS 4.2.0 password-derivation conventions and support only the default modes listed here. References',
            )}{' '}
            <a href="https://www.jyshare.com/crypto/">
              {tr('菜鳥加密工具', 'Rookie encryption tools')}
            </a>
            {tr('與', ' and ')}
            <a href="https://github.com/brix/crypto-js">
              {tr('CryptoJS 文件', 'CryptoJS documentation')}
            </a>
            {tr(
              '；CryptoJS 已停止維護，僅用於相容功能。',
              '; CryptoJS is no longer maintained and is used only for compatibility.',
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
