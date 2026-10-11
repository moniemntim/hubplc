'use client';
import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import { useToolLanguage } from '@/components/tool-language';
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
  tr,
}: {
  target: number;
  lower: number;
  upper: number;
  nearest: number;
  tr: (zh: string, en: string) => string;
}) {
  const exact = lower === upper;
  const span = upper - lower || Math.max(lower * 0.1, 1);
  const x = (value: number) => (35 + ((value - lower) / span) * 230).toFixed(2);
  return (
    <svg
      viewBox="0 0 300 100"
      aria-label={tr('標準阻值刻度', 'Preferred resistance scale')}
    >
      <title>{tr('標準阻值刻度', 'Preferred resistance scale')}</title>
      <path d="M35 55H265" stroke="currentColor" />
      <DiagramPart field={tr('目標阻值', 'Target resistance')}>
        <path d={`M${x(target)} 25V70`} stroke="#c49b31" strokeWidth="3" />
        <text x={x(target)} y="20" textAnchor="middle">
          {tr('目標', 'Target')}
        </text>
      </DiagramPart>
      <path d={`M${x(lower)} 45V65M${x(upper)} 45V65`} stroke="currentColor" />
      <circle cx={x(nearest)} cy="55" r="6" fill="#0a9f76" />
      <text x={x(lower)} y="85" textAnchor="middle">
        {exact ? tr('標準值', 'Preferred value') : tr('下', 'Lower')}
      </text>
      {!exact && (
        <text x={x(upper)} y="85" textAnchor="middle">
          {tr('上', 'Upper')}
        </text>
      )}
    </svg>
  );
}
export default function PreferredResistor() {
  const { tr } = useToolLanguage();
  const [value, setValue] = useState('128');
  const [series, setSeries] = useState<PreferredSeries>('E24');
  const result = attempt(() => preferredResistor(value, series));
  return (
    <ToolPanel
      diagram={
        result.data ? (
          <Scale {...result.data} tr={tr} />
        ) : (
          <svg
            viewBox="0 0 300 100"
            aria-label={tr('標準阻值刻度', 'Preferred resistance scale')}
          >
            <title>{tr('標準阻值刻度', 'Preferred resistance scale')}</title>
            <path d="M35 55H265M35 45v20m230-20v20" stroke="currentColor" />
            <text x="150" y="35" textAnchor="middle">
              {tr('請輸入目標阻值', 'Enter a target resistance')}
            </text>
          </svg>
        )
      }
      notes={
        <>
          E
          {tr(
            'E 系列每個十倍區間重複相同的標稱數列。最接近值使用絕對誤差；距離完全相同時，依工具規則選較大值。結果為標稱阻值，未含容差與溫度係數。',
            'E series repeat the same nominal sequence in every decade. The nearest value uses absolute error; ties select the larger value by tool rule. Results are nominal resistance values without tolerance or temperature coefficient.',
          )}
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: tr('較小標準阻值', 'Lower preferred resistance'),
                value: formatNumber(result.data.lower),
                unit: 'Ω',
              },
              {
                label: tr('較大標準阻值', 'Upper preferred resistance'),
                value: formatNumber(result.data.upper),
                unit: 'Ω',
              },
              {
                label: tr('最接近值', 'Nearest value'),
                value: formatNumber(result.data.nearest),
                unit: 'Ω',
              },
              {
                label: tr('相對誤差', 'Relative error'),
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
        label={tr('標準阻值系列', 'Preferred resistance series')}
        value={series}
        onChange={(v) => setSeries(v as PreferredSeries)}
        options={['E6', 'E12', 'E24', 'E48', 'E96'].map((value) => ({
          value,
          label: value,
        }))}
      />
      <QuantityField
        label={tr('目標阻值', 'Target resistance')}
        value={value}
        onChange={setValue}
        kind="resistance"
        initialUnit="Ω"
      />
    </ToolPanel>
  );
}
