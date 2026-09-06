'use client';
import { useState } from 'react';
import {
  quantityUnits,
  scaleQuantity,
  type QuantityKind,
} from '@/lib/tools/quantity';
import { Choice, NumberField } from './controls';

function display(raw: string, factor: number) {
  try {
    return scaleQuantity(raw, 1 / factor);
  } catch {
    return raw;
  }
}

/** Values exchanged with calculators are always SI strings. Display units are local. */
export function QuantityField({
  label,
  value,
  onChange,
  kind,
  initialUnit,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind: QuantityKind;
  initialUnit?: string;
}) {
  const options = quantityUnits[kind];
  const initial =
    options.find((unit) => unit.label === initialUnit) ??
    options.find((unit) => unit.factor === 1) ??
    options[0];
  const [state, setState] = useState({
    kind,
    unit: initial.label as string,
    raw: display(value, initial.factor),
    lastValue: value,
  });
  const unit = options.find((item) => item.label === state.unit) ?? initial;
  const raw =
    state.kind === kind && state.lastValue === value
      ? state.raw
      : display(value, unit.factor);
  return (
    <div className="quantity-field" data-field={label}>
      <NumberField
        label={label}
        value={raw}
        onChange={(next) => {
          let si: string;
          try {
            si = scaleQuantity(next, unit.factor);
          } catch {
            si = `無效數值：${next}`;
          }
          setState({ kind, unit: unit.label, raw: next, lastValue: si });
          onChange(si);
        }}
      />
      <Choice
        label={`${label} 單位`}
        shortLabel="單位"
        value={unit.label}
        options={options.map((item) => ({
          value: item.label,
          label: item.label,
        }))}
        onChange={(next) => {
          const selected = options.find((item) => item.label === next)!;
          // A display-unit change never alters the SI value or repairs an invalid input.
          setState({
            kind,
            unit: next,
            raw: value.startsWith('無效數值：')
              ? raw
              : display(value, selected.factor),
            lastValue: value,
          });
        }}
      />
    </div>
  );
}
