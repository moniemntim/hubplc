'use client';
import { useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
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
  const { tr } = useToolLanguage();
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
          Rshunt = Vshunt / I，P = Vshunt × I
          {tr(
            '。功耗為理論值；實際選型還需確認容差、溫度係數與散熱。',
            '. Power dissipation is theoretical; actual selection must also verify tolerance, temperature coefficient, and heat dissipation.',
          )}
        </>
      }
      result={
        result.data ? (
          <ResultRows
            rows={[
              {
                label: tr('分流電阻', 'Shunt resistance'),
                value: formatNumber(result.data.resistance),
                unit: 'Ω',
              },
              {
                label: tr('壓降', 'Voltage drop'),
                value: formatNumber(result.data.voltage),
                unit: 'V',
              },
              {
                label: tr('電流', 'Current'),
                value: formatNumber(result.data.current),
                unit: 'A',
              },
              {
                label: tr('功耗', 'Power dissipation'),
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
        label={tr('計算方式', 'Calculation method')}
        value={mode}
        onChange={(v) => setMode(v as typeof mode)}
        options={[
          {
            value: 'two',
            label: tr('任選兩項求第三項', 'Choose any two to solve the third'),
          },
          {
            value: 'measured',
            label: tr(
              '額定值與實測壓降',
              'Rated values and measured voltage drop',
            ),
          },
        ]}
      />
      {mode === 'two' ? (
        <>
          <Choice
            label={tr('第一個已知量', 'First known quantity')}
            value={known}
            onChange={(v) => setKnown(v as typeof known)}
            options={[
              {
                value: 'voltage',
                label: tr('壓降與電流', 'Voltage drop and current'),
              },
              {
                value: 'current',
                label: tr('電流與電阻', 'Current and resistance'),
              },
              {
                value: 'resistance',
                label: tr('電阻與壓降', 'Resistance and voltage drop'),
              },
            ]}
          />
          <div className="fields-grid">
            <QuantityField
              label={
                known === 'voltage'
                  ? tr('壓降', 'Voltage drop')
                  : known === 'current'
                    ? tr('電流', 'Current')
                    : tr('電阻', 'Resistance')
              }
              value={a}
              onChange={setA}
              kind={aKind}
            />
            <QuantityField
              label={
                known === 'voltage'
                  ? tr('電流', 'Current')
                  : known === 'current'
                    ? tr('電阻', 'Resistance')
                    : tr('壓降', 'Voltage drop')
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
            label={tr('額定電流', 'Rated current')}
            value={ratedI}
            onChange={setRatedI}
            kind="current"
          />
          <QuantityField
            label={tr('額定壓降', 'Rated voltage drop')}
            value={ratedV}
            onChange={setRatedV}
            kind="voltage"
            initialUnit="mV"
          />
          <QuantityField
            label={tr('實測壓降', 'Measured voltage drop')}
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
