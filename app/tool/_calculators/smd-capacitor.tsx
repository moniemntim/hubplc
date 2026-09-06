'use client';
import { useId, useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import {
  decodeSmdCapacitor,
  encodeSmdCapacitor,
  type CapacitorTolerance,
} from '@/lib/tools/markings';
import { QuantityField } from '@/app/tool/_components/quantity';
import {
  Choice,
  DiagramPart,
  Notice,
  ResultRows,
  TextField,
  ToolActions,
  ToolPanel,
} from '@/app/tool/_components/controls';
function Diagram({ code, field }: { code: string; field: string }) {
  const id = useId().replace(/:/g, '');
  const match = /^(\d{3}|(?:\d{1,3})?R\d{1,3})([JKM])?$/.exec(code);
  const marking = match?.[1] ?? '';
  const tolerance = match?.[2] ?? '';
  const isNumeric = /^\d{3}$/.test(marking);
  const significant = isNumeric ? marking.slice(0, 2) : '';
  const multiplier = isNumeric ? marking[2] : '';
  return (
    <svg
      viewBox="0 0 360 190"
      aria-label={code ? `SMD 電容代碼 ${code} 分解圖` : 'SMD 電容代碼示意圖'}
    >
      <title>SMD 電容代碼分解圖</title>
      <defs>
        <linearGradient id={`${id}-ceramic`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#d7c29d" />
          <stop offset="0.45" stopColor="#b89562" />
          <stop offset="1" stopColor="#84633c" />
        </linearGradient>
        <linearGradient id={`${id}-metal`} x1="0" x2="1">
          <stop offset="0" stopColor="#89949a" />
          <stop offset="0.3" stopColor="#e5ebeb" />
          <stop offset="0.66" stopColor="#a0aaae" />
          <stop offset="1" stopColor="#657178" />
        </linearGradient>
        <filter
          id={`${id}-shadow`}
          x="-20%"
          y="-40%"
          width="140%"
          height="180%"
        >
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.25" />
        </filter>
      </defs>
      <path d="M18 92h58m208 0h58" stroke="#55646a" strokeWidth="2" />
      <DiagramPart field={field}>
        <g filter={`url(#${id}-shadow)`}>
          <rect
            x="76"
            y="58"
            width="208"
            height="68"
            rx="12"
            fill={`url(#${id}-ceramic)`}
            stroke="#604728"
            strokeWidth="1.5"
          />
          <path
            d="M88 68h184"
            stroke="#f2e3c6"
            strokeOpacity="0.5"
            strokeWidth="2"
          />
          <rect
            x="64"
            y="67"
            width="34"
            height="50"
            rx="5"
            fill={`url(#${id}-metal)`}
            stroke="#68747a"
          />
          <rect
            x="262"
            y="67"
            width="34"
            height="50"
            rx="5"
            fill={`url(#${id}-metal)`}
            stroke="#68747a"
          />
          <path d="M73 77v30m214-30v30" stroke="#f4f7f8" strokeOpacity="0.6" />
          <text
            x="180"
            y="103"
            textAnchor="middle"
            fontSize="31"
            fontWeight="700"
            letterSpacing="3"
            fill="#382617"
            fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace"
          >
            {marking || '—'}
          </text>
          {tolerance && (
            <text
              x="244"
              y="103"
              textAnchor="middle"
              fontSize="17"
              fontWeight="700"
              fill="#382617"
              fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace"
            >
              {tolerance}
            </text>
          )}
        </g>
      </DiagramPart>
      {isNumeric ? (
        <>
          <path
            d="M157 110v34H82"
            fill="none"
            stroke="#65757a"
            strokeDasharray="4 3"
          />
          <circle cx="157" cy="110" r="3" fill="#65757a" />
          <text x="30" y="153" fontSize="12" fill="#29434a">
            有效數字
          </text>
          <text x="30" y="170" fontSize="17" fontWeight="700" fill="#17333a">
            {significant}
          </text>
          <path
            d="M181 110v34h42"
            fill="none"
            stroke="#65757a"
            strokeDasharray="4 3"
          />
          <circle cx="181" cy="110" r="3" fill="#65757a" />
          <text x="226" y="153" fontSize="12" fill="#29434a">
            倍率（10 的冪次）
          </text>
          <text x="226" y="170" fontSize="17" fontWeight="700" fill="#17333a">
            {multiplier}
          </text>
          {tolerance && (
            <text
              x="292"
              y="153"
              textAnchor="middle"
              fontSize="12"
              fill="#29434a"
            >
              容差 {tolerance}
            </text>
          )}
        </>
      ) : marking ? (
        <>
          <path
            d="M180 112v26"
            fill="none"
            stroke="#65757a"
            strokeDasharray="4 3"
          />
          <circle cx="180" cy="112" r="3" fill="#65757a" />
          <text
            x="180"
            y="154"
            textAnchor="middle"
            fontSize="12"
            fill="#29434a"
          >
            R 表示小數點（pF）
          </text>
          {tolerance && (
            <text
              x="180"
              y="172"
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill="#17333a"
            >
              容差 {tolerance}
            </text>
          )}
        </>
      ) : (
        <text x="180" y="158" textAnchor="middle" fontSize="13" fill="#65757a">
          輸入代碼後顯示分解說明
        </text>
      )}
    </svg>
  );
}
export default function SmdCapacitor() {
  const [mode, setMode] = useState<'decode' | 'encode'>('decode');
  const [code, setCode] = useState('104');
  const [value, setValue] = useState('1e-7');
  const [tolerance, setTolerance] = useState<CapacitorTolerance>('K');
  const result = attempt(() =>
    mode === 'decode'
      ? decodeSmdCapacitor(code)
      : encodeSmdCapacitor(value, tolerance),
  );
  const example = () => {
    setMode('decode');
    setCode('104');
    setTolerance('K');
  };
  return (
    <ToolPanel
      diagram={
        <Diagram
          code={result.data?.code ?? ''}
          field={mode === 'decode' ? 'SMD 電容代碼' : '電容量'}
        />
      }
      notes={
        <>
          通用三位數代碼以 pF 為基準：104 = 10 × 10⁴ pF = 100 nF。J、K、M
          分別表示 ±5%、±10%、±20% 容差；不解讀廠商專用耐壓或系列標記。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: mode === 'decode' ? '電容量' : '可精確表示的代碼',
                value:
                  mode === 'decode'
                    ? formatNumber(result.data.capacitance)
                    : result.data.code,
                unit: mode === 'decode' ? 'F' : undefined,
              },
              ...(mode === 'decode'
                ? [
                    {
                      label: '換算',
                      value: `${formatNumber(result.data.capacitance * 1e12)} pF ／ ${formatNumber(result.data.capacitance * 1e9)} nF ／ ${formatNumber(result.data.capacitance * 1e6)} µF`,
                    },
                  ]
                : [
                    {
                      label: '電容量',
                      value: formatNumber(result.data.capacitance),
                      unit: 'F',
                    },
                  ]),
              ...(result.data.tolerance
                ? [{ label: '容差', value: `±${result.data.tolerance}%` }]
                : []),
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <ToolActions
        onExample={example}
        onClear={() => {
          setCode('');
          setValue('');
        }}
      />
      <Choice
        label="轉換方向"
        value={mode}
        onChange={(v) => setMode(v as typeof mode)}
        options={[
          { value: 'decode', label: '代碼轉電容量' },
          { value: 'encode', label: '電容量轉代碼' },
        ]}
      />
      {mode === 'encode' && (
        <Choice
          label="容差（可選）"
          value={tolerance}
          onChange={(v) => setTolerance(v as CapacitorTolerance)}
          options={[
            { value: '', label: '未標示' },
            { value: 'J', label: 'J ±5%' },
            { value: 'K', label: 'K ±10%' },
            { value: 'M', label: 'M ±20%' },
          ]}
        />
      )}
      {mode === 'decode' ? (
        <TextField label="SMD 電容代碼" value={code} onChange={setCode} />
      ) : (
        <QuantityField
          label="電容量"
          value={value}
          onChange={setValue}
          kind="capacitance"
          initialUnit="nF"
        />
      )}
    </ToolPanel>
  );
}
