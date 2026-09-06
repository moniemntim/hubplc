'use client';

import { useState } from 'react';
import { attempt } from '@/lib/tools/core';
import { modbusAreas, modbusConvert, type ModbusArea } from '@/lib/tools/plc';
import {
  Choice,
  Notice,
  NumberField,
  ResultRows,
  ToolPanel,
} from '@/app/tool/_components/controls';

export default function ModbusAddress() {
  const [area, setArea] = useState<ModbusArea>('holding');
  const [digits, setDigits] = useState<'5' | '6'>('5');
  const [mode, setMode] = useState<'reference' | 'offset' | 'sequence'>(
    'reference',
  );
  const [value, setValue] = useState('40001');
  const referenceBase = (nextArea = area, nextDigits = digits) =>
    String(
      (nextDigits === '5'
        ? modbusAreas[nextArea].prefix * 10000
        : modbusAreas[nextArea].prefix * 100000) + 1,
    ).padStart(Number(nextDigits), '0');
  const result = attempt(() =>
    modbusConvert({ area, digits: Number(digits) as 5 | 6, [mode]: value }),
  );
  const changeMode = (next: string) => {
    const selected = next as typeof mode;
    setMode(selected);
    setValue(selected === 'reference' ? referenceBase() : '1');
    if (selected === 'offset') setValue('0');
  };
  const changeArea = (next: string) => {
    const selected = next as ModbusArea;
    setArea(selected);
    if (mode === 'reference') setValue(referenceBase(selected));
  };
  const changeDigits = (next: string) => {
    const selected = next as typeof digits;
    setDigits(selected);
    if (mode === 'reference') setValue(referenceBase(area, selected));
  };
  return (
    <ToolPanel
      notes={
        <Notice>
          參考編號是文件慣例；實際 Modbus 封包使用零起算位址。五位數慣例可表示
          0–9998，六位數可表示 0–65535。
        </Notice>
      }
      result={
        result.error ? (
          <Notice>{result.error}</Notice>
        ) : (
          <ResultRows
            rows={[
              { label: '參考編號', value: result.data!.reference },
              { label: '零起算位址', value: result.data!.offset },
              { label: '從 1 起算序號', value: result.data!.sequence },
              { label: 'HEX 位址', value: result.data!.hex },
              { label: '讀取功能碼', value: result.data!.functionCode },
            ]}
          />
        )
      }
    >
      <div className="fields-grid">
        <Choice
          label="資料區"
          value={area}
          onChange={changeArea}
          options={Object.entries(modbusAreas).map(([value, item]) => ({
            value,
            label: item.label,
          }))}
        />
        <Choice
          label="參考編號位數"
          value={digits}
          onChange={changeDigits}
          options={[
            { value: '5', label: '五位數' },
            { value: '6', label: '六位數' },
          ]}
        />
        <Choice
          label="輸入種類"
          value={mode}
          onChange={changeMode}
          options={[
            { value: 'reference', label: '參考編號' },
            { value: 'offset', label: '零起算位址' },
            { value: 'sequence', label: '從 1 起算序號' },
          ]}
        />
        <NumberField
          label={
            mode === 'sequence'
              ? '從 1 起算序號'
              : mode === 'offset'
                ? '零起算位址'
                : '參考編號'
          }
          value={value}
          onChange={setValue}
        />
      </div>
    </ToolPanel>
  );
}
