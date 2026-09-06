'use client';
import { useState } from 'react';
import { QuantityField } from '@/app/tool/_components/quantity';
import {
  dividerInverse,
  voltageDivider,
  electricalFormat,
} from '@/lib/tools/electrical';
import { attempt } from '@/lib/tools/core';
import {
  Choice,
  ToolPanel,
  ResultRows,
  Notice,
  DiagramPart,
  ToolActions,
} from '@/app/tool/_components/controls';
export default function VoltageDivider() {
  const [mode, setMode] = useState('forward'),
    [vin, setVin] = useState('24'),
    [r1, setR1] = useState('10000'),
    [r2, setR2] = useState('10000'),
    [out, setOut] = useState('12');
  const example = () => {
    setMode('forward');
    setVin('24');
    setR1('10000');
    setR2('10000');
    setOut('12');
  };
  const clear = () => {
    setVin('');
    setR1('');
    setR2('');
    setOut('');
  };
  const forward = attempt(() => voltageDivider(vin, r1, r2));
  const inverse = attempt(() => dividerInverse(vin, out, r1));
  const activeForward = mode === 'forward' ? forward.data : undefined;
  const activeInverse = mode === 'inverse' ? inverse.data : undefined;
  const result =
    mode === 'forward' ? (
      forward.data ? (
        <ResultRows
          rows={[
            {
              label: '輸出電壓',
              value: electricalFormat(forward.data.vout),
              unit: 'V',
            },
            {
              label: '電流',
              value: electricalFormat(forward.data.current),
              unit: 'A',
            },
            {
              label: 'R1 功耗',
              value: electricalFormat(forward.data.p1),
              unit: 'W',
            },
            {
              label: 'R2 功耗',
              value: electricalFormat(forward.data.p2),
              unit: 'W',
            },
          ]}
        />
      ) : (
        <Notice>{forward.error}</Notice>
      )
    ) : inverse.data ? (
      <ResultRows
        rows={[
          {
            label: '所需 R2',
            value: electricalFormat(inverse.data.r2),
            unit: 'Ω',
          },
        ]}
      />
    ) : (
      <Notice>{inverse.error}</Notice>
    );
  return (
    <ToolPanel
      diagram={
        <svg
          viewBox="0 0 360 220"
          aria-label="Vin 經 R1、R2 串聯接地，Vout 為兩電阻中點且無負載"
        >
          <title>無負載電阻分壓器</title>
          <g fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M120 20V40M120 75V120M120 155V190M105 190H135M110 196H130M115 202H125M120 95H250" />
          </g>
          <DiagramPart field="Vin">
            <text x="82" y="15">
              Vin{' '}
              {activeForward || activeInverse
                ? `${electricalFormat(Number(vin))} V`
                : ''}
            </text>
          </DiagramPart>
          <DiagramPart field="R1">
            <g fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="110" y="40" width="20" height="35" />
            </g>
            <text x="145" y="56">
              R1{' '}
              {activeForward || activeInverse
                ? `${electricalFormat(Number(r1))} Ω`
                : ''}
            </text>
          </DiagramPart>
          <DiagramPart field="R2">
            <g fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="110" y="120" width="20" height="35" />
            </g>
            <text x="145" y="143">
              R2 {activeForward ? `${electricalFormat(Number(r2))} Ω` : ''}
            </text>
          </DiagramPart>
          <circle cx="120" cy="95" r="3" fill="currentColor" />
          <circle
            cx="250"
            cy="95"
            r="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <DiagramPart field="目標 Vout">
            <text x="222" y="81">
              Vout{' '}
              {activeForward
                ? `${electricalFormat(activeForward.vout)} V`
                : activeInverse
                  ? `${electricalFormat(Number(out))} V`
                  : ''}
            </text>
          </DiagramPart>
          <text x="221" y="120">
            無負載
          </text>
          <text x="145" y="202">
            GND (0 V)
          </text>
        </svg>
      }
      notes={
        <>
          <b>公式</b> Vout = Vin × R2 ÷ (R1 +
          R2)。結果假設輸出端無負載；接上負載後須把負載與 R2 並聯。
        </>
      }
      result={result}
    >
      <Choice
        label="計算方式"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'forward', label: '正算輸出' },
          { value: 'inverse', label: '反算 R2' },
        ]}
      />
      <div className="fields-grid">
        <QuantityField
          label="Vin"
          value={vin}
          onChange={setVin}
          kind="voltage"
          initialUnit="V"
        />
        <QuantityField
          label="R1"
          value={r1}
          onChange={setR1}
          kind="resistance"
          initialUnit="kΩ"
        />
        {mode === 'forward' ? (
          <QuantityField
            label="R2"
            value={r2}
            onChange={setR2}
            kind="resistance"
            initialUnit="kΩ"
          />
        ) : (
          <QuantityField
            label="目標 Vout"
            value={out}
            onChange={setOut}
            kind="voltage"
            initialUnit="V"
          />
        )}
      </div>
      <ToolActions onExample={example} onClear={clear} />
    </ToolPanel>
  );
}
