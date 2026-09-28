'use client';
import { useState } from 'react';
import { directionExample, stepExample } from '@/lib/sensor-lesson';
import { attempt, formatNumber } from '@/lib/tools/core';
export default function SensorLesson({ mode }: { mode: 'direction' | 'step' }) {
  const [current, setCurrent] = useState('8');
  const [tau, setTau] = useState('0.5');
  const [delay, setDelay] = useState('0');
  const [interval, setInterval] = useState('0.1');
  const [falling, setFalling] = useState(false);
  const direction = attempt(() => directionExample(current));
  const step = attempt(() => stepExample(tau, delay, interval, falling));
  return (
    <section
      className="plc-practice"
      id="sensor-practice"
      aria-labelledby="sensor-heading"
    >
      <h2 id="sensor-heading">
        {mode === 'direction'
          ? '直接比較：同一電流的兩種映射'
          : '直接試算：理論跨越與取樣看到的時間'}
      </h2>
      <p>這是瀏覽器數學模型，沒有接到感測器、PLC 或校正器，不代表硬體實測。</p>
      {mode === 'direction' ? (
        <>
          <div className="plc-practice-actions">
            {['4', '8', '12', '16', '20'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCurrent(value)}
              >
                載入 {value} mA
              </button>
            ))}
          </div>
          <div className="analog-lesson-fields">
            <label>
              輸入電流（mA）
              <input
                type="text"
                inputMode="decimal"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
              />
            </label>
          </div>
          {direction.error ? <p role="alert">{direction.error}</p> : null}
          {direction.data ? (
            <>
              <output aria-live="polite" data-testid="direction-result">
                正向：{formatNumber(direction.data.forward)} °C；反向：
                {formatNumber(direction.data.reverse)} °C
              </output>
              <p>
                {direction.data.outside
                  ? '超出本例 4–20 mA：以上只保留外推算式，不提供有效測量或故障原因判定。'
                  : '落在本例量程內；仍須另確認來源品質與正式量程定義。'}
              </p>
            </>
          ) : null}
          <p>
            正向：4 mA → 0 °C、20 mA → 100 °C。反向：4 mA → 100 °C、20 mA → 0
            °C。負斜率不能單獨證明接線反接。
          </p>
        </>
      ) : (
        <>
          <div className="plc-practice-actions">
            <button
              type="button"
              onClick={() => {
                setTau('0.5');
                setDelay('0');
                setInterval('0.1');
                setFalling(false);
              }}
            >
              重設範例
            </button>
            <button type="button" onClick={() => setFalling(!falling)}>
              切換為{falling ? '上升' : '下降'}階躍
            </button>
          </div>
          <div className="analog-lesson-fields">
            {[
              { value: tau, setter: setTau, label: '時間常數 τ（秒）' },
              { value: delay, setter: setDelay, label: '固定延遲（秒）' },
              { value: interval, setter: setInterval, label: '取樣間隔（秒）' },
            ].map(({ value, setter, label }) => (
              <label key={label}>
                {label}
                <input
                  type="text"
                  inputMode="decimal"
                  value={value}
                  onChange={(event) => setter(event.target.value)}
                />
              </label>
            ))}
          </div>
          <p>
            固定 {falling ? '80 → 20' : '20 → 80'}{' '}
            EU，一階、單調、無雜訊。取樣格點從 t=0
            開始；固定延遲是模型參數，沒有量到任何通訊延遲。表格可左右捲動。
          </p>
          {step.error ? <p role="alert">{step.error}</p> : null}
          {step.data ? (
            <>
              <output aria-live="polite" data-testid="step-result">
                不含延遲 T90：{formatNumber(step.data.t90)} 秒；T10–90：
                {formatNumber(step.data.rise)} 秒
              </output>
              <div className="plc-practice-scroll">
                <table>
                  <caption>
                    理論跨越和取樣時間均從 t=0 起算（含固定延遲）
                  </caption>
                  <thead>
                    <tr>
                      <th>變化比例 %</th>
                      <th>門檻 EU</th>
                      <th>理論時間 s</th>
                      <th>首次取樣跨越 s</th>
                      <th>該筆讀值 EU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {step.data.rows.map((row) => (
                      <tr key={row.fraction}>
                        <td>{formatNumber(row.fraction * 100)}</td>
                        <td>{formatNumber(row.threshold)}</td>
                        <td>{formatNumber(row.crossing)}</td>
                        <td>{formatNumber(row.sample)}</td>
                        <td>{formatNumber(row.observed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                首次跨越不等於已穩定。模型沒有超調、缺樣或時間戳誤差，不能用它替真實資料自動判定合格。
              </p>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
