'use client';
import { useState } from 'react';
import { electricalFormat, rcTime } from '@/lib/tools/electrical';
import { attempt } from '@/lib/tools/core';
import {
  NumberField,
  Choice,
  ToolPanel,
  ResultRows,
  Notice,
} from '@/app/tool/_components/controls';
function RcCurve({
  tau,
  time,
  mode,
}: {
  tau: number;
  time: number;
  mode: 'charge' | 'discharge';
}) {
  const point = (x: number) => {
    const ratio = Math.exp(-x * 5);
    const y = mode === 'charge' ? 1 - ratio : ratio;
    return `${(30 + x * 220).toFixed(4)},${(80 - y * 60).toFixed(4)}`;
  };
  const marker = Math.max(0, Math.min(1, time / (5 * tau)));
  return (
    <svg
      viewBox="0 0 280 110"
      aria-label="RC 充放電曲線，橫軸從零到五個時間常數"
    >
      <title>RC 充放電曲線</title>
      <path d="M30 80V15m0 65h240" stroke="currentColor" fill="none" />
      <path
        d={Array.from(
          { length: 41 },
          (_, i) => `${i ? 'L' : 'M'}${point(i / 40)}`,
        ).join(' ')}
        fill="none"
        stroke="#0a9f76"
        strokeWidth="3"
      />
      <path
        d={`M${(30 + marker * 220).toFixed(4)} 80V15`}
        stroke="#c49b31"
        strokeDasharray="3 3"
      />
      <text x="20" y="97">
        0
      </text>
      <text x="240" y="97">
        5τ
      </text>
      <text x="5" y="20">
        Vin
      </text>
      <text x="5" y="82">
        0
      </text>
    </svg>
  );
}
export default function RcTime() {
  const [r, setR] = useState('10000'),
    [c, setC] = useState('.0001'),
    [time, setTime] = useState('1'),
    [mode, setMode] = useState<'charge' | 'discharge'>('charge'),
    [supply, setSupply] = useState('5');
  const res = attempt(() => rcTime(r, c, time, mode, supply));
  const numericTime = Number(time);
  return (
    <ToolPanel
      diagram={
        res.data ? (
          <RcCurve
            tau={res.data.tau}
            time={Number.isFinite(numericTime) ? numericTime : 0}
            mode={mode}
          />
        ) : undefined
      }
      notes={
        mode === 'charge' ? (
          <>
            充電：V(t) = Vin × (1 − e<sup>−t/RC</sup>)。標準初始電壓為 0 V；1μF
            = 0.000001 F。
          </>
        ) : (
          <>
            放電：V(t) = Vin × e<sup>−t/RC</sup>。標準初始電壓為 Vin；1μF =
            0.000001 F。
          </>
        )
      }
      result={
        res.data ? (
          <ResultRows
            rows={[
              {
                label: '時間常數 τ',
                value: electricalFormat(res.data.tau),
                unit: 's',
              },
              {
                label: '5τ',
                value: electricalFormat(res.data.settle),
                unit: 's',
              },
              {
                label: `t = ${time} s 電壓`,
                value: electricalFormat(res.data.voltage),
                unit: 'V',
              },
              {
                label: '相對輸入電壓',
                value: electricalFormat(res.data.percent),
                unit: '%',
              },
            ]}
          />
        ) : (
          <Notice>{res.error}</Notice>
        )
      }
    >
      <Choice
        label="狀態"
        value={mode}
        onChange={(v) => setMode(v as 'charge' | 'discharge')}
        options={[
          { value: 'charge', label: '充電' },
          { value: 'discharge', label: '放電' },
        ]}
      />
      <div className="fields-grid">
        <NumberField label="R" value={r} onChange={setR} unit="Ω" />
        <NumberField label="C" value={c} onChange={setC} unit="F" />
        <NumberField label="時間 t" value={time} onChange={setTime} unit="s" />
        <NumberField
          label="輸入電壓"
          value={supply}
          onChange={setSupply}
          unit="V"
        />
      </div>
    </ToolPanel>
  );
}
