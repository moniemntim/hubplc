'use client';
import { useState } from 'react';
import { QuantityField } from '@/app/tool/_components/quantity';
import {
  acElectrical,
  dcElectrical,
  electricalFormat,
} from '@/lib/tools/electrical';
import { attempt } from '@/lib/tools/core';
import {
  NumberField,
  Choice,
  ToolPanel,
  ResultRows,
  Notice,
  DiagramPart,
  ToolActions,
} from '@/app/tool/_components/controls';
const dcOptions = [
  { value: 'v', label: '電壓 V' },
  { value: 'i', label: '電流 A' },
  { value: 'r', label: '電阻 Ω' },
  { value: 'p', label: '功率 W' },
] as const;
function ElectricalDiagram({
  kind,
  phase,
  known,
  dcKeys,
  pf,
  data,
}: {
  kind: string;
  phase: 'single' | 'three';
  known: 'power' | 'current';
  dcKeys: [string, string];
  pf: string;
  data?: { v: number; i: number; r?: number; p: number; va?: number };
}) {
  const fieldFor = (key: string) =>
    dcKeys[0] === key ? '數值 1' : dcKeys[1] === key ? '數值 2' : '';
  if (kind === 'dc') {
    const label = (key: 'v' | 'i' | 'r' | 'p', unit: string) =>
      data
        ? `${electricalFormat(key === 'r' ? (data.r ?? NaN) : data[key])} ${unit}`
        : '';
    return (
      <svg viewBox="0 0 360 190" aria-label="直流電源與理想電阻負載">
        <title>直流理想電阻負載</title>
        <g fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M95 35H260V70M260 120V155H95M95 35V75M95 115V155" />
          <path d="M78 75H112M84 115H106" />
          <rect x="247" y="70" width="26" height="50" />
        </g>
        <DiagramPart field={fieldFor('v')}>
          <text x="48" y="65">
            V {label('v', 'V')}
          </text>
        </DiagramPart>
        <DiagramPart field={fieldFor('r')}>
          <text x="278" y="100">
            R {label('r', 'Ω')}
          </text>
        </DiagramPart>
        <DiagramPart field={fieldFor('i')}>
          <text x="145" y="24">
            I {label('i', 'A')} →
          </text>
        </DiagramPart>
        <DiagramPart field={fieldFor('p')}>
          <text x="145" y="178">
            P {label('p', 'W')}
          </text>
        </DiagramPart>
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 360 190"
      aria-label={phase === 'three' ? '平衡三相負載與線電壓' : '單相交流負載'}
    >
      <title>
        {phase === 'three' ? '平衡三相以線電壓與線電流計算' : '單相交流負載'}
      </title>
      <g fill="none" stroke="currentColor" strokeWidth="2">
        {phase === 'three' ? (
          <>
            <path d="M55 45H235M55 95H235M55 145H235" />
            <rect x="235" y="28" width="70" height="134" rx="8" />
          </>
        ) : (
          <>
            <path d="M90 45H250V72M250 118V145H90M90 45V70M90 120V145" />
            <circle cx="90" cy="95" r="25" />
            <path d="M75 95c5-17 10 17 15 0s10-17 15 0" />
            <rect x="235" y="72" width="30" height="46" />
          </>
        )}
      </g>
      <DiagramPart field={phase === 'three' ? '線電壓' : 'RMS 電壓'}>
        <text x="70" y="20">
          {phase === 'three' ? 'VL' : 'Vrms'}{' '}
          {data ? `${electricalFormat(data.v)} V` : ''}
        </text>
      </DiagramPart>
      <DiagramPart field="功率因數">
        <text x="70" y="178">
          PF {data ? pf : ''}
        </text>
      </DiagramPart>
      <DiagramPart field={known === 'power' ? '實功率' : '電流'}>
        <text x="235" y="178">
          P {data ? `${electricalFormat(data.p)} W` : ''}
        </text>
      </DiagramPart>
      <text x="250" y="30">
        I {data ? `${electricalFormat(data.i)} A` : ''}
      </text>
      {phase === 'three' && (
        <>
          <text x="28" y="49">
            L1
          </text>
          <text x="28" y="99">
            L2
          </text>
          <text x="28" y="149">
            L3
          </text>
          <text x="247" y="98">
            3φ 負載
          </text>
        </>
      )}
    </svg>
  );
}
export default function Electrical() {
  const [kind, setKind] = useState('dc'),
    [a, setA] = useState('v'),
    [av, setAv] = useState('24'),
    [b, setB] = useState('r'),
    [bv, setBv] = useState('120'),
    [phase, setPhase] = useState<'single' | 'three'>('single'),
    [voltage, setVoltage] = useState('220'),
    [pf, setPf] = useState('.8'),
    [known, setKnown] = useState<'power' | 'current'>('power'),
    [raw, setRaw] = useState('1000');
  const example = () => {
    setKind('dc');
    setA('v');
    setAv('24');
    setB('r');
    setBv('120');
    setPhase('single');
    setVoltage('220');
    setPf('.8');
    setKnown('power');
    setRaw('1000');
  };
  const clear = () => {
    setAv('');
    setBv('');
    setVoltage('');
    setPf('');
    setRaw('');
  };
  const dc = attempt(() =>
    dcElectrical(
      a as 'v' | 'i' | 'r' | 'p',
      av,
      b as 'v' | 'i' | 'r' | 'p',
      bv,
    ),
  );
  const ac = attempt(() => acElectrical(phase, voltage, pf, known, raw));
  const dcResult = dc.data ? (
    <ResultRows
      rows={[
        { label: '電壓', value: electricalFormat(dc.data.v), unit: 'V' },
        { label: '電流', value: electricalFormat(dc.data.i), unit: 'A' },
        { label: '電阻', value: electricalFormat(dc.data.r), unit: 'Ω' },
        { label: '功率', value: electricalFormat(dc.data.p), unit: 'W' },
      ]}
    />
  ) : (
    <Notice>{dc.error}</Notice>
  );
  const acResult = ac.data ? (
    <ResultRows
      rows={[
        { label: '實功率', value: electricalFormat(ac.data.p), unit: 'W' },
        { label: '視在功率', value: electricalFormat(ac.data.va), unit: 'VA' },
        { label: '線電流', value: electricalFormat(ac.data.i), unit: 'A' },
      ]}
    />
  ) : (
    <Notice>{ac.error}</Notice>
  );
  return (
    <ToolPanel
      diagram={
        <ElectricalDiagram
          kind={kind}
          phase={phase}
          known={known}
          dcKeys={[a, b]}
          pf={pf}
          data={
            kind === 'dc'
              ? dc.data
              : ac.data
                ? { ...ac.data, v: Number(voltage) }
                : undefined
          }
        />
      }
      notes={
        kind === 'dc' ? (
          <>直流理想電阻負載：V = I R、P = V I。</>
        ) : (
          <>
            交流使用 RMS 值。平衡三相以線電壓計算：P = √3 × V<sub>L</sub> × I ×
            PF。
          </>
        )
      }
      result={kind === 'dc' ? dcResult : acResult}
    >
      <Choice
        label="電路類型"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'dc', label: '直流' },
          { value: 'ac', label: '交流' },
        ]}
      />
      {kind === 'dc' ? (
        <div className="fields-grid">
          <Choice
            label="已知量 1"
            value={a}
            onChange={setA}
            options={dcOptions}
          />
          <NumberField
            label="數值 1"
            value={av}
            onChange={setAv}
            unit={dcOptions
              .find((option) => option.value === a)
              ?.label.split(' ')
              .at(-1)}
          />
          <Choice
            label="已知量 2"
            value={b}
            onChange={setB}
            options={dcOptions}
          />
          <NumberField
            label="數值 2"
            value={bv}
            onChange={setBv}
            unit={dcOptions
              .find((option) => option.value === b)
              ?.label.split(' ')
              .at(-1)}
          />
        </div>
      ) : (
        <div className="fields-grid">
          <Choice
            label="系統"
            value={phase}
            onChange={(v) => setPhase(v as 'single' | 'three')}
            options={[
              { value: 'single', label: '單相' },
              { value: 'three', label: '平衡三相' },
            ]}
          />
          <QuantityField
            label={phase === 'three' ? '線電壓' : 'RMS 電壓'}
            value={voltage}
            onChange={setVoltage}
            kind="voltage"
            initialUnit="V"
          />
          <NumberField label="功率因數" value={pf} onChange={setPf} />
          <Choice
            label="已知量"
            value={known}
            onChange={(v) => setKnown(v as 'power' | 'current')}
            options={[
              { value: 'power', label: '實功率 W' },
              { value: 'current', label: '電流 A' },
            ]}
          />
          {known === 'current' ? (
            <QuantityField
              label="電流"
              value={raw}
              onChange={setRaw}
              kind="current"
              initialUnit="A"
            />
          ) : (
            <NumberField
              label="實功率"
              value={raw}
              onChange={setRaw}
              unit="W"
            />
          )}
        </div>
      )}
      <ToolActions onExample={example} onClear={clear} />
    </ToolPanel>
  );
}
