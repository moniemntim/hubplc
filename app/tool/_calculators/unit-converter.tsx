'use client';
import { useState } from 'react';
import { unitGroups, convertUnit } from '@/lib/tools/units';
import { attempt, formatNumber } from '@/lib/tools/core';
import Link from '@/components/site-link';
import {
  Choice,
  NumberField,
  ToolPanel,
  ResultRows,
  Notice,
  CopyButton,
} from '../_components/controls';
const dedicatedPages = [
  ['length', '長度'],
  ['temperature', '溫度'],
  ['mass', '質量'],
  ['area', '面積'],
  ['volume', '體積'],
  ['pressure', '壓力'],
  ['power', '功率'],
  ['time', '時間'],
  ['angle', '角度'],
  ['capacitance', '電容量'],
  ['speed', '速度'],
  ['storage', '資料容量'],
] as const;

const groupExamples: Record<
  string,
  { fromId: string; toId: string; raw: string }
> = {
  length: { fromId: 'm', toId: 'ft', raw: '1' },
  temperature: { fromId: 'c', toId: 'f', raw: '1' },
  mass: { fromId: 'kg', toId: 'lb', raw: '1' },
  area: { fromId: 'm2', toId: 'ft2', raw: '1' },
  volume: { fromId: 'l', toId: 'usgal', raw: '1' },
  pressure: { fromId: 'bar', toId: 'kpa', raw: '1' },
  power: { fromId: 'kw', toId: 'watt', raw: '1' },
  time: { fromId: 'h', toId: 'min', raw: '1' },
  angle: { fromId: 'deg', toId: 'rad', raw: '180' },
  capacitance: { fromId: 'uf', toId: 'nf', raw: '1' },
  speed: { fromId: 'kmh', toId: 'mspeed', raw: '1' },
  storage: { fromId: 'gb', toId: 'gib', raw: '1' },
  flow: { fromId: 'lmin', toId: 'm3h', raw: '1' },
};

function exampleFor(groupId: string) {
  return groupExamples[groupId] ?? groupExamples.pressure;
}

export default function UnitConverter({ fixedGroup }: { fixedGroup?: string }) {
  const initialGroup = fixedGroup ?? 'pressure';
  const initialExample = exampleFor(initialGroup);
  const initial =
    unitGroups.find((item) => item.id === initialGroup) ?? unitGroups[0];
  const [groupId, setGroupId] = useState(initial.id),
    [fromId, setFromId] = useState(initialExample.fromId),
    [toId, setToId] = useState(initialExample.toId),
    [raw, setRaw] = useState(initialExample.raw);
  const group =
    unitGroups.find((item) => item.id === (fixedGroup ?? groupId)) ?? initial;
  const from = group.units.find((item) => item.id === fromId) ?? group.units[0];
  const compatible = group.units.filter(
    (item) => item.dimension === from.dimension,
  );
  const target = compatible.find((item) => item.id === toId) ?? compatible[0];
  const result = attempt(() => convertUnit(raw, from.id, target.id));
  function changeGroup(id: string) {
    const selected = exampleFor(id);
    setGroupId(id);
    setFromId(selected.fromId);
    setToId(selected.toId);
    setRaw(selected.raw);
  }
  function loadExample() {
    const selected = exampleFor(group.id);
    setFromId(selected.fromId);
    setToId(selected.toId);
    setRaw(selected.raw);
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
          {group.note && <p>{group.note}</p>}
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
      {!fixedGroup && (
        <>
          <Choice
            label="物理量分類"
            value={groupId}
            onChange={changeGroup}
            options={unitGroups.map((item) => ({
              value: item.id,
              label: item.label,
            }))}
          />
          <nav className="crypto-related" aria-label="常用單位換算捷徑">
            {dedicatedPages.map(([id, label]) => (
              <Link key={id} href={`/tool/${id}-converter`}>
                {label}
              </Link>
            ))}
          </nav>
        </>
      )}
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
          setFromId(target.id);
          setToId(from.id);
          if (result.data !== undefined) setRaw(String(result.data));
        }}
      >
        ⇄ 交換方向
      </button>
      <div className="action-row">
        <button className="action secondary" onClick={() => setRaw('')}>
          清空
        </button>
        <button className="action secondary" onClick={loadExample}>
          載入範例
        </button>
      </div>
    </ToolPanel>
  );
}
