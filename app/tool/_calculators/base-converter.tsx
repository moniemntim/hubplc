'use client';

import { useState } from 'react';
import { attempt } from '@/lib/tools/core';
import { baseConvert } from '@/lib/tools/plc';
import { useToolLanguage } from '@/components/tool-language';
import {
  Choice,
  Notice,
  ResultRows,
  TextField,
  ToolPanel,
} from '@/app/tool/_components/controls';

export default function BaseConverter() {
  const { tr } = useToolLanguage();
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
          {tr(
            '二、八、十六進位輸入代表位元型態；有號模式以二補數解讀最高位元。十進位有號輸入可直接使用負數。',
            "Binary, octal, and hexadecimal input represents bit patterns. Signed mode interprets the most significant bit using two's complement. Signed decimal input may use negative numbers directly.",
          )}
        </Notice>
      }
      result={
        result.error ? (
          <Notice>{result.error}</Notice>
        ) : (
          <ResultRows
            rows={[
              { label: tr('十進位', 'Decimal'), value: result.data!.decimal },
              { label: tr('二進位', 'Binary'), value: result.data!.binary },
              { label: tr('八進位', 'Octal'), value: result.data!.octal },
              { label: tr('十六進位', 'Hexadecimal'), value: result.data!.hex },
            ]}
          />
        )
      }
    >
      <div className="fields-grid">
        <TextField
          label={tr('數值（不含 0x／0b 前綴）', 'Value (without 0x/0b prefix)')}
          value={raw}
          onChange={setRaw}
        />
        <Choice
          label={tr('輸入進位', 'Input base')}
          value={base}
          onChange={setBase}
          options={[
            { value: '2', label: tr('二進位', 'Binary') },
            { value: '8', label: tr('八進位', 'Octal') },
            { value: '10', label: tr('十進位', 'Decimal') },
            { value: '16', label: tr('十六進位', 'Hexadecimal') },
          ]}
        />
        <Choice
          label={tr('位元數', 'Bit width')}
          value={bits}
          onChange={setBits}
          options={[
            { value: '8', label: '8 bit' },
            { value: '16', label: '16 bit' },
            { value: '32', label: '32 bit' },
          ]}
        />
        <Choice
          label={tr('解讀方式', 'Interpretation')}
          value={signed}
          onChange={setSigned}
          options={[
            { value: 'false', label: tr('無號整數', 'Unsigned integer') },
            {
              value: 'true',
              label: tr('有號二補數', "Signed two's complement"),
            },
          ]}
        />
      </div>
    </ToolPanel>
  );
}
