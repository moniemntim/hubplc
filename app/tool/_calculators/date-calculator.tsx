'use client';

import { useState } from 'react';
import {
  addCalendarDays,
  dateDifference,
  formatCalendarDate,
  taipeiToday,
} from '@/lib/tools/date-time';
import { attempt, formatNumber } from '@/lib/tools/core';
import {
  Choice,
  CopyButton,
  Notice,
  ResultRows,
  TextField,
  ToolPanel,
} from '../_components/controls';

export default function DateCalculator() {
  const [mode, setMode] = useState<'difference' | 'add-days'>('difference');
  const [start, setStart] = useState('2024-02-28');
  const [end, setEnd] = useState('2024-03-01');
  const [inclusive, setInclusive] = useState(false);
  const [baseDate, setBaseDate] = useState('2024-02-28');
  const [days, setDays] = useState('2');
  const result = attempt(() =>
    mode === 'difference'
      ? {
          kind: 'difference' as const,
          ...dateDifference(start, end, inclusive),
        }
      : {
          kind: 'add-days' as const,
          baseDate,
          days: Number(days),
          result: formatCalendarDate(addCalendarDays(baseDate, days)),
        },
  );
  const copyText = result.data
    ? result.data.kind === 'difference'
      ? `${result.data.start} 到 ${result.data.end}\n相差 ${result.data.calendarDays} 天${inclusive ? `（含首尾 ${result.data.inclusiveDays} 天）` : ''}`
      : `${result.data.baseDate} ${result.data.days >= 0 ? '+' : ''}${result.data.days} 天 = ${result.data.result}`
    : '';

  return (
    <ToolPanel
      notes={
        <>
          <p>
            日期差以曆法日計算，固定使用 UTC
            的日曆座標，因此不會受裝置時區或夏令時間影響。「含首尾」會在兩端都納入計數，例如同一天為
            1 天。
          </p>
          <p>
            日期加減只接受整數天數；輸入正數往後、負數往前。有效範圍為
            1900-01-01～9999-12-31，並依格里曆處理閏年。
          </p>
        </>
      }
      result={
        result.data ? (
          <>
            {result.data.kind === 'difference' ? (
              <ResultRows
                rows={[
                  {
                    label: '結束 − 開始',
                    value: result.data.signedDays,
                    unit: '天',
                  },
                  {
                    label: '相差曆法日',
                    value: result.data.calendarDays,
                    unit: '天',
                  },
                  {
                    label: '相差週數',
                    value: formatNumber(result.data.wholeWeeks),
                    unit: '週',
                  },
                  ...(inclusive
                    ? [
                        {
                          label: '含首尾計數',
                          value: result.data.inclusiveDays,
                          unit: '天',
                        },
                      ]
                    : []),
                ]}
              />
            ) : (
              <ResultRows
                rows={[
                  { label: '基準日期', value: result.data.baseDate },
                  { label: '增減天數', value: result.data.days, unit: '天' },
                  { label: '結果日期', value: result.data.result },
                ]}
              />
            )}
            <CopyButton text={copyText} />
          </>
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label="計算方式"
        value={mode}
        onChange={(value) => setMode(value as typeof mode)}
        options={[
          { value: 'difference', label: '計算兩日期相差天數' },
          { value: 'add-days', label: '日期加減天數' },
        ]}
      />
      {mode === 'difference' ? (
        <>
          <div className="fields-grid">
            <TextField label="開始日期" value={start} onChange={setStart} />
            <TextField label="結束日期" value={end} onChange={setEnd} />
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={inclusive}
              onChange={(event) => setInclusive(event.target.checked)}
            />
            含開始日與結束日
          </label>
        </>
      ) : (
        <div className="fields-grid">
          <TextField label="基準日期" value={baseDate} onChange={setBaseDate} />
          <TextField
            label="增減天數（正／負整數）"
            value={days}
            onChange={setDays}
          />
        </div>
      )}
      <div className="action-row">
        <button
          type="button"
          className="action"
          onClick={() => {
            const today = taipeiToday();
            if (mode === 'difference') {
              setStart(today);
              setEnd(today);
            } else setBaseDate(today);
          }}
        >
          帶入台北今日
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() => {
            setMode('difference');
            setStart('2024-02-28');
            setEnd('2024-03-01');
            setInclusive(false);
            setBaseDate('2024-02-28');
            setDays('2');
          }}
        >
          載入範例
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() => {
            setStart('');
            setEnd('');
            setBaseDate('');
            setDays('');
          }}
        >
          清空
        </button>
      </div>
    </ToolPanel>
  );
}
