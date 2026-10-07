'use client';
import { useState } from 'react';
import {
  branchVoltageExample,
  eventCoverageExample,
  hotPlugExample,
  redundancyExample,
} from '@/lib/power-lesson';
import { attempt, formatNumber } from '@/lib/tools/core';

type Mode = 'branch' | 'redundancy' | 'hotplug' | 'events';
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

export default function PowerLesson({ mode }: { mode: Mode }) {
  const [a, setA] = useState(mode === 'events' ? '100' : '24');
  const [b, setB] = useState(
    mode === 'branch'
      ? '0.1'
      : mode === 'redundancy'
        ? '16'
        : mode === 'hotplug'
          ? '1000'
          : '50',
  );
  const [c, setC] = useState(
    mode === 'branch'
      ? '30'
      : mode === 'redundancy'
        ? '18'
        : mode === 'hotplug'
          ? '1'
          : '20',
  );
  const [d, setD] = useState(
    mode === 'branch'
      ? '0.018'
      : mode === 'redundancy'
        ? '0.6'
        : mode === 'hotplug'
          ? '0.8'
          : '100',
  );
  const [e, setE] = useState(
    mode === 'branch' ? '0' : mode === 'redundancy' ? '0.05' : '',
  );
  const [f, setF] = useState(
    mode === 'branch' ? '23.8' : mode === 'redundancy' ? '23' : '',
  );

  if (mode === 'branch') {
    const result = attempt(() => branchVoltageExample(a, b, c, d, e, f));
    return (
      <section
        className="plc-practice"
        id="power-practice"
        aria-labelledby="power-heading"
      >
        <h2 id="power-heading">直接試算：末端還剩多少電壓？</h2>
        <p>
          這是直流電阻的離線算例，不連接儀表。單程長度會乘二，接點電阻另加。
        </p>
        <div className="plc-practice-actions">
          <button
            type="button"
            onClick={() => {
              setA('24');
              setB('0.1');
              setC('30');
              setD('0.018');
              setE('0');
              setF('23.8');
            }}
          >
            載入文章案例
          </button>
          <button
            type="button"
            onClick={() => {
              setA('24');
              setB('0.15');
              setC('30');
              setD('0.018');
              setE('0.5');
              setF('23.8');
            }}
          >
            載入接點劣化
          </button>
        </div>
        <Fields
          fields={[
            { label: '電源輸出（V）', value: a, set: setA },
            { label: '支路電流（A）', value: b, set: setB },
            { label: '單程線長（m）', value: c, set: setC },
            { label: '每條導線電阻（Ω/m）', value: d, set: setD },
            { label: '接點合計電阻（Ω）', value: e, set: setE },
            { label: '最低允許電壓（V）', value: f, set: setF },
          ]}
        />
        {result.error ? <p role="alert">{result.error}</p> : null}
        {result.data ? (
          <dl className="analog-lesson-results" data-testid="power-result">
            <div>
              <dt>回路電阻</dt>
              <dd>{fmt(result.data.loopResistance)} Ω</dd>
            </div>
            <div>
              <dt>支路壓降</dt>
              <dd>{fmt(result.data.drop)} V</dd>
            </div>
            <div>
              <dt>末端電壓</dt>
              <dd>{fmt(result.data.loadVoltage)} V</dd>
            </div>
            <div>
              <dt>判定</dt>
              <dd>
                {result.data.pass
                  ? `通過，餘裕 ${fmt(result.data.margin)} V`
                  : `不足 ${fmt(-result.data.margin)} V`}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>
    );
  }

  if (mode === 'redundancy') {
    const result = attempt(() => redundancyExample(a, b, c, d, e, f));
    return (
      <section
        className="plc-practice"
        id="power-practice"
        aria-labelledby="power-heading"
      >
        <h2 id="power-heading">直接試算：失去一台後還撐得住嗎？</h2>
        <p>
          只計單台可用電流、隔離壓降和共用路徑；不把兩台額定相加，也不假設未提供的脈衝能力。
        </p>
        <div className="plc-practice-actions">
          <button
            type="button"
            onClick={() => {
              setA('24');
              setB('16');
              setC('18');
              setD('0.6');
              setE('0.05');
              setF('23');
            }}
          >
            載入容量不足
          </button>
          <button
            type="button"
            onClick={() => {
              setA('24');
              setB('20');
              setC('12');
              setD('0.1');
              setE('0.02');
              setF('23');
            }}
          >
            載入可繼續驗證
          </button>
        </div>
        <Fields
          fields={[
            { label: '單台輸出電壓（V）', value: a, set: setA },
            { label: '單台可用電流（A）', value: b, set: setB },
            { label: '失效後需求電流（A）', value: c, set: setC },
            { label: '隔離元件壓降（V）', value: d, set: setD },
            { label: '共用路徑電阻（Ω）', value: e, set: setE },
            { label: '最低允許電壓（V）', value: f, set: setF },
          ]}
        />
        {result.error ? <p role="alert">{result.error}</p> : null}
        {result.data ? (
          <dl className="analog-lesson-results" data-testid="power-result">
            <div>
              <dt>單台容量餘裕</dt>
              <dd>{fmt(result.data.capacityMargin)} A</dd>
            </div>
            <div>
              <dt>負載端電壓</dt>
              <dd>{fmt(result.data.loadVoltage)} V</dd>
            </div>
            <div>
              <dt>電壓餘裕</dt>
              <dd>{fmt(result.data.voltageMargin)} V</dd>
            </div>
            <div>
              <dt>初步判定</dt>
              <dd>
                {result.data.pass ? '容量與穩態電壓通過' : '不具 N+1 條件'}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>
    );
  }

  if (mode === 'hotplug') {
    const result = attempt(() => hotPlugExample(a, b, c, d));
    return (
      <section
        className="plc-practice"
        id="power-practice"
        aria-labelledby="power-heading"
      >
        <h2 id="power-heading">直接試算：限流後電容充得起來嗎？</h2>
        <p>
          使用 CΔV/I 的理想充電時間，只用於整理測試條件；不包含控制器斜率、FET
          熱限制或電源折返。
        </p>
        <div className="plc-practice-actions">
          <button
            type="button"
            onClick={() => {
              setA('24');
              setB('1000');
              setC('1');
              setD('0.8');
            }}
          >
            載入文章案例
          </button>
          <button
            type="button"
            onClick={() => {
              setA('24');
              setB('1000');
              setC('1');
              setD('1.2');
            }}
          >
            載入無法充電
          </button>
        </div>
        <Fields
          fields={[
            { label: '目標電壓（V）', value: a, set: setA },
            { label: '輸入電容（µF）', value: b, set: setB },
            { label: '限流值（A）', value: c, set: setC },
            { label: '充電期間負載（A）', value: d, set: setD },
          ]}
        />
        {result.error ? <p role="alert">{result.error}</p> : null}
        {result.data ? (
          <dl className="analog-lesson-results" data-testid="power-result">
            <div>
              <dt>電容儲能</dt>
              <dd>{fmt(result.data.energy)} J</dd>
            </div>
            <div>
              <dt>可用充電電流</dt>
              <dd>{fmt(result.data.chargeCurrent)} A</dd>
            </div>
            <div>
              <dt>理想充電時間</dt>
              <dd>
                {result.data.chargeTime === null
                  ? '無法到達目標'
                  : `${fmt(result.data.chargeTime * 1000)} ms`}
              </dd>
            </div>
            <div>
              <dt>初步判定</dt>
              <dd>
                {result.data.canCharge
                  ? '可進入下一階段驗證'
                  : '限流值不大於負載'}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>
    );
  }

  const result = attempt(() => eventCoverageExample(a, b, c, d));
  return (
    <section
      className="plc-practice"
      id="power-practice"
      aria-labelledby="power-heading"
    >
      <h2 id="power-heading">直接判讀：沒記到低壓，等於沒發生嗎？</h2>
      <p>
        比較取樣週期、低壓持續時間和兩台設備的時鐘誤差。這是時間覆蓋模型，不會重建真實事故。
      </p>
      <div className="plc-practice-actions">
        <button
          type="button"
          onClick={() => {
            setA('100');
            setB('50');
            setC('20');
            setD('100');
          }}
        >
          載入不可判定
        </button>
        <button
          type="button"
          onClick={() => {
            setA('10');
            setB('50');
            setC('250');
            setD('20');
          }}
        >
          載入可排序案例
        </button>
      </div>
      <Fields
        fields={[
          { label: '取樣週期（ms）', value: a, set: setA },
          { label: '低壓持續時間（ms）', value: b, set: setB },
          { label: '事件 B−A 時間差（ms）', value: c, set: setC },
          { label: '單一裝置時間誤差（±ms）', value: d, set: setD },
        ]}
      />
      {result.error ? <p role="alert">{result.error}</p> : null}
      {result.data ? (
        <dl className="analog-lesson-results" data-testid="power-result">
          <div>
            <dt>低壓擷取</dt>
            <dd>
              {result.data.detectionGuaranteed
                ? '保證至少一筆'
                : '可能整段漏採'}
            </dd>
          </div>
          <div>
            <dt>相對時間不確定度</dt>
            <dd>±{fmt(result.data.relativeUncertainty)} ms</dd>
          </div>
          <div>
            <dt>事件先後</dt>
            <dd>{result.data.order}</dd>
          </div>
          <div>
            <dt>報告寫法</dt>
            <dd>
              {result.data.ordered ? '可依目前誤差判定先後' : '只寫時間重疊'}
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
