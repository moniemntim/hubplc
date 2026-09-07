'use client';
import { useEffect, useState } from 'react';
import type { KdfAlgorithm, KdfHash } from '@/lib/tools/crypto-options';
import { toBase64 } from '@/lib/tools/crypto-bytes';
import { Choice, NumberField, TextField } from '../_components/controls';
import { CryptoOutput } from '../_components/crypto-output';
import { useCryptoJob } from '../_components/use-crypto-job';

export default function KeyDerivation() {
  const [algorithm, setAlgorithm] = useState<KdfAlgorithm>('pbkdf2');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [salt, setSalt] = useState('');
  const [saltFormat, setSaltFormat] = useState<'text' | 'hex'>('hex');
  const [hash, setHash] = useState<KdfHash>('sha256');
  const [iterations, setIterations] = useState('600000');
  const [bits, setBits] = useState('256');
  const [format, setFormat] = useState('hex');
  const [error, setError] = useState('');
  const job = useCryptoJob();
  useEffect(() => {
    const wipe = () => {
      setPassword('');
      setSalt('');
    };
    window.addEventListener('pagehide', wipe);
    return () => window.removeEventListener('pagehide', wipe);
  }, []);
  function invalidate() {
    job.invalidate();
    setError('');
  }
  function change(set: (value: string) => void) {
    return (value: string) => {
      invalidate();
      set(value);
    };
  }
  function randomSalt() {
    invalidate();
    try {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      setSalt(
        Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
          '',
        ),
      );
      setSaltFormat('hex');
    } catch {
      setError('此瀏覽器無法產生安全亂數鹽值。');
    }
  }
  const result =
    job.result === null
      ? null
      : format === 'upper'
        ? job.result.toUpperCase()
        : format === 'base64'
          ? toBase64(
              Uint8Array.from(job.result.match(/../g) ?? [], (byte) =>
                parseInt(byte, 16),
              ),
            )
          : job.result;
  return (
    <div className="crypto-tool">
      <p className="crypto-private">
        從密碼與鹽值派生固定長度的密鑰。這是單向運算，不能解密還原密碼。
      </p>
      <div className="crypto-grid">
        <section className="crypto-inputs" aria-label="密鑰派生設定">
          <div className="fields-grid">
            <Choice
              label="派生算法"
              value={algorithm}
              onChange={(value) => {
                invalidate();
                setAlgorithm(value as KdfAlgorithm);
                setHash(value === 'pbkdf2' ? 'sha256' : 'md5');
                setIterations(value === 'pbkdf2' ? '600000' : '1');
              }}
              options={[
                { value: 'pbkdf2', label: 'PBKDF2' },
                { value: 'evpkdf', label: 'EvpKDF（舊格式相容）' },
              ]}
            />
            <Choice
              label="派生雜湊"
              value={hash}
              onChange={(value) => {
                invalidate();
                setHash(value as KdfHash);
              }}
              options={[
                ...(algorithm === 'evpkdf'
                  ? [{ value: 'md5', label: 'MD5（舊格式）' }]
                  : []),
                { value: 'sha1', label: 'SHA-1（相容用途）' },
                { value: 'sha256', label: 'SHA-256' },
                { value: 'sha384', label: 'SHA-384' },
                { value: 'sha512', label: 'SHA-512' },
              ]}
            />
          </div>
          <TextField
            label="密碼（UTF-8）"
            value={password}
            type={showPassword ? 'text' : 'password'}
            onChange={change(setPassword)}
          />
          <label className="crypto-check">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            顯示密碼
          </label>
          <Choice
            label="鹽值輸入格式"
            value={saltFormat}
            onChange={(value) => {
              invalidate();
              setSaltFormat(value as 'text' | 'hex');
              setSalt('');
            }}
            options={[
              { value: 'hex', label: 'HEX 位元組' },
              { value: 'text', label: 'UTF-8 文字' },
            ]}
          />
          <TextField
            label={saltFormat === 'hex' ? '鹽值（HEX）' : '鹽值（UTF-8）'}
            value={salt}
            onChange={change(setSalt)}
          />
          <button
            type="button"
            className="action secondary"
            onClick={randomSalt}
          >
            產生隨機鹽值（16 bytes）
          </button>
          <div className="fields-grid">
            <NumberField
              label="迭代次數"
              value={iterations}
              onChange={change(setIterations)}
            />
            <Choice
              label="派生密鑰長度"
              value={bits}
              onChange={change(setBits)}
              options={[128, 192, 256, 384, 512].map((length) => ({
                value: String(length),
                label: `${length} bits（${length / 8} bytes）`,
              }))}
            />
          </div>
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
          {algorithm === 'evpkdf' && (
            <p className="crypto-warning">
              EvpKDF 僅供 CryptoJS／舊 OpenSSL
              格式比對。MD5、單次迭代是舊格式預設，不適合新的密碼保護用途。
            </p>
          )}
          {algorithm === 'pbkdf2' && Number(iterations) < 600000 && (
            <p className="crypto-warning">
              目前迭代次數低於本工具預設，適合核對舊資料或測試向量。正式用途應依算法、設備及應用需求評估。
            </p>
          )}
          {!salt && (
            <p className="crypto-warning">
              目前鹽值為空，僅供相容測試。實際用途請使用每筆獨立的隨機鹽值，並連同派生參數保存。
            </p>
          )}
          <div className="action-row">
            <button
              type="button"
              className="action"
              disabled={job.busy || !password}
              onClick={() => {
                invalidate();
                if (!/^\d+$/.test(iterations)) {
                  setError('迭代次數必須是正整數。');
                  return;
                }
                job.run({
                  kind: 'kdf',
                  algorithm,
                  password,
                  salt,
                  saltFormat,
                  hash,
                  iterations: Number(iterations),
                  bits: Number(bits),
                });
              }}
            >
              {job.busy ? '派生中…' : '派生密鑰'}
            </button>
            {job.busy && (
              <button
                type="button"
                className="action secondary"
                onClick={invalidate}
              >
                取消處理
              </button>
            )}
            <button
              type="button"
              className="action secondary"
              onClick={() => {
                invalidate();
                setPassword('password');
                setSalt('salt');
                setSaltFormat('text');
                setAlgorithm('pbkdf2');
                setHash('sha256');
                setIterations('1');
                setBits('256');
              }}
            >
              載入範例
            </button>
            <button
              type="button"
              className="action secondary"
              onClick={() => {
                invalidate();
                setPassword('');
                setSalt('');
              }}
            >
              清空
            </button>
          </div>
          <output className="crypto-status" aria-live="polite">
            {error || job.status}
          </output>
        </section>
        <section className="crypto-result" aria-label="派生結果">
          <p className="eyebrow">DERIVED KEY / 派生密鑰</p>
          <CryptoOutput value={result} name="derived-key" />
        </section>
      </div>
      <div className="tool-foot">
        <span>算法與使用說明</span>
        <div>
          <p>
            PBKDF2 使用 HMAC，預設 SHA-256、600,000 次。EvpKDF
            使用指定雜湊反覆處理前一區塊、密碼與鹽值，預設 MD5、1
            次。參考工具及套件版本的預設可能不同，比對時請逐項指定相同參數。
          </p>
          <p>
            密碼與鹽值各限 1,024 bytes；密碼不得為空，空白與換行不會移除。HEX
            鹽值以兩位數代表一個 byte。PBKDF2 上限 2,000,000 次，EvpKDF 上限
            100,000 次；處理期間可取消。
          </p>
          <p>
            輸出只包含派生密鑰，不包含鹽值、算法、迭代次數或 IV。若要對照
            OpenSSL EVP_BytesToKey，鹽值通常為 8 bytes；本頁可接受其他長度以相容
            CryptoJS，不自動分割密鑰與 IV，也不能直接當作 HPLC1 密文。
          </p>
          <p>
            密碼與結果僅在瀏覽器內處理，不上傳或儲存。參考{' '}
            <a href="https://www.jyshare.com/crypto/">菜鳥加密工具</a> 與{' '}
            <a href="https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveBits">
              Web Crypto 文件
            </a>
            。
          </p>
        </div>
      </div>
    </div>
  );
}
