'use client';

import { useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
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
  const { tr } = useToolLanguage();
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
      <svg
        viewBox="0 0 360 175"
        aria-label={tr(
          '電容經固定電阻放電的理想 RC 電路',
          'Ideal RC circuit with a capacitor discharging through a fixed resistor',
        )}
      >
        <title>
          {tr(
            '固定電阻的理想電容放電電路',
            'Ideal capacitor discharge circuit with a fixed resistor',
          )}
        </title>
        <g fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M55 32H110M165 32H245V65M245 75V110H55V32" />
          <rect x="110" y="22" width="55" height="20" />
          <path d="M227 65h36m-36 10h36" />
        </g>
        <DiagramPart field={tr('放電電阻', 'Discharge resistance')}>
          <text x="112" y="17" fontSize="13">
            R {result ? `${formatNumber(result.resistance)} Ω` : ''}
          </text>
        </DiagramPart>
        <DiagramPart field="C">
          <text x="25" y="160" fontSize="12">
            C {result ? `${formatNumber(result.capacitance)} F` : ''}
          </text>
        </DiagramPart>
        <DiagramPart field={tr('初始電壓', 'Initial voltage')}>
          <text x="25" y="140" fontSize="12">
            Vi {result ? `${formatNumber(result.initialVoltage)} V` : ''}
          </text>
        </DiagramPart>
        <DiagramPart field={tr('目標電壓', 'Target voltage')}>
          <text x="335" y="140" textAnchor="end" fontSize="12">
            Vt {result ? `${formatNumber(result.targetVoltage)} V` : ''}
          </text>
        </DiagramPart>
        {mode === 'resistance' && (
          <DiagramPart field={tr('目標時間', 'Target time')}>
            <text x="335" y="160" textAnchor="end" fontSize="12">
              t {result ? `${formatNumber(result.time)} s` : ''}
            </text>
          </DiagramPart>
        )}
      </svg>
      <svg
        viewBox="0 0 280 110"
        aria-label={tr(
          '電容電壓隨時間指數衰減的曲線',
          'Capacitor voltage exponentially decaying over time',
        )}
      >
        <title>{tr('理想 RC 放電曲線', 'Ideal RC discharge curve')}</title>
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
  const { tr } = useToolLanguage();
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
          {tr('公式：V(t) = Vi × e', 'Formula: V(t) = Vi × e')}
          <sup>−t/RC</sup>
          {tr(
            '；t = RC × ln(Vi ÷ Vt)。此工具假設理想固定電阻的 RC 放電，結果不表示實際電容、電阻或電路具備所需耐壓、額定功率或觸碰安全性。參考',
            '; t = RC × ln(Vi ÷ Vt). This tool assumes ideal RC discharge through a fixed resistor. Results do not establish that actual capacitors, resistors, or circuits meet required voltage ratings, power ratings, or touch-safety requirements. Reference:',
          )}{' '}
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
                label: tr('放電時間', 'Discharge time'),
                value: formatNumber(result.data.time),
                unit: 's',
              },
              {
                label: tr('放電電阻', 'Discharge resistance'),
                value: formatNumber(result.data.resistance),
                unit: 'Ω',
              },
              {
                label: tr('時間常數 τ', 'Time constant τ'),
                value: formatNumber(result.data.tau),
                unit: 's',
              },
              {
                label: tr('初始電流', 'Initial current'),
                value: formatNumber(result.data.initialCurrent),
                unit: 'A',
              },
              {
                label: tr('初始功率', 'Initial power'),
                value: formatNumber(result.data.initialPower),
                unit: 'W',
              },
              {
                label: tr('初始儲能', 'Initial stored energy'),
                value: formatNumber(result.data.initialEnergy),
                unit: 'J',
              },
              {
                label: tr('目標電壓儲能', 'Energy at target voltage'),
                value: formatNumber(result.data.finalEnergy),
                unit: 'J',
              },
              {
                label: tr(
                  '至目標電壓已耗散',
                  'Energy dissipated to target voltage',
                ),
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
        label={tr('計算方式', 'Calculation method')}
        value={mode}
        onChange={changeMode}
        options={[
          {
            value: 'time',
            label: tr('由電阻算時間', 'Calculate time from resistance'),
          },
          {
            value: 'resistance',
            label: tr('由時間算電阻', 'Calculate resistance from time'),
          },
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
          label={tr('初始電壓', 'Initial voltage')}
          value={initialVoltage}
          onChange={setInitialVoltage}
          kind="voltage"
          initialUnit="V"
        />
        <QuantityField
          label={tr('目標電壓', 'Target voltage')}
          value={targetVoltage}
          onChange={setTargetVoltage}
          kind="voltage"
          initialUnit="V"
        />
        {mode === 'time' ? (
          <QuantityField
            key="resistance"
            label={tr('放電電阻', 'Discharge resistance')}
            value={known}
            onChange={setKnown}
            kind="resistance"
            initialUnit="kΩ"
          />
        ) : (
          <QuantityField
            key="time"
            label={tr('目標時間', 'Target time')}
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
