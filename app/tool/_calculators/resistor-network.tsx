'use client';
import { useState } from 'react';
import { electricalFormat } from '@/lib/tools/electrical';
import { attempt } from '@/lib/tools/core';
import { passiveNetwork, type NetworkMode } from '@/lib/tools/networks';
import { useToolLanguage } from '@/components/tool-language';
import {
  Choice,
  ToolPanel,
  ResultRows,
  Notice,
  ToolActions,
} from '@/app/tool/_components/controls';
import { NetworkDiagram } from '@/app/tool/_components/network-components';
import { QuantityField } from '@/app/tool/_components/quantity';
export default function ResistorNetwork() {
  const { tr } = useToolLanguage();
  const [mode, setMode] = useState<NetworkMode>('series'),
    [values, setValues] = useState(['100', '220', '330']);
  const numbers = values.map(Number);
  const res = attempt(() =>
    passiveNetwork(numbers, mode, tr('電阻', 'resistor')),
  );
  return (
    <ToolPanel
      diagram={
        <NetworkDiagram
          mode={mode}
          values={res.data ? numbers : numbers.map(() => NaN)}
        />
      }
      notes={
        <>
          {tr(
            '串聯：Req = R1 + R2 + …；並聯：1/Req = 1/R1 + 1/R2 + …。可輸入 2 至 20 個正電阻值；結果為理想純電阻等效值。',
            'Series: Req = R1 + R2 + …; parallel: 1/Req = 1/R1 + 1/R2 + …. Enter 2 to 20 positive resistance values; the result is an ideal resistive equivalent.',
          )}
        </>
      }
      result={
        res.data ? (
          <ResultRows
            rows={[
              {
                label: tr('等效電阻', 'Equivalent resistance'),
                value: electricalFormat(res.data.equivalent),
                unit: 'Ω',
              },
              {
                label: tr('電阻數量', 'Resistor count'),
                value: res.data.count,
                unit: tr('顆', 'units'),
              },
            ]}
          />
        ) : (
          <Notice>{res.error}</Notice>
        )
      }
    >
      <Choice
        label={tr('連接方式', 'Connection')}
        value={mode}
        onChange={(v) => setMode(v as NetworkMode)}
        options={[
          { value: 'series', label: tr('串聯', 'Series') },
          { value: 'parallel', label: tr('並聯', 'Parallel') },
        ]}
      />
      <div className="fields-grid">
        {values.map((value, index) => (
          <QuantityField
            key={index}
            label={`R${index + 1}`}
            value={value}
            onChange={(next) =>
              setValues((items) =>
                items.map((item, i) => (i === index ? next : item)),
              )
            }
            kind="resistance"
          />
        ))}
      </div>
      <div className="tool-actions">
        <button
          type="button"
          className="action secondary"
          disabled={values.length >= 20}
          onClick={() => setValues((items) => [...items, '100'])}
        >
          {tr('新增電阻', 'Add resistor')}
        </button>
        <button
          type="button"
          className="action secondary"
          disabled={values.length <= 2}
          onClick={() => setValues((items) => items.slice(0, -1))}
        >
          {tr('移除最後一顆', 'Remove last resistor')}
        </button>
      </div>
      <ToolActions
        onExample={() => {
          setMode('series');
          setValues(['100', '220', '330']);
        }}
        onClear={() => setValues(['', ''])}
      />
    </ToolPanel>
  );
}
