'use client';
import { useState } from 'react';
import { QuantityField } from '@/app/tool/_components/quantity';
import { electricalFormat, rcTime } from '@/lib/tools/electrical';
import { attempt } from '@/lib/tools/core';
import {
  Choice,
  ToolPanel,
  ResultRows,
  Notice,
  DiagramPart,
  ToolActions,
} from '@/app/tool/_components/controls';
function RcCircuit({
  r,
  c,
  supply,
  mode,
}: {
  r?: number;
  c?: number;
  supply?: number;
  mode: 'charge' | 'discharge';
}) {
  return (
    <svg viewBox="0 0 360 165" aria-label="RC 充放電標準電路">
      <title>{`RC ${mode === 'charge' ? '充電' : '放電'}電路`}</title>
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M55 25H115M165 25H225V62M225 72V105H55V80M55 25V50" />
        {mode === 'charge' ? (
          <>
            <circle cx="55" cy="65" r="15" />
            <path d="M47 65h16m-8-8v16" />
          </>
        ) : (
          <path d="M55 50V80" />
        )}
        <rect x="115" y="15" width="50" height="20" />
        <path d="M207 62h36m-36 10h36" />
      </g>
      <DiagramPart field="輸入電壓">
        <text x="25" y="140" fontSize="14">
          {mode === 'charge' ? 'Vin' : '初始電壓'}{' '}
          {supply ? `${electricalFormat(supply)} V` : ''}
        </text>
      </DiagramPart>
      <DiagramPart field="R">
        <text x="116" y="12">
          R {r ? `${electricalFormat(r)} Ω` : ''}
        </text>
      </DiagramPart>
      <DiagramPart field="C">
        <text x="245" y="75" fontSize="12">
          C {c ? `${electricalFormat(c)} F` : ''}
        </text>
      </DiagramPart>
      <DiagramPart field="時間 t">
        <text x="210" y="140" fontSize="14">
          {mode === 'charge' ? '充電' : '放電'}，t
        </text>
      </DiagramPart>
    </svg>
  );
}
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
  const example = () => {
    setR('10000');
    setC('.0001');
    setTime('1');
    setMode('charge');
    setSupply('5');
  };
  const clear = () => {
    setR('');
    setC('');
    setTime('');
    setSupply('');
  };
  const res = attempt(() => rcTime(r, c, time, mode, supply));
  const numericTime = Number(time);
  return (
    <ToolPanel
      diagram={
        res.data ? (
          <>
            <RcCircuit
              r={Number(r)}
              c={Number(c)}
              supply={Number(supply)}
              mode={mode}
            />
            <RcCurve
              tau={res.data.tau}
              time={Number.isFinite(numericTime) ? numericTime : 0}
              mode={mode}
            />
          </>
        ) : (
          <RcCircuit mode={mode} />
        )
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
        <QuantityField
          label="R"
          value={r}
          onChange={setR}
          kind="resistance"
          initialUnit="kΩ"
        />
        <QuantityField
          label="C"
          value={c}
          onChange={setC}
          kind="capacitance"
          initialUnit="µF"
        />
        <QuantityField
          label="時間 t"
          value={time}
          onChange={setTime}
          kind="time"
          initialUnit="s"
        />
        <QuantityField
          label="輸入電壓"
          value={supply}
          onChange={setSupply}
          kind="voltage"
          initialUnit="V"
        />
      </div>
      <ToolActions onExample={example} onClear={clear} />
    </ToolPanel>
  );
}
