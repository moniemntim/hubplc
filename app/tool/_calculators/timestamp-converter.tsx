'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  formatTaipeiDateTime,
  taipeiToTimestamp,
  timestampToTaipei,
  type TimestampUnit,
} from '@/lib/tools/date-time';
import { attempt } from '@/lib/tools/core';
import {
  Choice,
  CopyButton,
  Notice,
  ResultRows,
  TextField,
  ToolPanel,
} from '../_components/controls';

const exampleSeconds = '1709251200';
const exampleDate = '2024-03-01 08:00:00';

export default function TimestampConverter() {
  const [direction, setDirection] = useState<
    'timestamp-to-taipei' | 'taipei-to-timestamp'
  >('timestamp-to-taipei');
  const [unit, setUnit] = useState<TimestampUnit>('seconds');
  const [timestamp, setTimestamp] = useState(exampleSeconds);
  const [taipei, setTaipei] = useState(exampleDate);
  const [now, setNow] = useState<number | null>(null);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const result = attempt(() =>
    direction === 'timestamp-to-taipei'
      ? timestampToTaipei(timestamp, unit)
      : taipeiToTimestamp(taipei),
  );
  const current = useMemo(
    () =>
      now === null ? null : timestampToTaipei(String(now), 'milliseconds'),
    [now],
  );
  const copyText = result.data
    ? `台灣（Asia/Taipei） ${result.data.taipei}\nUnix 秒數：${result.data.seconds}\nUnix 毫秒：${result.data.milliseconds}`
    : '';

  function loadCurrent() {
    const currentTimestamp = Date.now();
    if (direction === 'timestamp-to-taipei')
      setTimestamp(
        unit === 'seconds'
          ? String(Math.floor(currentTimestamp / 1000))
          : String(currentTimestamp),
      );
    else setTaipei(formatTaipeiDateTime(currentTimestamp));
  }

  return (
    <ToolPanel
      notes={
        <>
          <p>
            Unix 時間戳以 UTC 為基準；台灣國家／地區採 IANA 時區{' '}
            <code>Asia/Taipei</code>。 本工具支援 1900～9999
            年的台北時間，格式化會依 IANA 時區資料處理。
          </p>
          <p>
            秒數與毫秒都必須為整數。日期時間請輸入{' '}
            <code>YYYY-MM-DD HH:mm:ss</code>
            ，不含時區後綴；工具會把它視為台北當地時間後再換成 UTC Unix
            時間戳。日期時間顯示精確到秒；毫秒輸入的剩餘位數保留在 Unix
            毫秒結果。Unix
            秒數由毫秒向下取整，因此負毫秒時間戳也會向較早的一秒取整。
          </p>
        </>
      }
      result={
        result.data ? (
          <>
            <ResultRows
              rows={[
                { label: '台北日期時間（到秒）', value: result.data.taipei },
                {
                  label: 'Unix 秒數',
                  value: String(result.data.seconds),
                  unit: 's',
                },
                {
                  label: 'Unix 毫秒',
                  value: String(result.data.milliseconds),
                  unit: 'ms',
                },
              ]}
            />
            <CopyButton text={copyText} />
          </>
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <p className="field-help">
        目前台灣時間：<strong>{current?.taipei ?? '讀取中…'}</strong>
        （Asia/Taipei）
      </p>
      {current && (
        <div className="field-help">
          Unix 秒數：{current.seconds}
          <CopyButton text={String(current.seconds)} label="複製目前秒數" />
        </div>
      )}
      <Choice
        label="換算方向"
        value={direction}
        onChange={(value) => setDirection(value as typeof direction)}
        options={[
          { value: 'timestamp-to-taipei', label: 'Unix 時間戳 → 台北時間' },
          { value: 'taipei-to-timestamp', label: '台北時間 → Unix 時間戳' },
        ]}
      />
      {direction === 'timestamp-to-taipei' ? (
        <div className="fields-grid">
          <TextField
            label="Unix 時間戳"
            value={timestamp}
            onChange={setTimestamp}
          />
          <Choice
            label="時間戳單位"
            value={unit}
            onChange={(value) => setUnit(value as TimestampUnit)}
            options={[
              { value: 'seconds', label: '秒（s）' },
              { value: 'milliseconds', label: '毫秒（ms）' },
            ]}
          />
        </div>
      ) : (
        <TextField label="台北日期時間" value={taipei} onChange={setTaipei} />
      )}
      <div className="action-row">
        <button type="button" className="action" onClick={loadCurrent}>
          帶入目前時間
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() => setRunning((value) => !value)}
        >
          {running ? '暫停目前時間' : '繼續目前時間'}
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() => {
            setDirection('timestamp-to-taipei');
            setUnit('seconds');
            setTimestamp(exampleSeconds);
            setTaipei(exampleDate);
          }}
        >
          載入範例
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() => {
            setTimestamp('');
            setTaipei('');
          }}
        >
          清空
        </button>
      </div>
    </ToolPanel>
  );
}
