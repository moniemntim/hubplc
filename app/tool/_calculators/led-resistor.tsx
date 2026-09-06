'use client';
import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import { ledSeriesResistor, type PreferredSeries } from '@/lib/tools/preferred';
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
function LedDiagram({
  supply,
  forward,
  count,
  resistor,
}: {
  supply: string;
  forward: string;
  count: number;
  resistor: string;
}) {
  return (
    <svg viewBox="0 0 360 130" aria-label="LED 串聯限流電阻電路">
      <title>LED 串聯限流電阻電路</title>
      <DiagramPart field="電源電壓">
        <path d="M25 30V53M16 53h18M20 68h10M25 68V100" stroke="currentColor" />
        <text x="5" y="122" fontSize="11">
          {supply} V
        </text>
      </DiagramPart>
      <path
        d="M25 30H50m60 0H145m24 0H275V100H25"
        fill="none"
        stroke="currentColor"
      />
      <DiagramPart field="目標電流">
        <path d="M35 30h10" stroke="#0a9f76" strokeWidth="3" />
        <path d="M45 30l-7-4v8z" fill="#0a9f76" />
      </DiagramPart>
      <DiagramPart field="選用標準阻值">
        <path
          d="M50 30l8-10 10 20 10-20 10 20 10-20 12 10"
          fill="none"
          stroke="currentColor"
        />
        <text x="80" y="10" textAnchor="middle">
          R {resistor} Ω
        </text>
      </DiagramPart>
      <DiagramPart field="LED 順向壓降">
        <path
          d="M145 18v24l20-12zM169 18v24"
          fill="none"
          stroke="currentColor"
        />
        <path d="M157 17l7-8m-1 10 7-8" stroke="currentColor" />
        <text x="157" y="58" textAnchor="middle" fontSize="11">
          {forward} V
        </text>
      </DiagramPart>
      <DiagramPart field="LED 數量">
        <text x="200" y="78" fontSize="12">
          × {count} 顆相同 LED
        </text>
      </DiagramPart>
    </svg>
  );
}
export default function LedResistor() {
  const [supply, setSupply] = useState('12');
  const [forward, setForward] = useState('3');
  const [count, setCount] = useState('3');
  const [current, setCurrent] = useState('.02');
  const [series, setSeries] = useState<PreferredSeries>('E24');
  const result = attempt(() =>
    ledSeriesResistor(supply, forward, count, current, series),
  );
  return (
    <ToolPanel
      diagram={
        <LedDiagram
          supply={result.data ? formatNumber(result.data.supply) : '—'}
          forward={result.data ? formatNumber(result.data.forwardVoltage) : '—'}
          count={result.data?.count ?? 0}
          resistor={
            result.data ? formatNumber(result.data.selectedResistance) : '—'
          }
        />
      }
      notes={
        <>
          R = (Vs − N × Vf) / I。工具會向上選取 E
          系列標準阻值，因此實際電流不會高於目標值。功耗是理想直流條件，元件額定功率還須考慮環境溫度與散熱。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: 'LED 總順向壓降',
                value: formatNumber(result.data.totalForward),
                unit: 'V',
              },
              {
                label: '理論限流電阻',
                value: formatNumber(result.data.idealResistance),
                unit: 'Ω',
              },
              {
                label: '理論電阻功耗',
                value: formatNumber(result.data.idealPower),
                unit: 'W',
              },
              {
                label: '選用標準阻值',
                value: formatNumber(result.data.selectedResistance),
                unit: 'Ω',
              },
              {
                label: '實際電流',
                value: formatNumber(result.data.actualCurrent),
                unit: 'A',
              },
              {
                label: '選用電阻功耗',
                value: formatNumber(result.data.actualPower),
                unit: 'W',
              },
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <ToolActions
        onExample={() => {
          setSupply('12');
          setForward('3');
          setCount('3');
          setCurrent('.02');
          setSeries('E24');
        }}
        onClear={() => {
          setSupply('');
          setForward('');
          setCount('');
          setCurrent('');
        }}
      />
      <div className="fields-grid">
        <QuantityField
          label="電源電壓"
          value={supply}
          onChange={setSupply}
          kind="voltage"
          initialUnit="V"
        />
        <QuantityField
          label="LED 順向壓降"
          value={forward}
          onChange={setForward}
          kind="voltage"
          initialUnit="V"
        />
        <NumberField
          label="LED 數量"
          value={count}
          onChange={setCount}
          unit="顆"
        />
        <QuantityField
          label="目標電流"
          value={current}
          onChange={setCurrent}
          kind="current"
          initialUnit="mA"
        />
      </div>
      <Choice
        label="選用標準阻值"
        value={series}
        onChange={(v) => setSeries(v as PreferredSeries)}
        options={['E12', 'E24', 'E96'].map((value) => ({
          value,
          label: value,
        }))}
      />
    </ToolPanel>
  );
}
