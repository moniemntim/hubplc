'use client';

import { useState } from 'react';
import { attempt } from '@/lib/tools/core';
import { plcScale } from '@/lib/tools/plc';
import { useToolLanguage } from '@/components/tool-language';
import {
  Choice,
  Notice,
  NumberField,
  ResultRows,
  ToolPanel,
} from '@/app/tool/_components/controls';

const presets = {
  '4095': ['0', '4095'],
  '27648': ['0', '27648'],
  '32000': ['0', '32000'],
} as const;
export default function PlcScaling() {
  const { tr } = useToolLanguage();
  const [raw, setRaw] = useState('13824');
  const [rawLow, setRawLow] = useState('0');
  const [rawHigh, setRawHigh] = useState('27648');
  const [engineeringLow, setEngineeringLow] = useState('0');
  const [engineeringHigh, setEngineeringHigh] = useState('100');
  const [preset, setPreset] = useState('27648');
  const [direction, setDirection] = useState<
    'raw-to-engineering' | 'engineering-to-raw'
  >('raw-to-engineering');
  const result = attempt(() =>
    plcScale({
      raw,
      rawLow,
      rawHigh,
      engineeringLow,
      engineeringHigh,
      direction,
    }),
  );
  const selectPreset = (value: string) => {
    setPreset(value);
    if (value !== 'custom') {
      const [low, high] = presets[value as keyof typeof presets];
      setRawLow(low);
      setRawHigh(high);
      setRaw(
        direction === 'raw-to-engineering' ? String(Number(high) / 2) : '50',
      );
    }
  };
  return (
    <ToolPanel
      notes={
        <Notice>
          {tr(
            '線性公式：工程值 = 工程下限 + (原始值 − 原始下限) ÷ (原始上限 − 原始下限) × 工程跨度。0–4095、0–27648、0–32000 是常見範例，不代表所有 PLC 的固定規格。',
            'Linear formula: engineering value = engineering low + (raw value − raw low) ÷ (raw high − raw low) × engineering span. 0–4095, 0–27648, and 0–32000 are common examples, not fixed specifications for every PLC.',
          )}
        </Notice>
      }
      result={
        result.error ? (
          <Notice>{result.error}</Notice>
        ) : (
          <ResultRows
            rows={[
              {
                label:
                  direction === 'raw-to-engineering'
                    ? tr('工程值', 'Engineering value')
                    : tr('原始值', 'Raw value'),
                value: result.data!.result,
              },
              {
                label: tr('百分比', 'Percentage'),
                value: result.data!.percentage,
                unit: '%',
              },
              {
                label: tr('狀態', 'Status'),
                value: result.data!.outside
                  ? tr('超出範圍', 'Out of range')
                  : tr('範圍內', 'In range'),
              },
            ]}
          />
        )
      }
    >
      <div className="fields-grid">
        <Choice
          label={tr('方向', 'Direction')}
          value={direction}
          onChange={(value) => setDirection(value as typeof direction)}
          options={[
            {
              value: 'raw-to-engineering',
              label: tr('原始值 → 工程值', 'Raw value → Engineering value'),
            },
            {
              value: 'engineering-to-raw',
              label: tr('工程值 → 原始值', 'Engineering value → Raw value'),
            },
          ]}
        />
        <Choice
          label={tr('原始值預設', 'Raw-value preset')}
          value={preset}
          onChange={selectPreset}
          options={[
            { value: '4095', label: '0–4095' },
            { value: '27648', label: '0–27648' },
            { value: '32000', label: '0–32000' },
            { value: 'custom', label: tr('自訂', 'Custom') },
          ]}
        />
        <NumberField
          label={
            direction === 'raw-to-engineering'
              ? tr('原始值', 'Raw value')
              : tr('工程值', 'Engineering value')
          }
          value={raw}
          onChange={setRaw}
        />
        <NumberField
          label={tr('原始下限', 'Raw low')}
          value={rawLow}
          onChange={(value) => {
            setRawLow(value);
            setPreset('custom');
          }}
        />
        <NumberField
          label={tr('原始上限', 'Raw high')}
          value={rawHigh}
          onChange={(value) => {
            setRawHigh(value);
            setPreset('custom');
          }}
        />
        <NumberField
          label={tr('工程下限', 'Engineering low')}
          value={engineeringLow}
          onChange={setEngineeringLow}
        />
        <NumberField
          label={tr('工程上限', 'Engineering high')}
          value={engineeringHigh}
          onChange={setEngineeringHigh}
        />
      </div>
    </ToolPanel>
  );
}
