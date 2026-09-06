'use client';
import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import {
  decodeSmdResistor,
  encodeSmdResistor,
  type ResistorMarkFormat,
} from '@/lib/tools/markings';
import {
  Choice,
  DiagramPart,
  Notice,
  ResultRows,
  TextField,
  ToolActions,
  ToolPanel,
} from '@/app/tool/_components/controls';
import { QuantityField } from '@/app/tool/_components/quantity';

const formats = [
  { value: 'three', label: '三位數（472）' },
  { value: 'four', label: '四位數（1001）' },
  { value: 'decimal', label: 'R 小數點（4R7）' },
  { value: 'eia96', label: 'EIA-96（01Y）' },
] as const;
function MarkDiagram({ code, field }: { code: string; field: string }) {
  return (
    <svg viewBox="0 0 300 100" aria-label={`SMD 電阻標記 ${code}`}>
      <title>SMD 電阻標記</title>
      <path d="M0 50h55m190 0h55" stroke="currentColor" />
      <DiagramPart field={field}>
        <rect
          x="55"
          y="30"
          width="190"
          height="40"
          rx="6"
          fill="#d9e6e2"
          stroke="currentColor"
        />
        <text
          x="150"
          y="57"
          textAnchor="middle"
          fontSize="25"
          fontFamily="monospace"
        >
          {code || '---'}
        </text>
      </DiagramPart>
    </svg>
  );
}
export default function SmdResistor() {
  const [mode, setMode] = useState<'decode' | 'encode'>('decode');
  const [format, setFormat] = useState<ResistorMarkFormat>('three');
  const [raw, setRaw] = useState('472');
  const result = attempt(() =>
    mode === 'decode'
      ? decodeSmdResistor(raw, format)
      : encodeSmdResistor(raw, format),
  );
  const example = () => {
    setMode('decode');
    setFormat('three');
    setRaw('472');
  };
  const zeroOhm =
    result.data && 'zeroOhm' in result.data && result.data.zeroOhm;
  return (
    <ToolPanel
      diagram={
        <MarkDiagram
          code={result.data?.code ?? ''}
          field={mode === 'decode' ? 'SMD 電阻代碼' : '阻值'}
        />
      }
      notes={
        <>
          三位與四位數標記以前段為有效數字、末位為 10 的冪次；EIA-96 使用 01–96
          基數與字母倍率。零歐姆跳線可用 0、000 或 0000 表示。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={
              mode === 'decode'
                ? [
                    {
                      label: '阻值',
                      value: formatNumber(result.data.resistance),
                      unit: 'Ω',
                    },
                    { label: '標記', value: result.data.code },
                    ...(zeroOhm
                      ? [{ label: '用途', value: '零歐姆跳線' }]
                      : []),
                  ]
                : [
                    { label: '可精確表示的代碼', value: result.data.code },
                    {
                      label: '阻值',
                      value: formatNumber(result.data.resistance),
                      unit: 'Ω',
                    },
                  ]
            }
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <ToolActions onExample={example} onClear={() => setRaw('')} />
      <Choice
        label="轉換方向"
        value={mode}
        onChange={(v) => setMode(v as typeof mode)}
        options={[
          { value: 'decode', label: '代碼轉阻值' },
          { value: 'encode', label: '阻值轉代碼' },
        ]}
      />
      <Choice
        label="標記格式"
        value={format}
        onChange={(v) => setFormat(v as ResistorMarkFormat)}
        options={formats}
      />
      {mode === 'decode' ? (
        <TextField label="SMD 電阻代碼" value={raw} onChange={setRaw} />
      ) : (
        <QuantityField
          label="阻值"
          value={raw}
          onChange={setRaw}
          kind="resistance"
          initialUnit="Ω"
        />
      )}
    </ToolPanel>
  );
}
