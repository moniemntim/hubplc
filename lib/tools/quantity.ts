import { numberInput } from './core.ts';

export const quantityUnits = {
  resistance: [
    { label: 'mΩ', factor: 1e-3 },
    { label: 'Ω', factor: 1 },
    { label: 'kΩ', factor: 1e3 },
    { label: 'MΩ', factor: 1e6 },
  ],
  capacitance: [
    { label: 'pF', factor: 1e-12 },
    { label: 'nF', factor: 1e-9 },
    { label: 'µF', factor: 1e-6 },
    { label: 'mF', factor: 1e-3 },
    { label: 'F', factor: 1 },
  ],
  inductance: [
    { label: 'nH', factor: 1e-9 },
    { label: 'µH', factor: 1e-6 },
    { label: 'mH', factor: 1e-3 },
    { label: 'H', factor: 1 },
  ],
  voltage: [
    { label: 'mV', factor: 1e-3 },
    { label: 'V', factor: 1 },
    { label: 'kV', factor: 1e3 },
  ],
  current: [
    { label: 'µA', factor: 1e-6 },
    { label: 'mA', factor: 1e-3 },
    { label: 'A', factor: 1 },
  ],
  frequency: [
    { label: 'Hz', factor: 1 },
    { label: 'kHz', factor: 1e3 },
    { label: 'MHz', factor: 1e6 },
  ],
  time: [
    { label: 'µs', factor: 1e-6 },
    { label: 'ms', factor: 1e-3 },
    { label: 's', factor: 1 },
  ],
} as const;
export type QuantityKind = keyof typeof quantityUnits;

export function scaleQuantity(raw: string, factor: number): string {
  if (raw.trim() === '') return '';
  const n = numberInput(raw);
  const scaled = n * factor;
  if (
    !Number.isFinite(factor) ||
    factor <= 0 ||
    !Number.isFinite(scaled) ||
    (n !== 0 && scaled === 0)
  )
    throw new Error('單位換算超出可表示範圍。');
  return String(Number(scaled.toPrecision(15)));
}
