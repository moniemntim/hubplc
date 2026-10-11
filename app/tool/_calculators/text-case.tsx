'use client';

import { useMemo, useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
import {
  convertTextCase,
  MAX_TEXT_CASE_CODE_POINTS,
  textCaseModes,
  type TextCaseMode,
} from '@/lib/tools/text-conversion';
import { Choice } from '../_components/controls';
import { CryptoOutput } from '../_components/crypto-output';

const example = 'hello, WORLD!\nDON’T stop. 中文內容保持原樣。';

export default function TextCaseCalculator() {
  const { tr } = useToolLanguage();
  const [input, setInput] = useState(example);
  const [mode, setMode] = useState<TextCaseMode>('titlecase');
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const modeOptions = textCaseModes.map((item) => ({
    ...item,
    label: tr(
      item.label,
      {
        全部大寫: 'UPPERCASE',
        全部小寫: 'lowercase',
        英文標題式: 'English Title Case',
        句首大寫: 'Sentence case',
        切換大小寫: 'tOGGLE cASE',
      }[item.label] ?? item.label,
    ),
  }));
  const codePoints = useMemo(() => Array.from(input).length, [input]);
  const tooLong = codePoints > MAX_TEXT_CASE_CODE_POINTS;

  function invalidate() {
    setResult(null);
    setStatus('');
  }

  function convert() {
    try {
      setResult(convertTextCase(input, mode));
      setStatus(tr('轉換完成。', 'Conversion complete.'));
    } catch (error) {
      setResult(null);
      setStatus(
        error instanceof Error
          ? error.message
          : tr('轉換失敗。', 'Conversion failed.'),
      );
    }
  }

  return (
    <div className="crypto-tool">
      <p className="crypto-private">
        {tr(
          '文字只在此瀏覽器頁面記憶體中處理，不上傳、不寫入網址，也不儲存紀錄。',
          'Text is processed only in this browser page’s memory. It is not uploaded, written to the URL, or stored.',
        )}
      </p>
      <div className="crypto-grid">
        <section
          className="crypto-inputs"
          aria-label={tr('英文大小寫轉換輸入', 'English case conversion input')}
        >
          <Choice
            label={tr('轉換方式', 'Conversion mode')}
            value={mode}
            onChange={(value) => {
              invalidate();
              setMode(value as TextCaseMode);
            }}
            options={modeOptions}
          />
          <div className="tool-field">
            <label htmlFor="text-case-input">
              {tr('輸入文字', 'Input text')}
            </label>
            <textarea
              id="text-case-input"
              value={input}
              onChange={(event) => {
                invalidate();
                setInput(event.target.value);
              }}
              autoComplete="off"
              spellCheck={false}
              aria-describedby="text-case-help"
            />
          </div>
          <p id="text-case-help">
            {codePoints.toLocaleString()} /{' '}
            {MAX_TEXT_CASE_CODE_POINTS.toLocaleString()}{' '}
            {tr('個 Unicode 碼點', 'Unicode code points')}
            {tooLong ? tr('（超過上限）', ' (over limit)') : ''}
          </p>
          <div className="action-row">
            <button
              type="button"
              className="action"
              disabled={tooLong}
              onClick={convert}
            >
              {tr('轉換文字', 'Convert text')}
            </button>
            <button
              type="button"
              className="action secondary"
              onClick={() => {
                invalidate();
                setInput(example);
                setMode('titlecase');
              }}
            >
              {tr('載入範例', 'Load example')}
            </button>
            <button
              type="button"
              className="action secondary"
              onClick={() => {
                invalidate();
                setInput('');
              }}
            >
              {tr('清空', 'Clear')}
            </button>
          </div>
          <output className="crypto-status" aria-live="polite">
            {status}
          </output>
        </section>
        <section
          className="crypto-result"
          aria-label={tr(
            '英文大小寫轉換結果',
            'English case conversion result',
          )}
        >
          <p className="eyebrow">RESULT / {tr('轉換結果', 'RESULT')}</p>
          {result !== null && (
            <p className="crypto-result-size">
              {Array.from(result).length.toLocaleString()}{' '}
              {tr('個 Unicode 碼點', 'Unicode code points')}
            </p>
          )}
          <CryptoOutput value={result} name="text-case" />
        </section>
      </div>
      <div className="tool-foot">
        <span>{tr('格式與使用說明', 'Format and usage notes')}</span>
        <div>
          <p>
            {tr(
              '僅轉換 ASCII 英文字母 A–Z、a–z；中文、數字、emoji、標點、空白與換行都保持原樣。英文標題式以連續英文字母為一個字，字內的直引號或彎引號也視為同一字的一部分，因此 DON’T 會轉成 Don’t。',
              'Only ASCII English letters A–Z and a–z are converted; Chinese, numbers, emoji, punctuation, spaces, and line breaks remain unchanged. English title case treats consecutive English letters as one word, with straight or curly apostrophes part of that word, so DON’T becomes Don’t.',
            )}
          </p>
          <p>
            {tr(
              'Sentence case follows literal rules rather than interpreting meaning: the first English letter at the start, after each ',
              'Sentence case follows literal rules rather than interpreting meaning: the first English letter at the start, after each ',
            )}
            <code>.</code>、<code>!</code>、<code>?</code>{' '}
            {tr(
              '與每一行換行後遇到的第一個英文字母會大寫，其餘 ASCII 英文字母會小寫。像縮寫或網址中的句點也會被當成分界。',
              ', and after each line break is capitalized; remaining ASCII English letters are lowercased. Dots in abbreviations or URLs are also treated as boundaries.',
            )}
          </p>
          <p>
            {tr(
              '輸入上限為 100,000 個 Unicode 碼點；頁面上的計數以實際碼點計算，emoji 等代理對字元各算一個。每次修改文字或改變模式都會清除舊結果。',
              'The input limit is 100,000 Unicode code points. The page count uses actual code points, so surrogate-pair characters such as emoji count as one each. Editing text or changing mode clears the previous result.',
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
