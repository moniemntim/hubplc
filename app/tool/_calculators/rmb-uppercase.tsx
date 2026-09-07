'use client';

import { useState } from 'react';
import { convertTwdUppercase } from '@/lib/tools/text-conversion';
import { CryptoOutput } from '../_components/crypto-output';

const example = '1001.05';

export default function RmbUppercaseCalculator() {
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
      setStatus('轉換完成。');
    } catch (error) {
      setResult(null);
      setStatus(error instanceof Error ? error.message : '轉換失敗。');
    }
  }

  return (
    <div className="crypto-tool">
      <p className="crypto-private">
        金額只在此瀏覽器頁面記憶體中處理，不上傳、不寫入網址，也不儲存紀錄。
      </p>
      <div className="crypto-grid">
        <section className="crypto-inputs" aria-label="新臺幣大寫金額輸入">
          <div className="tool-field">
            <label htmlFor="rmb-uppercase-input">新台幣金額（元）</label>
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
            範圍
            0～999999999999.99；只接受純十進位數字，小數最多兩位，不接受千分位逗號、負數或指數記法。
          </p>
          <div className="action-row">
            <button type="button" className="action" onClick={convert}>
              轉為大寫
            </button>
            <button
              type="button"
              className="action secondary"
              onClick={() => {
                invalidate();
                setAmount(example);
              }}
            >
              載入範例
            </button>
            <button
              type="button"
              className="action secondary"
              onClick={() => {
                invalidate();
                setAmount('');
              }}
            >
              清空
            </button>
          </div>
          <output className="crypto-status" aria-live="polite">
            {status}
          </output>
        </section>
        <section className="crypto-result" aria-label="新臺幣大寫金額結果">
          <p className="eyebrow">RESULT / 大寫金額</p>
          <CryptoOutput value={result} name="twd-uppercase" />
        </section>
      </div>
      <div className="tool-foot">
        <span>格式與使用說明</span>
        <div>
          <p>
            輸出採繁體中文金額大寫與「新臺幣」前綴，使用壹、貳、參、肆、伍、陸、柒、捌、玖及拾、佰、仟、萬、億；整數金額以「圓整」結尾。例如
            1001 元為「新臺幣壹仟零壹圓整」。
          </p>
          <p>
            保留最多兩位小數，以角、分表示；1001.05
            元為「新臺幣壹仟零壹圓零伍分」。小數不會四捨五入，超過兩位會直接拒絕。金額以字串與整數運算，避免浮點數誤差。本工具只轉換金額寫法，不進行匯率換算。
          </p>
        </div>
      </div>
    </div>
  );
}
