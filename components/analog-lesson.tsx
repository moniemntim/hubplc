'use client';
import { useState } from 'react';
import { assessAnalog, type LessonQuality } from '@/lib/analog-lesson';
import { attempt, formatNumber } from '@/lib/tools/core';
const initial = {
  value: '12',
  low: '4',
  high: '20',
  engLow: '0',
  engHigh: '10',
  unit: 'bar',
  source: 'mA',
  quality: 'good' as LessonQuality,
};
const status: Record<string, string> = {
  AVAILABLE: '符合本例使用條件',
  SOURCE_BAD: '來源失效：不提供本次工程值',
  SOURCE_UNKNOWN: '來源品質未確認：不提供本次工程值',
  OUT_OF_RANGE: '超出本例量程：不提供本次工程值',
};
export default function AnalogLesson() {
  const [form, setForm] = useState(initial);
  const result = attempt(() =>
    assessAnalog(
      {
        signal: form.value,
        signalLow: form.low,
        signalHigh: form.high,
        engineeringLow: form.engLow,
        engineeringHigh: form.engHigh,
      },
      form.quality,
    ),
  );
  const data = result.data;
  function preset(kind: string) {
    setForm({
      ...initial,
      ...(kind === 'temperature'
        ? { engLow: '-50', engHigh: '150', unit: '°C' }
        : kind === 'level'
          ? { engHigh: '6', unit: 'm' }
          : kind === 'raw'
            ? { value: '2000', low: '0', high: '4000', source: 'counts' }
            : {}),
    });
  }
  return (
    <section
      className="plc-practice analog-lesson"
      id="analog-practice"
      aria-labelledby="analog-lesson-heading"
    >
      <h2 id="analog-lesson-heading">直接試算：數字算得出來，就能使用嗎？</h2>
      <p>
        先載入範例，再改輸入或來源品質。不需安裝；這是合成資料試算，沒有讀取感測器或
        PLC。Good 是你指定的教學條件，不是工具檢測到的設備狀態。
      </p>
      <div className="plc-practice-actions">
        {[
          ['pressure', '壓力 0–10 bar'],
          ['temperature', '溫度 −50–150 °C'],
          ['level', '液位 0–6 m'],
          ['raw', '原始值 0–4000 counts'],
        ].map(([key, label]) => (
          <button type="button" key={key} onClick={() => preset(key)}>
            載入{label}
          </button>
        ))}
      </div>
      <div className="analog-lesson-fields">
        {(
          [
            ['value', '輸入值'],
            ['low', '輸入下限'],
            ['high', '輸入上限'],
            ['engLow', '工程下限'],
            ['engHigh', '工程上限'],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              inputMode="decimal"
              type="text"
              maxLength={40}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
        <label>
          輸入單位
          <select
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          >
            <option>mA</option>
            <option>counts</option>
          </select>
        </label>
        <label>
          工程單位
          <select
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          >
            <option>bar</option>
            <option>°C</option>
            <option>m</option>
            <option>EU</option>
          </select>
        </label>
        <label>
          來源品質
          <select
            value={form.quality}
            onChange={(e) =>
              setForm({ ...form, quality: e.target.value as LessonQuality })
            }
          >
            <option value="good">Good：已確認有效（教學輸入）</option>
            <option value="unknown">Unknown：尚未確認</option>
            <option value="bad">Bad：來源失效或診斷異常</option>
          </select>
        </label>
      </div>
      <p>
        單位欄是資料標籤，不會自動換算 mA 與
        counts。改變資料來源時須同時填入正確端點，或使用上方完整範例。
      </p>
      {result.error ? (
        <p role="alert">{result.error}</p>
      ) : data ? (
        <>
          <output className="plc-practice-status" aria-live="polite">
            {status[data.state]}
          </output>
          <dl className="analog-lesson-results">
            <div>
              <dt>算式結果（未裁切）</dt>
              <dd data-testid="calculated">
                {formatNumber(data.engineering)} {form.unit}
              </dd>
            </div>
            <div>
              <dt>比例</dt>
              <dd data-testid="percentage">
                {formatNumber(data.percentage)} %
              </dd>
            </div>
            <div>
              <dt>本例可用工程值</dt>
              <dd data-testid="usable">
                {data.usable
                  ? `${formatNumber(data.usableValue!)} ${form.unit}`
                  : '未提供'}
              </dd>
            </div>
            <div>
              <dt>量程判斷</dt>
              <dd>{data.outside ? '量程外' : '量程內'}</dd>
            </div>
          </dl>
          <p data-testid="equation">
            ({form.value} − {form.low}) ÷ ({form.high} − {form.low}) × (
            {form.engHigh} − {form.engLow}) + {form.engLow} ={' '}
            {formatNumber(data.engineering)} {form.unit}
          </p>
        </>
      ) : null}
      <p>
        本例僅在來源 Good
        且輸入位於兩端點之間時提供工程值。量程外保留數學結果供排查；不自動截為零，也不僅憑
        0 mA 判定斷線。未處理樣本時間、設備診斷或控制安全。
      </p>
    </section>
  );
}
