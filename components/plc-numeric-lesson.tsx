'use client';

import { useState } from 'react';
import { attempt } from '@/lib/tools/core';
import { compareWithTolerance, roundRaw100 } from '@/lib/numeric-lesson';

type CompareForm = {
  a: string;
  b: string;
  absoluteTolerance: string;
  relativeTolerance: string;
  policy: 'fixed' | 'relative';
};

function ToleranceLesson() {
  const [form, setForm] = useState<CompareForm>({
    a: '25.049',
    b: '25',
    absoluteTolerance: '0.05',
    relativeTolerance: '0.0001',
    policy: 'fixed',
  });
  const result = attempt(() =>
    compareWithTolerance({
      a: form.a,
      b: form.b,
      absoluteTolerance: form.absoluteTolerance,
      relativeTolerance:
        form.policy === 'relative' ? form.relativeTolerance : undefined,
    }),
  );
  const data = result.data;
  return (
    <section
      className="plc-practice analog-lesson"
      id="plc-tolerance-practice"
      aria-labelledby="plc-tolerance-heading"
    >
      <h2 id="plc-tolerance-heading">直接比較：界線兩側會得到什麼？</h2>
      <p>
        瀏覽器使用 JavaScript binary64 計算以下合成值，未執行 PLC REAL／LREAL。
        固定窗口案例的單位都是 °C；相對容差案例是另一條演算法比較規則。
      </p>
      <div className="plc-practice-actions">
        <button
          type="button"
          onClick={() =>
            setForm({
              ...form,
              a: '25.049',
              b: '25',
              absoluteTolerance: '0.05',
              policy: 'fixed',
            })
          }
        >
          載入 25.049：窗口內
        </button>
        <button
          type="button"
          onClick={() =>
            setForm({
              ...form,
              a: '25.051',
              b: '25',
              absoluteTolerance: '0.05',
              policy: 'fixed',
            })
          }
        >
          載入 25.051：窗口外
        </button>
        <button
          type="button"
          onClick={() =>
            setForm({
              ...form,
              a: '1.5',
              b: '1',
              absoluteTolerance: '0.5',
              policy: 'fixed',
            })
          }
        >
          載入可精確表示的等號邊界
        </button>
        <button
          type="button"
          onClick={() =>
            setForm({
              a: '10000.5',
              b: '10000',
              absoluteTolerance: '0.01',
              relativeTolerance: '0.0001',
              policy: 'relative',
            })
          }
        >
          載入相對容差案例
        </button>
      </div>
      <div className="analog-lesson-fields">
        <label>
          第一個值 a
          <input
            inputMode="decimal"
            type="text"
            value={form.a}
            onChange={(event) => setForm({ ...form, a: event.target.value })}
          />
        </label>
        <label>
          第二個值 b
          <input
            inputMode="decimal"
            type="text"
            value={form.b}
            onChange={(event) => setForm({ ...form, b: event.target.value })}
          />
        </label>
        <label>
          比較規則
          <select
            value={form.policy}
            onChange={(event) =>
              setForm({
                ...form,
                policy: event.target.value as CompareForm['policy'],
              })
            }
          >
            <option value="fixed">固定絕對窗口</option>
            <option value="relative">絕對下限與相對容差取較大者</option>
          </select>
        </label>
        <label>
          絕對容差
          <input
            inputMode="decimal"
            type="text"
            value={form.absoluteTolerance}
            onChange={(event) =>
              setForm({ ...form, absoluteTolerance: event.target.value })
            }
          />
        </label>
        {form.policy === 'relative' ? (
          <label>
            相對容差（比例，例如 0.0001）
            <input
              inputMode="decimal"
              type="text"
              value={form.relativeTolerance}
              onChange={(event) =>
                setForm({ ...form, relativeTolerance: event.target.value })
              }
            />
          </label>
        ) : null}
      </div>
      {result.error ? (
        <p role="alert">{result.error}</p>
      ) : data ? (
        <dl className="analog-lesson-results" aria-live="polite">
          <div>
            <dt>binary64 實際差值</dt>
            <dd data-testid="numeric-difference">{String(data.difference)}</dd>
          </div>
          <div>
            <dt>最大允許差</dt>
            <dd data-testid="numeric-limit">{String(data.limit)}</dd>
          </div>
          <div>
            <dt>比較結果</dt>
            <dd data-testid="numeric-close">
              {data.close ? '合格' : '不合格'}
            </dd>
          </div>
        </dl>
      ) : null}
      <p>
        固定窗口不可因數值變大就自動放寬；相對規則只用於需求已明定的演算法比較。
        25.050 − 25 在 binary64 中可能略大於
        0.05，請看上方實際差值，不要靠顯示小數位猜判定。
      </p>
    </section>
  );
}

function RoundingLesson() {
  const [raw, setRaw] = useState('-1235');
  const result = attempt(() => roundRaw100(raw));
  const data = result.data;
  return (
    <section
      className="plc-practice analog-lesson"
      id="plc-rounding-practice"
      aria-labelledby="plc-rounding-heading"
    >
      <h2 id="plc-rounding-heading">直接取整：負數中點如何處理？</h2>
      <p>
        輸入 Raw100 整數，每 1 代表 0.01
        工程單位。頁面採「最近值，剛好中點遠離零」的教學規則；沒有在目標 PLC
        編譯或測試。
      </p>
      <div className="plc-practice-actions">
        {[
          ['1234', '正數低於中點'],
          ['1235', '正數中點'],
          ['-1235', '負數中點'],
          ['-4', '負數接近零'],
        ].map(([value, label]) => (
          <button type="button" key={value} onClick={() => setRaw(value)}>
            載入{label}
          </button>
        ))}
      </div>
      <div className="analog-lesson-fields">
        <label>
          Raw100（整數，−100000 至 100000）
          <input
            inputMode="numeric"
            type="text"
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
          />
        </label>
      </div>
      {result.error ? (
        <p role="alert">{result.error}</p>
      ) : data ? (
        <dl className="analog-lesson-results" aria-live="polite">
          <div>
            <dt>原值</dt>
            <dd data-testid="numeric-raw">{data.rawDisplay}</dd>
          </div>
          <div>
            <dt>絕對值的商／餘數</dt>
            <dd data-testid="numeric-parts">
              {data.quotient} / {data.remainder}
            </dd>
          </div>
          <div>
            <dt>Rounded10 整數</dt>
            <dd data-testid="numeric-rounded">{data.rounded10}</dd>
          </div>
          <div>
            <dt>顯示一位小數</dt>
            <dd data-testid="numeric-display">{data.display}</dd>
          </div>
        </dl>
      ) : null}
      <p>
        顯示字串與真正寫給下游的 Rounded10 是不同欄位。控制比較若仍讀 Raw100，
        不能因畫面顯示一位小數就當成原值已取整。
      </p>
    </section>
  );
}

export default function PlcNumericLesson({
  mode,
}: {
  mode: 'tolerance' | 'rounding';
}) {
  return mode === 'tolerance' ? <ToleranceLesson /> : <RoundingLesson />;
}
