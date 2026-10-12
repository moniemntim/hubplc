'use client';

import { useState } from 'react';
import {
  appendEdgeScan,
  longHoldCase,
  parseScanInputs,
  runScanLesson,
  samplePulseLesson,
  type EdgeRow,
  type ScanOrder,
  type ScanRow,
} from '@/lib/plc-scan-edge-lesson';

const fixedInputs = '0,0,1,0,0';
const bit = (value: boolean) => (value ? '1' : '0');

export function PlcScanLesson() {
  const [draft, setDraft] = useState(fixedInputs);
  const [order, setOrder] = useState<ScanOrder>('forward');
  const [rows, setRows] = useState<ScanRow[]>(() =>
    runScanLesson(parseScanInputs(fixedInputs), 'forward'),
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const [pulseStart, setPulseStart] = useState('2');
  const [pulseEnd, setPulseEnd] = useState('5');
  const [pulse, setPulse] = useState(() => samplePulseLesson('2', '5'));
  const [pulseError, setPulseError] = useState<string | null>(null);

  function run(values = draft, selected = order) {
    try {
      setRows(runScanLesson(parseScanInputs(values), selected));
      setScanError(null);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : '無法重播掃描。');
    }
  }
  function loadCase(selected: ScanOrder) {
    setDraft(fixedInputs);
    setOrder(selected);
    run(fixedInputs, selected);
  }
  function runPulse(start = pulseStart, end = pulseEnd) {
    try {
      setPulse(samplePulseLesson(start, end));
      setPulseError(null);
    } catch (error) {
      setPulseError(error instanceof Error ? error.message : '無法取樣脈衝。');
    }
  }
  function loadPulse(start: string, end: string) {
    setPulseStart(start);
    setPulseEnd(end);
    runPulse(start, end);
  }

  return (
    <section
      className="plc-practice analog-lesson"
      id="plc-scan-practice"
      aria-labelledby="plc-scan-practice-heading"
    >
      <h2 id="plc-scan-practice-heading">
        直接重播：同一個 Input，換行後差哪一輪？
      </h2>
      <p>
        這是單一循環任務的合成模型。每輪開始先把上輪 Out 套用到 Applied， 再取得
        Input 快照，接著由上而下執行三行賦值。M10、M11 與 Out 初值都是 0。
        沒有連接 PLC 或端子。
      </p>
      <div className="plc-practice-actions">
        <button type="button" onClick={() => loadCase('forward')}>
          載入正向五次掃描
        </button>
        <button type="button" onClick={() => loadCase('swapped')}>
          載入交換順序五次掃描
        </button>
      </div>
      <div className="analog-lesson-fields">
        <label>
          各輪 Input（0／1，逗號分隔）
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <label>
          三行程式的前兩行
          <select
            value={order}
            onChange={(event) => setOrder(event.target.value as ScanOrder)}
          >
            <option value="forward">先 M10 := Input，再 M11 := M10</option>
            <option value="swapped">先 M11 := M10，再 M10 := Input</option>
          </select>
        </label>
      </div>
      <button type="button" onClick={() => run()}>
        重播輸入
      </button>
      {scanError ? <p role="alert">{scanError}</p> : null}
      <p className="plc-practice-status" data-testid="scan-interpretation">
        {rows.length >= 3 && rows[2].input
          ? `第 3 輪：M11=${bit(rows[2].m11)}、Out=${bit(rows[2].out)}、Applied=${bit(rows[2].applied)}。Applied 是本輪開始套用的上一輪結果。`
          : '請對照每輪 Input、M10、M11、Out 與 Applied；改變前兩行的執行順序再比較。'}
      </p>
      <section className="plc-practice-scroll" aria-label="逐掃描結果表">
        <table>
          <caption>
            每列記錄本輪執行後的記憶值；Applied 記錄本輪開始的更新值
          </caption>
          <thead>
            <tr>
              <th scope="col">掃描</th>
              <th scope="col">Input</th>
              <th scope="col">舊 M10</th>
              <th scope="col">M10</th>
              <th scope="col">M11</th>
              <th scope="col">Out</th>
              <th scope="col">Applied</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.scan}>
                <th scope="row">{row.scan}</th>
                <td>{bit(row.input)}</td>
                <td>{bit(row.previousM10)}</td>
                <td>{bit(row.m10)}</td>
                <td data-testid={`scan-${row.scan}-m11-value`}>
                  {bit(row.m11)}
                </td>
                <td>{bit(row.out)}</td>
                <td data-testid={`scan-${row.scan}-applied`}>
                  {bit(row.applied)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <h3>短脈衝會被哪次取樣看見？</h3>
      <p>
        另一個獨立的理想取樣練習只在 0、10、20、30 ms 讀取輸入。 ON 時段為
        [起點, 終點)，包含起點、不包含終點；它不模擬輸入濾波或硬體捕捉。
      </p>
      <div className="plc-practice-actions">
        <button type="button" onClick={() => loadPulse('2', '5')}>
          2–5 ms：未取樣
        </button>
        <button type="button" onClick={() => loadPulse('8', '12')}>
          8–12 ms：取樣一次
        </button>
        <button type="button" onClick={() => loadPulse('8', '25')}>
          8–25 ms：取樣兩次
        </button>
      </div>
      <div className="analog-lesson-fields">
        <label>
          ON 起點（ms）
          <input
            inputMode="numeric"
            value={pulseStart}
            onChange={(event) => setPulseStart(event.target.value)}
          />
        </label>
        <label>
          ON 終點（ms）
          <input
            inputMode="numeric"
            value={pulseEnd}
            onChange={(event) => setPulseEnd(event.target.value)}
          />
        </label>
      </div>
      <button type="button" onClick={() => runPulse()}>
        取樣脈衝
      </button>
      {pulseError ? <p role="alert">{pulseError}</p> : null}
      <p className="plc-practice-status" data-testid="pulse-samples">
        {pulse
          .map(({ timeMs, input }) => `${timeMs} ms=${bit(input)}`)
          .join('；')}
      </p>
      <p>即使後面再接上升緣判斷，程式也不能還原兩次取樣之間結束的 ON。</p>
    </section>
  );
}

export function PlcEdgeLesson() {
  const [history, setHistory] = useState<EdgeRow[]>(() => longHoldCase());
  const [error, setError] = useState<string | null>(null);
  const last = history.at(-1);

  function step(button: boolean) {
    try {
      setHistory(appendEdgeScan(history, button));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '無法執行本輪掃描。');
    }
  }
  return (
    <section
      className="plc-practice analog-lesson"
      id="plc-edge-practice"
      aria-labelledby="plc-edge-practice-heading"
    >
      <h2 id="plc-edge-practice-heading">直接逐掃描：長按只送一次命令嗎？</h2>
      <p>
        每按一次下方按鈕代表一次離線取樣，不是實體按鈕或 PLC 掃描。 Previous
        初值為 0；先用更新前的 Previous 計算 Rise／Fall，再保存本輪 Button。
      </p>
      <div className="plc-practice-actions">
        <button type="button" onClick={() => step(true)}>
          本輪取樣 1（按住）
        </button>
        <button type="button" onClick={() => step(false)}>
          本輪取樣 0（放開）
        </button>
        <button
          type="button"
          onClick={() => {
            setHistory(longHoldCase());
            setError(null);
          }}
        >
          載入 12 次長按案例
        </button>
        <button
          type="button"
          onClick={() => {
            setHistory([]);
            setError(null);
          }}
        >
          從初值重設
        </button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <dl className="analog-lesson-results">
        <div>
          <dt>本輪 Button</dt>
          <dd data-testid="edge-button">
            {last ? bit(last.button) : '尚未取樣'}
          </dd>
        </div>
        <div>
          <dt>Rise / Fall</dt>
          <dd data-testid="edge-events">
            {last ? `${bit(last.rising)} / ${bit(last.falling)}` : '—'}
          </dd>
        </div>
        <div>
          <dt>CommandCount</dt>
          <dd data-testid="edge-count">{last?.commandCount ?? 0}</dd>
        </div>
        <div>
          <dt>下輪 Previous</dt>
          <dd data-testid="edge-previous">
            {last ? bit(last.button) : '0（初值）'}
          </dd>
        </div>
      </dl>
      <section className="plc-practice-scroll" aria-label="邊沿逐掃描結果表">
        <table>
          <caption>Previous 是本輪計算前的值；每次 Rise 才使計數加一</caption>
          <thead>
            <tr>
              <th scope="col">掃描</th>
              <th scope="col">Button</th>
              <th scope="col">Previous</th>
              <th scope="col">Rise</th>
              <th scope="col">Fall</th>
              <th scope="col">CommandCount</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.scan}>
                <th scope="row">{row.scan}</th>
                <td>{bit(row.button)}</td>
                <td>{bit(row.previous)}</td>
                <td>{bit(row.rising)}</td>
                <td>{bit(row.falling)}</td>
                <td>{row.commandCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p>
        本教材把首次 Button=1 解讀為 Rise；故障復歸案例採先看到可信的 0
        才允許按下，
        兩種初值政策不能混用。真實輸入的彈跳、濾波與安全輸出都須另行驗證。
      </p>
    </section>
  );
}
