'use client';

import { useState } from 'react';
import { attempt } from '@/lib/tools/core';
import { plcScale } from '@/lib/tools/plc';
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
          線性公式：工程值 = 工程下限 + (原始值 − 原始下限) ÷ (原始上限 −
          原始下限) × 工程跨度。0–4095、0–27648、0–32000 是常見範例，不代表所有
          PLC 的固定規格。
        </Notice>
      }
      result={
        result.error ? (
          <Notice>{result.error}</Notice>
        ) : (
          <ResultRows
            rows={[
              {
                label: direction === 'raw-to-engineering' ? '工程值' : '原始值',
                value: result.data!.result,
              },
              { label: '百分比', value: result.data!.percentage, unit: '%' },
              {
                label: '狀態',
                value: result.data!.outside ? '超出範圍' : '範圍內',
              },
            ]}
          />
        )
      }
    >
      <div className="fields-grid">
        <Choice
          label="方向"
          value={direction}
          onChange={(value) => setDirection(value as typeof direction)}
          options={[
            { value: 'raw-to-engineering', label: '原始值 → 工程值' },
            { value: 'engineering-to-raw', label: '工程值 → 原始值' },
          ]}
        />
        <Choice
          label="原始值預設"
          value={preset}
          onChange={selectPreset}
          options={[
            { value: '4095', label: '0–4095' },
            { value: '27648', label: '0–27648' },
            { value: '32000', label: '0–32000' },
            { value: 'custom', label: '自訂' },
          ]}
        />
        <NumberField
          label={direction === 'raw-to-engineering' ? '原始值' : '工程值'}
          value={raw}
          onChange={setRaw}
        />
        <NumberField
          label="原始下限"
          value={rawLow}
          onChange={(value) => {
            setRawLow(value);
            setPreset('custom');
          }}
        />
        <NumberField
          label="原始上限"
          value={rawHigh}
          onChange={(value) => {
            setRawHigh(value);
            setPreset('custom');
          }}
        />
        <NumberField
          label="工程下限"
          value={engineeringLow}
          onChange={setEngineeringLow}
        />
        <NumberField
          label="工程上限"
          value={engineeringHigh}
          onChange={setEngineeringHigh}
        />
      </div>
    </ToolPanel>
  );
}
