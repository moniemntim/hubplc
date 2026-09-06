'use client';
import { useState } from 'react';
import { unitGroups, convertUnit } from '@/lib/tools/units';
import { attempt, formatNumber } from '@/lib/tools/core';
import {
  Choice,
  NumberField,
  ToolPanel,
  ResultRows,
  Notice,
  CopyButton,
} from '../_components/controls';
export default function UnitConverter() {
  const [groupId, setGroupId] = useState('pressure'),
    [fromId, setFromId] = useState('bar'),
    [toId, setToId] = useState('kpa'),
    [raw, setRaw] = useState('1');
  const group = unitGroups.find((item) => item.id === groupId)!;
  const from = group.units.find((item) => item.id === fromId)!;
  const compatible = group.units.filter(
    (item) => item.dimension === from.dimension,
  );
  const target = compatible.find((item) => item.id === toId)!;
  const result = attempt(() => convertUnit(raw, fromId, toId));
  function changeGroup(id: string) {
    const selected = unitGroups.find((item) => item.id === id)!;
    setGroupId(id);
    setFromId(selected.units[0].id);
    setToId(selected.units[1].id);
  }
  function changeFrom(id: string) {
    const selected = group.units.find((item) => item.id === id)!;
    setFromId(id);
    if (selected.dimension !== from.dimension)
      setToId(
        group.units.find(
          (item) => item.dimension === selected.dimension && item.id !== id,
        )?.id ?? id,
      );
  }
  return (
    <ToolPanel
      notes={
        <>
          <p>
            一般單位：先乘以來源單位的 SI
            係數，再除以目標單位係數。溫度另外計算零點偏移。
          </p>
          <p>
            質量流量與體積流量不能直接互換；US gpm
            使用美制液量加侖。壓力僅做單位倍率換算，不進行表壓／絕對壓基準轉換。mmH₂O
            使用標準重力換算值。
          </p>
          <p>「重量」在此指質量，不是力。時間中的 day 固定為 24 小時。</p>
        </>
      }
      result={
        result.data !== undefined ? (
          <>
            <ResultRows
              rows={[
                {
                  label: '換算結果',
                  value: formatNumber(result.data),
                  unit: target.label,
                },
              ]}
            />
            <CopyButton text={`${formatNumber(result.data)} ${target.label}`} />
          </>
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label="物理量分類"
        value={groupId}
        onChange={changeGroup}
        options={unitGroups.map((item) => ({
          value: item.id,
          label: item.label,
        }))}
      />
      <NumberField label="輸入數值" value={raw} onChange={setRaw} />
      <div className="fields-grid">
        <Choice
          label="來源單位"
          value={fromId}
          onChange={changeFrom}
          options={group.units.map((item) => ({
            value: item.id,
            label: item.label,
          }))}
        />
        <Choice
          label="目標單位"
          value={toId}
          onChange={setToId}
          options={compatible.map((item) => ({
            value: item.id,
            label: item.label,
          }))}
        />
      </div>
      <button
        className="action secondary"
        onClick={() => {
          setFromId(toId);
          setToId(fromId);
          if (result.data !== undefined) setRaw(String(result.data));
        }}
      >
        ⇄ 交換方向
      </button>
    </ToolPanel>
  );
}
