'use client';
import { useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
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
  { value: 'apparent-to-current', label: 'VA／kVA／MVA → 安培' },
  { value: 'apparent-to-real', label: 'VA／kVA／MVA → W／kW' },
  { value: 'real-to-apparent', label: 'W／kW／MW → VA／kVA' },
  { value: 'apparent-units', label: 'VA／kVA／MVA 單位換算' },
] as const;
export type AcPowerPreset = {
  mode: AcPowerMode;
  phase?: PhaseSystem;
  unit?: string;
  value?: string;
  other?: string;
  pf?: string;
  fixedMode?: boolean;
};
export default function AcPowerConverter({
  preset = { mode: 'current-to-power' },
}: {
  preset?: AcPowerPreset;
}) {
  const { tr } = useToolLanguage();
  const initialPhase = preset.phase ?? 'single';
  const initialUnit =
    preset.unit ??
    (preset.mode === 'current-to-power'
      ? 'A'
      : ['apparent-to-current', 'apparent-to-real', 'apparent-units'].includes(
            preset.mode,
          )
        ? 'kVA'
        : 'kW');
  const [mode, setMode] = useState<AcPowerMode>(preset.mode);
  const [phase, setPhase] = useState<PhaseSystem>(initialPhase);
  const [value, setValue] = useState(preset.value ?? '10');
  const [unit, setUnit] = useState(initialUnit);
  const [other, setOther] = useState(
    preset.other ?? (initialPhase === 'three' ? '380' : '220'),
  );
  const [pf, setPf] = useState(preset.pf ?? '0.8');
  const isApparent = [
    'apparent-to-current',
    'apparent-to-real',
    'apparent-units',
  ].includes(mode);
  const isCurrent = mode === 'current-to-power';
  const needsOther = [
    'current-to-power',
    'power-to-current',
    'power-to-voltage',
    'apparent-to-current',
  ].includes(mode);
  const needsPowerFactor =
    phase !== 'dc' && !['apparent-to-current', 'apparent-units'].includes(mode);
  const modeOptions = modes.map((item) => ({
    ...item,
    label: tr(
      item.label,
      {
        '安培 → W／kW／VA／kVA': 'Amps → W/kW/VA/kVA',
        'W／kW／MW → 安培': 'W/kW/MW → Amps',
        'W／kW／MW → 電壓': 'W/kW/MW → Voltage',
        'VA／kVA／MVA → 安培': 'VA/kVA/MVA → Amps',
        'VA／kVA／MVA → W／kW': 'VA/kVA/MVA → W/kW',
        'W／kW／MW → VA／kVA': 'W/kW/MW → VA/kVA',
        'VA／kVA／MVA 單位換算': 'VA/kVA/MVA unit conversion',
      }[item.label] ?? item.label,
    ),
  }));
  const result = attempt(() =>
    acPowerConvert(mode, phase, value, unit as never, other, pf),
  );
  const setModeSafely = (next: AcPowerMode) => {
    setMode(next);
    setUnit(
      next === 'current-to-power'
        ? 'A'
        : [
              'apparent-to-current',
              'apparent-to-real',
              'apparent-units',
            ].includes(next)
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
          {tr(
            '直流與單相：S = V × I；平衡三相使用線電壓與線電流：S = √3 × V',
            'DC and single-phase: S = V × I; balanced three-phase uses line voltage and line current: S = √3 × V',
          )}
          <sub>L</sub> × I<sub>L</sub>
          {tr('。交流實功率 P = S ×', '. AC real power P = S ×')}
          {tr(
            'PF。三相模式的功率是三相合計值。公式參考',
            'PF. Power in three-phase mode is the total across all phases. Formula reference:',
          )}{' '}
          <a href="https://www.se.com/us/en/faqs/FA101600/">
            {tr(
              'Schneider Electric 單相與三相容量公式',
              'Schneider Electric single- and three-phase capacity formulas',
            )}
          </a>
          。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              ...(!['apparent-to-current', 'apparent-units'].includes(mode)
                ? [
                    {
                      label: tr('實功率', 'Real power'),
                      value: formatNumber(result.data.watts),
                      unit: 'W',
                    },
                    {
                      label: tr('實功率', 'Real power'),
                      value: formatNumber(result.data.watts / 1000),
                      unit: 'kW',
                    },
                  ]
                : []),
              {
                label: tr('視在功率', 'Apparent power'),
                value: formatNumber(result.data.va),
                unit: 'VA',
              },
              {
                label: tr('視在功率', 'Apparent power'),
                value: formatNumber(result.data.va / 1000),
                unit: 'kVA',
              },
              {
                label: tr('視在功率', 'Apparent power'),
                value: formatNumber(result.data.va / 1e6),
                unit: 'MVA',
              },
              ...(result.data.current
                ? [
                    {
                      label:
                        phase === 'three'
                          ? tr('線電流', 'Line current')
                          : tr('電流', 'Current'),
                      value: formatNumber(result.data.current),
                      unit: 'A',
                    },
                  ]
                : []),
              ...(result.data.voltage
                ? [
                    {
                      label:
                        phase === 'three'
                          ? tr('線電壓', 'Line voltage')
                          : tr('電壓', 'Voltage'),
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
      {!preset.fixedMode && (
        <Choice
          label={tr('換算方向', 'Conversion direction')}
          value={mode}
          onChange={(v) => setModeSafely(v as AcPowerMode)}
          options={modeOptions}
        />
      )}
      <Choice
        label={tr('供電方式', 'Supply type')}
        value={phase}
        onChange={(v) => setPhase(v as PhaseSystem)}
        options={[
          { value: 'dc', label: tr('直流', 'DC') },
          { value: 'single', label: tr('單相交流', 'Single-phase AC') },
          {
            value: 'three',
            label: tr('平衡三相交流', 'Balanced three-phase AC'),
          },
        ]}
      />
      <div className="fields-grid">
        <Choice
          label={tr('已知量單位', 'Known quantity unit')}
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
          label={
            isCurrent
              ? tr('電流', 'Current')
              : isApparent
                ? tr('視在功率', 'Apparent power')
                : tr('實功率', 'Real power')
          }
          value={value}
          onChange={setValue}
          unit={unit}
        />
        {needsOther && (
          <NumberField
            label={
              mode === 'power-to-voltage'
                ? tr('電流', 'Current')
                : phase === 'three'
                  ? tr('線電壓', 'Line voltage')
                  : tr('電壓', 'Voltage')
            }
            value={other}
            onChange={setOther}
            unit={mode === 'power-to-voltage' ? 'A' : 'V'}
          />
        )}
        {needsPowerFactor && (
          <NumberField
            label={tr('功率因數', 'Power factor')}
            value={pf}
            onChange={setPf}
          />
        )}
      </div>
      <ToolActions
        onExample={() => {
          if (preset.fixedMode) {
            setMode(preset.mode);
            setPhase(initialPhase);
            setUnit(initialUnit);
            setValue(preset.value ?? '10');
            setOther(
              preset.other ?? (initialPhase === 'three' ? '380' : '220'),
            );
            setPf(preset.pf ?? '0.8');
          } else {
            setPhase('three');
            setModeSafely('power-to-current');
            setUnit('kW');
            setValue('10');
            setOther('380');
            setPf('0.8');
          }
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
