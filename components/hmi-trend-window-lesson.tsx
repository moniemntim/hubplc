'use client';

import { useState } from 'react';

function format(value: number, places = 2) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(places).replace(/0+$/u, '').replace(/\.$/u, '');
}

export default function HmiTrendWindowLesson() {
  const [spikeSeconds, setSpikeSeconds] = useState('60');
  const [quality, setQuality] = useState<'Good' | 'Bad'>('Good');
  const [applied, setApplied] = useState<{
    seconds: number;
    quality: 'Good' | 'Bad';
  }>({ seconds: 60, quality: 'Good' });
  const [error, setError] = useState<string | null>(null);
  const seconds = Number(spikeSeconds);
  const valid =
    spikeSeconds.trim() !== '' &&
    Number.isSafeInteger(seconds) &&
    seconds >= 0 &&
    seconds <= 600;
  const knownSeconds = applied.quality === 'Good' ? 600 : 600 - applied.seconds;
  const coverage = knownSeconds / 600;
  const knownMean =
    applied.quality === 'Good'
      ? (600 * (600 - applied.seconds) + 750 * applied.seconds) / 600 / 10
      : knownSeconds === 0
        ? null
        : 60;
  const fullMean = applied.quality === 'Good' ? knownMean : null;

  function apply() {
    if (!valid) {
      setError('尖峰秒數必須是 0 到 600 的整數。');
      return;
    }
    setApplied({ seconds, quality });
    setError(null);
  }

  return (
    <section
      className="plc-practice analog-lesson"
      id="hmi-trend-window-practice"
      aria-labelledby="hmi-trend-window-heading"
    >
      <h2 id="hmi-trend-window-heading">
        直接計算：10 分鐘平均能不能當完整窗口？
      </h2>
      <p>
        此頁面用 10 分鐘合成窗口重現本文的 duration-weighted 規則：基線
        60°C，最後一段是 75°C 尖峰。沒有下載、資料庫連線或設備讀取。
      </p>
      <div className="plc-practice-actions">
        <button
          type="button"
          onClick={() => {
            setSpikeSeconds('60');
            setQuality('Good');
            setApplied({ seconds: 60, quality: 'Good' });
            setError(null);
          }}
        >
          載入 1 分鐘 Good 尖峰
        </button>
        <button
          type="button"
          onClick={() => {
            setSpikeSeconds('30');
            setQuality('Bad');
            setApplied({ seconds: 30, quality: 'Bad' });
            setError(null);
          }}
        >
          載入 30 秒 Bad 缺口
        </button>
      </div>
      <div className="analog-lesson-fields">
        <label>
          75°C 尖峰持續（秒）
          <input
            inputMode="numeric"
            value={spikeSeconds}
            onChange={(event) => setSpikeSeconds(event.target.value)}
          />
        </label>
        <label>
          尖峰品質
          <select
            value={quality}
            onChange={(event) =>
              setQuality(event.target.value as 'Good' | 'Bad')
            }
          >
            <option value="Good">Good</option>
            <option value="Bad">Bad</option>
          </select>
        </label>
      </div>
      <button type="button" onClick={apply}>
        計算窗口
      </button>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <dl
          className="analog-lesson-results"
          data-testid="hmi-trend-window-result"
        >
          <div>
            <dt>窗口長度</dt>
            <dd>600 秒</dd>
          </div>
          <div>
            <dt>已知時間／coverage</dt>
            <dd data-testid="coverage">
              {knownSeconds} 秒 / {format(coverage, 4)}
            </dd>
          </div>
          <div>
            <dt>已知資料平均</dt>
            <dd data-testid="known-mean">
              {knownMean === null
                ? '未提供（無已知資料）'
                : `${format(knownMean)} °C`}
            </dd>
          </div>
          <div>
            <dt>完整窗口平均</dt>
            <dd data-testid="full-mean">
              {fullMean === null
                ? '未提供（coverage 不足）'
                : `${format(fullMean)} °C`}
            </dd>
          </div>
          <div>
            <dt>最高 Good 值</dt>
            <dd>
              {applied.quality === 'Good'
                ? '75 °C'
                : knownSeconds === 0
                  ? '未提供'
                  : '60 °C'}
            </dd>
          </div>
          <div>
            <dt>判讀</dt>
            <dd data-testid="trend-decision">
              {applied.quality === 'Good'
                ? '可報告完整窗口平均'
                : knownSeconds === 0
                  ? '沒有可報告的已知資料'
                  : '只能報告已知資料平均'}
            </dd>
          </div>
        </dl>
      )}
      <p>
        Bad 段不以 0°C 或前一筆補齊。coverage 不足且仍有已知資料時，60°C
        的已知平均可用於排查，但不能命名成完整 10 分鐘平均；若已知時間為
        0，平均也不提供。
      </p>
    </section>
  );
}
