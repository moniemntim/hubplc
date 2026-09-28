'use client';
import { useState } from 'react';
import { aliasExample } from '@/lib/alias-lesson';
import { attempt, formatNumber } from '@/lib/tools/core';
export default function AliasLesson() {
  const [frequency, setFrequency] = useState('70'),
    [rate, setRate] = useState('100'),
    [phase, setPhase] = useState('0');
  const result = attempt(() => aliasExample(frequency, rate, phase));
  const fmt = (value: number) =>
    formatNumber(Math.abs(value) < 1e-12 ? 0 : value);
  return (
    <section
      className="plc-practice"
      id="alias-practice"
      aria-labelledby="alias-heading"
    >
      <h2 id="alias-heading">直接取樣：不同頻率，能留下相同數列嗎？</h2>
      <p>
        振幅 1 的合成正弦，每次列出 12 筆。不連接
        ADC，也不從未知資料偵測混疊。輸入頻率是你指定的已知條件。
      </p>
      <div className="plc-practice-actions">
        {[
          ['70', '100', '0', '70 Hz／100 Hz'],
          ['70', '200', '0', '提高到 200 Hz'],
          ['50', '100', '0', '邊界零相位'],
          ['50', '100', '90', '邊界 90°'],
        ].map(([f, fs, p, label]) => (
          <button
            type="button"
            key={label}
            onClick={() => {
              setFrequency(f);
              setRate(fs);
              setPhase(p);
            }}
          >
            載入{label}
          </button>
        ))}
      </div>
      <div className="analog-lesson-fields">
        {[
          { label: '輸入頻率（Hz）', value: frequency, set: setFrequency },
          { label: '取樣率（Hz）', value: rate, set: setRate },
          { label: '相位（度）', value: phase, set: setPhase },
        ].map((field) => (
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
      {result.error ? <p role="alert">{result.error}</p> : null}
      {result.data ? (
        <>
          <output aria-live="polite" data-testid="alias-result">
            折返頻率大小：{fmt(result.data.alias)} Hz；帶正負號的等效頻率：
            {fmt(result.data.signed)} Hz；fs/2：{fmt(result.data.nyquist)} Hz
          </output>
          <p>
            兩欄都用相同相位代入正弦；負號保留離散序列的方向關係，不表示已識別真實輸入。小於
            1e-12 的浮點殘值在表中顯示為 0。可左右及上下捲動。
          </p>
          <div className="plc-practice-scroll">
            <table>
              <caption>原式 sin(2πfn/fs+φ) 與等效式 sin(2πf等效n/fs+φ)</caption>
              <thead>
                <tr>
                  <th>n</th>
                  <th>時間 s</th>
                  <th>原式取樣</th>
                  <th>等效式取樣</th>
                </tr>
              </thead>
              <tbody>
                {result.data.rows.map((row) => (
                  <tr key={row.index}>
                    <td>{row.index}</td>
                    <td>{fmt(row.time)}</td>
                    <td>{fmt(row.original)}</td>
                    <td>{fmt(row.equivalent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            表格相同只代表這些取樣點相同，不能唯一還原兩點之間的波形；理想邊界也沒有證明硬體頻帶足夠。
          </p>
        </>
      ) : null}
    </section>
  );
}
