'use client';
import { useState } from 'react';
import { electricalFormat } from '@/lib/tools/electrical';
import { attempt } from '@/lib/tools/core';
import { passiveNetwork, type NetworkMode } from '@/lib/tools/networks';
import {
  Choice,
  ToolPanel,
  ResultRows,
  Notice,
  ToolActions,
} from '@/app/tool/_components/controls';
import { NetworkDiagram } from '@/app/tool/_components/network-components';
import { QuantityField } from '@/app/tool/_components/quantity';
export default function ResistorNetwork() {
  const [mode, setMode] = useState<NetworkMode>('series'),
    [values, setValues] = useState(['100', '220', '330']);
  const numbers = values.map(Number);
  const res = attempt(() => passiveNetwork(numbers, mode, '電阻'));
  return (
    <ToolPanel
      diagram={
        <NetworkDiagram
          mode={mode}
          values={res.data ? numbers : numbers.map(() => NaN)}
        />
      }
      notes={
        <>
          串聯：Req = R1 + R2 + …；並聯：1/Req = 1/R1 + 1/R2 + …。可輸入 2 至 20
          個正電阻值；結果為理想純電阻等效值。
        </>
      }
      result={
        res.data ? (
          <ResultRows
            rows={[
              {
                label: '等效電阻',
                value: electricalFormat(res.data.equivalent),
                unit: 'Ω',
              },
              { label: '電阻數量', value: res.data.count, unit: '顆' },
            ]}
          />
        ) : (
          <Notice>{res.error}</Notice>
        )
      }
    >
      <Choice
        label="連接方式"
        value={mode}
        onChange={(v) => setMode(v as NetworkMode)}
        options={[
          { value: 'series', label: '串聯' },
          { value: 'parallel', label: '並聯' },
        ]}
      />
      <div className="fields-grid">
        {values.map((value, index) => (
          <QuantityField
            key={index}
            label={`R${index + 1}`}
            value={value}
            onChange={(next) =>
              setValues((items) =>
                items.map((item, i) => (i === index ? next : item)),
              )
            }
            kind="resistance"
          />
        ))}
      </div>
      <div className="tool-actions">
        <button
          type="button"
          className="action secondary"
          disabled={values.length >= 20}
          onClick={() => setValues((items) => [...items, '100'])}
        >
          新增電阻
        </button>
        <button
          type="button"
          className="action secondary"
          disabled={values.length <= 2}
          onClick={() => setValues((items) => items.slice(0, -1))}
        >
          移除最後一顆
        </button>
      </div>
      <ToolActions
        onExample={() => {
          setMode('series');
          setValues(['100', '220', '330']);
        }}
        onClear={() => setValues(['', ''])}
      />
    </ToolPanel>
  );
}
