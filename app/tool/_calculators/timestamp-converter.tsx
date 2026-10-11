'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  formatTaipeiDateTime,
  taipeiToTimestamp,
  timestampToTaipei,
  type TimestampUnit,
} from '@/lib/tools/date-time';
import { attempt } from '@/lib/tools/core';
import { useToolLanguage } from '@/components/tool-language';
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
  const { tr } = useToolLanguage();
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
    ? `${tr('台灣（Asia/Taipei）', 'Taiwan (Asia/Taipei)')} ${result.data.taipei}\nUnix ${tr('秒數', 'seconds')}: ${result.data.seconds}\nUnix ${tr('毫秒', 'milliseconds')}: ${result.data.milliseconds}`
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
            {tr(
              'Unix 時間戳以 UTC 為基準；台灣國家／地區採 IANA 時區',
              'Unix timestamps use UTC; Taiwan uses the IANA time zone',
            )}{' '}
            <code>Asia/Taipei</code>
            {tr(
              '。本工具支援 1900～9999 年的台北時間，格式化會依 IANA 時區資料處理。',
              '. This tool supports Taipei dates from 1900 to 9999 and formats them using IANA time-zone data.',
            )}
          </p>
          <p>
            {tr(
              '秒數與毫秒都必須為整數。日期時間請輸入',
              'Seconds and milliseconds must be integers. Enter date and time as',
            )}{' '}
            <code>YYYY-MM-DD HH:mm:ss</code>
            {tr(
              '，不含時區後綴；工具會把它視為台北當地時間後再換成 UTC Unix 時間戳。日期時間顯示精確到秒；毫秒輸入的剩餘位數保留在 Unix 毫秒結果。Unix 秒數由毫秒向下取整，因此負毫秒時間戳也會向較早的一秒取整。',
              ', without a time-zone suffix; the tool treats it as Taipei local time and converts it to a UTC Unix timestamp. Date-time display is accurate to seconds; remaining digits of millisecond input are kept in the Unix-millisecond result. Unix seconds floor milliseconds, so negative millisecond timestamps also floor to the earlier second.',
            )}
          </p>
        </>
      }
      result={
        result.data ? (
          <>
            <ResultRows
              rows={[
                {
                  label: tr(
                    '台北日期時間（到秒）',
                    'Taipei date and time (seconds)',
                  ),
                  value: result.data.taipei,
                },
                {
                  label: tr('Unix 秒數', 'Unix seconds'),
                  value: String(result.data.seconds),
                  unit: 's',
                },
                {
                  label: tr('Unix 毫秒', 'Unix milliseconds'),
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
        {tr('目前台灣時間：', 'Current Taiwan time:')}
        <strong>{current?.taipei ?? tr('讀取中…', 'Loading…')}</strong>
        {tr('（Asia/Taipei）', ' (Asia/Taipei)')}
      </p>
      {current && (
        <div className="field-help">
          {tr('Unix 秒數：', 'Unix seconds:')}
          {current.seconds}
          <CopyButton
            text={String(current.seconds)}
            label={tr('複製目前秒數', 'Copy current seconds')}
          />
        </div>
      )}
      <Choice
        label={tr('換算方向', 'Conversion direction')}
        value={direction}
        onChange={(value) => setDirection(value as typeof direction)}
        options={[
          {
            value: 'timestamp-to-taipei',
            label: tr('Unix 時間戳 → 台北時間', 'Unix timestamp → Taipei time'),
          },
          {
            value: 'taipei-to-timestamp',
            label: tr('台北時間 → Unix 時間戳', 'Taipei time → Unix timestamp'),
          },
        ]}
      />
      {direction === 'timestamp-to-taipei' ? (
        <div className="fields-grid">
          <TextField
            label={tr('Unix 時間戳', 'Unix timestamp')}
            value={timestamp}
            onChange={setTimestamp}
          />
          <Choice
            label={tr('時間戳單位', 'Timestamp unit')}
            value={unit}
            onChange={(value) => setUnit(value as TimestampUnit)}
            options={[
              { value: 'seconds', label: tr('秒（s）', 'Seconds (s)') },
              {
                value: 'milliseconds',
                label: tr('毫秒（ms）', 'Milliseconds (ms)'),
              },
            ]}
          />
        </div>
      ) : (
        <TextField
          label={tr('台北日期時間', 'Taipei date and time')}
          value={taipei}
          onChange={setTaipei}
        />
      )}
      <div className="action-row">
        <button type="button" className="action" onClick={loadCurrent}>
          {tr('帶入目前時間', 'Use current time')}
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() => setRunning((value) => !value)}
        >
          {running
            ? tr('暫停目前時間', 'Pause current time')
            : tr('繼續目前時間', 'Resume current time')}
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
          {tr('載入範例', 'Load example')}
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() => {
            setTimestamp('');
            setTaipei('');
          }}
        >
          {tr('清空', 'Clear')}
        </button>
      </div>
    </ToolPanel>
  );
}
