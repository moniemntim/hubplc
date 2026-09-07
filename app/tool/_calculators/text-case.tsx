'use client';

import { useMemo, useState } from 'react';
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
  const [input, setInput] = useState(example);
  const [mode, setMode] = useState<TextCaseMode>('titlecase');
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const codePoints = useMemo(() => Array.from(input).length, [input]);
  const tooLong = codePoints > MAX_TEXT_CASE_CODE_POINTS;

  function invalidate() {
    setResult(null);
    setStatus('');
  }

  function convert() {
    try {
      setResult(convertTextCase(input, mode));
      setStatus('轉換完成。');
    } catch (error) {
      setResult(null);
      setStatus(error instanceof Error ? error.message : '轉換失敗。');
    }
  }

  return (
    <div className="crypto-tool">
      <p className="crypto-private">
        文字只在此瀏覽器頁面記憶體中處理，不上傳、不寫入網址，也不儲存紀錄。
      </p>
      <div className="crypto-grid">
        <section className="crypto-inputs" aria-label="英文大小寫轉換輸入">
          <Choice
            label="轉換方式"
            value={mode}
            onChange={(value) => {
              invalidate();
              setMode(value as TextCaseMode);
            }}
            options={textCaseModes}
          />
          <div className="tool-field">
            <label htmlFor="text-case-input">輸入文字</label>
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
            {MAX_TEXT_CASE_CODE_POINTS.toLocaleString()} 個 Unicode 碼點
            {tooLong ? '（超過上限）' : ''}
          </p>
          <div className="action-row">
            <button
              type="button"
              className="action"
              disabled={tooLong}
              onClick={convert}
            >
              轉換文字
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
              載入範例
            </button>
            <button
              type="button"
              className="action secondary"
              onClick={() => {
                invalidate();
                setInput('');
              }}
            >
              清空
            </button>
          </div>
          <output className="crypto-status" aria-live="polite">
            {status}
          </output>
        </section>
        <section className="crypto-result" aria-label="英文大小寫轉換結果">
          <p className="eyebrow">RESULT / 轉換結果</p>
          {result !== null && (
            <p className="crypto-result-size">
              {Array.from(result).length.toLocaleString()} 個 Unicode 碼點
            </p>
          )}
          <CryptoOutput value={result} name="text-case" />
        </section>
      </div>
      <div className="tool-foot">
        <span>格式與使用說明</span>
        <div>
          <p>
            僅轉換 ASCII 英文字母
            A–Z、a–z；中文、數字、emoji、標點、空白與換行都保持原樣。英文標題式以連續英文字母為一個字，字內的直引號或彎引號也視為同一字的一部分，因此
            DON’T 會轉成 Don’t。
          </p>
          <p>
            句首大寫採字面規則，不嘗試判斷語意：開頭、每個 <code>.</code>、
            <code>!</code>、<code>?</code>{' '}
            與每一行換行後遇到的第一個英文字母會大寫，其餘 ASCII
            英文字母會小寫。像縮寫或網址中的句點也會被當成分界。
          </p>
          <p>
            輸入上限為 100,000 個 Unicode
            碼點；頁面上的計數以實際碼點計算，emoji
            等代理對字元各算一個。每次修改文字或改變模式都會清除舊結果。
          </p>
        </div>
      </div>
    </div>
  );
}
