'use client';
import { useState } from 'react';
import { attempt } from '@/lib/tools/core';
import { modbusCrc } from '@/lib/tools/plc';
import { useToolLanguage } from '@/components/tool-language';
import {
  CopyButton,
  Notice,
  ResultRows,
  TextField,
  ToolPanel,
} from '@/app/tool/_components/controls';
export default function ModbusCrc() {
  const { tr } = useToolLanguage();
  const [raw, setRaw] = useState('01 03 00 00 00 0A');
  const result = attempt(() => modbusCrc(raw));
  return (
    <ToolPanel
      notes={
        <Notice>
          {tr(
            'CRC-16/Modbus 初始值為 FFFF。CRC 數值以高位元組在前顯示；實際封包以低位元組在前傳送。',
            'CRC-16/Modbus starts at FFFF. The CRC value is displayed high byte first; the actual packet sends the low byte first.',
          )}
        </Notice>
      }
      result={
        result.error ? (
          <Notice>{result.error}</Notice>
        ) : (
          <>
            <ResultRows
              rows={[
                { label: tr('CRC 數值', 'CRC value'), value: result.data!.crc },
                {
                  label: tr('封包傳送順序', 'Packet byte order'),
                  value: result.data!.wire,
                },
                {
                  label: tr('完整封包', 'Complete packet'),
                  value: result.data!.complete,
                },
              ]}
            />
            <CopyButton
              text={result.data!.complete}
              label={tr('複製完整封包', 'Copy complete packet')}
            />
          </>
        )
      }
    >
      {
        <TextField
          label={tr(
            'HEX 位元組（空白或逗號分隔）',
            'HEX bytes (space or comma separated)',
          )}
          value={raw}
          onChange={setRaw}
          multiline
        />
      }
    </ToolPanel>
  );
}
