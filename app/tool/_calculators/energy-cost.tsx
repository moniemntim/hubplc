'use client';
import { useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
import { attempt, formatNumber } from '@/lib/tools/core';
import { energyAndCost, type EnergyMode } from '@/lib/tools/power-calculators';
import {
  Choice,
  Notice,
  NumberField,
  ResultRows,
  ToolActions,
  ToolPanel,
} from '../_components/controls';
export type EnergyPreset = {
  mode: EnergyMode;
  unit?: string;
  value?: string;
  hours?: string;
  days?: string;
  rate?: string;
  fixedMode?: boolean;
  showCost?: boolean;
};
export default function EnergyCost({
  preset = { mode: 'from-power' },
}: {
  preset?: EnergyPreset;
}) {
  const { tr } = useToolLanguage();
  const showCost = preset.showCost !== false;
  const initialUnit =
    preset.unit ?? (preset.mode === 'from-power' ? 'kW' : 'kWh');
  const [mode, setMode] = useState<EnergyMode>(preset.mode);
  const [value, setValue] = useState(preset.value ?? '1');
  const [unit, setUnit] = useState(initialUnit);
  const [hours, setHours] = useState(
    preset.hours ?? (preset.mode === 'from-power' ? '8' : '1'),
  );
  const [days, setDays] = useState(preset.days ?? '30');
  const [rate, setRate] = useState(preset.rate ?? '3');
  const result = attempt(() =>
    energyAndCost(mode, value, unit as never, hours, days, rate),
  );
  const switchMode = (next: EnergyMode) => {
    setMode(next);
    setUnit(next === 'from-power' ? 'kW' : 'kWh');
    setValue('1');
    setHours(next === 'from-power' ? '8' : '1');
  };
  return (
    <ToolPanel
      notes={
        <>
          {showCost
            ? tr(
                '用電量 E = P × t；1 kWh = 1000 Wh = 3,600,000 J。電費是用電量乘以自行輸入的每度電價。實際帳單可能另含級距、契約容量、功率因數、需量、基本費與稅費。公式參考',
                'Energy E = P × t; 1 kWh = 1000 Wh = 3,600,000 J. Cost is energy use multiplied by your entered price per kWh. Actual bills may also include tiers, contracted capacity, power factor, demand, base charges, and taxes. Formula reference:',
              )
            : tr(
                '用電量 E = P × t；1 kWh = 1000 Wh = 3,600,000 J。反推功率為區間平均值，不代表瞬時峰值。公式參考',
                'Energy E = P × t; 1 kWh = 1000 Wh = 3,600,000 J. Reverse-calculated power is an interval average, not an instantaneous peak. Formula reference:',
              )}{' '}
          <a href="https://www1.eere.energy.gov/education/pdfs/lesson301.pdf">
            {tr(
              '美國能源部 kWh 計算教材',
              'US Department of Energy kWh calculation guide',
            )}
          </a>
          。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: tr('用電量', 'Energy use'),
                value: formatNumber(result.data.kwh),
                unit: tr('kWh（度）', 'kWh'),
              },
              {
                label: tr('用電量', 'Energy use'),
                value: formatNumber(result.data.joules),
                unit: 'J',
              },
              ...(mode === 'from-power'
                ? [
                    {
                      label: tr('輸入功率', 'Input power'),
                      value: formatNumber(result.data.watts / 1000),
                      unit: 'kW',
                    },
                  ]
                : [
                    {
                      label: tr('平均功率', 'Average power'),
                      value: formatNumber(result.data.watts),
                      unit: 'W',
                    },
                    {
                      label: tr('平均功率', 'Average power'),
                      value: formatNumber(result.data.watts / 1000),
                      unit: 'kW',
                    },
                  ]),
              ...(showCost
                ? [
                    {
                      label: tr('估算電費', 'Estimated cost'),
                      value: formatNumber(result.data.cost),
                      unit: tr('元', 'currency units'),
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
          label={tr('計算方向', 'Calculation direction')}
          value={mode}
          onChange={(v) => switchMode(v as EnergyMode)}
          options={[
            {
              value: 'from-power',
              label: tr(
                '功率＋時間 → 用電量與電費',
                'Power + time → energy use and cost',
              ),
            },
            {
              value: 'from-energy',
              label: tr(
                '用電量＋時間 → 平均功率',
                'Energy use + time → average power',
              ),
            },
          ]}
        />
      )}
      <div className="fields-grid">
        <Choice
          label={
            mode === 'from-power'
              ? tr('功率單位', 'Power unit')
              : tr('能量單位', 'Energy unit')
          }
          value={unit}
          onChange={setUnit}
          options={
            mode === 'from-power'
              ? [
                  { value: 'W', label: 'W' },
                  { value: 'kW', label: 'kW' },
                  { value: 'MW', label: 'MW' },
                ]
              : [
                  { value: 'J', label: 'J' },
                  { value: 'Wh', label: 'Wh' },
                  { value: 'kWh', label: 'kWh' },
                  { value: 'MWh', label: 'MWh' },
                ]
          }
        />
        <NumberField
          label={
            mode === 'from-power'
              ? tr('功率', 'Power')
              : tr('用電量', 'Energy use')
          }
          value={value}
          onChange={setValue}
          unit={unit}
        />
        <NumberField
          label={
            mode === 'from-power'
              ? tr('每日使用時間', 'Daily usage time')
              : tr('總時間', 'Total time')
          }
          value={hours}
          onChange={setHours}
          unit={tr('小時', 'hours')}
        />
        {mode === 'from-power' && (
          <NumberField
            label={tr('使用天數', 'Usage days')}
            value={days}
            onChange={setDays}
            unit={tr('天', 'days')}
          />
        )}
        {showCost && (
          <NumberField
            label={tr('每度電價', 'Price per kWh')}
            value={rate}
            onChange={setRate}
            unit={tr('元/kWh', 'currency/kWh')}
          />
        )}
      </div>
      <ToolActions
        onExample={() => {
          setMode(preset.mode);
          setUnit(initialUnit);
          setValue(preset.value ?? '1');
          setHours(preset.hours ?? (preset.mode === 'from-power' ? '8' : '1'));
          setDays(preset.days ?? '30');
          setRate(preset.rate ?? '3');
        }}
        onClear={() => {
          setValue('');
          setHours('');
          setDays('');
          setRate('');
        }}
      />
    </ToolPanel>
  );
}
