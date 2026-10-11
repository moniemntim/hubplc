'use client';
import { useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
import { ChipPackage } from '@/app/tool/_components/chip-package';
import { attempt, formatNumber } from '@/lib/tools/core';
import {
  decodeSmdCapacitor,
  encodeSmdCapacitor,
  type CapacitorTolerance,
} from '@/lib/tools/markings';
import { QuantityField } from '@/app/tool/_components/quantity';
import {
  Choice,
  Notice,
  ResultRows,
  TextField,
  ToolActions,
  ToolPanel,
} from '@/app/tool/_components/controls';
function Diagram({ code, field }: { code: string; field: string }) {
  const { tr } = useToolLanguage();
  const match = /^(\d{3}|(?:\d{1,3})?R\d{1,3})([JKM])?$/.exec(code);
  const marking = match?.[1] ?? '';
  const tolerance = match?.[2] ?? '';
  const numeric = /^\d{3}$/.test(marking);
  return (
    <figure className="component-visual capacitor-visual">
      <div className="component-eyebrow">
        MLCC · {tr('積層陶瓷電容', 'Multilayer ceramic capacitor')}
      </div>
      <ChipPackage kind="capacitor" field={field} />
      <figcaption>
        <p className="component-caption">
          {tr(
            '陶瓷本體 · 兩端金屬端電極 · 外觀示意',
            'Ceramic body · metal end electrodes · illustrative appearance',
          )}
        </p>
        <div
          className="marking-breakdown"
          aria-label={tr('電容代碼拆解', 'Capacitor code breakdown')}
        >
          {marking ? (
            <>
              <div className="marking-token">
                <strong>{numeric ? marking.slice(0, 2) : marking}</strong>
                <span>
                  {numeric
                    ? tr('有效數字', 'Significant digits')
                    : tr('R 是小數點', 'R is decimal point')}
                </span>
                {!numeric && <small>{marking.replace('R', '.')} pF</small>}
              </div>
              {numeric && (
                <div className="marking-token">
                  <strong>{marking[2]}</strong>
                  <span>{tr('倍率', 'Multiplier')}</span>
                  <small>
                    × 10<sup>{marking[2]}</sup> pF
                  </small>
                </div>
              )}
              {tolerance && (
                <div className="marking-token">
                  <strong>{tolerance}</strong>
                  <span>{tr('容差', 'Tolerance')}</span>
                  <small>
                    ±
                    {
                      ({ J: 5, K: 10, M: 20 } as Record<string, number>)[
                        tolerance
                      ]
                    }
                    %
                  </small>
                </div>
              )}
            </>
          ) : (
            <p>
              {tr(
                '輸入有效代碼後顯示拆解',
                'Enter a valid code to show the breakdown',
              )}
            </p>
          )}
        </div>
        <p className="component-footnote">
          {tr(
            '下方為容量代碼解讀，並非上方元件的實際印字；請以元件料號與製造商資料確認標示。',
            'The code interpretation below is not the actual marking on the component above; confirm markings using the part number and manufacturer data.',
          )}
        </p>
      </figcaption>
    </figure>
  );
}
export default function SmdCapacitor() {
  const { tr } = useToolLanguage();
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
          field={
            mode === 'decode'
              ? tr('SMD 電容代碼', 'SMD capacitor code')
              : tr('電容量', 'Capacitance')
          }
        />
      }
      notes={
        <>
          {tr(
            '通用三位數代碼以 pF 為基準：104 = 10 × 10⁴ pF = 100 nF。J、K、M 分別表示 ±5%、±10%、±20% 容差；不解讀廠商專用耐壓或系列標記。資料參考：',
            'Generic three-digit codes use pF as the base: 104 = 10 × 10⁴ pF = 100 nF. J, K, and M indicate ±5%, ±10%, and ±20% tolerance; manufacturer-specific voltage and series markings are not interpreted. References:',
          )}{' '}
          <a href="https://ele.kyocera.com/sites/default/files/assets/products/capacitor/aboutnewpn_e.pdf">
            KYOCERA {tr('容量代碼', 'capacitance codes')}
          </a>
          、
          <a href="https://www.murata.com/en-global/products/capacitor/ceramiccapacitor/overview/lineup">
            Murata {tr('陶瓷電容外觀', 'ceramic capacitor appearance')}
          </a>
          。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label:
                  mode === 'decode'
                    ? tr('電容量', 'Capacitance')
                    : tr('可精確表示的代碼', 'Exactly representable code'),
                value:
                  mode === 'decode'
                    ? formatNumber(result.data.capacitance)
                    : result.data.code,
                unit: mode === 'decode' ? 'F' : undefined,
              },
              ...(mode === 'decode'
                ? [
                    {
                      label: tr('換算', 'Conversions'),
                      value: `${formatNumber(result.data.capacitance * 1e12)} pF ／ ${formatNumber(result.data.capacitance * 1e9)} nF ／ ${formatNumber(result.data.capacitance * 1e6)} µF`,
                    },
                  ]
                : [
                    {
                      label: tr('電容量', 'Capacitance'),
                      value: formatNumber(result.data.capacitance),
                      unit: 'F',
                    },
                  ]),
              ...(result.data.tolerance
                ? [
                    {
                      label: tr('容差', 'Tolerance'),
                      value: `±${result.data.tolerance}%`,
                    },
                  ]
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
        label={tr('轉換方向', 'Conversion direction')}
        value={mode}
        onChange={(v) => setMode(v as typeof mode)}
        options={[
          { value: 'decode', label: tr('代碼轉電容量', 'Code to capacitance') },
          { value: 'encode', label: tr('電容量轉代碼', 'Capacitance to code') },
        ]}
      />
      {mode === 'encode' && (
        <Choice
          label={tr('容差（可選）', 'Tolerance (optional)')}
          value={tolerance}
          onChange={(v) => setTolerance(v as CapacitorTolerance)}
          options={[
            { value: '', label: tr('未標示', 'Not marked') },
            { value: 'J', label: 'J ±5%' },
            { value: 'K', label: 'K ±10%' },
            { value: 'M', label: 'M ±20%' },
          ]}
        />
      )}
      {mode === 'decode' ? (
        <TextField
          label={tr('SMD 電容代碼', 'SMD capacitor code')}
          value={code}
          onChange={setCode}
        />
      ) : (
        <QuantityField
          label={tr('電容量', 'Capacitance')}
          value={value}
          onChange={setValue}
          kind="capacitance"
          initialUnit="nF"
        />
      )}
    </ToolPanel>
  );
}
