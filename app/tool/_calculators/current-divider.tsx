'use client';
import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import { currentDivider } from '@/lib/tools/networks';
import {
  Choice,
  Notice,
  ResultRows,
  ToolActions,
  ToolPanel,
} from '@/app/tool/_components/controls';
import { QuantityField } from '@/app/tool/_components/quantity';
import { NetworkDiagram } from '@/app/tool/_components/network-components';
const example = ['100', '220', '330'];
export default function CurrentDivider() {
  const [source, setSource] = useState<'voltage' | 'current'>('voltage'),
    [raw, setRaw] = useState('12'),
    [values, setValues] = useState(example);
  const nums = values.map(Number),
    result = attempt(() => currentDivider(nums, source, raw));
  const update = (i: number, v: string) =>
    setValues((xs) => xs.map((x, n) => (n === i ? v : x)));
  return (
    <ToolPanel
      diagram={
        <NetworkDiagram
          mode="parallel"
          values={result.data ? nums : nums.map(() => NaN)}
          currents={result.data?.branches.map((b) => b.current)}
          sourceField={source === 'voltage' ? '電源電壓' : '總電流'}
          sourceText={
            result.data
              ? `電源 ${formatNumber(result.data.voltage)} V · 總電流 ${formatNumber(result.data.totalCurrent)} A`
              : undefined
          }
        />
      }
      notes={
        <>
          並聯支路共用相同電壓；依歐姆定律計算各支路電流與理想功耗。各支路電流總和等於總電流。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: '等效電阻',
                value: formatNumber(result.data.equivalent),
                unit: 'Ω',
              },
              {
                label: '支路電壓',
                value: formatNumber(result.data.voltage),
                unit: 'V',
              },
              {
                label: '總電流',
                value: formatNumber(result.data.totalCurrent),
                unit: 'A',
              },
              {
                label: '總功耗',
                value: formatNumber(result.data.totalPower),
                unit: 'W',
              },
              ...result.data.branches.map((b, i) => ({
                label: `R${i + 1} 支路`,
                value: `${formatNumber(b.current)} A / ${formatNumber(b.percent)}% / ${formatNumber(b.power)} W`,
              })),
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label="已知來源"
        value={source}
        onChange={(v) => setSource(v as typeof source)}
        options={[
          { value: 'voltage', label: '電源電壓' },
          { value: 'current', label: '總電流' },
        ]}
      />
      <QuantityField
        label={source === 'voltage' ? '電源電壓' : '總電流'}
        value={raw}
        onChange={setRaw}
        kind={source === 'voltage' ? 'voltage' : 'current'}
      />
      <div className="fields-grid">
        {values.map((value, i) => (
          <QuantityField
            key={i}
            label={`R${i + 1}`}
            value={value}
            onChange={(v) => update(i, v)}
            kind="resistance"
          />
        ))}
      </div>
      <div className="tool-actions">
        <button
          type="button"
          className="action secondary"
          disabled={values.length >= 20}
          onClick={() => setValues((xs) => [...xs, '100'])}
        >
          新增支路
        </button>
        <button
          type="button"
          className="action secondary"
          disabled={values.length <= 2}
          onClick={() => setValues((xs) => xs.slice(0, -1))}
        >
          移除支路
        </button>
      </div>
      <ToolActions
        onExample={() => {
          setSource('voltage');
          setRaw('12');
          setValues(example);
        }}
        onClear={() => {
          setRaw('');
          setValues(['', '']);
        }}
      />
    </ToolPanel>
  );
}
