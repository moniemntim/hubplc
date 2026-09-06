'use client';
import { useState } from 'react';
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
            inverse={mode === 'inverse'}
          />
          {result.data && (
            <Curve
              label="理想元件電抗的雙對數頻率曲線"
              yLabel={
                '|X|（對數）中點 ' + formatNumber(result.data.magnitude) + ' Ω'
              }
              points={points}
              marker
              field="頻率"
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
            ? 'Xc = 1/(2πfC)，阻抗 −jXc。'
            : 'XL = 2πfL，阻抗 +jXL。'}
          此為理想單一元件電抗，不含實際損耗；曲線兩軸使用對數刻度，範圍為指定頻率的
          0.01 至 100 倍。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: kind === 'capacitor' ? '電容' : '電感',
                value: result.data.component,
                unit: kind === 'capacitor' ? 'F' : 'H',
              },
              { label: '電抗大小', value: result.data.magnitude, unit: 'Ω' },
              {
                label: '阻抗表示',
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
        label="元件"
        value={kind}
        onChange={(v) => {
          setKind(v as typeof kind);
          setValue(v === 'capacitor' ? '1e-7' : '.01');
        }}
        options={[
          { value: 'capacitor', label: '電容（容抗）' },
          { value: 'inductor', label: '電感（感抗）' },
        ]}
      />
      <Choice
        label="計算"
        value={mode}
        onChange={(v) => {
          if (v === 'inverse' && result.data)
            setTarget(String(result.data.magnitude));
          if (v === 'forward' && result.data)
            setValue(String(result.data.component));
          setMode(v);
        }}
        options={[
          { value: 'forward', label: '由元件值計算' },
          { value: 'inverse', label: '反推元件值' },
        ]}
      />
      <div className="fields-grid">
        <QuantityField
          label="頻率"
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
            label="目標電抗"
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
