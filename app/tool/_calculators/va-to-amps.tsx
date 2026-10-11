'use client';

import { useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
import { attempt, formatNumber } from '@/lib/tools/core';
import { vaToAmps, type Supply } from '@/lib/tools/va-to-amps';
import {
  Choice,
  Notice,
  NumberField,
  ResultRows,
  ToolActions,
  ToolPanel,
} from '../_components/controls';

export default function VaToAmps() {
  const { tr } = useToolLanguage();
  const [supply, setSupply] = useState<Supply>('single');
  const [unit, setUnit] = useState<'VA' | 'kVA' | 'MVA'>('VA');
  const [power, setPower] = useState('1000');
  const [voltage, setVoltage] = useState('220');
  const result = attempt(() => vaToAmps(power, unit, voltage, supply));
  const formula =
    supply === 'single'
      ? 'I = S ÷ V'
      : supply === 'three-line'
        ? 'I = S ÷ (√3 × VLL)'
        : 'I = S ÷ (3 × VLN)';
  return (
    <ToolPanel
      notes={
        <>
          <p>
            {formula}
            {tr(
              '。S 使用 VA，電壓使用 V，結果為 A；1 MVA = 1000 kVA = 1,000,000 VA。電壓與電流皆為有效值（RMS）。',
              '. S uses VA, voltage uses V, and the result is A; 1 MVA = 1000 kVA = 1,000,000 VA. Voltage and current are RMS values.',
            )}
          </p>
          <p>
            {tr(
              '單相填負載兩端電壓。三相填三相總視在功率；線電壓是兩條相線之間的電壓，相對中性線電壓則是一條相線對 N 的電壓。三相結果為每條相線的線電流，適用於平衡負載。',
              'For single-phase, enter the voltage across the load. For three-phase, enter total apparent power; line voltage is between two phase lines, while line-to-neutral voltage is from one phase line to N. The three-phase result is line current for each phase, for balanced loads.',
            )}
          </p>
          <p>
            {tr(
              'VA 已是視在功率，不需要再乘除功率因數。若銘牌只提供 W 或 kW，需先以實功率除以功率因數換成 VA。不平衡負載須逐相計算；此結果不包含啟動電流，也不能直接當作斷路器或線徑選型值。',
              'VA is already apparent power, so do not multiply or divide by power factor again. If the nameplate provides only W or kW, divide real power by power factor first to obtain VA. Unbalanced loads require per-phase calculation; this result excludes starting current and is not a direct breaker or conductor-sizing value.',
            )}
          </p>
          <p>
            {tr('公式參考：', 'Formula reference:')}
            <a href="https://www.se.com/us/en/faqs/FA101600/">
              {tr(
                'Schneider Electric 單相與三相容量公式',
                'Schneider Electric single- and three-phase capacity formulas',
              )}
            </a>
            。
          </p>
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label:
                  supply === 'single'
                    ? tr('負載電流', 'Load current')
                    : tr('線電流（每條相線）', 'Line current (per phase)'),
                value: formatNumber(result.data.amps),
                unit: 'A',
              },
              {
                label:
                  supply === 'single'
                    ? tr('視在功率', 'Apparent power')
                    : tr('三相總視在功率', 'Total three-phase apparent power'),
                value: formatNumber(result.data.va),
                unit: 'VA',
              },
              { label: tr('計算公式', 'Formula'), value: formula },
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label={tr('供電方式', 'Supply type')}
        value={supply}
        onChange={(v) => setSupply(v as Supply)}
        options={[
          { value: 'single', label: tr('單相交流', 'Single-phase AC') },
          {
            value: 'three-line',
            label: tr(
              '三相平衡／線電壓',
              'Balanced three-phase / line voltage',
            ),
          },
          {
            value: 'three-neutral',
            label: tr(
              '三相平衡／相對中性線電壓',
              'Balanced three-phase / line-to-neutral voltage',
            ),
          },
        ]}
      />
      <Choice
        label={tr('功率單位', 'Power unit')}
        value={unit}
        onChange={(v) => setUnit(v as typeof unit)}
        options={[
          { value: 'VA', label: 'VA' },
          { value: 'kVA', label: 'kVA' },
          { value: 'MVA', label: 'MVA' },
        ]}
      />
      <NumberField
        label={
          supply === 'single'
            ? tr('視在功率', 'Apparent power')
            : tr('三相總視在功率', 'Total three-phase apparent power')
        }
        value={power}
        onChange={setPower}
        unit={unit}
      />
      <NumberField
        label={
          supply === 'single'
            ? tr('負載兩端電壓', 'Voltage across load')
            : supply === 'three-line'
              ? tr('線電壓 VLL', 'Line voltage VLL')
              : tr('相對中性線電壓 VLN', 'Line-to-neutral voltage VLN')
        }
        value={voltage}
        onChange={setVoltage}
        unit="V"
      />
      <ToolActions
        onExample={() => {
          setSupply('single');
          setUnit('VA');
          setPower('1000');
          setVoltage('220');
        }}
        onClear={() => {
          setPower('');
          setVoltage('');
        }}
      />
    </ToolPanel>
  );
}
