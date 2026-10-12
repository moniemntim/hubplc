'use client';

import { useState } from 'react';

type Stage =
  | 'good'
  | 'disconnect'
  | 'reconnect'
  | 'oldEpoch'
  | 'oldCache'
  | 'newGood';
type ConnectionView = {
  now: number;
  epoch: number;
  connection: 'Connected' | 'Disconnected';
  pending: boolean;
  value: number;
  acquiredAt: number;
  receivedAt: number;
  state: 'FRESH' | 'DISCONNECTED' | 'PENDING_CURRENT_EPOCH';
  trend: number | null;
  decision: string;
};

const replay: Record<Stage, ConnectionView> = {
  good: {
    now: 100,
    epoch: 1,
    connection: 'Connected',
    pending: false,
    value: 62,
    acquiredAt: 100,
    receivedAt: 100,
    state: 'FRESH',
    trend: 62,
    decision: 'sample_good',
  },
  disconnect: {
    now: 500,
    epoch: 1,
    connection: 'Disconnected',
    pending: true,
    value: 62,
    acquiredAt: 100,
    receivedAt: 100,
    state: 'DISCONNECTED',
    trend: null,
    decision: 'disconnected',
  },
  reconnect: {
    now: 1000,
    epoch: 2,
    connection: 'Connected',
    pending: true,
    value: 62,
    acquiredAt: 100,
    receivedAt: 100,
    state: 'PENDING_CURRENT_EPOCH',
    trend: null,
    decision: 'reconnected_pending',
  },
  oldEpoch: {
    now: 1001,
    epoch: 2,
    connection: 'Connected',
    pending: true,
    value: 62,
    acquiredAt: 100,
    receivedAt: 100,
    state: 'PENDING_CURRENT_EPOCH',
    trend: null,
    decision: 'sample_rejected_epoch',
  },
  oldCache: {
    now: 1002,
    epoch: 2,
    connection: 'Connected',
    pending: true,
    value: 62,
    acquiredAt: 100,
    receivedAt: 100,
    state: 'PENDING_CURRENT_EPOCH',
    trend: null,
    decision: 'sample_rejected_old_cache',
  },
  newGood: {
    now: 1003,
    epoch: 2,
    connection: 'Connected',
    pending: false,
    value: 64,
    acquiredAt: 1003,
    receivedAt: 1003,
    state: 'FRESH',
    trend: 64,
    decision: 'sample_good',
  },
};

function View({ view }: { view: ConnectionView }) {
  return (
    <dl className="analog-lesson-results" data-testid="hmi-connection-result">
      <div>
        <dt>時間／epoch</dt>
        <dd data-testid="connection-time">
          {view.now} ms / {view.epoch}
        </dd>
      </div>
      <div>
        <dt>連線狀態</dt>
        <dd data-testid="connection-status">{view.connection}</dd>
      </div>
      <div>
        <dt>pending 新 epoch</dt>
        <dd data-testid="connection-pending">{String(view.pending)}</dd>
      </div>
      <div>
        <dt>保留 last Good</dt>
        <dd data-testid="connection-value">{view.value}</dd>
      </div>
      <div>
        <dt>last Good acquired／received</dt>
        <dd>
          {view.acquiredAt} / {view.receivedAt} ms
        </dd>
      </div>
      <div>
        <dt>趨勢點</dt>
        <dd data-testid="connection-trend">
          {view.trend === null ? '缺口（不補零）' : view.trend}
        </dd>
      </div>
      <div>
        <dt>畫面狀態</dt>
        <dd data-testid="connection-state">{view.state}</dd>
      </div>
      <div>
        <dt>接受結果</dt>
        <dd data-testid="connection-decision">{view.decision}</dd>
      </div>
    </dl>
  );
}

export default function HmiConnectionLesson() {
  const [stage, setStage] = useState<Stage>('good');
  const [epoch, setEpoch] = useState('2');
  const [acquiredAt, setAcquiredAt] = useState('1003');
  const [result, setResult] = useState<ConnectionView | null>(null);
  const [error, setError] = useState<string | null>(null);

  function checkInput() {
    if (epoch.trim() === '' || acquiredAt.trim() === '') {
      setResult(null);
      setError('請完整輸入 epoch 與 acquiredAt。');
      return;
    }
    const requestedEpoch = Number(epoch),
      requestedAcquiredAt = Number(acquiredAt);
    if (
      !Number.isSafeInteger(requestedEpoch) ||
      !Number.isSafeInteger(requestedAcquiredAt) ||
      requestedEpoch < 1 ||
      requestedAcquiredAt < 0
    ) {
      setResult(null);
      setError('epoch 與 acquiredAt 必須是非負安全整數，epoch 至少為 1。');
      return;
    }
    setError(null);
    if (requestedEpoch !== 2) {
      setResult({
        ...replay.reconnect,
        now: 1003,
        decision: 'sample_rejected_epoch',
      });
      return;
    }
    if (requestedAcquiredAt > 1003) {
      setResult({
        ...replay.reconnect,
        now: 1003,
        decision: 'sample_rejected_shape',
      });
      return;
    }
    if (requestedAcquiredAt <= 1000) {
      setResult(replay.oldCache);
      return;
    }
    setResult({
      ...replay.newGood,
      acquiredAt: requestedAcquiredAt,
      receivedAt: 1003,
      value: 64,
    });
  }

  return (
    <section
      className="plc-practice analog-lesson"
      id="hmi-connection-practice"
      aria-labelledby="hmi-connection-heading"
    >
      <h2 id="hmi-connection-heading">直接重播：重連後何時才能恢復 Fresh？</h2>
      <p>
        這是固定合成事件的瀏覽器投影，不需下載 Node。它重現本篇的
        epoch、pending、acquisition 和趨勢缺口規則；沒有連線到 PLC、OPC UA
        或真實 HMI。
      </p>
      <div className="plc-practice-actions" aria-label="重播斷線與恢復事件">
        {(
          [
            ['good', 't=100 新 Good'],
            ['disconnect', 't=500 斷線'],
            ['reconnect', 't=1000 重連'],
            ['oldEpoch', 't=1001 舊 epoch'],
            ['oldCache', 't=1002 舊快取'],
            ['newGood', 't=1003 新取得'],
          ] as const
        ).map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={stage === key}
            onClick={() => setStage(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <View view={replay[stage]} />
      <p>
        斷線與 pending 都把 trend 寫為缺口；舊資料即使數字仍是 62，也不能解除
        pending。只有 epoch=2 且 acquiredAt 晚於 1000 ms 的資料才能恢復 Fresh。
      </p>
      <h3>自己檢查重連後的一筆資料</h3>
      <p>
        固定前提：畫面在 t=1000 重連並進入 epoch 2。輸入 epoch 與
        acquiredAt，按套用後核對是否接受。這是簡化的教學分支，沒有重現所有
        seq、Bad、容量與時鐘驗證。
      </p>
      <div className="analog-lesson-fields">
        <label>
          資料 epoch
          <input
            inputMode="numeric"
            value={epoch}
            onChange={(event) => setEpoch(event.target.value)}
          />
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
      <button type="button" onClick={checkInput}>
        套用重連資料
      </button>
      {error ? <p role="alert">{error}</p> : null}
      {result ? <View view={result} /> : null}
    </section>
  );
}
