'use client';

import { useState } from 'react';
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
            {formula}。S 使用 VA，電壓使用 V，結果為 A；1 MVA = 1000 kVA =
            1,000,000 VA。電壓與電流皆為有效值（RMS）。
          </p>
          <p>
            單相填負載兩端電壓。三相填三相總視在功率；線電壓是兩條相線之間的電壓，相對中性線電壓則是一條相線對
            N 的電壓。三相結果為每條相線的線電流，適用於平衡負載。
          </p>
          <p>
            VA 已是視在功率，不需要再乘除功率因數。若銘牌只提供 W 或
            kW，需先以實功率除以功率因數換成
            VA。不平衡負載須逐相計算；此結果不包含啟動電流，也不能直接當作斷路器或線徑選型值。
          </p>
          <p>
            公式參考：
            <a href="https://www.se.com/us/en/faqs/FA101600/">
              Schneider Electric 單相與三相容量公式
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
                label: supply === 'single' ? '負載電流' : '線電流（每條相線）',
                value: formatNumber(result.data.amps),
                unit: 'A',
              },
              {
                label: supply === 'single' ? '視在功率' : '三相總視在功率',
                value: formatNumber(result.data.va),
                unit: 'VA',
              },
              { label: '計算公式', value: formula },
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label="供電方式"
        value={supply}
        onChange={(v) => setSupply(v as Supply)}
        options={[
          { value: 'single', label: '單相交流' },
          { value: 'three-line', label: '三相平衡／線電壓' },
          { value: 'three-neutral', label: '三相平衡／相對中性線電壓' },
        ]}
      />
      <Choice
        label="功率單位"
        value={unit}
        onChange={(v) => setUnit(v as typeof unit)}
        options={[
          { value: 'VA', label: 'VA' },
          { value: 'kVA', label: 'kVA' },
          { value: 'MVA', label: 'MVA' },
        ]}
      />
      <NumberField
        label={supply === 'single' ? '視在功率' : '三相總視在功率'}
        value={power}
        onChange={setPower}
        unit={unit}
      />
      <NumberField
        label={
          supply === 'single'
            ? '負載兩端電壓'
            : supply === 'three-line'
              ? '線電壓 VLL'
              : '相對中性線電壓 VLN'
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
