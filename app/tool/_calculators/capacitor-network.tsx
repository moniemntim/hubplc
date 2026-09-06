'use client';
import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import { capacitorNetwork, type NetworkMode } from '@/lib/tools/networks';
import {
  Choice,
  Notice,
  ResultRows,
  ToolActions,
  ToolPanel,
} from '@/app/tool/_components/controls';
import { QuantityField } from '@/app/tool/_components/quantity';
import { NetworkDiagram } from '@/app/tool/_components/network-components';
const example = ['0.0000001', '0.0000001'];
export default function CapacitorNetwork() {
  const [mode, setMode] = useState<NetworkMode>('parallel'),
    [values, setValues] = useState(example);
  const nums = values.map(Number),
    result = attempt(() => capacitorNetwork(nums, mode));
  const update = (i: number, v: string) =>
    setValues((xs) => xs.map((x, n) => (n === i ? v : x)));
  return (
    <ToolPanel
      diagram={
        <NetworkDiagram
          mode={mode}
          values={result.data ? nums : nums.map(() => NaN)}
          symbol="C"
        />
      }
      notes={
        <>
          並聯：Ceq = C1 + C2 + …；串聯：1/Ceq = 1/C1 + 1/C2 +
          …。結果為理想電容值，不推算耐壓。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: '等效電容',
                value: formatNumber(result.data.equivalent),
                unit: 'F',
              },
              { label: '電容數量', value: result.data.count, unit: '顆' },
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label="連接方式"
        value={mode}
        onChange={(v) => setMode(v as NetworkMode)}
        options={[
          { value: 'parallel', label: '並聯' },
          { value: 'series', label: '串聯' },
        ]}
      />
      <div className="fields-grid">
        {values.map((value, i) => (
          <QuantityField
            key={i}
            label={`C${i + 1}`}
            value={value}
            onChange={(v) => update(i, v)}
            kind="capacitance"
            initialUnit="nF"
          />
        ))}
      </div>
      <div className="tool-actions">
        <button
          type="button"
          className="action secondary"
          disabled={values.length >= 20}
          onClick={() => setValues((xs) => [...xs, '0.0000001'])}
        >
          新增電容
        </button>
        <button
          type="button"
          className="action secondary"
          disabled={values.length <= 2}
          onClick={() => setValues((xs) => xs.slice(0, -1))}
        >
          移除最後一顆
        </button>
      </div>
      <ToolActions
        onExample={() => {
          setMode('parallel');
          setValues(example);
        }}
        onClear={() => setValues(['', ''])}
      />
    </ToolPanel>
  );
}
