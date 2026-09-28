'use client';
import { useState } from 'react';
import {
  initialReset,
  resetScan,
} from '@/public/examples/fault-reset/reset-model.mjs';
const reasons: Record<string, string> = {
  idle: '尚未執行',
  invalid: '來源無效，必須重新釋放',
  released: '已看到釋放，可接受下一次按下',
  'wait-release': '先釋放，再重新按下',
  'cause-active': '故障原因仍存在，本次拒絕',
  'no-fault': '沒有待清除的故障',
  accepted: '已接受復歸；本次 pulse=1',
};
type Inputs = { valid: boolean; button: boolean; cause: boolean };
type State = {
  fault: boolean;
  armed: boolean;
  accepted: number;
  pulse: boolean;
  reason: string;
};
type Row = Inputs & State & { scan: number };
const initial = (): State => ({
  ...initialReset(),
  pulse: false,
  reason: 'idle',
});
const example: Inputs[] = [
  [1, 1, 0],
  [1, 0, 0],
  [1, 1, 1],
  [1, 1, 0],
  [1, 0, 0],
  [1, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 1, 0],
  [1, 0, 0],
  [1, 1, 0],
].map(([valid, button, cause]) => ({
  valid: !!valid,
  button: !!button,
  cause: !!cause,
}));
export default function FaultResetPractice() {
  const [inputs, setInputs] = useState<Inputs>({
    valid: true,
    button: true,
    cause: false,
  });
  const [session, setSession] = useState<{ state: State; rows: Row[] }>({
    state: initial(),
    rows: [],
  });
  function advance(sequence: Inputs[], restart = false) {
    setSession((old) => {
      let state = restart ? initial() : old.state;
      const rows = restart ? [] : [...old.rows];
      for (const input of sequence) {
        if (rows.length >= 100) break;
        state = resetScan(state, input);
        rows.push({ ...state, ...input, scan: rows.length + 1 });
      }
      return { state, rows };
    });
  }
  return (
    <section
      className="plc-practice"
      id="practice"
      aria-labelledby="fault-practice-heading"
    >
      <h2 id="fault-practice-heading">直接練習：為什麼按住不能復歸？</h2>
      <p>
        不用下載或安裝。勾選代表 1，更改輸入後按「執行 1
        掃描」。這是離線邏輯練習，未連接 PLC；等待真實時間不會改變狀態。
      </p>
      <fieldset>
        <legend>本次輸入</legend>
        {(
          [
            ['valid', '來源有效'],
            ['button', '復歸按鈕按住'],
            ['cause', '故障原因存在'],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={inputs[key]}
              onChange={(e) =>
                setInputs({ ...inputs, [key]: e.target.checked })
              }
            />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="plc-practice-actions">
        <button
          onClick={() => advance([inputs])}
          disabled={session.rows.length >= 100}
        >
          執行 1 掃描
        </button>
        <button
          onClick={() => advance(Array.from({ length: 10 }, () => inputs))}
          disabled={session.rows.length >= 100}
        >
          維持輸入 10 掃描
        </button>
        <button
          onClick={() => {
            advance(example, true);
            setInputs(example[10]);
          }}
        >
          載入正文 11 步案例
        </button>
        <button
          onClick={() => {
            setSession({ state: initial(), rows: [] });
            setInputs({ valid: true, button: true, cause: false });
          }}
        >
          重新開始
        </button>
      </div>
      <output className="plc-practice-status" aria-live="polite">
        掃描 {session.rows.length} · fault={Number(session.state.fault)} ·
        armed={Number(session.state.armed)} · pulse=
        {Number(session.state.pulse)} · 接受 {session.state.accepted} 次
      </output>
      <p>
        {reasons[session.state.reason]}
        {session.rows.length >= 100 ? '。已達 100 次，請重新開始。' : ''}
      </p>
      <div
        className="plc-practice-scroll"

        aria-label="逐掃描紀錄，可水平捲動"
      >
        <table>
          <caption>每次只記錄實際按下執行後的結果；最多 100 筆</caption>
          <thead>
            <tr>
              {[
                '掃描',
                'valid',
                'button',
                'cause',
                'fault',
                'armed',
                'pulse',
                '接受次數',
                '原因',
              ].map((x) => (
                <th scope="col" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {session.rows.map((r) => (
              <tr key={r.scan}>
                <td>{r.scan}</td>
                {(
                  [
                    'valid',
                    'button',
                    'cause',
                    'fault',
                    'armed',
                    'pulse',
                    'accepted',
                  ] as const
                ).map((k) => (
                  <td key={k}>{Number(r[k])}</td>
                ))}
                <td>{reasons[r.reason]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        先取消「復歸按鈕按住」並執行一次，再勾選並執行：fault 應變 0、pulse 變
        1。接著維持 10 掃描，接受次數仍是 1。
      </p>
    </section>
  );
}
