'use client';
import { useState } from 'react';
import {
  actuatorPathExample,
  analogLoadExample,
  inputProtectionExample,
  switchLossExample,
} from '@/lib/io-path-lesson';
import { attempt, formatNumber } from '@/lib/tools/core';

type Mode = 'analog' | 'switch' | 'protect' | 'actuator';
type Field = { label: string; value: string; set: (value: string) => void };
const fmt = (value: number) => formatNumber(value);

function Fields({ fields }: { fields: Field[] }) {
  return (
    <div className="analog-lesson-fields">
      {fields.map((field) => (
        <label key={field.label}>
          {field.label}
          <input
            type="text"
            inputMode="decimal"
            value={field.value}
            onChange={(event) => field.set(event.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

export default function IoPathLesson({ mode }: { mode: Mode }) {
  const defaults =
    mode === 'analog'
      ? ['10', '100', '1000000', '0.2', '', '', '', '', '']
      : mode === 'switch'
        ? ['24', '0.2', '0.15', '0.9', '100', '24', '', '', '']
        : mode === 'protect'
          ? ['18', '29', '3', '0.7', '0.2', '18', '30', '48', '36']
          : ['24', '24', '120', '0', '20', '', '', '', ''];
  const [a, setA] = useState(defaults[0]);
  const [b, setB] = useState(defaults[1]);
  const [c, setC] = useState(defaults[2]);
  const [d, setD] = useState(defaults[3]);
  const [e, setE] = useState(defaults[4]);
  const [f, setF] = useState(defaults[5]);
  const [g, setG] = useState(defaults[6]);
  const [h, setH] = useState(defaults[7]);
  const [i, setI] = useState(defaults[8]);

  if (mode === 'analog') {
    const result = attempt(() => analogLoadExample(a, b, c, d));
    return (
      <section
        className="plc-practice"
        id="io-path-practice"
        aria-labelledby="io-path-heading"
      >
        <h2 id="io-path-heading">直接試算：PLC 實際會量到幾伏？</h2>
        <p>
          用戴維寧輸出電阻、PLC
          輸入阻抗與兩端地電位差計算。這是離線穩態模型，不診斷開路。
        </p>
        <div className="plc-practice-actions">
          <button
            type="button"
            onClick={() => {
              setA('10');
              setB('100');
              setC('1000000');
              setD('0.2');
            }}
          >
            載入 1 MΩ 輸入
          </button>
          <button
            type="button"
            onClick={() => {
              setA('10');
              setB('100');
              setC('10000');
              setD('0.2');
            }}
          >
            載入 10 kΩ 輸入
          </button>
        </div>
        <Fields
          fields={[
            { label: '輸出設定（V）', value: a, set: setA },
            { label: '輸出電阻（Ω）', value: b, set: setB },
            { label: 'PLC 輸入阻抗（Ω）', value: c, set: setC },
            { label: '輸入地−輸出地（V）', value: d, set: setD },
          ]}
        />
        {result.error ? <p role="alert">{result.error}</p> : null}
        {result.data ? (
          <dl className="analog-lesson-results" data-testid="io-path-result">
            <div>
              <dt>負載後訊號</dt>
              <dd>{fmt(result.data.loaded)} V</dd>
            </div>
            <div>
              <dt>PLC 量測值</dt>
              <dd>{fmt(result.data.measured)} V</dd>
            </div>
            <div>
              <dt>僅負載誤差</dt>
              <dd>{fmt(result.data.loadingError)}%</dd>
            </div>
            <div>
              <dt>範圍狀態</dt>
              <dd>{result.data.outside ? '超出 0–10 V' : '落在 0–10 V'}</dd>
            </div>
          </dl>
        ) : null}
      </section>
    );
  }

  if (mode === 'switch') {
    const result = attempt(() => switchLossExample(a, b, c, d, e, f));
    return (
      <section
        className="plc-practice"
        id="io-path-practice"
        aria-labelledby="io-path-heading"
      >
        <h2 id="io-path-heading">直接比較：導通損失與線圈關斷</h2>
        <p>
          比較指定條件下 MOSFET 與 BJT 的導通損失，並用 L·I／V
          算理想線圈電流衰減時間。
        </p>
        <div className="plc-practice-actions">
          <button
            type="button"
            onClick={() => {
              setA('24');
              setB('0.2');
              setC('0.15');
              setD('0.9');
              setE('100');
              setF('24');
            }}
          >
            載入文章案例
          </button>
          <button
            type="button"
            onClick={() => {
              setA('24');
              setB('0.2');
              setC('0.15');
              setD('0.9');
              setE('100');
              setF('0.7');
            }}
          >
            載入二極體箝位
          </button>
        </div>
        <Fields
          fields={[
            { label: '電源電壓（V）', value: a, set: setA },
            { label: '負載電流（A）', value: b, set: setB },
            { label: 'MOSFET RDS(on)（Ω）', value: c, set: setC },
            { label: 'BJT 飽和壓降（V）', value: d, set: setD },
            { label: '線圈電感（mH）', value: e, set: setE },
            { label: '關斷箝位電壓（V）', value: f, set: setF },
          ]}
        />
        {result.error ? <p role="alert">{result.error}</p> : null}
        {result.data ? (
          <dl className="analog-lesson-results" data-testid="io-path-result">
            <div>
              <dt>MOSFET 損失</dt>
              <dd>{fmt(result.data.mosfetLoss)} W</dd>
            </div>
            <div>
              <dt>BJT 損失</dt>
              <dd>{fmt(result.data.bjtLoss)} W</dd>
            </div>
            <div>
              <dt>線圈儲能</dt>
              <dd>{fmt(result.data.energy)} J</dd>
            </div>
            <div>
              <dt>理想衰減時間</dt>
              <dd>{fmt(result.data.idealDecay * 1000)} ms</dd>
            </div>
          </dl>
        ) : null}
      </section>
    );
  }

  if (mode === 'protect') {
    const result = attempt(() =>
      inputProtectionExample(a, b, c, d, e, f, g, h, i),
    );
    return (
      <section
        className="plc-practice"
        id="io-path-practice"
        aria-labelledby="io-path-heading"
      >
        <h2 id="io-path-heading">直接檢查：低端供電與高端箝位能否同時通過？</h2>
        <p>
          低端用最小輸入、串聯壓降及配線壓降；高端只比較 TVS
          工作電壓與指定脈衝下箝位值。
        </p>
        <div className="plc-practice-actions">
          <button
            type="button"
            onClick={() => {
              setA('18');
              setB('29');
              setC('3');
              setD('0.7');
              setE('0.2');
              setF('18');
              setG('30');
              setH('48');
              setI('36');
            }}
          >
            載入雙邊失敗
          </button>
          <button
            type="button"
            onClick={() => {
              setA('20');
              setB('29');
              setC('3');
              setD('0.1');
              setE('0.1');
              setF('18');
              setG('30');
              setH('34');
              setI('36');
            }}
          >
            載入可繼續驗證
          </button>
        </div>
        <Fields
          fields={[
            { label: '最低正常輸入（V）', value: a, set: setA },
            { label: '最高正常輸入（V）', value: b, set: setB },
            { label: '連續電流（A）', value: c, set: setC },
            { label: '反接元件壓降（V）', value: d, set: setD },
            { label: '配線回路電阻（Ω）', value: e, set: setE },
            { label: '負載最低電壓（V）', value: f, set: setF },
            { label: 'TVS VRWM（V）', value: g, set: setG },
            { label: 'TVS 最大箝位（V）', value: h, set: setH },
            { label: '下游絕對最大（V）', value: i, set: setI },
          ]}
        />
        {result.error ? <p role="alert">{result.error}</p> : null}
        {result.data ? (
          <dl className="analog-lesson-results" data-testid="io-path-result">
            <div>
              <dt>最低負載電壓</dt>
              <dd>{fmt(result.data.loadVoltage)} V</dd>
            </div>
            <div>
              <dt>反接元件損失</dt>
              <dd>{fmt(result.data.loss)} W</dd>
            </div>
            <div>
              <dt>正常上限／TVS</dt>
              <dd>
                {result.data.normalPass ? '通過工作電壓檢查' : 'VRWM 太低'}
              </dd>
            </div>
            <div>
              <dt>整體初步判定</dt>
              <dd>
                {result.data.pass ? '三項通過，仍須波形驗證' : '至少一項失敗'}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>
    );
  }

  const result = attempt(() => actuatorPathExample(a, b, c, d, e));
  return (
    <section
      className="plc-practice"
      id="io-path-practice"
      aria-labelledby="io-path-heading"
    >
      <h2 id="io-path-heading">直接判讀：電壓停在哪一層？</h2>
      <p>
        正、負端都相對同一個 0 V
        量測，再算真正線圈差動電壓。電阻模型只作初步比對。
      </p>
      <div className="plc-practice-actions">
        <button
          type="button"
          onClick={() => {
            setA('24');
            setB('24');
            setC('120');
            setD('0');
            setE('20');
          }}
        >
          載入返回路徑未導通
        </button>
        <button
          type="button"
          onClick={() => {
            setA('24');
            setB('0.2');
            setC('120');
            setD('0.198');
            setE('20');
          }}
        >
          載入電氣層成立
        </button>
      </div>
      <Fields
        fields={[
          { label: '線圈正端對 0 V（V）', value: a, set: setA },
          { label: '線圈負端對 0 V（V）', value: b, set: setB },
          { label: '線圈電阻（Ω）', value: c, set: setC },
          { label: '實測支路電流（A）', value: d, set: setD },
          { label: '最低線圈電壓（V）', value: e, set: setE },
        ]}
      />
      {result.error ? <p role="alert">{result.error}</p> : null}
      {result.data ? (
        <dl className="analog-lesson-results" data-testid="io-path-result">
          <div>
            <dt>線圈差動電壓</dt>
            <dd>{fmt(result.data.coilVoltage)} V</dd>
          </div>
          <div>
            <dt>電阻模型預期電流</dt>
            <dd>{fmt(result.data.expectedCurrent)} A</dd>
          </div>
          <div>
            <dt>實測／預期</dt>
            <dd>
              {result.data.currentRatio === null
                ? '無法比較'
                : `${fmt(result.data.currentRatio * 100)}%`}
            </dd>
          </div>
          <div>
            <dt>下一步</dt>
            <dd>{result.data.verdict}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
