'use client';
import { useState } from 'react';
import { ChipPackage } from '@/app/tool/_components/chip-package';
import { attempt, formatNumber } from '@/lib/tools/core';
import {
  decodeSmdResistor,
  encodeSmdResistor,
  type ResistorMarkFormat,
} from '@/lib/tools/markings';
import {
  Choice,
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
    <figure className="component-visual resistor-chip-visual">
      <div className="component-eyebrow">SMD · 晶片電阻</div>
      <ChipPackage kind="resistor" code={code} field={field} />
      <figcaption>
        <p className="component-caption">黑色保護層 · 兩端金屬端電極</p>
        <div className="component-mark-readout">
          <span>元件標記</span>
          <strong>{code || '—'}</strong>
        </div>
        <p className="component-footnote">
          外觀與印字為示意；實際尺寸、字型與標記方式依系列而異。
        </p>
      </figcaption>
    </figure>
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
          基數與字母倍率。零歐姆跳線可用 0、000 或 0000 表示。 外觀參考：
          <a href="https://www.vishay.com/docs/20035/dcrcwe3.pdf">
            Vishay D/CRCW 晶片電阻
          </a>
          。
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
