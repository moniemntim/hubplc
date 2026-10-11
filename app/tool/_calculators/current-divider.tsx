'use client';
import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import { currentDivider } from '@/lib/tools/networks';
import { useToolLanguage } from '@/components/tool-language';
import {
  Choice,
  Notice,
  ResultRows,
  ToolActions,
  ToolPanel,
} from '@/app/tool/_components/controls';
import { QuantityField } from '@/app/tool/_components/quantity';
import { NetworkDiagram } from '@/app/tool/_components/network-components';
const example = ['100', '220', '330'];
export default function CurrentDivider() {
  const { tr } = useToolLanguage();
  const [source, setSource] = useState<'voltage' | 'current'>('voltage'),
    [raw, setRaw] = useState('12'),
    [values, setValues] = useState(example);
  const nums = values.map(Number),
    result = attempt(() => currentDivider(nums, source, raw));
  const update = (i: number, v: string) =>
    setValues((xs) => xs.map((x, n) => (n === i ? v : x)));
  return (
    <ToolPanel
      diagram={
        <NetworkDiagram
          mode="parallel"
          values={result.data ? nums : nums.map(() => NaN)}
          currents={result.data?.branches.map((b) => b.current)}
          sourceField={
            source === 'voltage'
              ? tr('電源電壓', 'Supply voltage')
              : tr('總電流', 'Total current')
          }
          sourceText={
            result.data
              ? `${tr('電源', 'Supply')} ${formatNumber(result.data.voltage)} V · ${tr('總電流', 'Total current')} ${formatNumber(result.data.totalCurrent)} A`
              : undefined
          }
        />
      }
      notes={
        <>
          {tr(
            '並聯支路共用相同電壓；依歐姆定律計算各支路電流與理想功耗。各支路電流總和等於總電流。',
            "Parallel branches share the same voltage. Ohm's law calculates each branch current and ideal power; their currents sum to the total current.",
          )}
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: tr('等效電阻', 'Equivalent resistance'),
                value: formatNumber(result.data.equivalent),
                unit: 'Ω',
              },
              {
                label: tr('支路電壓', 'Branch voltage'),
                value: formatNumber(result.data.voltage),
                unit: 'V',
              },
              {
                label: tr('總電流', 'Total current'),
                value: formatNumber(result.data.totalCurrent),
                unit: 'A',
              },
              {
                label: tr('總功耗', 'Total power'),
                value: formatNumber(result.data.totalPower),
                unit: 'W',
              },
              ...result.data.branches.map((b, i) => ({
                label: `R${i + 1} ${tr('支路', 'branch')}`,
                value: `${formatNumber(b.current)} A / ${formatNumber(b.percent)}% / ${formatNumber(b.power)} W`,
              })),
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label={tr('已知來源', 'Known source')}
        value={source}
        onChange={(v) => setSource(v as typeof source)}
        options={[
          { value: 'voltage', label: tr('電源電壓', 'Supply voltage') },
          { value: 'current', label: tr('總電流', 'Total current') },
        ]}
      />
      <QuantityField
        label={
          source === 'voltage'
            ? tr('電源電壓', 'Supply voltage')
            : tr('總電流', 'Total current')
        }
        value={raw}
        onChange={setRaw}
        kind={source === 'voltage' ? 'voltage' : 'current'}
      />
      <div className="fields-grid">
        {values.map((value, i) => (
          <QuantityField
            key={i}
            label={`R${i + 1}`}
            value={value}
            onChange={(v) => update(i, v)}
            kind="resistance"
          />
        ))}
      </div>
      <div className="tool-actions">
        <button
          type="button"
          className="action secondary"
          disabled={values.length >= 20}
          onClick={() => setValues((xs) => [...xs, '100'])}
        >
          {tr('新增支路', 'Add branch')}
        </button>
        <button
          type="button"
          className="action secondary"
          disabled={values.length <= 2}
          onClick={() => setValues((xs) => xs.slice(0, -1))}
        >
          {tr('移除支路', 'Remove branch')}
        </button>
      </div>
      <ToolActions
        onExample={() => {
          setSource('voltage');
          setRaw('12');
          setValues(example);
        }}
        onClear={() => {
          setRaw('');
          setValues(['', '']);
        }}
      />
    </ToolPanel>
  );
}
