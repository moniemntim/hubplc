'use client';

import { useState } from 'react';
import { attempt } from '@/lib/tools/core';
import { baseConvert } from '@/lib/tools/plc';
import {
  Choice,
  Notice,
  ResultRows,
  TextField,
  ToolPanel,
} from '@/app/tool/_components/controls';

export default function BaseConverter() {
  const [raw, setRaw] = useState('255');
  const [base, setBase] = useState('10');
  const [bits, setBits] = useState('32');
  const [signed, setSigned] = useState('false');
  const result = attempt(() =>
    baseConvert({
      raw,
      base: Number(base),
      bits: Number(bits) as 8 | 16 | 32,
      signed: signed === 'true',
    }),
  );
  return (
    <ToolPanel
      notes={
        <Notice>
          二、八、十六進位輸入代表位元型態；有號模式以二補數解讀最高位元。十進位有號輸入可直接使用負數。
        </Notice>
      }
      result={
        result.error ? (
          <Notice>{result.error}</Notice>
        ) : (
          <ResultRows
            rows={[
              { label: '十進位', value: result.data!.decimal },
              { label: '二進位', value: result.data!.binary },
              { label: '八進位', value: result.data!.octal },
              { label: '十六進位', value: result.data!.hex },
            ]}
          />
        )
      }
    >
      <div className="fields-grid">
        <TextField
          label="數值（不含 0x／0b 前綴）"
          value={raw}
          onChange={setRaw}
        />
        <Choice
          label="輸入進位"
          value={base}
          onChange={setBase}
          options={[
            { value: '2', label: '二進位' },
            { value: '8', label: '八進位' },
            { value: '10', label: '十進位' },
            { value: '16', label: '十六進位' },
          ]}
        />
        <Choice
          label="位元數"
          value={bits}
          onChange={setBits}
          options={[
            { value: '8', label: '8 bit' },
            { value: '16', label: '16 bit' },
            { value: '32', label: '32 bit' },
          ]}
        />
        <Choice
          label="解讀方式"
          value={signed}
          onChange={setSigned}
          options={[
            { value: 'false', label: '無號整數' },
            { value: 'true', label: '有號二補數' },
          ]}
        />
      </div>
    </ToolPanel>
  );
}
