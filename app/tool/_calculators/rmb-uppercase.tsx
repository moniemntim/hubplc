'use client';

import { useState } from 'react';
import { convertTwdUppercase } from '@/lib/tools/text-conversion';
import { useToolLanguage } from '@/components/tool-language';
import { CryptoOutput } from '../_components/crypto-output';

const example = '1001.05';

export default function RmbUppercaseCalculator() {
  const { tr } = useToolLanguage();
  const [amount, setAmount] = useState(example);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  function invalidate() {
    setResult(null);
    setStatus('');
  }

  function convert() {
    try {
      setResult(convertTwdUppercase(amount));
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
          '金額只在此瀏覽器頁面記憶體中處理，不上傳、不寫入網址，也不儲存紀錄。',
          'Amounts are processed only in this browser page memory; they are not uploaded, written to the URL, or saved.',
        )}
      </p>
      <div className="crypto-grid">
        <section
          className="crypto-inputs"
          aria-label={tr('新臺幣大寫金額輸入', 'TWD uppercase amount input')}
        >
          <div className="tool-field">
            <label htmlFor="rmb-uppercase-input">
              {tr('新臺幣金額（元）', 'TWD amount')}
            </label>
            <input
              id="rmb-uppercase-input"
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                invalidate();
                setAmount(event.target.value);
              }}
              autoComplete="off"
              spellCheck={false}
              aria-describedby="rmb-uppercase-help"
            />
          </div>
          <p id="rmb-uppercase-help">
            {tr(
              '範圍 0～999999999999.99；只接受純十進位數字，小數最多兩位，不接受千分位逗號、負數或指數記法。',
              'Range 0–999999999999.99. Only plain decimal digits are accepted, with at most two decimal places; thousands separators, negatives, and exponent notation are not accepted.',
            )}
          </p>
          <div className="action-row">
            <button type="button" className="action" onClick={convert}>
              {tr('轉為大寫', 'Convert to uppercase')}
            </button>
            <button
              type="button"
              className="action secondary"
              onClick={() => {
                invalidate();
                setAmount(example);
              }}
            >
              {tr('載入範例', 'Load example')}
            </button>
            <button
              type="button"
              className="action secondary"
              onClick={() => {
                invalidate();
                setAmount('');
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
          aria-label={tr('新臺幣大寫金額結果', 'TWD uppercase amount result')}
        >
          <p className="eyebrow">
            RESULT / {tr('大寫金額', 'UPPERCASE AMOUNT')}
          </p>
          <CryptoOutput value={result} name="twd-uppercase" />
        </section>
      </div>
      <div className="tool-foot">
        <span>{tr('格式與使用說明', 'Format and usage notes')}</span>
        <div>
          <p>
            {tr(
              '輸出採繁體中文金額大寫與「新臺幣」前綴，使用壹、貳、參、肆、伍、陸、柒、捌、玖及拾、佰、仟、萬、億；整數金額以「圓整」結尾。例如 1001 元為「新臺幣壹仟零壹圓整」。',
              'Output uses Traditional Chinese financial numerals with the 「新臺幣」 prefix. It uses 壹、貳、參、肆、伍、陸、柒、捌、玖 and 拾、佰、仟、萬、億; whole amounts end in 「圓整」. For example, 1001 is 「新臺幣壹仟零壹圓整」.',
            )}
          </p>
          <p>
            {tr(
              '保留最多兩位小數，以角、分表示；1001.05 元為「新臺幣壹仟零壹圓零伍分」。小數不會四捨五入，超過兩位會直接拒絕。金額以字串與整數運算，避免浮點數誤差。本工具只轉換金額寫法，不進行匯率換算。',
              'Up to two decimal places are retained as 角 and 分; 1001.05 is 「新臺幣壹仟零壹圓零伍分」. Decimals are not rounded and more than two places are rejected. Amounts use strings and integer arithmetic to avoid floating-point errors. This tool changes amount notation only; it does not convert exchange rates.',
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
