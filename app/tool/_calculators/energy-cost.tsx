'use client';
import { useState } from 'react';
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
export default function EnergyCost() {
  const [mode, setMode] = useState<EnergyMode>('from-power');
  const [value, setValue] = useState('1');
  const [unit, setUnit] = useState('kW');
  const [hours, setHours] = useState('8');
  const [days, setDays] = useState('30');
  const [rate, setRate] = useState('3');
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
          用電量 E = P × t；1 kWh = 1000 Wh = 3,600,000
          J。電費是用電量乘以自行輸入的每度電價。實際帳單可能另含級距、契約容量、功率因數、需量、基本費與稅費。公式參考{' '}
          <a href="https://www1.eere.energy.gov/education/pdfs/lesson301.pdf">
            美國能源部 kWh 計算教材
          </a>
          。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: '用電量',
                value: formatNumber(result.data.kwh),
                unit: 'kWh（度）',
              },
              {
                label: '用電量',
                value: formatNumber(result.data.joules),
                unit: 'J',
              },
              {
                label: mode === 'from-power' ? '輸入功率' : '平均功率',
                value: formatNumber(result.data.watts / 1000),
                unit: 'kW',
              },
              {
                label: '估算電費',
                value: formatNumber(result.data.cost),
                unit: '元',
              },
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label="計算方向"
        value={mode}
        onChange={(v) => switchMode(v as EnergyMode)}
        options={[
          { value: 'from-power', label: '功率＋時間 → 用電量與電費' },
          { value: 'from-energy', label: '用電量＋時間 → 平均功率' },
        ]}
      />
      <div className="fields-grid">
        <Choice
          label={mode === 'from-power' ? '功率單位' : '能量單位'}
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
          label={mode === 'from-power' ? '功率' : '用電量'}
          value={value}
          onChange={setValue}
          unit={unit}
        />
        <NumberField
          label={mode === 'from-power' ? '每日使用時間' : '總時間'}
          value={hours}
          onChange={setHours}
          unit="小時"
        />
        {mode === 'from-power' && (
          <NumberField
            label="使用天數"
            value={days}
            onChange={setDays}
            unit="天"
          />
        )}
        <NumberField
          label="每度電價"
          value={rate}
          onChange={setRate}
          unit="元/kWh"
        />
      </div>
      <ToolActions
        onExample={() => {
          switchMode('from-power');
          setValue('1');
          setHours('8');
          setDays('30');
          setRate('3');
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
