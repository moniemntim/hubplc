'use client';
import { useState } from 'react';
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
} from '@/app/tool/_components/controls';
const dcOptions = [
  { value: 'v', label: '電壓 V' },
  { value: 'i', label: '電流 A' },
  { value: 'r', label: '電阻 Ω' },
  { value: 'p', label: '功率 W' },
] as const;
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
          <NumberField label="數值 1" value={av} onChange={setAv} />
          <Choice
            label="已知量 2"
            value={b}
            onChange={setB}
            options={dcOptions}
          />
          <NumberField label="數值 2" value={bv} onChange={setBv} />
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
          <NumberField
            label={phase === 'three' ? '線電壓' : 'RMS 電壓'}
            value={voltage}
            onChange={setVoltage}
            unit="V"
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
          <NumberField
            label={known === 'power' ? '實功率' : '電流'}
            value={raw}
            onChange={setRaw}
            unit={known === 'power' ? 'W' : 'A'}
          />
        </div>
      )}
    </ToolPanel>
  );
}
