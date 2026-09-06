'use client';

import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import {
  batteryCapacityToAh,
  batteryLife,
  type BatteryCapacityUnit,
} from '@/lib/tools/power-extras';
import { QuantityField } from '@/app/tool/_components/quantity';
import {
  Choice,
  DiagramPart,
  Notice,
  NumberField,
  ResultRows,
  ToolActions,
  ToolPanel,
} from '@/app/tool/_components/controls';

function BatteryDiagram({
  capacityAh,
  currentA,
  usablePercent,
}: {
  capacityAh?: number;
  currentA?: number;
  usablePercent?: number;
}) {
  const fill = Math.max(0, Math.min(100, usablePercent ?? 0));
  return (
    <svg viewBox="0 0 360 180" aria-label="電池供應固定平均電流負載示意">
      <title>{'電池壽命的固定平均電流模型'}</title>
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="35" y="45" width="110" height="65" rx="6" />
        <path d="M145 65h12v25h-12M157 77h63m-8-6 8 6-8 6M225 55v45h80v-45h-80" />
        <path d="M65 77h18m-9-9v18M109 77h18" />
      </g>
      <DiagramPart field="可用容量">
        <rect x="48" y="95" width="84" height="8" rx="4" fill="none" />
        <rect
          x="48"
          y="95"
          width={(fill * 0.84).toFixed(4)}
          height="8"
          rx="4"
          fill="#0a9f76"
          stroke="none"
        />
        <text x="35" y="130" fontSize="13">
          可用{' '}
          {usablePercent === undefined ? '' : `${formatNumber(usablePercent)}%`}
        </text>
      </DiagramPart>
      <DiagramPart field="電池容量">
        <text x="35" y="145" fontSize="13">
          容量{' '}
          {capacityAh === undefined ? '' : `${formatNumber(capacityAh)} Ah`}
        </text>
      </DiagramPart>
      <DiagramPart field="平均負載電流">
        <text x="190" y="135" fontSize="13">
          Iavg {currentA === undefined ? '' : `${formatNumber(currentA)} A`}
        </text>
      </DiagramPart>
      <text x="265" y="82" textAnchor="middle" fontSize="13">
        固定負載
      </text>
    </svg>
  );
}

export default function BatteryLife() {
  const [capacity, setCapacity] = useState('2000');
  const [capacityUnit, setCapacityUnit] = useState<BatteryCapacityUnit>('mAh');
  const [current, setCurrent] = useState('.1');
  const [usablePercent, setUsablePercent] = useState('100');
  const result = attempt(() =>
    batteryLife(
      String(batteryCapacityToAh(capacity, capacityUnit)),
      current,
      usablePercent,
    ),
  );
  const example = () => {
    setCapacity('2000');
    setCapacityUnit('mAh');
    setCurrent('.1');
    setUsablePercent('100');
  };
  const clear = () => {
    setCapacity('');
    setCurrent('');
    setUsablePercent('');
  };
  const changeCapacityUnit = (next: string) => {
    const unit = next as BatteryCapacityUnit;
    try {
      const capacityAh = batteryCapacityToAh(capacity, capacityUnit);
      const display = capacityAh * (unit === 'mAh' ? 1e3 : 1);
      setCapacity(
        !Number.isFinite(display) || display === 0
          ? ''
          : String(Number(display.toPrecision(15))),
      );
    } catch {
      // Blank and invalid input stays exactly as entered when only its unit changes.
    }
    setCapacityUnit(unit);
  };
  return (
    <ToolPanel
      diagram={
        <BatteryDiagram
          capacityAh={result.data?.capacityAh}
          currentA={result.data?.currentA}
          usablePercent={result.data?.usablePercent}
        />
      }
      notes={
        <>
          公式：時間（h）= 有效容量（Ah）÷
          平均負載電流（A）。這是理想、固定電流的估計；電池狀況、年齡、溫度與放電率都會改變實際續航。參考{' '}
          <a href="https://www.digikey.tw/en/resources/conversion-calculators/conversion-calculator-battery-life">
            DigiKey Battery Life Calculator
          </a>
          。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: '預估續航',
                value: formatNumber(result.data.hours),
                unit: 'h',
              },
              {
                label: '預估天數',
                value: formatNumber(result.data.days),
                unit: '天',
              },
              {
                label: '有效容量',
                value: formatNumber(result.data.usableCapacityAh),
                unit: 'Ah',
              },
              {
                label: '平均負載電流',
                value: formatNumber(result.data.currentA),
                unit: 'A',
              },
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <div className="fields-grid">
        <div data-field="電池容量">
          <NumberField
            label="電池容量"
            value={capacity}
            onChange={setCapacity}
          />
          <Choice
            label="電池容量單位"
            shortLabel="單位"
            value={capacityUnit}
            onChange={changeCapacityUnit}
            options={[
              { value: 'mAh', label: 'mAh' },
              { value: 'Ah', label: 'Ah' },
            ]}
          />
        </div>
        <QuantityField
          label="平均負載電流"
          value={current}
          onChange={setCurrent}
          kind="current"
          initialUnit="mA"
        />
        <NumberField
          label="可用容量"
          value={usablePercent}
          onChange={setUsablePercent}
          unit="%"
        />
      </div>
      <ToolActions onExample={example} onClear={clear} />
    </ToolPanel>
  );
}
