'use client';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  analogConvert,
  analogConvertRanges,
  analogLegacy,
  analogSignalFromEngineering,
  analogSignalFromPercentage,
} from '@/lib/tools/plc';
import { attempt, numberInput } from '@/lib/tools/core';
import {
  Choice,
  Notice,
  NumberField,
  ResultRows,
  ToolPanel,
} from '../_components/controls';
const presets = [
  { value: '4,20,mA', label: '4–20 mA' },
  { value: '0,20,mA', label: '0–20 mA' },
  { value: '0,5,V', label: '0–5 V' },
  { value: '1,5,V', label: '1–5 V' },
  { value: '0,10,V', label: '0–10 V' },
  { value: '2,10,V', label: '2–10 V' },
  { value: '-10,10,V', label: '±10 V' },
  { value: 'custom', label: '自訂端點' },
];
const units = [
  { value: 'mA', label: 'mA' },
  { value: 'V', label: 'V' },
];
export default function AnalogCalculator() {
  const [signal, setSignal] = useState('12'),
    [preset, setPreset] = useState('4,20,mA'),
    [low, setLow] = useState('4'),
    [high, setHigh] = useState('20'),
    [unit, setUnit] = useState('mA'),
    [engLow, setEngLow] = useState('0'),
    [engHigh, setEngHigh] = useState('100'),
    [source, setSource] = useState('signal'),
    [target, setTarget] = useState('none'),
    [targetLow, setTargetLow] = useState('0'),
    [targetHigh, setTargetHigh] = useState('10'),
    [targetUnit, setTargetUnit] = useState('V');
  function selectPreset(value: string) {
    setPreset(value);
    if (value !== 'custom') {
      const [a, b, c] = value.split(',');
      setLow(a);
      setHigh(b);
      setUnit(c);
    }
  }
  function selectTarget(value: string) {
    setTarget(value);
    if (value !== 'custom' && value !== 'none') {
      const [a, b, c] = value.split(',');
      setTargetLow(a);
      setTargetHigh(b);
      setTargetUnit(c);
    }
  }
  const result = attempt(() => {
    const calculatedSignal =
      source === 'signal'
        ? numberInput(signal, '訊號值')
        : source === 'engineering'
          ? analogSignalFromEngineering(signal, low, high, engLow, engHigh)
              .signal
          : analogSignalFromPercentage(signal, low, high).signal;
    const converted = analogConvert({
      signal: String(calculatedSignal),
      signalLow: low,
      signalHigh: high,
      engineeringLow: engLow,
      engineeringHigh: engHigh,
    });
    return {
      ...converted,
      target:
        target === 'none'
          ? null
          : analogConvertRanges(
              String(calculatedSignal),
              low,
              high,
              targetLow,
              targetHigh,
            ).target,
    };
  });
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'calculate_analog_signal',
            description: '計算 4–20 mA 工程值並更新此工具。',
            inputSchema: {
              type: 'object',
              properties: {
                current: { type: 'number' },
                low: { type: 'number' },
                high: { type: 'number' },
              },
              required: ['current', 'low', 'high'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute(input: unknown) {
              const data = input as Record<string, unknown>;
              if (
                ['current', 'low', 'high'].some(
                  (key) => typeof data?.[key] !== 'number',
                )
              )
                throw new Error('需要 current、low、high 數字');
              const calculation = analogLegacy(
                String(data.current),
                String(data.low),
                String(data.high),
              );
              flushSync(() => {
                setSource('signal');
                setSignal(String(data.current));
                setPreset('4,20,mA');
                setLow('4');
                setHigh('20');
                setUnit('mA');
                setEngLow(String(data.low));
                setEngHigh(String(data.high));
                setTarget('none');
              });
              return calculation;
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  return (
    <ToolPanel
      notes={
        <>
          <p>
            比例 p = (訊號 − 訊號下限) ÷ (訊號上限 − 訊號下限)；工程值 =
            工程下限 + p × 工程跨度；百分比 = p × 100。反算使用相同線性關係。
          </p>
          <p>
            範例：4–20 mA 對應 0–100，12 mA 即 50%，換成 0–10 V 為 5
            V。工程值單位依現場量程設定。
          </p>
          <Notice>
            超出量程仍會線性外推，不自動截斷；請確認現場訊號是否合理。
          </Notice>
        </>
      }
      result={
        result.error ? (
          <Notice>{result.error}</Notice>
        ) : (
          <>
            <ResultRows
              rows={[
                { label: '訊號值', value: result.data!.signal, unit },
                { label: '工程值', value: result.data!.engineering },
                { label: '百分比', value: result.data!.percentage, unit: '%' },
                ...(result.data!.target === null
                  ? []
                  : [
                      {
                        label: '目標訊號',
                        value: result.data!.target,
                        unit: targetUnit,
                      },
                    ]),
              ]}
            />
            {result.data!.outside && (
              <Notice>超出量程：結果為線性外推值。</Notice>
            )}
          </>
        )
      }
    >
      <div className="fields-grid">
        <Choice
          label="常用訊號"
          value={preset}
          onChange={selectPreset}
          options={presets}
        />
        <Choice
          label="輸入種類"
          value={source}
          onChange={setSource}
          options={[
            { value: 'signal', label: '訊號值' },
            { value: 'engineering', label: '工程值' },
            { value: 'percentage', label: '百分比' },
          ]}
        />
        <NumberField
          label={
            source === 'signal'
              ? '訊號值'
              : source === 'engineering'
                ? '工程值'
                : '百分比'
          }
          value={signal}
          onChange={setSignal}
          unit={
            source === 'signal'
              ? unit
              : source === 'percentage'
                ? '%'
                : undefined
          }
        />
        <Choice
          label="訊號單位"
          value={unit}
          onChange={(v) => {
            setUnit(v);
            setPreset('custom');
          }}
          options={units}
        />
        <NumberField
          label="訊號下限"
          value={low}
          onChange={(v) => {
            setLow(v);
            setPreset('custom');
          }}
          unit={unit}
        />
        <NumberField
          label="訊號上限"
          value={high}
          onChange={(v) => {
            setHigh(v);
            setPreset('custom');
          }}
          unit={unit}
        />
        <NumberField label="工程下限" value={engLow} onChange={setEngLow} />
        <NumberField label="工程上限" value={engHigh} onChange={setEngHigh} />
        <Choice
          label="轉換到其他訊號"
          value={target}
          onChange={selectTarget}
          options={[{ value: 'none', label: '不轉換' }, ...presets]}
        />
        {target !== 'none' && (
          <>
            <Choice
              label="目標訊號單位"
              value={targetUnit}
              onChange={(v) => {
                setTargetUnit(v);
                setTarget('custom');
              }}
              options={units}
            />
            <NumberField
              label="目標訊號下限"
              value={targetLow}
              onChange={(v) => {
                setTargetLow(v);
                setTarget('custom');
              }}
              unit={targetUnit}
            />
            <NumberField
              label="目標訊號上限"
              value={targetHigh}
              onChange={(v) => {
                setTargetHigh(v);
                setTarget('custom');
              }}
              unit={targetUnit}
            />
          </>
        )}
      </div>
    </ToolPanel>
  );
}
