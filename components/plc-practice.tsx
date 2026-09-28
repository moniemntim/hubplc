'use client';
import { useState } from 'react';
import {
  emptyInputs,
  initialPractice,
  practiceScan,
  type PracticeInputs,
  type PracticeMode,
  type PracticeState,
} from '@/lib/plc-practice';

type Row = { state: PracticeState; inputs: PracticeInputs };
const labels: Record<keyof PracticeInputs, string> = {
  start: 'Start',
  stop: 'Stop',
  input: 'IN',
  done: 'DoneInput',
  ack: 'Ack',
  reset: 'Reset',
};
const fields: Record<PracticeMode, (keyof PracticeInputs)[]> = {
  latch: ['start', 'stop'],
  ton: ['input'],
  sequence: ['start', 'stop', 'done', 'ack', 'reset'],
};

export default function PlcPractice({ mode }: { mode: PracticeMode }) {
  const [inputs, setInputs] = useState<PracticeInputs>({ ...emptyInputs });
  const [session, setSession] = useState<{ state: PracticeState; rows: Row[] }>(
    { state: initialPractice(), rows: [] },
  );
  function advance(count: number) {
    setSession((previous) => {
      let state = previous.state;
      const rows = [...previous.rows];
      for (let i = 0; i < count; i++) {
        state = practiceScan(mode, state, inputs);
        rows.push({ state, inputs: { ...inputs } });
      }
      return { state, rows: rows.slice(-100) };
    });
  }
  return (
    <section
      className="plc-practice"
      id="practice"
      aria-labelledby="practice-heading"
    >
      <h2 id="practice-heading">先操作一次，再對照下方程式</h2>
      <p>
        這是本站的瀏覽器教學模型，未連接 PLC。勾選表示 1；更改輸入後須按「執行 1
        掃描」才會更新。第一次掃描為 0 ms，之後每次前進 100
        ms；等待真實時間不會推進模型。
      </p>
      <fieldset>
        <legend>本次掃描的輸入</legend>
        {fields[mode].map((field) => (
          <label key={field}>
            <input
              type="checkbox"
              checked={inputs[field]}
              onChange={(event) =>
                setInputs({ ...inputs, [field]: event.target.checked })
              }
            />
            {labels[field]} = {Number(inputs[field])}
          </label>
        ))}
      </fieldset>
      <div className="plc-practice-actions">
        <button type="button" onClick={() => advance(1)}>
          執行 1 掃描
        </button>
        <button type="button" onClick={() => advance(10)}>
          執行 10 掃描
        </button>
        <button
          type="button"
          onClick={() => {
            setInputs({ ...emptyInputs });
            setSession({ state: initialPractice(), rows: [] });
          }}
        >
          全部重設
        </button>
      </div>
      <output className="plc-practice-status">
        已執行 {session.state.scan} 掃描 ·{' '}
        {mode === 'sequence'
          ? `State=${session.state.phase} · Busy`
          : mode === 'latch'
            ? 'FanReq'
            : 'Q'}
        ={Number(session.state.q)}
        {mode !== 'latch' && ` · ET=${session.state.elapsed} ms`}
        {' · '}
        {session.state.reason}
      </output>
      <section
        className="plc-practice-scroll"
        aria-label="逐掃描紀錄，可橫向捲動"
      >
        <table>
          <caption>最近 100 次掃描，最新在下方</caption>
          <thead>
            <tr>
              <th>掃描／時間</th>
              <th>取樣輸入</th>
              <th>結果</th>
              <th>原因</th>
            </tr>
          </thead>
          <tbody>
            {session.rows.length ? (
              session.rows.map(({ state, inputs: sample }) => (
                <tr key={state.scan}>
                  <td>
                    {state.scan} / {(state.scan - 1) * 100} ms
                  </td>
                  <td>
                    {fields[mode]
                      .map((key) => `${labels[key]}=${Number(sample[key])}`)
                      .join('、')}
                  </td>
                  <td>
                    {mode === 'sequence'
                      ? `${state.phase} / Busy`
                      : mode === 'latch'
                        ? 'FanReq'
                        : 'Q'}
                    ={Number(state.q)}
                    {mode !== 'latch' && ` / ET=${state.elapsed}`}
                  </td>
                  <td>{state.reason}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>尚無紀錄。先設定輸入，再執行掃描。</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      <noscript>
        請啟用 JavaScript 操作模型；下方文字與預期結果表不需要 JavaScript。
      </noscript>
    </section>
  );
}
