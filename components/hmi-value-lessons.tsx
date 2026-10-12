'use client';

import { useState } from 'react';
import {
  assessReadback,
  submitEngineering,
  submitRawString,
  type NumericResult,
  type ReadbackScenario,
} from '@/lib/hmi-value-lessons';

export function NumericRangeLesson() {
  const [text, setText] = useState('100.04');
  const [lastWire, setLastWire] = useState(250);
  const [result, setResult] = useState<NumericResult | null>(null);

  function submit(kind: 'engineering' | 'raw') {
    const state = { lastWire };
    const next =
      kind === 'engineering'
        ? submitEngineering(state, text)
        : submitRawString(state, text);
    setLastWire(next.state.lastWire);
    setResult(next.result);
  }

  return (
    <section
      className="plc-practice analog-lesson"
      id="hmi-numeric-value-practice"
      aria-labelledby="hmi-numeric-value-heading"
    >
      <h2 id="hmi-numeric-value-heading">直接試：拒絕時會保留哪個 wire 值？</h2>
      <p>
        這是固定 `0..100.0°C`、`0.1°C` 步距和 wire `0..1000`
        的合成頁面模型。它沒有授權、網路請求或設備寫入。
      </p>
      <div className="plc-practice-actions">
        {['100.04', '25.35', '25.30', '7'].map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => {
              setText(value);
              setResult(null);
            }}
          >
            載入 {value}
          </button>
        ))}
      </div>
      <div className="analog-lesson-fields">
        <label>
          工程文字或 raw 字串
          <input
            value={text}
            maxLength={16}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
      </div>
      <div className="plc-practice-actions">
        <button type="button" onClick={() => submit('engineering')}>
          以工程文字檢查
        </button>
        <button type="button" onClick={() => submit('raw')}>
          以 raw 字串檢查
        </button>
      </div>
      {result ? (
        <dl className="analog-lesson-results" data-testid="numeric-result">
          <div>
            <dt>decision</dt>
            <dd data-testid="numeric-decision">{result.decision}</dd>
          </div>
          <div>
            <dt>lastWire</dt>
            <dd data-testid="numeric-last-wire">{result.lastWire}</dd>
          </div>
          <div>
            <dt>last engineering</dt>
            <dd>{result.lastEngineering} °C</dd>
          </div>
          <div>
            <dt>解讀</dt>
            <dd>
              {result.decision === 'ACCEPT'
                ? '接受並更新 wire'
                : '拒絕，既有 wire 保留'}
            </dd>
          </div>
        </dl>
      ) : null}
      <p>
        依序試 100.04、25.35、25.30：前兩者分別是 RANGE、STEP 拒絕，25.30 接受為
        wire 253。最後以 raw 字串「7」送出，會是 RAW_TYPE_REJECTED，因 raw JSON
        number 與工程文字是不同入口。
      </p>
    </section>
  );
}

export function SettingReadbackLesson() {
  const [scenario, setScenario] = useState<ReadbackScenario>('accepted');
  const outcome = assessReadback(scenario);
  return (
    <section
      className="plc-practice analog-lesson"
      id="hmi-readback-proof-practice"
      aria-labelledby="hmi-readback-proof-heading"
    >
      <h2 id="hmi-readback-proof-heading">
        直接重播：accepted 為什麼還不能說已套用？
      </h2>
      <p>
        這是 OP-884／EQ-A／TEMP_SP
        的固定合成事件分支。它不發送設定值，也沒有連接設備或服務。
      </p>
      <div className="plc-practice-actions">
        {(
          [
            ['accepted', '只有 accepted'],
            ['wrong-operation', '55 但 operationId 錯誤'],
            ['revision-conflict', '版本衝突'],
            ['complete-proof', '完整讀回匹配'],
          ] as const
        ).map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={scenario === key}
            onClick={() => setScenario(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <dl className="analog-lesson-results" data-testid="readback-result">
        <div>
          <dt>結果</dt>
          <dd data-testid="readback-state">{outcome.result}</dd>
        </div>
        <div>
          <dt>原因</dt>
          <dd data-testid="readback-reason">{outcome.reason}</dd>
        </div>
        <div>
          <dt>所見證據</dt>
          <dd>{outcome.evidence.join('；')}</dd>
        </div>
        <div>
          <dt>需要的完整讀回欄位</dt>
          <dd>operationId、equipment/tag、value、revisionBefore/After</dd>
        </div>
      </dl>
      <p>
        只有完整匹配才是 applied。單純 accepted 或讀到相同數字都不能取代同一
        operationId、目標、值與版本的讀回證據。
      </p>
    </section>
  );
}
