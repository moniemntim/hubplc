'use client';
import { useState } from 'react';
import { attempt, formatNumber } from '@/lib/tools/core';
import { shuntFromTwo, shuntMeasured } from '@/lib/tools/networks';
import {
  Choice,
  Notice,
  ResultRows,
  ToolActions,
  ToolPanel,
} from '@/app/tool/_components/controls';
import { QuantityField } from '@/app/tool/_components/quantity';
import { ShuntDiagram } from '@/app/tool/_components/network-components';
export default function ShuntResistor() {
  const [mode, setMode] = useState<'two' | 'measured'>('two'),
    [known, setKnown] = useState<'voltage' | 'current' | 'resistance'>(
      'voltage',
    ),
    [a, setA] = useState('.075'),
    [b, setB] = useState('100'),
    [ratedV, setRatedV] = useState('.075'),
    [ratedI, setRatedI] = useState('100'),
    [measured, setMeasured] = useState('.03');
  const result = attempt(() =>
    mode === 'two'
      ? shuntFromTwo(known, a, b)
      : shuntMeasured(ratedI, ratedV, measured),
  );
  const aKind =
    known === 'voltage'
      ? 'voltage'
      : known === 'current'
        ? 'current'
        : 'resistance';
  const bKind =
    known === 'voltage'
      ? 'current'
      : known === 'current'
        ? 'resistance'
        : 'voltage';
  return (
    <ToolPanel
      diagram={
        <ShuntDiagram data={result.data} measured={mode === 'measured'} />
      }
      notes={
        <>
          Rshunt = Vshunt / I，P = Vshunt ×
          I。功耗為理論值；實際選型還需確認容差、溫度係數與散熱。
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: '分流電阻',
                value: formatNumber(result.data.resistance),
                unit: 'Ω',
              },
              {
                label: '壓降',
                value: formatNumber(result.data.voltage),
                unit: 'V',
              },
              {
                label: '電流',
                value: formatNumber(result.data.current),
                unit: 'A',
              },
              {
                label: '功耗',
                value: formatNumber(result.data.power),
                unit: 'W',
              },
            ]}
          />
        ) : (
          <Notice>{result.error}</Notice>
        )
      }
    >
      <Choice
        label="計算方式"
        value={mode}
        onChange={(v) => setMode(v as typeof mode)}
        options={[
          { value: 'two', label: '任選兩項求第三項' },
          { value: 'measured', label: '額定值與實測壓降' },
        ]}
      />
      {mode === 'two' ? (
        <>
          <Choice
            label="第一個已知量"
            value={known}
            onChange={(v) => setKnown(v as typeof known)}
            options={[
              { value: 'voltage', label: '壓降與電流' },
              { value: 'current', label: '電流與電阻' },
              { value: 'resistance', label: '電阻與壓降' },
            ]}
          />
          <div className="fields-grid">
            <QuantityField
              label={
                known === 'voltage'
                  ? '壓降'
                  : known === 'current'
                    ? '電流'
                    : '電阻'
              }
              value={a}
              onChange={setA}
              kind={aKind}
            />
            <QuantityField
              label={
                known === 'voltage'
                  ? '電流'
                  : known === 'current'
                    ? '電阻'
                    : '壓降'
              }
              value={b}
              onChange={setB}
              kind={bKind}
            />
          </div>
        </>
      ) : (
        <div className="fields-grid">
          <QuantityField
            label="額定電流"
            value={ratedI}
            onChange={setRatedI}
            kind="current"
          />
          <QuantityField
            label="額定壓降"
            value={ratedV}
            onChange={setRatedV}
            kind="voltage"
            initialUnit="mV"
          />
          <QuantityField
            label="實測壓降"
            value={measured}
            onChange={setMeasured}
            kind="voltage"
            initialUnit="mV"
          />
        </div>
      )}
      <ToolActions
        onExample={() => {
          setMode('two');
          setKnown('voltage');
          setA('.075');
          setB('100');
          setRatedV('.075');
          setRatedI('100');
          setMeasured('.0375');
        }}
        onClear={() => {
          setA('');
          setB('');
          setRatedI('');
          setRatedV('');
          setMeasured('');
        }}
      />
    </ToolPanel>
  );
}
