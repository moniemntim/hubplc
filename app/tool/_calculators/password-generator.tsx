'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, Eye, EyeOff, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  defaultPasswordOptions,
  generatePassword,
  passwordCharacters,
  validatePasswordOptions,
  type PasswordOptions,
} from '@/lib/tools/password-generator';
import { Choice } from '../_components/controls';

const modes = [
  { value: 'random', label: '隨機字元' },
  { value: 'words', label: '好記片語' },
  { value: 'pin', label: '數字 PIN' },
] as const;
const groupLabels = {
  uppercase: '大寫字母 A–Z',
  lowercase: '小寫字母 a–z',
  digits: '數字 0–9',
  symbols: '符號 !@#…',
} as const;

export default function PasswordGenerator() {
  const [options, setOptions] = useState<PasswordOptions>(
    defaultPasswordOptions,
  );
  const [length, setLength] = useState('20');
  const [password, setPassword] = useState('');
  const [hidden, setHidden] = useState(false);
  const [message, setMessage] = useState('按下「產生密碼」開始。');
  const [copying, setCopying] = useState(false);
  const revision = useRef(0);
  let validation = '';
  try {
    validatePasswordOptions(options);
  } catch (error) {
    validation = error instanceof Error ? error.message : '請檢查設定。';
  }
  function clear() {
    revision.current++;
    setPassword('');
    setCopying(false);
    setMessage('已清空頁面中的密碼。');
  }
  useEffect(() => {
    const invalidate = () => {
      revision.current++;
    };
    // Remove page state before it can be retained in the back/forward cache.
    const onPageHide = () => {
      revision.current++;
      setPassword('');
      setCopying(false);
      setMessage('請重新產生密碼。');
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      invalidate();
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);
  function update(next: PasswordOptions) {
    clear();
    setOptions(next);
    setMessage('設定已變更，請重新產生密碼。');
  }
  function changeLength(raw: string) {
    setLength(raw);
    const parsed = /^\d+$/.test(raw) ? Number(raw) : NaN;
    update(
      options.mode === 'words'
        ? { ...options, count: parsed }
        : { ...options, length: parsed },
    );
  }
  function changeMode(mode: PasswordOptions['mode']) {
    const next: PasswordOptions =
      mode === 'random'
        ? defaultPasswordOptions
        : mode === 'words'
          ? { mode, count: 6, separator: '-' }
          : { mode, length: 6 };
    setLength(mode === 'random' ? '20' : '6');
    update(next);
  }
  function generate() {
    clear();
    try {
      setPassword(generatePassword(options));
      setMessage('已產生新密碼。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '產生失敗，請重試。');
    }
  }
  async function copy() {
    const current = revision.current;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(password);
      if (current === revision.current) setMessage('已複製到剪貼簿。');
    } catch {
      if (current === revision.current)
        setMessage('無法存取剪貼簿，請顯示密碼後選取並手動複製。');
    } finally {
      if (current === revision.current) setCopying(false);
    }
  }
  const countLabel =
    options.mode === 'words'
      ? '單字數量'
      : options.mode === 'pin'
        ? 'PIN 長度'
        : '密碼長度';
  const max = options.mode === 'words' ? 10 : options.mode === 'pin' ? 32 : 128;
  return (
    <div className="password-tool">
      <div className="password-privacy">
        <ShieldCheck size={20} aria-hidden="true" />
        密碼只在這個瀏覽器內產生，不上傳、不儲存歷史紀錄。
      </div>
      <div className="password-grid">
        <section className="password-settings" aria-label="密碼設定">
          <Choice
            label="密碼類型"
            value={options.mode}
            onChange={(value) => changeMode(value as PasswordOptions['mode'])}
            options={modes}
          />
          <div className="password-length">
            <label htmlFor="password-length">
              {countLabel}
              <span>4～{max}</span>
            </label>
            <input
              id="password-length"
              inputMode="numeric"
              autoComplete="off"
              value={length}
              onChange={(event) => changeLength(event.target.value)}
              aria-invalid={!!validation}
              aria-describedby={validation ? 'password-validation' : undefined}
            />
          </div>
          <input
            className="password-range"
            type="range"
            aria-label={`${countLabel}滑桿`}
            min={4}
            max={max}
            step={1}
            value={
              /^\d+$/.test(length)
                ? Math.max(4, Math.min(max, Number(length)))
                : 4
            }
            onChange={(event) => changeLength(event.target.value)}
          />
          {options.mode === 'random' && (
            <>
              <fieldset className="password-choices">
                <legend>包含的字元</legend>
                {(Object.keys(groupLabels) as (keyof typeof groupLabels)[]).map(
                  (key) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={options[key]}
                        onChange={(event) =>
                          update({ ...options, [key]: event.target.checked })
                        }
                      />
                      {groupLabels[key]}
                    </label>
                  ),
                )}
              </fieldset>
              <label className="password-check">
                <input
                  type="checkbox"
                  checked={options.excludeSimilar}
                  onChange={(event) =>
                    update({ ...options, excludeSimilar: event.target.checked })
                  }
                />
                排除易混淆字元（I、l、1、O、0、o）
              </label>
              <p className="password-help">每種已勾選的字元至少出現一次。</p>
            </>
          )}
          {options.mode === 'words' && (
            <>
              <Choice
                label="分隔符號"
                value={options.separator}
                onChange={(value) =>
                  update({ ...options, separator: value as '-' | ' ' | '.' })
                }
                options={[
                  { value: '-', label: '連字號 −' },
                  { value: ' ', label: '空白' },
                  { value: '.', label: '句點 .' },
                ]}
              />
              <p className="password-help">
                從 1,296
                個英文單字中獨立抽選，可重複出現；部分單字本身含連字號。
              </p>
            </>
          )}
          {options.mode === 'pin' && (
            <p className="password-help">
              只使用 0–9，保留開頭的 0。短 PIN
              適合要求數字碼的系統，不建議作為一般帳戶密碼。
            </p>
          )}
          {validation && (
            <output id="password-validation" className="password-error">
              {validation}
            </output>
          )}
          <button
            type="button"
            className="action password-generate"
            disabled={!!validation}
            onClick={generate}
          >
            <RefreshCw size={18} aria-hidden="true" />
            {password ? '重新產生' : '產生密碼'}
          </button>
          <button
            type="button"
            className="password-reset"
            onClick={() => {
              setLength('20');
              update(defaultPasswordOptions);
            }}
          >
            恢復預設設定
          </button>
        </section>
        <section className="password-result" aria-label="產生結果">
          <p className="eyebrow">YOUR PASSWORD / 你的密碼</p>
          <div className="password-display">
            {password ? (
              hidden ? (
                <p className="password-masked" aria-label="密碼已隱藏">
                  ••••••••••••
                </p>
              ) : (
                <textarea
                  id="generated-password"
                  aria-label="產生的密碼"
                  aria-live="off"
                  readOnly
                  autoComplete="off"
                  spellCheck={false}
                  rows={Math.max(3, Math.ceil(password.length / 24))}
                  value={password}
                />
              )
            ) : (
              <p className="password-placeholder">準備一組全新的密碼</p>
            )}
          </div>
          <div className="password-meta">
            {password
              ? `${password.length} 個字元${options.mode === 'words' ? ` · ${options.count} 個單字` : ''}`
              : '不會在伺服器預先產生密碼'}
          </div>
          <div className="password-buttons">
            <button
              type="button"
              className="action"
              disabled={!password || copying}
              onClick={copy}
            >
              <Copy size={18} aria-hidden="true" />
              複製密碼
            </button>
            <button
              type="button"
              className="action secondary"
              disabled={!password}
              aria-pressed={hidden}
              onClick={() => setHidden(!hidden)}
            >
              {hidden ? (
                <Eye size={18} aria-hidden="true" />
              ) : (
                <EyeOff size={18} aria-hidden="true" />
              )}
              {hidden ? '顯示密碼' : '隱藏密碼'}
            </button>
            <button
              type="button"
              className="action secondary"
              disabled={!password}
              onClick={clear}
            >
              清空
            </button>
          </div>
          <output className="password-status" aria-live="polite">
            {message}
          </output>
          <p className="password-clipboard-note">
            只有按下複製才會寫入剪貼簿；清空頁面不會清除系統剪貼簿。
          </p>
        </section>
      </div>
      <div className="tool-foot">
        <span>產生方式與說明</span>
        <div>
          <p>
            使用瀏覽器 Web Crypto
            安全亂數，透過拒絕取樣避免選字偏差。隨機字元模式從符合勾選條件的組合中抽選；不固定數字或符號的位置。若安全亂數不可用，會停止產生。
          </p>
          <p>
            請為每個帳戶使用不同密碼，並依該網站允許的長度與符號設定。長度與隨機性不代表能保證帳戶安全，本工具不推估破解時間。
          </p>
          <p>
            可用符號：
            <code className="password-symbols">
              {passwordCharacters.symbols}
            </code>
            。
          </p>
          <p>
            功能參考{' '}
            <a href="https://1password.com/zh-tw/password-generator">
              1Password 密碼產生器
            </a>
            。片語字庫採用 Joseph Bonneau／Electronic Frontier Foundation 的{' '}
            <a href="https://www.eff.org/files/2016/09/08/eff_short_wordlist_1.txt">
              EFF Short Wordlist #1
            </a>
            （
            <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
            ），移除骰子索引後隨本站提供，單字未修改；產生時不連線查詢字庫。
          </p>
        </div>
      </div>
    </div>
  );
}
