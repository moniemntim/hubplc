'use client';
import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import { lcResonance } from '@/lib/tools/frequency';
import { useToolLanguage } from '@/components/tool-language';
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
  const { tr } = useToolLanguage();
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
          {tr(
            '理想諧振頻率 f0 = 1 / (2π√LC)。此工具不估算元件寄生參數、Q 值或實際頻寬。',
            'Ideal resonant frequency f0 = 1 / (2π√LC). This tool does not estimate component parasitics, Q, or actual bandwidth.',
          )}
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: tr('電感 L', 'Inductance L'),
                value: formatNumber(result.data.inductance),
                unit: 'H',
              },
              {
                label: tr('電容 C', 'Capacitance C'),
                value: formatNumber(result.data.capacitance),
                unit: 'F',
              },
              {
                label: tr('諧振頻率 f0', 'Resonant frequency f0'),
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
        label={tr('已知量', 'Known values')}
        value={known}
        onChange={(v) => setKnown(v as typeof known)}
        options={[
          {
            value: 'lc',
            label: tr('L 與 C 求頻率', 'Find frequency from L and C'),
          },
          {
            value: 'lf',
            label: tr('L 與頻率求 C', 'Find C from L and frequency'),
          },
          {
            value: 'cf',
            label: tr('C 與頻率求 L', 'Find L from C and frequency'),
          },
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
