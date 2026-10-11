'use client';

import { useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
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
  const { tr } = useToolLanguage();
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
          {tr(
            '參考編號是文件慣例；實際 Modbus 封包使用零起算位址。五位數慣例可表示 0–9998，六位數可表示 0–65535。',
            'Reference numbers are a documentation convention; actual Modbus packets use zero-based addresses. The five-digit convention can represent 0–9998, and the six-digit convention can represent 0–65535.',
          )}
        </Notice>
      }
      result={
        result.error ? (
          <Notice>{result.error}</Notice>
        ) : (
          <ResultRows
            rows={[
              {
                label: tr('參考編號', 'Reference number'),
                value: result.data!.reference,
              },
              {
                label: tr('零起算位址', 'Zero-based address'),
                value: result.data!.offset,
              },
              {
                label: tr('從 1 起算序號', 'One-based sequence'),
                value: result.data!.sequence,
              },
              { label: tr('HEX 位址', 'HEX address'), value: result.data!.hex },
              {
                label: tr('讀取功能碼', 'Read function code'),
                value: result.data!.functionCode,
              },
            ]}
          />
        )
      }
    >
      <div className="fields-grid">
        <Choice
          label={tr('資料區', 'Data area')}
          value={area}
          onChange={changeArea}
          options={Object.entries(modbusAreas).map(([value, item]) => ({
            value,
            label: item.label,
          }))}
        />
        <Choice
          label={tr('參考編號位數', 'Reference number digits')}
          value={digits}
          onChange={changeDigits}
          options={[
            { value: '5', label: tr('五位數', 'Five digits') },
            { value: '6', label: tr('六位數', 'Six digits') },
          ]}
        />
        <Choice
          label={tr('輸入種類', 'Input type')}
          value={mode}
          onChange={changeMode}
          options={[
            { value: 'reference', label: tr('參考編號', 'Reference number') },
            { value: 'offset', label: tr('零起算位址', 'Zero-based address') },
            {
              value: 'sequence',
              label: tr('從 1 起算序號', 'One-based sequence'),
            },
          ]}
        />
        <NumberField
          label={
            mode === 'sequence'
              ? tr('從 1 起算序號', 'One-based sequence')
              : mode === 'offset'
                ? tr('零起算位址', 'Zero-based address')
                : tr('參考編號', 'Reference number')
          }
          value={value}
          onChange={setValue}
        />
      </div>
    </ToolPanel>
  );
}
