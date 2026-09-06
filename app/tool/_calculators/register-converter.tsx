'use client';

import { useState } from 'react';
import { attempt } from '@/lib/tools/core';
import {
  registerFromValue,
  registerToValue,
  type ByteOrder,
  type RegisterKind,
} from '@/lib/tools/plc';
import {
  Choice,
  CopyButton,
  Notice,
  ResultRows,
  TextField,
  ToolPanel,
} from '@/app/tool/_components/controls';

const kinds = [
  { value: 'uint16', label: 'UInt16' },
  { value: 'int16', label: 'Int16' },
  { value: 'uint32', label: 'UInt32' },
  { value: 'int32', label: 'Int32' },
  { value: 'float32', label: 'Float32 (IEEE 754)' },
] as const;
const orders = [
  { value: 'ABCD', label: 'ABCD' },
  { value: 'BADC', label: 'BADC' },
  { value: 'CDAB', label: 'CDAB' },
  { value: 'DCBA', label: 'DCBA' },
] as const;

export default function RegisterConverter() {
  const [direction, setDirection] = useState('to-register');
  const [kind, setKind] = useState<RegisterKind>('float32');
  const [order, setOrder] = useState<ByteOrder>('ABCD');
  const [raw, setRaw] = useState('12.5');
  const activeOrder = kind.endsWith('32') ? order : 'ABCD';
  const result = attempt(() =>
    direction === 'to-register'
      ? registerFromValue(raw, kind, activeOrder)
      : registerToValue(raw, kind, activeOrder),
  );
  const registers =
    direction === 'to-register' && result.data
      ? (result.data as ReturnType<typeof registerFromValue>).registers.join(
          ' ',
        )
      : '';
  const display = !result.error
    ? direction === 'to-register'
      ? registers
      : (result.data as ReturnType<typeof registerToValue>).formatted
    : '';
  return (
    <ToolPanel
      notes={
        <Notice>
          16 位元資料只有一個暫存器。ABCD 是 32
          位元資料的標準高位元組在前排列；請依設備手冊選擇其他排列。
        </Notice>
      }
      result={
        result.error ? (
          <Notice>{result.error}</Notice>
        ) : (
          <>
            <ResultRows
              rows={
                direction === 'to-register'
                  ? [{ label: '暫存器 HEX', value: registers }]
                  : [{ label: '數值', value: display }]
              }
            />
            <CopyButton text={display} />
          </>
        )
      }
    >
      <div className="fields-grid">
        <Choice
          label="方向"
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'to-register', label: '數值 → 暫存器' },
            { value: 'from-register', label: '暫存器 → 數值' },
          ]}
        />
        <Choice
          label="資料型別"
          value={kind}
          onChange={(value) => setKind(value as RegisterKind)}
          options={kinds}
        />
        {kind.endsWith('32') && (
          <Choice
            label="位元組排列"
            value={order}
            onChange={(value) => setOrder(value as ByteOrder)}
            options={orders}
          />
        )}
      </div>
      <TextField
        label={
          direction === 'to-register' ? '數值' : '暫存器 HEX（以空白分隔）'
        }
        value={raw}
        onChange={setRaw}
      />
    </ToolPanel>
  );
}
