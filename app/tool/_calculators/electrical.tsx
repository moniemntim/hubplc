'use client';
import { useState } from 'react';
import { QuantityField } from '@/app/tool/_components/quantity';
import {
  acElectrical,
  dcElectrical,
  electricalFormat,
} from '@/lib/tools/electrical';
import { attempt } from '@/lib/tools/core';
import { useToolLanguage } from '@/components/tool-language';
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
const displayElectrical = (value: number) =>
  electricalFormat(Number(value.toPrecision(7)));
function ElectricalDiagram({
  kind,
  phase,
  known,
  dcKeys,
  pf,
  data,
  tr,
}: {
  kind: string;
  phase: 'single' | 'three';
  known: 'power' | 'current';
  dcKeys: [string, string];
  pf: string;
  data?: { v: number; i: number; r?: number; p: number; va?: number };
  tr: (zh: string, en: string) => string;
}) {
  const fieldFor = (key: string) =>
    dcKeys[0] === key
      ? tr('數值 1', 'Value 1')
      : dcKeys[1] === key
        ? tr('數值 2', 'Value 2')
        : '';
  if (kind === 'dc') {
    const label = (key: 'v' | 'i' | 'r' | 'p', unit: string) =>
      data
        ? `${displayElectrical(key === 'r' ? (data.r ?? NaN) : data[key])} ${unit}`
        : '';
    return (
      <svg
        viewBox="0 0 360 190"
        aria-label={tr(
          '直流電源與理想電阻負載',
          'DC supply and ideal resistive load',
        )}
      >
        <title>{tr('直流理想電阻負載', 'Ideal DC resistive load')}</title>
        <g fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M95 35H260V70M260 120V155H95M95 35V75M95 115V155" />
          <path d="M78 75H112M84 115H106" />
          <rect x="247" y="70" width="26" height="50" />
        </g>
        <DiagramPart field={fieldFor('v')}>
          <text x="48" y="65">
            V = {label('v', 'V')}
          </text>
        </DiagramPart>
        <DiagramPart field={fieldFor('r')}>
          <text x="278" y="100">
            R = {label('r', 'Ω')}
          </text>
        </DiagramPart>
        <DiagramPart field={fieldFor('i')}>
          <text x="145" y="24">
            I = {label('i', 'A')} →
          </text>
        </DiagramPart>
        <DiagramPart field={fieldFor('p')}>
          <text x="145" y="178">
            P = {label('p', 'W')}
          </text>
        </DiagramPart>
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 360 190"
      aria-label={
        phase === 'three'
          ? tr(
              '平衡三相負載與線電壓',
              'Balanced three-phase load and line voltage',
            )
          : tr('單相交流負載', 'Single-phase AC load')
      }
    >
      <title>
        {phase === 'three'
          ? tr(
              '平衡三相以線電壓與線電流計算',
              'Balanced three-phase calculation using line voltage and current',
            )
          : tr('單相交流負載', 'Single-phase AC load')}
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
          {phase === 'three' ? 'VL' : 'Vrms'} ={' '}
          {data ? `${displayElectrical(data.v)} V` : ''}
        </text>
      </DiagramPart>
      <DiagramPart field="功率因數">
        <text x="70" y="178">
          PF = {data ? displayElectrical(Number(pf)) : ''}
        </text>
      </DiagramPart>
      <DiagramPart field={known === 'power' ? '實功率' : '電流'}>
        <text x="235" y="178">
          P = {data ? `${displayElectrical(data.p)} W` : ''}
        </text>
      </DiagramPart>
      <text x="250" y="30">
        I = {data ? `${displayElectrical(data.i)} A` : ''}
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
  const { tr } = useToolLanguage();
  const localizedDcOptions = dcOptions.map((option) => ({
    ...option,
    label:
      option.value === 'v'
        ? tr('電壓 V', 'Voltage V')
        : option.value === 'i'
          ? tr('電流 A', 'Current A')
          : option.value === 'r'
            ? tr('電阻 Ω', 'Resistance Ω')
            : tr('功率 W', 'Power W'),
  }));
  const [kind, setKind] = useState('dc'),
    [a, setA] = useState('v'),
    [av, setAv] = useState('24'),
    [b, setB] = useState('r'),
    [bv, setBv] = useState('120'),
    [phase, setPhase] = useState<'single' | 'three'>('single'),
    [voltage, setVoltage] = useState('220'),
    [pf, setPf] = useState('0.8'),
    [known, setKnown] = useState<'power' | 'current'>('power'),
    [raw, setRaw] = useState('1000');
  const example = () => {
    if (kind === 'dc') {
      setA('v');
      setAv('24');
      setB('r');
      setBv('120');
      return;
    }
    setVoltage(phase === 'three' ? '400' : '220');
    setPf('0.8');
    setKnown('current');
    setRaw('10');
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
        {
          label: tr('電壓', 'Voltage'),
          value: displayElectrical(dc.data.v),
          unit: 'V',
        },
        {
          label: tr('電流', 'Current'),
          value: displayElectrical(dc.data.i),
          unit: 'A',
        },
        {
          label: tr('電阻', 'Resistance'),
          value: displayElectrical(dc.data.r),
          unit: 'Ω',
        },
        {
          label: tr('功率', 'Power'),
          value: displayElectrical(dc.data.p),
          unit: 'W',
        },
      ]}
    />
  ) : (
    <Notice>{dc.error}</Notice>
  );
  const acResult = ac.data ? (
    <ResultRows
      rows={[
        {
          label: tr('實功率', 'Real power'),
          value: displayElectrical(ac.data.p),
          unit: 'W',
        },
        {
          label: tr('視在功率', 'Apparent power'),
          value: displayElectrical(ac.data.va),
          unit: 'VA',
        },
        {
          label:
            phase === 'three'
              ? tr('線電流', 'Line current')
              : tr('電流', 'Current'),
          value: displayElectrical(ac.data.i),
          unit: 'A',
        },
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
          tr={tr}
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
          <>
            {tr(
              '直流理想電阻負載：V = I × R；P = V × I。',
              'Ideal DC resistive load: V = I × R; P = V × I.',
            )}
          </>
        ) : phase === 'single' ? (
          <>
            {tr('單相交流使用 RMS 值：', 'Single-phase AC uses RMS values: ')}P
            = V<sub>RMS</sub> × I × PF；S = V<sub>RMS</sub> × I = P ÷ PF。
          </>
        ) : (
          <>
            {tr(
              '平衡三相使用 RMS 線電壓與線電流：',
              'Balanced three-phase uses RMS line voltage and line current: ',
            )}
            P = √3 × V<sub>L</sub> × I<sub>L</sub> × PF；S = √3 × V<sub>L</sub>{' '}
            × I<sub>L</sub> = P ÷ PF。
          </>
        )
      }
      result={kind === 'dc' ? dcResult : acResult}
    >
      <Choice
        label={tr('電路類型', 'Circuit type')}
        value={kind}
        onChange={setKind}
        options={[
          { value: 'dc', label: tr('直流', 'DC') },
          { value: 'ac', label: tr('交流', 'AC') },
        ]}
      />
      {kind === 'dc' ? (
        <div className="fields-grid">
          <Choice
            label={tr('已知量 1', 'Known value 1')}
            value={a}
            onChange={setA}
            options={localizedDcOptions}
          />
          <NumberField
            label={tr('數值 1', 'Value 1')}
            value={av}
            onChange={setAv}
            unit={dcOptions
              .find((option) => option.value === a)
              ?.label.split(' ')
              .at(-1)}
          />
          <Choice
            label={tr('已知量 2', 'Known value 2')}
            value={b}
            onChange={setB}
            options={localizedDcOptions}
          />
          <NumberField
            label={tr('數值 2', 'Value 2')}
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
            label={tr('系統', 'System')}
            value={phase}
            onChange={(v) => setPhase(v as 'single' | 'three')}
            options={[
              { value: 'single', label: tr('單相', 'Single phase') },
              { value: 'three', label: tr('平衡三相', 'Balanced three phase') },
            ]}
          />
          <QuantityField
            label={
              phase === 'three'
                ? tr('線電壓', 'Line voltage')
                : tr('RMS 電壓', 'RMS voltage')
            }
            value={voltage}
            onChange={setVoltage}
            kind="voltage"
            initialUnit="V"
          />
          <NumberField
            label={tr('功率因數', 'Power factor')}
            value={pf}
            onChange={setPf}
          />
          <Choice
            label={tr('已知量', 'Known value')}
            value={known}
            onChange={(v) => setKnown(v as 'power' | 'current')}
            options={[
              { value: 'power', label: tr('實功率 W', 'Real power W') },
              { value: 'current', label: tr('電流 A', 'Current A') },
            ]}
          />
          {known === 'current' ? (
            <QuantityField
              label={tr('電流', 'Current')}
              value={raw}
              onChange={setRaw}
              kind="current"
              initialUnit="A"
            />
          ) : (
            <NumberField
              label={tr('實功率', 'Real power')}
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
