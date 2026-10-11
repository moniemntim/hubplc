'use client';
import { useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
import { attempt, formatNumber, numberInput } from '@/lib/tools/core';
import { reactance, reactanceInverse } from '@/lib/tools/frequency';
import {
  Choice,
  Notice,
  ResultRows,
  ToolActions,
  ToolPanel,
} from '@/app/tool/_components/controls';
import { QuantityField } from '@/app/tool/_components/quantity';
import {
  Curve,
  ReactanceDiagram,
} from '@/app/tool/_components/network-components';
export default function Reactance() {
  const { tr } = useToolLanguage();
  const [kind, setKind] = useState<'capacitor' | 'inductor'>('capacitor'),
    [mode, setMode] = useState('forward'),
    [f, setF] = useState('1000'),
    [value, setValue] = useState('1e-7'),
    [target, setTarget] = useState('1591.5494309189535');
  const result = attempt(() => {
    const component =
      mode === 'forward'
        ? value
        : String(reactanceInverse(kind, f, target).component);
    return reactance(kind, f, component);
  });
  const points = Array.from(
    { length: 31 },
    (_, i) =>
      `${i ? 'L' : 'M'}${(45 + (i / 30) * 350).toFixed(4)},${(kind === 'capacitor' ? 30 + (i / 30) * 100 : 130 - (i / 30) * 100).toFixed(4)}`,
  ).join(' ');
  return (
    <ToolPanel
      diagram={
        <>
          <ReactanceDiagram
            kind={kind}
            component={result.data?.component}
            frequency={result.data?.frequency}
          />
          {result.data && (
            <Curve
              label={tr(
                '理想元件電抗的雙對數頻率曲線',
                'Log-log frequency curve of ideal component reactance',
              )}
              yLabel={
                tr('|X|（對數）中點 ', '|X| (log) midpoint ') +
                formatNumber(result.data.magnitude) +
                ' Ω'
              }
              points={points}
              marker
              field={tr('頻率', 'Frequency')}
              lowLabel={formatNumber(result.data.frequency / 100)}
              midLabel={formatNumber(result.data.frequency)}
              highLabel={formatNumber(result.data.frequency * 100)}
            />
          )}
        </>
      }
      notes={
        <>
          {kind === 'capacitor'
            ? tr('Xc = 1/(2πfC)，阻抗 −jXc。', 'Xc = 1/(2πfC), impedance −jXc.')
            : tr('XL = 2πfL，阻抗 +jXL。', 'XL = 2πfL, impedance +jXL.')}
          {tr(
            '此為理想單一元件電抗，不含實際損耗；曲線兩軸使用對數刻度，範圍為指定頻率的 0.01 至 100 倍。',
            'This is ideal single-component reactance and excludes real losses. Both curve axes use logarithmic scales, covering 0.01 to 100 times the specified frequency.',
          )}
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label:
                  kind === 'capacitor'
                    ? tr('電容', 'Capacitor')
                    : tr('電感', 'Inductor'),
                value: result.data.component,
                unit: kind === 'capacitor' ? 'F' : 'H',
              },
              {
                label: tr('電抗大小', 'Reactance magnitude'),
                value: result.data.magnitude,
                unit: 'Ω',
              },
              {
                label: tr('阻抗表示', 'Impedance notation'),
                value: `${kind === 'capacitor' ? '−j' : '+j'}${formatNumber(result.data.magnitude)} Ω`,
              },
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label={tr('元件', 'Component')}
        value={kind}
        onChange={(v) => {
          setKind(v as typeof kind);
          setValue(v === 'capacitor' ? '1e-7' : '.01');
        }}
        options={[
          {
            value: 'capacitor',
            label: tr('電容（容抗）', 'Capacitor (capacitive reactance)'),
          },
          {
            value: 'inductor',
            label: tr('電感（感抗）', 'Inductor (inductive reactance)'),
          },
        ]}
      />
      <Choice
        label={tr('計算', 'Calculation')}
        value={mode}
        onChange={(v) => {
          if (v === 'inverse' && result.data)
            setTarget(String(result.data.magnitude));
          if (v === 'forward' && result.data)
            setValue(String(result.data.component));
          setMode(v);
        }}
        options={[
          {
            value: 'forward',
            label: tr('由元件值計算', 'Calculate from component value'),
          },
          {
            value: 'inverse',
            label: tr('反推元件值', 'Solve for component value'),
          },
        ]}
      />
      <div className="fields-grid">
        <QuantityField
          label={tr('頻率', 'Frequency')}
          value={f}
          onChange={setF}
          kind="frequency"
        />
        {mode === 'forward' ? (
          <QuantityField
            label={kind === 'capacitor' ? 'C' : 'L'}
            value={value}
            onChange={setValue}
            kind={kind === 'capacitor' ? 'capacitance' : 'inductance'}
            initialUnit={kind === 'capacitor' ? 'nF' : 'mH'}
          />
        ) : (
          <QuantityField
            label={tr('目標電抗', 'Target reactance')}
            value={target}
            onChange={setTarget}
            kind="resistance"
          />
        )}
      </div>
      <ToolActions
        onExample={() => {
          setKind('capacitor');
          setMode('forward');
          setF('1000');
          setValue('1e-7');
          setTarget(String(1 / (2 * Math.PI * numberInput('1000') * 1e-7)));
        }}
        onClear={() => {
          setF('');
          setValue('');
          setTarget('');
        }}
      />
    </ToolPanel>
  );
}
