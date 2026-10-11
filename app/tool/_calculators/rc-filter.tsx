'use client';
import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import { rcFilter, rcFilterInverse } from '@/lib/tools/frequency';
import { useToolLanguage } from '@/components/tool-language';
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
  tr,
}: {
  type: 'lowpass' | 'highpass';
  cutoff: number;
  inverse: boolean;
  tr: (zh: string, en: string) => string;
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
      label={tr(
        'RC 幅度響應，截止點以虛線標示',
        'RC magnitude response; cutoff is marked by a dashed line',
      )}
      yLabel={tr('|Vout/Vin|：0 至 1', '|Vout/Vin|: 0 to 1')}
      marker
      field={
        inverse
          ? tr('目標截止頻率', 'Target cutoff frequency')
          : tr('指定頻率', 'Specified frequency')
      }
      lowLabel={formatNumber(cutoff / 100)}
      midLabel={'fc ' + formatNumber(cutoff)}
      highLabel={formatNumber(cutoff * 100)}
    />
  );
}
export default function RcFilter() {
  const { tr } = useToolLanguage();
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
              tr={tr}
            />
          )}
        </>
      }
      notes={
        <>
          {tr(
            'fc = 1/(2πRC)。低通 H = 1/(1+jf/fc)；高通 H = j(f/fc)/(1+jf/fc)。理想電源阻抗為零、輸出負載阻抗無限大。曲線橫軸為對數頻率，縱軸為電壓增益。',
            'fc = 1/(2πRC). Low-pass H = 1/(1+jf/fc); high-pass H = j(f/fc)/(1+jf/fc). Source impedance is ideally zero and output load impedance infinite. The curve uses logarithmic frequency and voltage gain.',
          )}
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: tr('電阻 R', 'Resistance R'),
                value: result.data.resistance,
                unit: 'Ω',
              },
              {
                label: tr('截止頻率', 'Cutoff frequency'),
                value: result.data.cutoff,
                unit: 'Hz',
              },
              {
                label: tr('指定頻率電壓增益', 'Gain at specified frequency'),
                value: result.data.gain,
              },
              {
                label: tr('增益', 'Gain'),
                value: result.data.gainDb,
                unit: 'dB',
              },
              {
                label: tr('相位', 'Phase'),
                value: result.data.phaseDeg,
                unit: '°',
              },
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label={tr('濾波器', 'Filter')}
        value={type}
        onChange={(v) => setType(v as typeof type)}
        options={[
          { value: 'lowpass', label: tr('低通', 'Low-pass') },
          { value: 'highpass', label: tr('高通', 'High-pass') },
        ]}
      />
      <Choice
        label={tr('計算', 'Calculation')}
        value={mode}
        onChange={setMode}
        options={[
          {
            value: 'forward',
            label: tr('由 R、C 求截止頻率', 'Find cutoff from R and C'),
          },
          {
            value: 'inverse',
            label: tr('由 fc、C 反推 R', 'Find R from fc and C'),
          },
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
            label={tr('目標截止頻率', 'Target cutoff frequency')}
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
          label={tr('指定頻率', 'Specified frequency')}
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
