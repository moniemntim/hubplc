'use client';
import { useState } from 'react';
import { QuantityField } from '@/app/tool/_components/quantity';
import {
  electricalFormat,
  resistorBands,
  resistorColor,
  resistorColorReverse,
} from '@/lib/tools/electrical';
import { attempt } from '@/lib/tools/core';
import {
  Choice,
  ToolPanel,
  ResultRows,
  Notice,
  DiagramPart,
  ToolActions,
} from '@/app/tool/_components/controls';
const name = (band: string) => resistorBands.displayNames[band] ?? band;
const options = resistorBands.colors.map((value) => ({
  value,
  label: `${name(value)} ${resistorBands.colors.indexOf(value)}`,
  color: resistorBands.colorHex[value],
}));
const multiplierLabel = (value: string) => {
  const multiplier = resistorBands.multipliers[value];
  return `${name(value)} ×10^${Math.round(Math.log10(multiplier))}`;
};
const multiplierOptions = Object.keys(resistorBands.multipliers).map(
  (value) => ({
    value,
    label: multiplierLabel(value),
    color: resistorBands.colorHex[value],
  }),
);
const toleranceOptions = Object.keys(resistorBands.tolerances).map((value) => ({
  value,
  label: `${name(value)} ±${resistorBands.tolerances[value]}%`,
  color: resistorBands.colorHex[value],
}));
function BandDiagram({
  bands,
  reverse,
}: {
  bands: string[];
  reverse?: boolean;
}) {
  const digits = bands.length - 2;
  const role = (i: number) => {
    if (i < digits) return `有效數字 ${i + 1}`;
    return i === digits ? '倍率' : '容差';
  };
  const detail = (band: string, i: number) => {
    if (i < digits)
      return `${name(band)} ${resistorBands.colors.indexOf(
        band as (typeof resistorBands.colors)[number],
      )}`;
    if (i === digits) return multiplierLabel(band);
    return `${name(band)} ±${resistorBands.tolerances[band]}%`;
  };
  const ringPositions =
    bands.length === 4 ? [205, 265, 325, 435] : [185, 235, 285, 335, 445];
  const ring = (band: string, i: number, field: string) => (
    <DiagramPart key={`${band}-${i}`} field={field}>
      <title>{`${role(i)}：${detail(band, i)}`}</title>
      <rect
        className="resistor-band"
        x={ringPositions[i]}
        y="53"
        width="24"
        height="94"
        rx="3"
        fill={resistorBands.colorHex[band]}
      />
    </DiagramPart>
  );
  return (
    <figure style={{ margin: 0 }}>
      <svg
        className="resistor-illustration"
        viewBox="80 20 460 160"
        aria-label={`電阻色環：${bands.map(name).join('、')}`}
      >
        <title>互動式陶瓷電阻色碼圖</title>
        <defs>
          <linearGradient
            id="lead-metal"
            gradientUnits="userSpaceOnUse"
            x1="0"
            x2="0"
            y1="96"
            y2="104"
          >
            <stop stopColor="#dbe4e1" />
            <stop offset=".46" stopColor="#7d8c8a" />
            <stop offset="1" stopColor="#d6dfdc" />
          </linearGradient>
          <linearGradient id="ceramic-body" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#fff8df" />
            <stop offset=".45" stopColor="#e8d9b7" />
            <stop offset="1" stopColor="#cbb58d" />
          </linearGradient>
          <linearGradient id="cap-metal" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#f3f6f3" />
            <stop offset=".45" stopColor="#b9c4be" />
            <stop offset="1" stopColor="#76847e" />
          </linearGradient>
          <filter id="body-shadow" x="-20%" y="-30%" width="140%" height="180%">
            <feDropShadow
              dx="0"
              dy="5"
              stdDeviation="4"
              floodColor="#27342f"
              floodOpacity=".28"
            />
          </filter>
          <style>{`.resistor-illustration{width:100%;height:auto;display:block}.resistor-illustration .resistor-band{stroke:#3b403c;stroke-width:1.5;transition:stroke .12s ease,stroke-width .12s ease,filter .12s ease}.resistor-illustration .diagram-part:hover .resistor-band,.resistor-illustration .diagram-part.is-focused .resistor-band{stroke:#08755d;stroke-width:4;filter:drop-shadow(0 0 3px #32b88a)}.resistor-illustration .label-connector{stroke:#697671;stroke-width:1.25}.resistor-illustration .band-label-title{font:600 12px system-ui,sans-serif;fill:#315048;text-anchor:middle}.resistor-illustration .band-label-value{font:12px system-ui,sans-serif;fill:#193a33;text-anchor:middle}.resistor-illustration .diagram-part.is-focused .band-label-title,.resistor-illustration .diagram-part.is-focused .band-label-value{fill:#08755d;font-weight:700}`}</style>
        </defs>
        <g aria-hidden="true" filter="url(#body-shadow)">
          <path
            d="M18 100H145M475 100H602"
            stroke="url(#lead-metal)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M138 83H163V117H138ZM457 83H482V117H457Z"
            fill="url(#cap-metal)"
            stroke="#67746e"
          />
          <path
            d="M158 75C180 54 204 47 232 47H400C430 47 452 59 462 78V122C451 141 429 153 400 153H232C204 153 180 146 158 125Z"
            fill="url(#ceramic-body)"
            stroke="#9a8968"
            strokeWidth="2"
          />
          <path
            d="M183 72C217 57 246 57 298 57H390"
            fill="none"
            stroke="#fffdf4"
            strokeWidth="8"
            strokeLinecap="round"
            opacity=".62"
          />
        </g>
        {reverse ? (
          <DiagramPart field="阻值">
            {bands.map((band, i) =>
              ring(band, i, i === bands.length - 1 ? '容差色環' : '阻值'),
            )}
          </DiagramPart>
        ) : (
          bands.map((band, i) => ring(band, i, role(i)))
        )}
      </svg>
      {bands.length > 0 && (
        <figcaption
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
            gap: '12px',
            marginTop: '12px',
          }}
        >
          {bands.map((band, i) => (
            <div
              key={i}
              style={{
                fontSize: '14px',
                borderTop: '1px solid #d3e2d9',
                paddingTop: '9px',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  marginRight: 6,
                  background: resistorBands.colorHex[band],
                  border: '1px solid #66776e',
                  borderRadius: 2,
                }}
                aria-hidden="true"
              />
              {role(i)}
              <br />
              <strong>{detail(band, i)}</strong>
            </div>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
export default function ResistorColor() {
  const [count, setCount] = useState<4 | 5>(4),
    [mode, setMode] = useState('forward'),
    [bands, setBands] = useState(['brown', 'black', 'red', 'gold']),
    [value, setValue] = useState('1000'),
    [tolerance, setTolerance] = useState('gold');
  const example = () => {
    setCount(4);
    setMode('forward');
    setBands(['brown', 'black', 'red', 'gold']);
    setValue('1000');
    setTolerance('gold');
  };
  const clear = () => {
    setBands(Array(count).fill(''));
    setValue('');
  };
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
      <BandDiagram bands={reverse.data.bands} reverse />
    ) : undefined;
  return (
    <ToolPanel
      diagram={diagram ?? <BandDiagram bands={[]} />}
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
          <QuantityField
            label="阻值"
            value={value}
            onChange={setValue}
            kind="resistance"
            initialUnit="kΩ"
          />
          <Choice
            label="容差色環"
            value={tolerance}
            onChange={setTolerance}
            options={toleranceOptions}
          />
        </div>
      )}
      <ToolActions onExample={example} onClear={clear} />
    </ToolPanel>
  );
}
