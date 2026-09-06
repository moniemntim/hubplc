'use client';

import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import {
  capacitorDischarge,
  type CapacitorDischargeMode,
} from '@/lib/tools/power-extras';
import { QuantityField } from '@/app/tool/_components/quantity';
import {
  Choice,
  DiagramPart,
  Notice,
  ResultRows,
  ToolActions,
  ToolPanel,
} from '@/app/tool/_components/controls';

function DischargeDiagram({
  result,
  mode,
}: {
  result?: ReturnType<typeof capacitorDischarge>;
  mode: CapacitorDischargeMode;
}) {
  const spanInTau = result ? Math.max(5, result.time / result.tau) : 5;
  const point = (x: number) => {
    const y = Math.exp(-x * spanInTau);
    return `${(30 + x * 220).toFixed(4)},${(80 - y * 60).toFixed(4)}`;
  };
  const marker = result ? result.time / result.tau / spanInTau : 0;
  const axisEnd =
    result && spanInTau > 5 ? `t = ${formatNumber(result.time)} s` : '5τ';
  return (
    <>
      <svg viewBox="0 0 360 175" aria-label="電容經固定電阻放電的理想 RC 電路">
        <title>{'固定電阻的理想電容放電電路'}</title>
        <g fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M55 32H110M165 32H245V65M245 75V110H55V32" />
          <rect x="110" y="22" width="55" height="20" />
          <path d="M227 65h36m-36 10h36" />
        </g>
        <DiagramPart field="放電電阻">
          <text x="112" y="17" fontSize="13">
            R {result ? `${formatNumber(result.resistance)} Ω` : ''}
          </text>
        </DiagramPart>
        <DiagramPart field="C">
          <text x="25" y="160" fontSize="12">
            C {result ? `${formatNumber(result.capacitance)} F` : ''}
          </text>
        </DiagramPart>
        <DiagramPart field="初始電壓">
          <text x="25" y="140" fontSize="12">
            Vi {result ? `${formatNumber(result.initialVoltage)} V` : ''}
          </text>
        </DiagramPart>
        <DiagramPart field="目標電壓">
          <text x="335" y="140" textAnchor="end" fontSize="12">
            Vt {result ? `${formatNumber(result.targetVoltage)} V` : ''}
          </text>
        </DiagramPart>
        {mode === 'resistance' && (
          <DiagramPart field="目標時間">
            <text x="335" y="160" textAnchor="end" fontSize="12">
              t {result ? `${formatNumber(result.time)} s` : ''}
            </text>
          </DiagramPart>
        )}
      </svg>
      <svg viewBox="0 0 280 110" aria-label="電容電壓隨時間指數衰減的曲線">
        <title>{'理想 RC 放電曲線'}</title>
        <path d="M30 80V15m0 65h240" stroke="currentColor" fill="none" />
        <path
          d={Array.from(
            { length: 41 },
            (_, index) => `${index ? 'L' : 'M'}${point(index / 40)}`,
          ).join(' ')}
          fill="none"
          stroke="#0a9f76"
          strokeWidth="3"
        />
        {result && (
          <path
            d={`M${(30 + marker * 220).toFixed(4)} 80V15`}
            stroke="#c49b31"
            strokeDasharray="3 3"
          />
        )}
        <text x="20" y="97">
          0
        </text>
        <text x="250" y="97" textAnchor="end">
          {axisEnd}
        </text>
        <text x="5" y="20">
          Vi
        </text>
        <text x="5" y="82">
          0
        </text>
      </svg>
    </>
  );
}

export default function CapacitorDischarge() {
  const [mode, setMode] = useState<CapacitorDischargeMode>('time');
  const [capacitance, setCapacitance] = useState('.0001');
  const [initialVoltage, setInitialVoltage] = useState('24');
  const [targetVoltage, setTargetVoltage] = useState('5');
  const [known, setKnown] = useState('10000');
  const result = attempt(() =>
    capacitorDischarge(mode, capacitance, initialVoltage, targetVoltage, known),
  );
  const example = () => {
    setMode('time');
    setCapacitance('.0001');
    setInitialVoltage('24');
    setTargetVoltage('5');
    setKnown('10000');
  };
  const clear = () => {
    setCapacitance('');
    setInitialVoltage('');
    setTargetVoltage('');
    setKnown('');
  };
  const changeMode = (next: string) => {
    const nextMode = next as CapacitorDischargeMode;
    if (result.data)
      setKnown(
        String(mode === 'time' ? result.data.time : result.data.resistance),
      );
    else setKnown('');
    setMode(nextMode);
  };
  return (
    <ToolPanel
      diagram={<DischargeDiagram result={result.data} mode={mode} />}
      notes={
        <>
          公式：V(t) = Vi × e<sup>−t/RC</sup>；t = RC × ln(Vi ÷
          Vt)。此工具假設理想固定電阻的 RC
          放電，結果不表示實際電容、電阻或電路具備所需耐壓、額定功率或觸碰安全性。參考{' '}
          <a href="https://www.digikey.tw/en/resources/conversion-calculators/conversion-calculator-capacitor-safety-discharge">
            DigiKey Capacitor Safety Discharge Calculator
          </a>
          。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: '放電時間',
                value: formatNumber(result.data.time),
                unit: 's',
              },
              {
                label: '放電電阻',
                value: formatNumber(result.data.resistance),
                unit: 'Ω',
              },
              {
                label: '時間常數 τ',
                value: formatNumber(result.data.tau),
                unit: 's',
              },
              {
                label: '初始電流',
                value: formatNumber(result.data.initialCurrent),
                unit: 'A',
              },
              {
                label: '初始功率',
                value: formatNumber(result.data.initialPower),
                unit: 'W',
              },
              {
                label: '初始儲能',
                value: formatNumber(result.data.initialEnergy),
                unit: 'J',
              },
              {
                label: '目標電壓儲能',
                value: formatNumber(result.data.finalEnergy),
                unit: 'J',
              },
              {
                label: '至目標電壓已耗散',
                value: formatNumber(result.data.energyDissipated),
                unit: 'J',
              },
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label="計算方式"
        value={mode}
        onChange={changeMode}
        options={[
          { value: 'time', label: '由電阻算時間' },
          { value: 'resistance', label: '由時間算電阻' },
        ]}
      />
      <div className="fields-grid">
        <QuantityField
          label="C"
          value={capacitance}
          onChange={setCapacitance}
          kind="capacitance"
          initialUnit="µF"
        />
        <QuantityField
          label="初始電壓"
          value={initialVoltage}
          onChange={setInitialVoltage}
          kind="voltage"
          initialUnit="V"
        />
        <QuantityField
          label="目標電壓"
          value={targetVoltage}
          onChange={setTargetVoltage}
          kind="voltage"
          initialUnit="V"
        />
        {mode === 'time' ? (
          <QuantityField
            key="resistance"
            label="放電電阻"
            value={known}
            onChange={setKnown}
            kind="resistance"
            initialUnit="kΩ"
          />
        ) : (
          <QuantityField
            key="time"
            label="目標時間"
            value={known}
            onChange={setKnown}
            kind="time"
            initialUnit="s"
          />
        )}
      </div>
      <ToolActions onExample={example} onClear={clear} />
    </ToolPanel>
  );
}
