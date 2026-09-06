'use client';
import { useState } from 'react';
import {
  electricalFormat,
  resistorBands,
  resistorColor,
  resistorColorReverse,
} from '@/lib/tools/electrical';
import { attempt } from '@/lib/tools/core';
import {
  NumberField,
  Choice,
  ToolPanel,
  ResultRows,
  Notice,
} from '@/app/tool/_components/controls';
const name = (band: string) => resistorBands.displayNames[band] ?? band;
const options = resistorBands.colors.map((value) => ({
  value,
  label: name(value),
}));
const multiplierOptions = Object.keys(resistorBands.multipliers).map(
  (value) => ({ value, label: name(value) }),
);
const toleranceOptions = Object.keys(resistorBands.tolerances).map((value) => ({
  value,
  label: `${name(value)} ±${resistorBands.tolerances[value]}%`,
}));
function BandDiagram({ bands }: { bands: string[] }) {
  return (
    <svg
      viewBox="0 0 280 80"
      aria-label={`電阻色環：${bands.map(name).join('、')}`}
    >
      <title>電阻色環</title>
      <path d="M0 40h55m170 0h55" stroke="currentColor" />
      <rect
        x="55"
        y="20"
        width="170"
        height="40"
        rx="15"
        fill="none"
        stroke="currentColor"
      />
      {bands.map((band, i) => (
        <rect
          key={`${band}-${i}`}
          x={85 + i * 28}
          y="19"
          width="12"
          height="42"
          fill={resistorBands.colorHex[band]}
          stroke="#123a35"
        />
      ))}
    </svg>
  );
}
export default function ResistorColor() {
  const [count, setCount] = useState<4 | 5>(4),
    [mode, setMode] = useState('forward'),
    [bands, setBands] = useState(['brown', 'black', 'red', 'gold']),
    [value, setValue] = useState('1000'),
    [tolerance, setTolerance] = useState('gold');
  const forward = attempt(() => resistorColor(count, bands)),
    reverse = attempt(() => resistorColorReverse(value, count, tolerance));
  const digits = count === 4 ? 2 : 3;
  function change(i: number, v: string) {
    setBands((old) => old.map((x, n) => (n === i ? v : x)));
  }
  const forwardResult = forward.data ? (
    <ResultRows
      rows={[
        {
          label: '阻值',
          value: electricalFormat(forward.data.resistance),
          unit: 'Ω',
        },
        {
          label: '容差',
          value: electricalFormat(forward.data.tolerance),
          unit: '%',
        },
        {
          label: '下限',
          value: electricalFormat(forward.data.minimum),
          unit: 'Ω',
        },
        {
          label: '上限',
          value: electricalFormat(forward.data.maximum),
          unit: 'Ω',
        },
      ]}
    />
  ) : (
    <Notice>{forward.error}</Notice>
  );
  const reverseResult = reverse.data ? (
    <ResultRows
      rows={[
        { label: '色環', value: reverse.data.bands.map(name).join('、') },
        { label: '阻值', value: reverse.data.label },
      ]}
    />
  ) : (
    <Notice>{reverse.error}</Notice>
  );
  const diagram =
    mode === 'forward' ? (
      forward.data ? (
        <BandDiagram bands={bands.slice(0, count)} />
      ) : undefined
    ) : reverse.data ? (
      <BandDiagram bands={reverse.data.bands} />
    ) : undefined;
  return (
    <ToolPanel
      diagram={diagram}
      notes={
        <>
          四色環為兩位有效數字；五色環為三位。反算僅輸出可精確表示的阻值，容差不改變標稱阻值。
        </>
      }
      result={mode === 'forward' ? forwardResult : reverseResult}
    >
      <Choice
        label="色環數"
        value={String(count)}
        onChange={(v) => {
          const n = Number(v) as 4 | 5;
          setCount(n);
          setBands(
            n === 4
              ? ['brown', 'black', 'red', 'gold']
              : ['brown', 'black', 'black', 'red', 'gold'],
          );
        }}
        options={[
          { value: '4', label: '四色環' },
          { value: '5', label: '五色環' },
        ]}
      />
      <Choice
        label="轉換方式"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'forward', label: '色環轉阻值' },
          { value: 'reverse', label: '阻值轉色環' },
        ]}
      />
      {mode === 'forward' ? (
        <div className="fields-grid">
          {Array.from({ length: digits }, (_, i) => (
            <Choice
              key={i}
              label={`有效數字 ${i + 1}`}
              value={bands[i] ?? 'black'}
              onChange={(v) => change(i, v)}
              options={i === 0 ? options.slice(1) : options}
            />
          ))}
          <Choice
            label="倍率"
            value={bands[digits] ?? 'red'}
            onChange={(v) => change(digits, v)}
            options={multiplierOptions}
          />
          <Choice
            label="容差"
            value={bands[digits + 1] ?? 'gold'}
            onChange={(v) => change(digits + 1, v)}
            options={toleranceOptions}
          />
        </div>
      ) : (
        <div className="fields-grid">
          <NumberField
            label="阻值"
            value={value}
            onChange={setValue}
            unit="Ω"
          />
          <Choice
            label="容差色環"
            value={tolerance}
            onChange={setTolerance}
            options={toleranceOptions}
          />
        </div>
      )}
    </ToolPanel>
  );
}
