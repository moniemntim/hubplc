'use client';
import { useState } from 'react';
import {
  assessFivePoints,
  errorPresets,
  references,
} from '@/lib/five-point-lesson';
import { attempt, formatNumber } from '@/lib/tools/core';

export default function FivePointLesson() {
  const [readings, setReadings] = useState(errorPresets[1].values.map(String));
  const [tolerance, setTolerance] = useState('0.05');
  const result = attempt(() => assessFivePoints(readings, tolerance));
  const data = result.data;
  return (
    <section
      className="plc-practice"
      id="five-point-practice"
      aria-labelledby="five-point-heading"
    >
      <h2 id="five-point-heading">直接比對：五點誤差往哪裡偏？</h2>
      <p>
        固定教學量程 0–10
        bar。預設為合成資料；請把同一測試方向的五個穩定讀值填入。容差用來辨識形狀，不代表設備允收規格，也不會寫入
        PLC。
      </p>
      <div className="plc-practice-actions">
        {errorPresets.map((preset) => (
          <button
            type="button"
            key={preset.label}
            onClick={() => {
              setReadings(preset.values.map(String));
              setTolerance('0.05');
            }}
          >
            載入{preset.label}
          </button>
        ))}
      </div>
      <div className="analog-lesson-fields">
        {references.map((ref, i) => (
          <label key={ref}>
            基準 {ref} bar 時的讀值（bar）
            <input
              type="text"
              inputMode="decimal"
              value={readings[i]}
              onChange={(event) =>
                setReadings(
                  readings.map((value, index) =>
                    index === i ? event.target.value : value,
                  ),
                )
              }
            />
          </label>
        ))}
        <label>
          判讀容差（bar）
          <input
            type="text"
            inputMode="decimal"
            value={tolerance}
            onChange={(event) => setTolerance(event.target.value)}
          />
        </label>
      </div>
      {result.error ? <p role="alert">{result.error}</p> : null}
      {data ? (
        <>
          <output aria-live="polite" data-testid="finding">
            {data.finding}。這是五點資料的線索，尚未確認故障位置。
          </output>
          <p>
            低點偏移：{formatNumber(data.offset)} bar；端點倍率：
            {formatNumber(data.gain)}；最大絕對誤差：
            {formatNumber(data.maxError)} bar；最大端點直線殘差：
            {formatNumber(data.maxResidual)} bar。
          </p>
          <div className="plc-practice-scroll">
            <table>
              <caption>誤差 = 讀值 − 基準；% span 以 10 bar 為分母</caption>
              <thead>
                <tr>
                  <th>基準 bar</th>
                  <th>讀值 bar</th>
                  <th>誤差 bar</th>
                  <th>誤差 % span</th>
                  <th>直線殘差 bar</th>
                </tr>
              </thead>
              <tbody>
                {data.points.map((point) => (
                  <tr key={point.reference}>
                    <td>{formatNumber(point.reference)}</td>
                    <td>{formatNumber(point.reading)}</td>
                    <td>{formatNumber(point.error)}</td>
                    <td>{formatNumber(point.percentSpan)}</td>
                    <td>{formatNumber(point.residual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            端點直線殘差比較「實際讀值」與「通過低、高點的直線」，不是設備規格中的所有非線性定義。只取五點，無法證明兩點之間也符合要求。
          </p>
        </>
      ) : null}
    </section>
  );
}
