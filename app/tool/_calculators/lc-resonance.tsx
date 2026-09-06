'use client';
import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import { lcResonance } from '@/lib/tools/frequency';
import {
  Choice,
  Notice,
  ResultRows,
  ToolActions,
  ToolPanel,
} from '@/app/tool/_components/controls';
import { QuantityField } from '@/app/tool/_components/quantity';
import { LcDiagram } from '@/app/tool/_components/network-components';
export default function LcResonance() {
  const [known, setKnown] = useState<'lc' | 'lf' | 'cf'>('lc'),
    [a, setA] = useState('.001'),
    [b, setB] = useState('.000001');
  const result = attempt(() => lcResonance(known, a, b));
  const labels =
    known === 'lc' ? ['L', 'C'] : known === 'lf' ? ['L', 'f0'] : ['C', 'f0'];
  const kinds =
    known === 'lc'
      ? ['inductance', 'capacitance']
      : known === 'lf'
        ? ['inductance', 'frequency']
        : ['capacitance', 'frequency'];
  return (
    <ToolPanel
      diagram={<LcDiagram data={result.data} />}
      notes={
        <>
          理想諧振頻率 f0 = 1 / (2π√LC)。此工具不估算元件寄生參數、Q
          值或實際頻寬。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: '電感 L',
                value: formatNumber(result.data.inductance),
                unit: 'H',
              },
              {
                label: '電容 C',
                value: formatNumber(result.data.capacitance),
                unit: 'F',
              },
              {
                label: '諧振頻率 f0',
                value: formatNumber(result.data.frequency),
                unit: 'Hz',
              },
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label="已知量"
        value={known}
        onChange={(v) => setKnown(v as typeof known)}
        options={[
          { value: 'lc', label: 'L 與 C 求頻率' },
          { value: 'lf', label: 'L 與頻率求 C' },
          { value: 'cf', label: 'C 與頻率求 L' },
        ]}
      />
      <div className="fields-grid">
        <QuantityField
          label={labels[0]}
          value={a}
          onChange={setA}
          kind={kinds[0] as 'inductance' | 'capacitance'}
        />
        <QuantityField
          label={labels[1]}
          value={b}
          onChange={setB}
          kind={kinds[1] as 'capacitance' | 'frequency'}
        />
      </div>
      <ToolActions
        onExample={() => {
          setKnown('lc');
          setA('.001');
          setB('.000001');
        }}
        onClear={() => {
          setA('');
          setB('');
        }}
      />
    </ToolPanel>
  );
}
