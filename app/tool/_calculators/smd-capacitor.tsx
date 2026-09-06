'use client';
import { useState } from 'react';
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
  const match = /^(\d{3}|(?:\d{1,3})?R\d{1,3})([JKM])?$/.exec(code);
  const marking = match?.[1] ?? '';
  const tolerance = match?.[2] ?? '';
  const numeric = /^\d{3}$/.test(marking);
  return (
    <figure className="component-visual capacitor-visual">
      <div className="component-eyebrow">MLCC · 積層陶瓷電容</div>
      <ChipPackage kind="capacitor" field={field} />
      <figcaption>
        <p className="component-caption">
          陶瓷本體 · 兩端金屬端電極 · 外觀示意
        </p>
        <div className="marking-breakdown" aria-label="電容代碼拆解">
          {marking ? (
            <>
              <div className="marking-token">
                <strong>{numeric ? marking.slice(0, 2) : marking}</strong>
                <span>{numeric ? '有效數字' : 'R 是小數點'}</span>
                {!numeric && <small>{marking.replace('R', '.')} pF</small>}
              </div>
              {numeric && (
                <div className="marking-token">
                  <strong>{marking[2]}</strong>
                  <span>倍率</span>
                  <small>
                    × 10<sup>{marking[2]}</sup> pF
                  </small>
                </div>
              )}
              {tolerance && (
                <div className="marking-token">
                  <strong>{tolerance}</strong>
                  <span>容差</span>
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
            <p>輸入有效代碼後顯示拆解</p>
          )}
        </div>
        <p className="component-footnote">
          下方為容量代碼解讀，並非上方元件的實際印字；請以元件料號與製造商資料確認標示。
        </p>
      </figcaption>
    </figure>
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
          分別表示 ±5%、±10%、±20% 容差；不解讀廠商專用耐壓或系列標記。{' '}
          資料參考：
          <a href="https://ele.kyocera.com/sites/default/files/assets/products/capacitor/aboutnewpn_e.pdf">
            KYOCERA 容量代碼
          </a>
          、
          <a href="https://www.murata.com/en-global/products/capacitor/ceramiccapacitor/overview/lineup">
            Murata 陶瓷電容外觀
          </a>
          。
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
