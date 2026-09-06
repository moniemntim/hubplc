'use client';
import { useState } from 'react';
import { attempt } from '@/lib/tools/core';
import { modbusCrc } from '@/lib/tools/plc';
import {
  CopyButton,
  Notice,
  ResultRows,
  TextField,
  ToolPanel,
} from '@/app/tool/_components/controls';
export default function ModbusCrc() {
  const [raw, setRaw] = useState('01 03 00 00 00 0A');
  const result = attempt(() => modbusCrc(raw));
  return (
    <ToolPanel
      notes={
        <Notice>
          CRC-16/Modbus 初始值為 FFFF。CRC
          數值以高位元組在前顯示；實際封包以低位元組在前傳送。
        </Notice>
      }
      result={
        result.error ? (
          <Notice>{result.error}</Notice>
        ) : (
          <>
            <ResultRows
              rows={[
                { label: 'CRC 數值', value: result.data!.crc },
                { label: '封包傳送順序', value: result.data!.wire },
                { label: '完整封包', value: result.data!.complete },
              ]}
            />
            <CopyButton text={result.data!.complete} label="複製完整封包" />
          </>
        )
      }
    >
      {
        <TextField
          label="HEX 位元組（空白或逗號分隔）"
          value={raw}
          onChange={setRaw}
          multiline
        />
      }
    </ToolPanel>
  );
}
