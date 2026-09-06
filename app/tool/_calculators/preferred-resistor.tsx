'use client';
import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import { preferredResistor, type PreferredSeries } from '@/lib/tools/preferred';
import { QuantityField } from '@/app/tool/_components/quantity';
import {
  Choice,
  DiagramPart,
  Notice,
  ResultRows,
  ToolActions,
  ToolPanel,
} from '@/app/tool/_components/controls';
function Scale({
  target,
  lower,
  upper,
  nearest,
}: {
  target: number;
  lower: number;
  upper: number;
  nearest: number;
}) {
  const exact = lower === upper;
  const span = upper - lower || Math.max(lower * 0.1, 1);
  const x = (value: number) => (35 + ((value - lower) / span) * 230).toFixed(2);
  return (
    <svg viewBox="0 0 300 100" aria-label="標準阻值刻度">
      <title>標準阻值刻度</title>
      <path d="M35 55H265" stroke="currentColor" />
      <DiagramPart field="目標阻值">
        <path d={`M${x(target)} 25V70`} stroke="#c49b31" strokeWidth="3" />
        <text x={x(target)} y="20" textAnchor="middle">
          目標
        </text>
      </DiagramPart>
      <path d={`M${x(lower)} 45V65M${x(upper)} 45V65`} stroke="currentColor" />
      <circle cx={x(nearest)} cy="55" r="6" fill="#0a9f76" />
      <text x={x(lower)} y="85" textAnchor="middle">
        {exact ? '標準值' : '下'}
      </text>
      {!exact && (
        <text x={x(upper)} y="85" textAnchor="middle">
          上
        </text>
      )}
    </svg>
  );
}
export default function PreferredResistor() {
  const [value, setValue] = useState('128');
  const [series, setSeries] = useState<PreferredSeries>('E24');
  const result = attempt(() => preferredResistor(value, series));
  return (
    <ToolPanel
      diagram={
        result.data ? (
          <Scale {...result.data} />
        ) : (
          <svg viewBox="0 0 300 100" aria-label="標準阻值刻度">
            <title>標準阻值刻度</title>
            <path d="M35 55H265M35 45v20m230-20v20" stroke="currentColor" />
            <text x="150" y="35" textAnchor="middle">
              請輸入目標阻值
            </text>
          </svg>
        )
      }
      notes={
        <>
          E
          系列每個十倍區間重複相同的標稱數列。最接近值使用絕對誤差；距離完全相同時，依工具規則選較大值。結果為標稱阻值，未含容差與溫度係數。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: '較小標準阻值',
                value: formatNumber(result.data.lower),
                unit: 'Ω',
              },
              {
                label: '較大標準阻值',
                value: formatNumber(result.data.upper),
                unit: 'Ω',
              },
              {
                label: '最接近值',
                value: formatNumber(result.data.nearest),
                unit: 'Ω',
              },
              {
                label: '相對誤差',
                value: formatNumber(result.data.errorPercent),
                unit: '%',
              },
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <ToolActions
        onExample={() => {
          setValue('128');
          setSeries('E24');
        }}
        onClear={() => setValue('')}
      />
      <Choice
        label="標準阻值系列"
        value={series}
        onChange={(v) => setSeries(v as PreferredSeries)}
        options={['E6', 'E12', 'E24', 'E48', 'E96'].map((value) => ({
          value,
          label: value,
        }))}
      />
      <QuantityField
        label="目標阻值"
        value={value}
        onChange={setValue}
        kind="resistance"
        initialUnit="Ω"
      />
    </ToolPanel>
  );
}
