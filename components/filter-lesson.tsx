'use client';
import { useState } from 'react';
import { filterSequence } from '@/lib/filter-lesson';
import { attempt, formatNumber } from '@/lib/tools/core';
export default function FilterLesson({ counts }: { counts: boolean }) {
  const presets = counts
    ? [
        ['故障後恢復', '12000,12000,12000,16384,16384,11800,11950,12010'],
        ['缺樣不補零', '1000,1010,1005,x,1007,1008,1009'],
        ['零是合法值', '0,0,0'],
      ]
    : [
        ['單點尖峰', '10,10,50,10,10'],
        ['平穩訊號', '10,10,10,10,10'],
        ['階躍', '10,10,10,50,50,50'],
        ['尖峰後缺樣', '10,10,50,x,10,10,10'],
      ];
  const [text, setText] = useState(presets[0][1]);
  const result = attempt(() => filterSequence(text, counts));
  const fmt = (n: number | null) => (n === null ? '—' : formatNumber(n));
  return (
    <section
      className="plc-practice"
      id="filter-practice"
      aria-labelledby="filter-heading"
    >
      <h2 id="filter-heading">
        {counts
          ? '直接重播：壞資料後，要等哪一筆才恢復？'
          : '直接重播：尖峰經三點平均後剩多少？'}
      </h2>
      <p>
        合成資料，每筆間隔 100 ms，採尾隨三點平均。x
        表示缺樣或來源無效；遇到它清空窗口，連續三筆有效值才輸出新值。這是本課選定策略，不是模組預設。
      </p>
      <div className="plc-practice-actions">
        {presets.map(([label, value]) => (
          <button type="button" key={label} onClick={() => setText(value)}>
            載入{label}
          </button>
        ))}
      </div>
      <div className="analog-lesson-fields">
        <label>
          依序輸入資料（逗號分隔）
          <input
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
      </div>
      <p>
        {counts
          ? '假想設定：0–16000 counts 對應 0–10 V，範圍外皆拒絕；16384 只是超出本例範圍，不代表通用故障碼。'
          : '本例單位 EU（工程單位）；不設硬體量程，不能用它判斷來源是否真實或飽和。'}
        最多 30 筆。表格可左右捲動。
      </p>
      {result.error ? <p role="alert">{result.error}</p> : null}
      {result.data ? (
        <>
          <output aria-live="polite">
            已重播 {result.data.length} 筆；「本次值」為 — 時，不提供新有效值。
          </output>
          <div className="plc-practice-scroll">
            <table>
              <caption>
                時間為本例相對時間；舊值年齡從上次完整窗口輸出起算
              </caption>
              <thead>
                <tr>
                  <th>ms</th>
                  <th>{counts ? 'raw counts' : '原值 EU'}</th>
                  <th>狀態</th>
                  <th>窗口筆數</th>
                  <th>三點平均</th>
                  <th>本次值 {counts ? 'V' : 'EU'}</th>
                  <th>舊有效值</th>
                  <th>舊值年齡 ms</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((row) => (
                  <tr key={row.time}>
                    <td>{row.time}</td>
                    <td>{fmt(row.raw)}</td>
                    <td>{row.state}</td>
                    <td>{row.count}</td>
                    <td>{fmt(row.mean)}</td>
                    <td>{fmt(row.current)}</td>
                    <td>{fmt(row.lastGood)}</td>
                    <td>{fmt(row.age)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            舊有效值只供追查。Bad 或 Warmup 不能因為仍有舊數字就當成
            Good。這裡沒有實作斷流計時、設備診斷或控制輸出。
          </p>
        </>
      ) : null}
    </section>
  );
}
