'use client';
import { useState } from 'react';
import { electricalFormat, resistorNetwork } from '@/lib/tools/electrical';
import { attempt } from '@/lib/tools/core';
import {
  TextField,
  Choice,
  ToolPanel,
  ResultRows,
  Notice,
} from '@/app/tool/_components/controls';
export default function ResistorNetwork() {
  const [mode, setMode] = useState<'series' | 'parallel'>('series'),
    [values, setValues] = useState('100, 220, 330');
  const res = attempt(() => resistorNetwork(values, mode));
  return (
    <ToolPanel
      notes={
        <>
          串聯：Req = R1 + R2 + …；並聯：1/Req = 1/R1 + 1/R2 + …。輸入 2 至 20
          個正電阻值，以逗號、空白或換行分隔。結果為理想純電阻等效值。
        </>
      }
      result={
        res.data ? (
          <ResultRows
            rows={[
              {
                label: '等效電阻',
                value: electricalFormat(res.data.resistance),
                unit: 'Ω',
              },
              { label: '電阻數量', value: res.data.count, unit: '顆' },
            ]}
          />
        ) : (
          <Notice>{res.error}</Notice>
        )
      }
    >
      <Choice
        label="連接方式"
        value={mode}
        onChange={(v) => setMode(v as 'series' | 'parallel')}
        options={[
          { value: 'series', label: '串聯' },
          { value: 'parallel', label: '並聯' },
        ]}
      />
      <TextField
        label="電阻值（Ω）"
        value={values}
        onChange={setValues}
        multiline
      />
    </ToolPanel>
  );
}
