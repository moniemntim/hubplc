'use client';
import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import { rcFilter, rcFilterInverse } from '@/lib/tools/frequency';
import {
  Choice,
  Notice,
  ResultRows,
  ToolActions,
  ToolPanel,
} from '@/app/tool/_components/controls';
import { QuantityField } from '@/app/tool/_components/quantity';
import { Curve, RcDiagram } from '@/app/tool/_components/network-components';
function Response({
  type,
  cutoff,
  inverse,
}: {
  type: 'lowpass' | 'highpass';
  cutoff: number;
  inverse: boolean;
}) {
  const points = Array.from({ length: 61 }, (_, i) => {
    const ratio = 10 ** ((i / 60) * 4 - 2),
      gain =
        type === 'lowpass'
          ? 1 / Math.hypot(1, ratio)
          : ratio / Math.hypot(1, ratio);
    return `${i ? 'L' : 'M'}${(45 + (i / 60) * 350).toFixed(4)},${(130 - gain * 100).toFixed(4)}`;
  }).join(' ');
  return (
    <Curve
      points={points}
      label="RC 幅度響應，截止點以虛線標示"
      yLabel="|Vout/Vin|：0 至 1"
      marker
      field={inverse ? '目標截止頻率' : '指定頻率'}
      lowLabel={formatNumber(cutoff / 100)}
      midLabel={'fc ' + formatNumber(cutoff)}
      highLabel={formatNumber(cutoff * 100)}
    />
  );
}
export default function RcFilter() {
  const [type, setType] = useState<'lowpass' | 'highpass'>('lowpass'),
    [mode, setMode] = useState('forward'),
    [r, setR] = useState('10000'),
    [c, setC] = useState('1e-8'),
    [sample, setSample] = useState('1000'),
    [target, setTarget] = useState('1591.5494309189535');
  const result = attempt(() => {
    const resistance =
      mode === 'forward' ? r : String(rcFilterInverse(target, c).resistance);
    return rcFilter(type, resistance, c, sample);
  });
  return (
    <ToolPanel
      diagram={
        <>
          <RcDiagram
            type={type}
            resistance={result.data?.resistance}
            capacitance={result.data?.capacitance}
          />
          {result.data && (
            <Response
              type={type}
              cutoff={result.data.cutoff}
              inverse={mode === 'inverse'}
            />
          )}
        </>
      }
      notes={
        <>
          fc = 1/(2πRC)。低通 H = 1/(1+jf/fc)；高通 H =
          j(f/fc)/(1+jf/fc)。理想電源阻抗為零、輸出負載阻抗無限大。曲線橫軸為對數頻率，縱軸為電壓增益。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              { label: '電阻 R', value: result.data.resistance, unit: 'Ω' },
              { label: '截止頻率', value: result.data.cutoff, unit: 'Hz' },
              { label: '指定頻率電壓增益', value: result.data.gain },
              { label: '增益', value: result.data.gainDb, unit: 'dB' },
              { label: '相位', value: result.data.phaseDeg, unit: '°' },
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label="濾波器"
        value={type}
        onChange={(v) => setType(v as typeof type)}
        options={[
          { value: 'lowpass', label: '低通' },
          { value: 'highpass', label: '高通' },
        ]}
      />
      <Choice
        label="計算"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'forward', label: '由 R、C 求截止頻率' },
          { value: 'inverse', label: '由 fc、C 反推 R' },
        ]}
      />
      <div className="fields-grid">
        {mode === 'forward' ? (
          <QuantityField
            label="R"
            value={r}
            onChange={setR}
            kind="resistance"
            initialUnit="kΩ"
          />
        ) : (
          <QuantityField
            label="目標截止頻率"
            value={target}
            onChange={setTarget}
            kind="frequency"
          />
        )}
        <QuantityField
          label="C"
          value={c}
          onChange={setC}
          kind="capacitance"
          initialUnit="nF"
        />
        <QuantityField
          label="指定頻率"
          value={sample}
          onChange={setSample}
          kind="frequency"
        />
      </div>
      <ToolActions
        onExample={() => {
          setType('lowpass');
          setMode('forward');
          setR('10000');
          setC('1e-8');
          setSample('1000');
          setTarget('1591.5494309189535');
        }}
        onClear={() => {
          setR('');
          setC('');
          setSample('');
          setTarget('');
        }}
      />
    </ToolPanel>
  );
}
