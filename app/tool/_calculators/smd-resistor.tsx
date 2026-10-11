'use client';
import { useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
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
  const { tr } = useToolLanguage();
  return (
    <figure className="component-visual resistor-chip-visual">
      <div className="component-eyebrow">
        SMD · {tr('晶片電阻', 'Chip resistor')}
      </div>
      <ChipPackage kind="resistor" code={code} field={field} />
      <figcaption>
        <p className="component-caption">
          {tr(
            '黑色保護層 · 兩端金屬端電極',
            'Black protective layer · metal end electrodes',
          )}
        </p>
        <div className="component-mark-readout">
          <span>{tr('元件標記', 'Component marking')}</span>
          <strong>{code || '—'}</strong>
        </div>
        <p className="component-footnote">
          {tr(
            '外觀與印字為示意；實際尺寸、字型與標記方式依系列而異。',
            'Appearance and printing are illustrative; actual dimensions, typefaces, and marking methods vary by series.',
          )}
        </p>
      </figcaption>
    </figure>
  );
}
export default function SmdResistor() {
  const { tr } = useToolLanguage();
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
  const formatOptions = formats.map((item) => ({
    ...item,
    label: tr(
      item.label,
      {
        '三位數（472）': 'Three digits (472)',
        '四位數（1001）': 'Four digits (1001)',
        'R 小數點（4R7）': 'R decimal point (4R7)',
        'EIA-96（01Y）': 'EIA-96 (01Y)',
      }[item.label] ?? item.label,
    ),
  }));
  return (
    <ToolPanel
      diagram={
        <MarkDiagram
          code={result.data?.code ?? ''}
          field={
            mode === 'decode'
              ? tr('SMD 電阻代碼', 'SMD resistor code')
              : tr('阻值', 'Resistance')
          }
        />
      }
      notes={
        <>
          {tr(
            '三位與四位數標記以前段為有效數字、末位為 10 的冪次；EIA-96 使用 01–96 基數與字母倍率。零歐姆跳線可用 0、000 或 0000 表示。 外觀參考：',
            'Three- and four-digit markings use leading significant digits and a final power of 10; EIA-96 uses bases 01–96 and letter multipliers. Zero-ohm jumpers can be marked 0, 000, or 0000. Appearance reference:',
          )}
          <a href="https://www.vishay.com/docs/20035/dcrcwe3.pdf">
            Vishay D/CRCW {tr('晶片電阻', 'chip resistors')}
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
                      label: tr('阻值', 'Resistance'),
                      value: formatNumber(result.data.resistance),
                      unit: 'Ω',
                    },
                    { label: tr('標記', 'Marking'), value: result.data.code },
                    ...(zeroOhm
                      ? [
                          {
                            label: tr('用途', 'Use'),
                            value: tr('零歐姆跳線', 'Zero-ohm jumper'),
                          },
                        ]
                      : []),
                  ]
                : [
                    {
                      label: tr(
                        '可精確表示的代碼',
                        'Exactly representable code',
                      ),
                      value: result.data.code,
                    },
                    {
                      label: tr('阻值', 'Resistance'),
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
        label={tr('轉換方向', 'Conversion direction')}
        value={mode}
        onChange={(v) => setMode(v as typeof mode)}
        options={[
          { value: 'decode', label: tr('代碼轉阻值', 'Code to resistance') },
          { value: 'encode', label: tr('阻值轉代碼', 'Resistance to code') },
        ]}
      />
      <Choice
        label={tr('標記格式', 'Marking format')}
        value={format}
        onChange={(v) => setFormat(v as ResistorMarkFormat)}
        options={formatOptions}
      />
      {mode === 'decode' ? (
        <TextField
          label={tr('SMD 電阻代碼', 'SMD resistor code')}
          value={raw}
          onChange={setRaw}
        />
      ) : (
        <QuantityField
          label={tr('阻值', 'Resistance')}
          value={raw}
          onChange={setRaw}
          kind="resistance"
          initialUnit="Ω"
        />
      )}
    </ToolPanel>
  );
}
