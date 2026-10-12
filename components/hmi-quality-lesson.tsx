'use client';

import { useState } from 'react';

type ReplayStep = 0 | 500 | 2500 | 4500;
type Quality = 'Good' | 'Bad';

type Projection = {
  now: number;
  rawQuality: 'Good' | 'Bad' | 'Unknown';
  value: number | null;
  lastGoodAcquiredAt: number | null;
  lastGoodReceivedAt: number | null;
  lastReceivedAt: number | null;
  dataState: 'FRESH' | 'BAD_LAST_GOOD' | 'STALE';
  trend: number | null;
  decision: string;
};

const replay: Record<ReplayStep, Projection> = {
  0: {
    now: 0,
    rawQuality: 'Good',
    value: 0,
    lastGoodAcquiredAt: 0,
    lastGoodReceivedAt: 0,
    lastReceivedAt: 0,
    dataState: 'FRESH',
    trend: 0,
    decision: 'sample_good',
  },
  500: {
    now: 500,
    rawQuality: 'Bad',
    value: 0,
    lastGoodAcquiredAt: 0,
    lastGoodReceivedAt: 0,
    lastReceivedAt: 500,
    dataState: 'BAD_LAST_GOOD',
    trend: null,
    decision: 'sample_bad',
  },
  2500: {
    now: 2500,
    rawQuality: 'Good',
    value: 0,
    lastGoodAcquiredAt: 2500,
    lastGoodReceivedAt: 2500,
    lastReceivedAt: 2500,
    dataState: 'FRESH',
    trend: 0,
    decision: 'sample_good',
  },
  4500: {
    now: 4500,
    rawQuality: 'Good',
    value: 0,
    lastGoodAcquiredAt: 2500,
    lastGoodReceivedAt: 2500,
    lastReceivedAt: 2500,
    dataState: 'STALE',
    trend: null,
    decision: 'advance',
  },
};

const display = (value: number | null) =>
  value === null ? '—' : String(value);

function age(view: Projection) {
  return view.lastGoodAcquiredAt === null
    ? null
    : view.now - view.lastGoodAcquiredAt;
}

function evaluateExercise({
  now,
  seq,
  value,
  quality,
  acquiredAt,
}: {
  now: number;
  seq: number;
  value: number;
  quality: Quality;
  acquiredAt: number;
}): Projection {
  // This bounded browser exercise starts after the t=0 Good sample.  Its
  // accept/reject conditions mirror the public Node model's sequence,
  // acquisition-time and freshness rules, without claiming an OPC/PLC runtime.
  const baseline = replay[0];
  const stale = now >= 2000;
  const rejected = (decision: string): Projection => ({
    ...baseline,
    now,
    // receive() records a rejection and adds a trend gap; view() still
    // derives the data state from the retained last Good sample.
    dataState: stale ? 'STALE' : 'FRESH',
    trend: null,
    decision,
  });
  if (!Number.isSafeInteger(seq) || seq !== 2)
    return rejected('sample_rejected_seq');
  if (!Number.isSafeInteger(acquiredAt) || acquiredAt < 0 || acquiredAt > now)
    return rejected('sample_rejected_shape');
  if (acquiredAt <= 0) return rejected('sample_rejected_old_acquisition');
  if (quality === 'Bad')
    return {
      ...baseline,
      now,
      rawQuality: 'Bad',
      lastReceivedAt: now,
      dataState: 'BAD_LAST_GOOD',
      trend: null,
      decision: 'sample_bad',
    };
  const fresh = now - acquiredAt < 2000;
  return {
    now,
    rawQuality: 'Good',
    value,
    lastGoodAcquiredAt: acquiredAt,
    lastGoodReceivedAt: now,
    lastReceivedAt: now,
    dataState: fresh ? 'FRESH' : 'STALE',
    trend: fresh ? value : null,
    decision: 'sample_good',
  };
}

function ProjectionView({ view }: { view: Projection }) {
  return (
    <dl className="analog-lesson-results" data-testid="hmi-quality-result">
      <div>
        <dt>目前時間</dt>
        <dd data-testid="current-time">{view.now} ms</dd>
      </div>
      <div>
        <dt>原始品質</dt>
        <dd data-testid="raw-quality">{view.rawQuality}</dd>
      </div>
      <div>
        <dt>保留的 last Good 值</dt>
        <dd data-testid="last-good-value">{display(view.value)}</dd>
      </div>
      <div>
        <dt>last Good acquired</dt>
        <dd data-testid="last-good-acquired">
          {display(view.lastGoodAcquiredAt)} ms
        </dd>
      </div>
      <div>
        <dt>last Good received</dt>
        <dd data-testid="last-good-received">
          {display(view.lastGoodReceivedAt)} ms
        </dd>
      </div>
      <div>
        <dt>最後原始 received</dt>
        <dd data-testid="last-received">{display(view.lastReceivedAt)} ms</dd>
      </div>
      <div>
        <dt>last Good 年齡</dt>
        <dd data-testid="last-good-age">{display(age(view))} ms</dd>
      </div>
      <div>
        <dt>趨勢點</dt>
        <dd data-testid="trend-point">
          {view.trend === null ? '缺口（不補零）' : view.trend}
        </dd>
      </div>
      <div>
        <dt>畫面決策</dt>
        <dd data-testid="data-state">{view.dataState}</dd>
      </div>
      <div>
        <dt>接受結果</dt>
        <dd data-testid="decision">{view.decision}</dd>
      </div>
    </dl>
  );
}

export default function HmiQualityLesson() {
  const [step, setStep] = useState<ReplayStep>(0);
  const [now, setNow] = useState('2500');
  const [seq, setSeq] = useState('2');
  const [value, setValue] = useState('0');
  const [quality, setQuality] = useState<Quality>('Good');
  const [acquiredAt, setAcquiredAt] = useState('2500');
  const [exercise, setExercise] = useState<Projection | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setPreset(kind: 'zero' | 'bad' | 'stale' | 'rejected') {
    const preset =
      kind === 'zero'
        ? ['2500', '2', '0', 'Good', '2500']
        : kind === 'bad'
          ? ['500', '2', '99', 'Bad', '500']
          : kind === 'stale'
            ? ['4500', '2', '0', 'Good', '2500']
            : ['2500', '1', '7', 'Good', '2500'];
    setNow(preset[0]);
    setSeq(preset[1]);
    setValue(preset[2]);
    setQuality(preset[3] as Quality);
    setAcquiredAt(preset[4]);
    setExercise(null);
    setError(null);
  }

  function runExercise() {
    const fields = [now, seq, value, acquiredAt];
    if (fields.some((field) => field.trim() === '')) {
      setExercise(null);
      setError('請完整輸入現在時間、序列、資料值與 acquiredAt。');
      return;
    }
    const parsedNow = Number(now);
    const parsedSeq = Number(seq);
    const parsedValue = Number(value);
    const parsedAcquiredAt = Number(acquiredAt);
    if (
      !Number.isSafeInteger(parsedNow) ||
      !Number.isSafeInteger(parsedSeq) ||
      !Number.isSafeInteger(parsedAcquiredAt) ||
      !Number.isFinite(parsedValue)
    ) {
      setExercise(null);
      setError('時間與序列必須是安全整數；資料值必須是有限數字。');
      return;
    }
    if (parsedNow < 0 || parsedSeq < 1 || parsedAcquiredAt < 0) {
      setExercise(null);
      setError('時間不可為負，序列必須從 1 開始。');
      return;
    }
    setError(null);
    setExercise(
      evaluateExercise({
        now: parsedNow,
        seq: parsedSeq,
        value: parsedValue,
        quality,
        acquiredAt: parsedAcquiredAt,
      }),
    );
  }

  return (
    <section
      className="plc-practice analog-lesson"
      id="hmi-quality-practice"
      aria-labelledby="hmi-quality-heading"
    >
      <h2 id="hmi-quality-heading">直接重播：零值、Bad 與舊值怎麼分？</h2>
      <p>
        不必下載 Node 檔案。以下是固定事件的簡化瀏覽器投影，對照本文公開範例的
        freshness（嚴格小於 2000 ms）、sequence 與 acquisition 規則；它不連接
        OPC、PLC 或 HMI 設備。
      </p>
      <div className="plc-practice-actions" aria-label="重播固定事件">
        {(
          [
            [0, 't=0 Good 0'],
            [500, 't=500 Bad'],
            [2500, 't=2500 Good 0'],
            [4500, 't=4500 stale'],
          ] as const
        ).map(([time, label]) => (
          <button
            type="button"
            key={time}
            aria-pressed={step === time}
            onClick={() => setStep(time)}
          >
            {label}
          </button>
        ))}
      </div>
      <ProjectionView view={replay[step]} />
      <p>
        t=500 的值仍顯示為 0，但原始品質是 Bad，趨勢是缺口；t=4500 剛好達到 2000
        ms，依契約為 Stale。兩者都不能當成新量測。
      </p>

      <h3>自己輸入一筆：資料會被接受嗎？</h3>
      <p>
        練習會先固定保留 t=0 的 Good
        0，再檢查你的下一筆。可載入案例後改一個欄位，觀察合法零、Bad、過期與序列拒絕的差異。
      </p>
      <div className="plc-practice-actions">
        <button type="button" onClick={() => setPreset('zero')}>
          載入合法零值
        </button>
        <button type="button" onClick={() => setPreset('bad')}>
          載入 Bad
        </button>
        <button type="button" onClick={() => setPreset('stale')}>
          載入 stale
        </button>
        <button type="button" onClick={() => setPreset('rejected')}>
          載入序列拒絕
        </button>
      </div>
      <div className="analog-lesson-fields">
        <label>
          現在時間（ms）
          <input
            inputMode="numeric"
            value={now}
            onChange={(event) => setNow(event.target.value)}
          />
        </label>
        <label>
          序列 seq
          <input
            inputMode="numeric"
            value={seq}
            onChange={(event) => setSeq(event.target.value)}
          />
        </label>
        <label>
          資料值
          <input
            inputMode="numeric"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        <label>
          原始品質
          <select
            value={quality}
            onChange={(event) => setQuality(event.target.value as Quality)}
          >
            <option value="Good">Good</option>
            <option value="Bad">Bad</option>
          </select>
        </label>
        <label>
          acquiredAt（ms）
          <input
            inputMode="numeric"
            value={acquiredAt}
            onChange={(event) => setAcquiredAt(event.target.value)}
          />
        </label>
      </div>
      <button type="button" onClick={runExercise}>
        套用這筆資料
      </button>
      {error ? <p role="alert">{error}</p> : null}
      {exercise ? <ProjectionView view={exercise} /> : null}
      <p>
        此練習只呈現有限的教學條件：沒有連線中斷、重連
        epoch、資料容量或硬體診斷。實際專案仍須以使用的通訊協定與設備驗收定義品質來源。
      </p>
    </section>
  );
}
