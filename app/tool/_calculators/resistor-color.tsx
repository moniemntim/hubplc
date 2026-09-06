'use client';
import { useId, useState } from 'react';
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
  const id = useId().replace(/:/g, '');
  const digits = bands.length - 2;
  const role = (i: number) =>
    i < digits ? `有效數字 ${i + 1}` : i === digits ? '倍率' : '容差';
  const detail = (band: string, i: number) => {
    if (i < digits)
      return `${name(band)} ${resistorBands.colors.indexOf(band as (typeof resistorBands.colors)[number])}`;
    if (i === digits) return multiplierLabel(band);
    return `${name(band)} ±${resistorBands.tolerances[band]}%`;
  };
  const silhouette =
    'M110 102Q110 78 132 78H154Q163 78 170 87Q176 92 188 92H332Q344 92 350 83Q354 78 364 78H388Q410 78 410 102V138Q410 162 388 162H364Q354 162 350 157Q344 148 332 148H188Q176 148 170 153Q163 162 154 162H132Q110 162 110 138Z';
  const positions =
    bands.length === 4 ? [137, 204, 258, 371] : [137, 190, 235, 280, 371];
  return (
    <figure className="component-visual axial-visual">
      <div className="component-eyebrow">
        AXIAL ·{' '}
        {bands.length
          ? `${bands.length === 5 ? '五' : '四'}環軸向電阻`
          : '軸向電阻'}
      </div>
      <svg
        className="resistor-illustration"
        viewBox="0 35 520 180"
        aria-label={
          bands.length
            ? `電阻色環：${bands.map(name).join('、')}`
            : '電阻色環：尚未輸入有效值'
        }
      >
        <title>軸向電阻色環示意</title>
        <defs>
          <clipPath id={`${id}-body-clip`}>
            <path d={silhouette} />
          </clipPath>
          <linearGradient id={`${id}-lead`} x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#84928f" />
            <stop offset=".35" stopColor="#f4f6f4" />
            <stop offset=".65" stopColor="#a7b1ac" />
            <stop offset="1" stopColor="#6d7a75" />
          </linearGradient>
          <linearGradient id={`${id}-round`} x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#473a26" stopOpacity=".22" />
            <stop offset=".23" stopColor="#fff" stopOpacity=".24" />
            <stop offset=".46" stopColor="#fff" stopOpacity="0" />
            <stop offset=".75" stopColor="#443822" stopOpacity=".08" />
            <stop offset="1" stopColor="#443822" stopOpacity=".3" />
          </linearGradient>
          <radialGradient id={`${id}-shadow`}>
            <stop stopColor="#263832" stopOpacity=".18" />
            <stop offset="1" stopColor="#263832" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse
          cx="260"
          cy="171"
          rx="170"
          ry="12"
          fill={`url(#${id}-shadow)`}
        />
        <rect
          x="18"
          y="117"
          width="484"
          height="6"
          rx="3"
          fill={`url(#${id}-lead)`}
        />
        <path
          d={silhouette}
          fill="#decc9f"
          stroke="#a49372"
          strokeWidth="1.2"
        />
        {bands.map((band, i) => (
          <DiagramPart
            key={i}
            field={
              reverse ? (i === bands.length - 1 ? '容差色環' : '阻值') : role(i)
            }
          >
            <title>{`${role(i)}：${detail(band, i)}`}</title>
            <g clipPath={`url(#${id}-body-clip)`}>
              <rect
                className="resistor-band"
                x={positions[i]}
                y="76"
                width="18"
                height="88"
                fill={resistorBands.colorHex[band]}
              />
            </g>
            <path
              className="band-focus-pointer"
              d={`M${positions[i] + 9} 183v-12m-4 4 4-4 4 4`}
              fill="none"
              stroke="#08755d"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </DiagramPart>
        ))}
        <path d={silhouette} fill={`url(#${id}-round)`} pointerEvents="none" />
      </svg>
      <figcaption>
        <p className="component-caption">
          {bands.length
            ? '由左至右讀取 · 最右環為容差'
            : '輸入有效值後顯示色環'}
        </p>
        {bands.length > 0 && (
          <div className="band-legend">
            {bands.map((band, i) => (
              <div key={i}>
                <span
                  className="color-swatch"
                  style={{ background: resistorBands.colorHex[band] }}
                  aria-hidden="true"
                />
                <span>{role(i)}</span>
                <strong>{detail(band, i)}</strong>
              </div>
            ))}
          </div>
        )}
      </figcaption>
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
          四色環為兩位有效數字；五色環為三位。反算僅輸出可精確表示的阻值，容差不改變標稱阻值。{' '}
          資料參考：
          <a href="https://www.vishay.com/docs/49478/_dale_resistor_color_code_chart_vmn_ms0002_1612.pdf">
            Vishay 電阻色碼圖表
          </a>
          。
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
