'use client';
import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import {
  calculatePowerFactor,
  type PowerFactorMode,
} from '@/lib/tools/power-calculators';
import {
  Choice,
  Notice,
  NumberField,
  ResultRows,
  ToolActions,
  ToolPanel,
} from '../_components/controls';
export default function PowerFactor() {
  const [mode, setMode] = useState<PowerFactorMode>('active-apparent');
  const [active, setActive] = useState('8');
  const [activeUnit, setActiveUnit] = useState('kW');
  const [second, setSecond] = useState('10');
  const [secondUnit, setSecondUnit] = useState('kVA');
  const result = attempt(() =>
    calculatePowerFactor(
      mode,
      active,
      activeUnit as never,
      second,
      secondUnit as never,
    ),
  );
  const switchMode = (next: PowerFactorMode) => {
    setMode(next);
    setSecondUnit(next === 'active-apparent' ? 'kVA' : 'kvar');
    setSecond(next === 'active-apparent' ? '10' : '6');
  };
  return (
    <ToolPanel
      notes={
        <>
          功率因數 PF = P ÷ S；功率三角形為 S² = P² + Q²。Q 為正時顯示落後，Q
          為負時顯示超前。這是正弦穩態的基波功率三角形；諧波明顯時應使用電力分析儀量得的真功率因數。參考{' '}
          <a href="https://www.se.com/hk/en/faqs/FA402515/">
            Schneider Electric：PF = P ÷ S
          </a>
          。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              { label: '功率因數', value: formatNumber(result.data.pf) },
              {
                label: '相位角',
                value: formatNumber(result.data.angleDegrees),
                unit: '°',
              },
              { label: '狀態', value: result.data.direction },
              {
                label: '實功率',
                value: formatNumber(result.data.watts / 1000),
                unit: 'kW',
              },
              {
                label: '虛功率',
                value: formatNumber(result.data.vars / 1000),
                unit: 'kvar',
              },
              {
                label: '視在功率',
                value: formatNumber(result.data.va / 1000),
                unit: 'kVA',
              },
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label="已知資料"
        value={mode}
        onChange={(v) => switchMode(v as PowerFactorMode)}
        options={[
          { value: 'active-apparent', label: '實功率 P＋視在功率 S' },
          { value: 'active-reactive', label: '實功率 P＋虛功率 Q' },
        ]}
      />
      <div className="fields-grid">
        <Choice
          label="實功率單位"
          value={activeUnit}
          onChange={setActiveUnit}
          options={[
            { value: 'W', label: 'W' },
            { value: 'kW', label: 'kW' },
            { value: 'MW', label: 'MW' },
          ]}
        />
        <NumberField
          label="實功率 P"
          value={active}
          onChange={setActive}
          unit={activeUnit}
        />
        <Choice
          label={mode === 'active-apparent' ? '視在功率單位' : '虛功率單位'}
          value={secondUnit}
          onChange={setSecondUnit}
          options={
            mode === 'active-apparent'
              ? [
                  { value: 'VA', label: 'VA' },
                  { value: 'kVA', label: 'kVA' },
                  { value: 'MVA', label: 'MVA' },
                ]
              : [
                  { value: 'var', label: 'var' },
                  { value: 'kvar', label: 'kvar' },
                  { value: 'Mvar', label: 'Mvar' },
                ]
          }
        />
        <NumberField
          label={mode === 'active-apparent' ? '視在功率 S' : '虛功率 Q'}
          value={second}
          onChange={setSecond}
          unit={secondUnit}
        />
      </div>
      <ToolActions
        onExample={() => {
          setActive('8');
          setActiveUnit('kW');
          switchMode('active-apparent');
        }}
        onClear={() => {
          setActive('');
          setSecond('');
        }}
      />
    </ToolPanel>
  );
}
