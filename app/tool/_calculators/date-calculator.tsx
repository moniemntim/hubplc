'use client';

import { useState } from 'react';
import {
  addCalendarDays,
  dateDifference,
  formatCalendarDate,
  taipeiToday,
} from '@/lib/tools/date-time';
import { attempt, formatNumber } from '@/lib/tools/core';
import { useToolLanguage } from '@/components/tool-language';
import {
  Choice,
  CopyButton,
  Notice,
  ResultRows,
  TextField,
  ToolPanel,
} from '../_components/controls';

export default function DateCalculator() {
  const { tr } = useToolLanguage();
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
      ? tr(
          `${result.data.start} 到 ${result.data.end}\n相差 ${result.data.calendarDays} 天${inclusive ? `（含首尾 ${result.data.inclusiveDays} 天）` : ''}`,
          `${result.data.start} to ${result.data.end}\nDifference: ${result.data.calendarDays} days${inclusive ? ` (including both dates: ${result.data.inclusiveDays} days)` : ''}`,
        )
      : tr(
          `${result.data.baseDate} ${result.data.days >= 0 ? '+' : ''}${result.data.days} 天 = ${result.data.result}`,
          `${result.data.baseDate} ${result.data.days >= 0 ? '+' : ''}${result.data.days} days = ${result.data.result}`,
        )
    : '';

  return (
    <ToolPanel
      notes={
        <>
          <p>
            {tr(
              '日期差以曆法日計算，固定使用 UTC 的日曆座標，因此不會受裝置時區或夏令時間影響。「含首尾」會在兩端都納入計數，例如同一天為 1 天。',
              'Date differences use calendar days in UTC, so device time zones and daylight saving time do not affect them. “Include both dates” counts both ends; the same day is 1 day.',
            )}
          </p>
          <p>
            {tr(
              '日期加減只接受整數天數；輸入正數往後、負數往前。有效範圍為 1900-01-01～9999-12-31，並依格里曆處理閏年。',
              'Date arithmetic accepts integer days only: positive moves forward and negative moves backward. The valid range is 1900-01-01 to 9999-12-31, using Gregorian leap-year rules.',
            )}
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
                    label: tr('結束 − 開始', 'End − start'),
                    value: result.data.signedDays,
                    unit: tr('天', 'days'),
                  },
                  {
                    label: tr('相差曆法日', 'Calendar-day difference'),
                    value: result.data.calendarDays,
                    unit: tr('天', 'days'),
                  },
                  {
                    label: tr('相差週數', 'Whole-week difference'),
                    value: formatNumber(result.data.wholeWeeks),
                    unit: tr('週', 'weeks'),
                  },
                  ...(inclusive
                    ? [
                        {
                          label: tr('含首尾計數', 'Including both dates'),
                          value: result.data.inclusiveDays,
                          unit: tr('天', 'days'),
                        },
                      ]
                    : []),
                ]}
              />
            ) : (
              <ResultRows
                rows={[
                  {
                    label: tr('基準日期', 'Base date'),
                    value: result.data.baseDate,
                  },
                  {
                    label: tr('增減天數', 'Days to add/subtract'),
                    value: result.data.days,
                    unit: tr('天', 'days'),
                  },
                  {
                    label: tr('結果日期', 'Result date'),
                    value: result.data.result,
                  },
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
        label={tr('計算方式', 'Calculation')}
        value={mode}
        onChange={(value) => setMode(value as typeof mode)}
        options={[
          {
            value: 'difference',
            label: tr('計算兩日期相差天數', 'Difference between dates'),
          },
          {
            value: 'add-days',
            label: tr('日期加減天數', 'Add or subtract days'),
          },
        ]}
      />
      {mode === 'difference' ? (
        <>
          <div className="fields-grid">
            <TextField
              label={tr('開始日期', 'Start date')}
              value={start}
              onChange={setStart}
            />
            <TextField
              label={tr('結束日期', 'End date')}
              value={end}
              onChange={setEnd}
            />
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={inclusive}
              onChange={(event) => setInclusive(event.target.checked)}
            />
            {tr('含開始日與結束日', 'Include start and end dates')}
          </label>
        </>
      ) : (
        <div className="fields-grid">
          <TextField
            label={tr('基準日期', 'Base date')}
            value={baseDate}
            onChange={setBaseDate}
          />
          <TextField
            label={tr(
              '增減天數（正／負整數）',
              'Days to add/subtract (positive or negative integer)',
            )}
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
          {tr('帶入台北今日', 'Use today in Taipei')}
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
          {tr('載入範例', 'Load example')}
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
          {tr('清空', 'Clear')}
        </button>
      </div>
    </ToolPanel>
  );
}
