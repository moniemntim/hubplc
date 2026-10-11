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
import { useToolLanguage } from '@/components/tool-language';

export default function PasswordGenerator() {
  const { tr } = useToolLanguage();
  const modes = [
    { value: 'random', label: tr('隨機字元', 'Random characters') },
    { value: 'words', label: tr('好記片語', 'Memorable passphrase') },
    { value: 'pin', label: tr('數字 PIN', 'Numeric PIN') },
  ] as const;
  const groupLabels = {
    uppercase: tr('大寫字母 A–Z', 'Uppercase A–Z'),
    lowercase: tr('小寫字母 a–z', 'Lowercase a–z'),
    digits: tr('數字 0–9', 'Digits 0–9'),
    symbols: tr('符號 !@#…', 'Symbols !@#…'),
  } as const;
  const [options, setOptions] = useState<PasswordOptions>(
    defaultPasswordOptions,
  );
  const [length, setLength] = useState('20');
  const [password, setPassword] = useState('');
  const [hidden, setHidden] = useState(false);
  const [message, setMessage] = useState(() =>
    tr('按下「產生密碼」開始。', 'Press “Generate password” to begin.'),
  );
  const [copying, setCopying] = useState(false);
  const revision = useRef(0);
  let validation = '';
  try {
    validatePasswordOptions(options);
  } catch (error) {
    validation =
      error instanceof Error
        ? tr(error.message, 'Invalid password settings.')
        : tr('請檢查設定。', 'Check the settings.');
  }
  function clear() {
    revision.current++;
    setPassword('');
    setCopying(false);
    setMessage(
      tr(
        '已清空頁面中的密碼。',
        'The password has been cleared from this page.',
      ),
    );
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
      setMessage(tr('請重新產生密碼。', 'Generate the password again.'));
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      invalidate();
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [tr]);
  function update(next: PasswordOptions) {
    clear();
    setOptions(next);
    setMessage(
      tr(
        '設定已變更，請重新產生密碼。',
        'Settings changed. Generate the password again.',
      ),
    );
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
      setMessage(tr('已產生新密碼。', 'A new password was generated.'));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? tr(error.message, 'Password generation failed. Try again.')
          : tr('產生失敗，請重試。', 'Generation failed. Try again.'),
      );
    }
  }
  async function copy() {
    const current = revision.current;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(password);
      if (current === revision.current)
        setMessage(tr('已複製到剪貼簿。', 'Copied to the clipboard.'));
    } catch {
      if (current === revision.current)
        setMessage(
          tr(
            '無法存取剪貼簿，請顯示密碼後選取並手動複製。',
            'Clipboard access is unavailable. Show the password, select it, and copy it manually.',
          ),
        );
    } finally {
      if (current === revision.current) setCopying(false);
    }
  }
  const countLabel =
    options.mode === 'words'
      ? tr('單字數量', 'Word count')
      : options.mode === 'pin'
        ? tr('PIN 長度', 'PIN length')
        : tr('密碼長度', 'Password length');
  const max = options.mode === 'words' ? 10 : options.mode === 'pin' ? 32 : 128;
  return (
    <div className="password-tool">
      <div className="password-privacy">
        <ShieldCheck size={20} aria-hidden="true" />
        {tr(
          '密碼只在這個瀏覽器內產生，不上傳、不儲存歷史紀錄。',
          'Passwords are generated only in this browser and are not uploaded or saved in history.',
        )}
      </div>
      <div className="password-grid">
        <section
          className="password-settings"
          aria-label={tr('密碼設定', 'Password settings')}
        >
          <Choice
            label={tr('密碼類型', 'Password type')}
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
            aria-label={tr(`${countLabel}滑桿`, `${countLabel} slider`)}
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
                <legend>{tr('包含的字元', 'Included characters')}</legend>
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
                {tr(
                  '排除易混淆字元（I、l、1、O、0、o）',
                  'Exclude ambiguous characters (I, l, 1, O, 0, o)',
                )}
              </label>
              <p className="password-help">
                {tr(
                  '每種已勾選的字元至少出現一次。',
                  'Each selected character group appears at least once.',
                )}
              </p>
            </>
          )}
          {options.mode === 'words' && (
            <>
              <Choice
                label={tr('分隔符號', 'Separator')}
                value={options.separator}
                onChange={(value) =>
                  update({ ...options, separator: value as '-' | ' ' | '.' })
                }
                options={[
                  { value: '-', label: tr('連字號 −', 'Hyphen −') },
                  { value: ' ', label: tr('空白', 'Space') },
                  { value: '.', label: tr('句點 .', 'Period .') },
                ]}
              />
              <p className="password-help">
                {tr(
                  '從 1,296 個英文單字中獨立抽選，可重複出現；部分單字本身含連字號。',
                  'Words are independently selected from 1,296 English words and may repeat; some words contain hyphens.',
                )}
              </p>
            </>
          )}
          {options.mode === 'pin' && (
            <p className="password-help">
              {tr(
                '只使用 0–9，保留開頭的 0。短 PIN 適合要求數字碼的系統，不建議作為一般帳戶密碼。',
                'Uses only 0–9 and preserves leading zeroes. A short PIN suits systems requiring a numeric code, but is not recommended as a general account password.',
              )}
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
            {password
              ? tr('重新產生', 'Generate again')
              : tr('產生密碼', 'Generate password')}
          </button>
          <button
            type="button"
            className="password-reset"
            onClick={() => {
              setLength('20');
              update(defaultPasswordOptions);
            }}
          >
            {tr('恢復預設設定', 'Restore defaults')}
          </button>
        </section>
        <section
          className="password-result"
          aria-label={tr('產生結果', 'Generated result')}
        >
          <p className="eyebrow">
            {tr('YOUR PASSWORD / 你的密碼', 'YOUR PASSWORD')}
          </p>
          <div className="password-display">
            {password ? (
              hidden ? (
                <p
                  className="password-masked"
                  aria-label={tr('密碼已隱藏', 'Password hidden')}
                >
                  ••••••••••••
                </p>
              ) : (
                <textarea
                  id="generated-password"
                  aria-label={tr('產生的密碼', 'Generated password')}
                  aria-live="off"
                  readOnly
                  autoComplete="off"
                  spellCheck={false}
                  rows={Math.max(3, Math.ceil(password.length / 24))}
                  value={password}
                />
              )
            ) : (
              <p className="password-placeholder">
                {tr('準備一組全新的密碼', 'Ready for a brand-new password')}
              </p>
            )}
          </div>
          <div className="password-meta">
            {password
              ? tr(
                  `${password.length} 個字元${options.mode === 'words' ? ` · ${options.count} 個單字` : ''}`,
                  `${password.length} characters${options.mode === 'words' ? ` · ${options.count} words` : ''}`,
                )
              : tr(
                  '不會在伺服器預先產生密碼',
                  'Passwords are never pre-generated on the server',
                )}
          </div>
          <div className="password-buttons">
            <button
              type="button"
              className="action"
              disabled={!password || copying}
              onClick={copy}
            >
              <Copy size={18} aria-hidden="true" />
              {tr('複製密碼', 'Copy password')}
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
              {hidden
                ? tr('顯示密碼', 'Show password')
                : tr('隱藏密碼', 'Hide password')}
            </button>
            <button
              type="button"
              className="action secondary"
              disabled={!password}
              onClick={clear}
            >
              {tr('清空', 'Clear')}
            </button>
          </div>
          <output className="password-status" aria-live="polite">
            {message}
          </output>
          <p className="password-clipboard-note">
            {tr(
              '只有按下複製才會寫入剪貼簿；清空頁面不會清除系統剪貼簿。',
              'Only pressing Copy writes to the clipboard; clearing this page does not clear the system clipboard.',
            )}
          </p>
        </section>
      </div>
      <div className="tool-foot">
        <span>{tr('產生方式與說明', 'Generation and usage notes')}</span>
        <div>
          <p>
            {tr(
              '使用瀏覽器 Web Crypto 安全亂數，透過拒絕取樣避免選字偏差。隨機字元模式從符合勾選條件的組合中抽選；不固定數字或符號的位置。若安全亂數不可用，會停止產生。',
              'Uses browser Web Crypto secure randomness and rejection sampling to avoid selection bias. Random-character mode draws from combinations matching the selected groups without fixing number or symbol positions. Generation stops if secure randomness is unavailable.',
            )}
          </p>
          <p>
            {tr(
              '請為每個帳戶使用不同密碼，並依該網站允許的長度與符號設定。長度與隨機性不代表能保證帳戶安全，本工具不推估破解時間。',
              'Use a different password for every account and follow each site’s length and symbol requirements. Length and randomness cannot guarantee account security; this tool does not estimate cracking time.',
            )}
          </p>
          <p>
            {tr('可用符號：', 'Available symbols:')}
            <code className="password-symbols">
              {passwordCharacters.symbols}
            </code>
            。
          </p>
          <p>
            {tr('功能參考', 'Based on')}{' '}
            <a href="https://1password.com/zh-tw/password-generator">
              {tr('1Password 密碼產生器', '1Password Password Generator')}
            </a>
            {tr(
              '。片語字庫採用 Joseph Bonneau／Electronic Frontier Foundation 的',
              '. The passphrase word list is Joseph Bonneau / Electronic Frontier Foundation’s ',
            )}
            <a href="https://www.eff.org/files/2016/09/08/eff_short_wordlist_1.txt">
              EFF Short Wordlist #1
            </a>
            （
            <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
            {tr(
              '），移除骰子索引後隨本站提供，單字未修改；產生時不連線查詢字庫。',
              '), supplied here with dice indexes removed and words unchanged; the word list is not queried online during generation.',
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
