'use client';

import { useState } from 'react';
import {
  convertRmbUppercase,
  rmbStyles,
  type RmbStyle,
} from '@/lib/tools/text-conversion';
import { Choice } from '../_components/controls';
import { CryptoOutput } from '../_components/crypto-output';

const example = '1001.05';

export default function RmbUppercaseCalculator() {
  const [amount, setAmount] = useState(example);
  const [style, setStyle] = useState<RmbStyle>('simplified');
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  function invalidate() {
    setResult(null);
    setStatus('');
  }

  function convert() {
    try {
      setResult(convertRmbUppercase(amount, { style }));
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
        <section className="crypto-inputs" aria-label="人民幣大寫金額輸入">
          <Choice
            label="字形"
            value={style}
            onChange={(value) => {
              invalidate();
              setStyle(value as RmbStyle);
            }}
            options={rmbStyles}
          />
          <div className="tool-field">
            <label htmlFor="rmb-uppercase-input">人民幣金額（元）</label>
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
                setStyle('simplified');
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
        <section className="crypto-result" aria-label="人民幣大寫金額結果">
          <p className="eyebrow">RESULT / 大寫金額</p>
          <CryptoOutput value={result} name="rmb-uppercase" />
        </section>
      </div>
      <div className="tool-foot">
        <span>格式與使用說明</span>
        <div>
          <p>
            簡體模式輸出「人民币壹贰叁肆伍陆柒捌玖零拾佰仟万亿元角分整」；繁體模式改用「人民幣、貳、參、陸、萬、億、圓」等對應字形。整數部分的跨萬、跨億與中間空位都會補上必要的「零」：例如
            1001.05 會得到「人民币壹仟零壹元零伍分」。
          </p>
          <p>
            小數不會四捨五入；超過兩位會直接拒絕。數值以字串與整數位運算，避免
            JavaScript
            浮點數改變金額。中國人民銀行採購公告可見「人民币陸佰壹拾陸萬肆仟陸佰零壹元柒角柒分」等相同金融大寫字形與單位寫法：{' '}
            <a href="https://jzcg.pbc.gov.cn/freecms/site/rmyh/ggxx/info/2024/2c96d1ad928a3062019362821437008a.html?Type=jzcggg&noticeId=4f7b3f77-1677-11f0-8be7-b4055dfb2a6a&noticeType=001021">
              中國人民銀行集中採購中心公告
            </a>
            。
          </p>
        </div>
      </div>
    </div>
  );
}
