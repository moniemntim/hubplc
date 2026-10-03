'use client';
import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import {
  acPowerConvert,
  type AcPowerMode,
  type PhaseSystem,
} from '@/lib/tools/power-calculators';
import {
  Choice,
  Notice,
  NumberField,
  ResultRows,
  ToolActions,
  ToolPanel,
} from '../_components/controls';

const modes = [
  { value: 'current-to-power', label: '安培 → W／kW／VA／kVA' },
  { value: 'power-to-current', label: 'W／kW／MW → 安培' },
  { value: 'power-to-voltage', label: 'W／kW／MW → 電壓' },
  { value: 'apparent-to-real', label: 'VA／kVA／MVA → W／kW' },
  { value: 'real-to-apparent', label: 'W／kW／MW → VA／kVA' },
] as const;
export default function AcPowerConverter() {
  const [mode, setMode] = useState<AcPowerMode>('current-to-power');
  const [phase, setPhase] = useState<PhaseSystem>('single');
  const [value, setValue] = useState('10');
  const [unit, setUnit] = useState('A');
  const [other, setOther] = useState('220');
  const [pf, setPf] = useState('0.8');
  const isApparent = mode === 'apparent-to-real';
  const isCurrent = mode === 'current-to-power';
  const needsOther = [
    'current-to-power',
    'power-to-current',
    'power-to-voltage',
  ].includes(mode);
  const result = attempt(() =>
    acPowerConvert(mode, phase, value, unit as never, other, pf),
  );
  const setModeSafely = (next: AcPowerMode) => {
    setMode(next);
    setUnit(
      next === 'current-to-power'
        ? 'A'
        : next === 'apparent-to-real'
          ? 'kVA'
          : 'kW',
    );
    setValue(next === 'current-to-power' ? '10' : '1');
    setOther(
      next === 'power-to-voltage' ? '10' : phase === 'three' ? '380' : '220',
    );
  };
  return (
    <ToolPanel
      notes={
        <>
          直流與單相：S = V × I；平衡三相使用線電壓與線電流：S = √3 × V
          <sub>L</sub> × I<sub>L</sub>。交流實功率 P = S ×
          PF。三相模式的功率是三相合計值。公式參考{' '}
          <a href="https://www.se.com/us/en/faqs/FA101600/">
            Schneider Electric 單相與三相容量公式
          </a>
          。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: '實功率',
                value: formatNumber(result.data.watts),
                unit: 'W',
              },
              {
                label: '實功率',
                value: formatNumber(result.data.watts / 1000),
                unit: 'kW',
              },
              {
                label: '視在功率',
                value: formatNumber(result.data.va),
                unit: 'VA',
              },
              {
                label: '視在功率',
                value: formatNumber(result.data.va / 1000),
                unit: 'kVA',
              },
              {
                label: '視在功率',
                value: formatNumber(result.data.va / 1e6),
                unit: 'MVA',
              },
              ...(result.data.current
                ? [
                    {
                      label: phase === 'three' ? '線電流' : '電流',
                      value: formatNumber(result.data.current),
                      unit: 'A',
                    },
                  ]
                : []),
              ...(result.data.voltage
                ? [
                    {
                      label: phase === 'three' ? '線電壓' : '電壓',
                      value: formatNumber(result.data.voltage),
                      unit: 'V',
                    },
                  ]
                : []),
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label="換算方向"
        value={mode}
        onChange={(v) => setModeSafely(v as AcPowerMode)}
        options={modes}
      />
      <Choice
        label="供電方式"
        value={phase}
        onChange={(v) => setPhase(v as PhaseSystem)}
        options={[
          { value: 'dc', label: '直流' },
          { value: 'single', label: '單相交流' },
          { value: 'three', label: '平衡三相交流' },
        ]}
      />
      <div className="fields-grid">
        <Choice
          label="已知量單位"
          value={unit}
          onChange={setUnit}
          options={
            isCurrent
              ? [{ value: 'A', label: 'A' }]
              : isApparent
                ? [
                    { value: 'VA', label: 'VA' },
                    { value: 'kVA', label: 'kVA' },
                    { value: 'MVA', label: 'MVA' },
                  ]
                : [
                    { value: 'W', label: 'W' },
                    { value: 'kW', label: 'kW' },
                    { value: 'MW', label: 'MW' },
                  ]
          }
        />
        <NumberField
          label={isCurrent ? '電流' : isApparent ? '視在功率' : '實功率'}
          value={value}
          onChange={setValue}
          unit={unit}
        />
        {needsOther && (
          <NumberField
            label={
              mode === 'power-to-voltage'
                ? '電流'
                : phase === 'three'
                  ? '線電壓'
                  : '電壓'
            }
            value={other}
            onChange={setOther}
            unit={mode === 'power-to-voltage' ? 'A' : 'V'}
          />
        )}
        {phase !== 'dc' && (
          <NumberField label="功率因數" value={pf} onChange={setPf} />
        )}
      </div>
      <ToolActions
        onExample={() => {
          setPhase('three');
          setModeSafely('power-to-current');
          setUnit('kW');
          setValue('10');
          setOther('380');
          setPf('0.8');
        }}
        onClear={() => {
          setValue('');
          setOther('');
          setPf('');
        }}
      />
    </ToolPanel>
  );
}
