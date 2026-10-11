'use client';

import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import { useToolLanguage } from '@/components/tool-language';
import { dbmWatts, type DbmWattsMode } from '@/lib/tools/power-extras';
import {
  Choice,
  DiagramPart,
  Notice,
  NumberField,
  ResultRows,
  ToolActions,
  ToolPanel,
} from '@/app/tool/_components/controls';

function PowerScale({
  result,
  tr,
}: {
  result?: ReturnType<typeof dbmWatts>;
  tr: (zh: string, en: string) => string;
}) {
  const level = result
    ? Math.max(0, Math.min(100, ((result.dbm + 60) / 120) * 100))
    : 0;
  const outsideRange = result && (result.dbm < -60 || result.dbm > 60);
  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox="0 0 360 145"
        aria-label={tr(
          'dBm 對瓦特的對數功率刻度',
          'Logarithmic dBm-to-watts power scale',
        )}
      >
        <title>
          {tr(
            'dBm 與瓦特的對數功率刻度',
            'Logarithmic dBm and watts power scale',
          )}
        </title>
        <text x="28" y="28" fontSize="13">
          −60 dBm
        </text>
        <text x="168" y="28" fontSize="13">
          0 dBm = 1 mW
        </text>
        <text x="292" y="28" fontSize="13">
          60 dBm
        </text>
        <rect
          x="30"
          y="58"
          width="300"
          height="22"
          rx="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect
          x="30"
          y="58"
          width={(level * 3).toFixed(4)}
          height="22"
          rx="11"
          fill="#0a9f76"
        />
        <path d="M180 52v35" stroke="currentColor" strokeWidth="2" />
        {outsideRange && (
          <path
            d={result.dbm < -60 ? 'M22 69l8-6v12z' : 'M338 69l-8-6v12z'}
            fill="#c49b31"
          />
        )}
        <DiagramPart field="dBm">
          <text x="30" y="120" fontSize="14">
            {result ? `${formatNumber(result.dbm)} dBm` : 'dBm'}
          </text>
        </DiagramPart>
        <DiagramPart field={tr('瓦特', 'Watts')}>
          <text x="205" y="120" fontSize="14">
            {result ? `${formatNumber(result.watts)} W` : tr('瓦特', 'Watts')}
          </text>
        </DiagramPart>
      </svg>
      <figcaption>
        {tr(
          '刻度固定顯示 −60 至 60 dBm；範圍外以端點箭頭標示，結果數值不會被截斷。',
          'The scale always shows −60 to 60 dBm; values outside it use endpoint arrows and are not truncated.',
        )}
      </figcaption>
    </figure>
  );
}

export default function DbmWatts() {
  const { tr } = useToolLanguage();
  const [mode, setMode] = useState<DbmWattsMode>('dbm');
  const [dbm, setDbm] = useState('0');
  const [watts, setWatts] = useState('.001');
  const result = attempt(() => dbmWatts(mode, mode === 'dbm' ? dbm : watts));
  const example = () => {
    setMode('dbm');
    setDbm('0');
    setWatts('.001');
  };
  const clear = () => {
    setDbm('');
    setWatts('');
  };
  return (
    <ToolPanel
      diagram={<PowerScale result={result.data} tr={tr} />}
      notes={
        <>
          {tr('公式：W = 10', 'Formula: W = 10')}
          <sup>(dBm − 30) ÷ 10</sup>
          {tr('；dBm = 10 × log', '; dBm = 10 × log')}
          <sub>10</sub>
          {tr(
            '(W ÷ 1 mW)。dBm 可為負值。參考',
            '(W ÷ 1 mW). dBm may be negative. Reference',
          )}{' '}
          <a href="https://www.digikey.tw/zh/resources/conversion-calculators/conversion-calculator-dbm-to-watts">
            {tr('DigiKey dBm 對瓦數換算', 'DigiKey dBm-to-watts conversion')}
          </a>
          。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: 'dBm',
                value: formatNumber(result.data.dbm),
                unit: 'dBm',
              },
              {
                label: tr('瓦特', 'Watts'),
                value: formatNumber(result.data.watts),
                unit: 'W',
              },
              {
                label: tr('毫瓦', 'Milliwatts'),
                value: formatNumber(result.data.milliwatts),
                unit: 'mW',
              },
              {
                label: 'dBW',
                value: formatNumber(result.data.dbw),
                unit: 'dBW',
              },
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label={tr('轉換方向', 'Conversion direction')}
        value={mode}
        onChange={(value) => {
          if (value === 'watts')
            setWatts(result.data ? String(result.data.watts) : '');
          else setDbm(result.data ? String(result.data.dbm) : '');
          setMode(value as DbmWattsMode);
        }}
        options={[
          { value: 'dbm', label: tr('dBm 轉瓦特', 'dBm to watts') },
          { value: 'watts', label: tr('瓦特轉 dBm', 'Watts to dBm') },
        ]}
      />
      {mode === 'dbm' ? (
        <NumberField label="dBm" value={dbm} onChange={setDbm} unit="dBm" />
      ) : (
        <NumberField
          label={tr('瓦特', 'Watts')}
          value={watts}
          onChange={setWatts}
          unit="W"
        />
      )}
      <ToolActions onExample={example} onClear={clear} />
    </ToolPanel>
  );
}
