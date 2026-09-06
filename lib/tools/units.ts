import { numberInput } from './core.ts';
export type Unit = {
  id: string;
  label: string;
  factor: number;
  dimension: string;
  offset?: number;
};
function unit(
  id: string,
  label: string,
  factor: number,
  dimension: string,
  offset?: number,
): Unit {
  return { id, label, factor, dimension, offset };
}
export const unitGroups = [
  {
    id: 'pressure',
    label: '壓力',
    units: [
      unit('pa', 'Pa', 1, 'pressure'),
      unit('kpa', 'kPa', 1e3, 'pressure'),
      unit('mpa', 'MPa', 1e6, 'pressure'),
      unit('bar', 'bar', 1e5, 'pressure'),
      unit('mbar', 'mbar', 100, 'pressure'),
      unit('psi', 'psi', 6894.757293168, 'pressure'),
      unit('kgfcm2', 'kgf/cm²', 98066.5, 'pressure'),
      unit('atm', 'atm', 101325, 'pressure'),
      unit('torr', 'Torr', 101325 / 760, 'pressure'),
      unit('mmh2o', 'mmH₂O（標準重力）', 9.80665, 'pressure'),
    ],
  },
  {
    id: 'flow',
    label: '流量',
    units: [
      unit('mlmin', 'mL/min', 1e-6 / 60, 'volume-flow'),
      unit('lmin', 'L/min', 0.001 / 60, 'volume-flow'),
      unit('ls', 'L/s', 0.001, 'volume-flow'),
      unit('m3h', 'm³/h', 1 / 3600, 'volume-flow'),
      unit('m3s', 'm³/s', 1, 'volume-flow'),
      unit('usgpm', 'US gpm', 0.003785411784 / 60, 'volume-flow'),
      unit('gs', 'g/s（質量）', 0.001, 'mass-flow'),
      unit('kgs', 'kg/s（質量）', 1, 'mass-flow'),
      unit('kgh', 'kg/h（質量）', 1 / 3600, 'mass-flow'),
      unit('th', 't/h（質量）', 1000 / 3600, 'mass-flow'),
    ],
  },
  {
    id: 'time',
    label: '時間',
    units: [
      unit('us', 'μs', 1e-6, 'time'),
      unit('ms', 'ms', 0.001, 'time'),
      unit('s', 's', 1, 'time'),
      unit('min', 'min', 60, 'time'),
      unit('h', 'h', 3600, 'time'),
      unit('day', 'day', 86400, 'time'),
    ],
  },
  {
    id: 'mass',
    label: '重量／質量',
    units: [
      unit('mg', 'mg', 1e-6, 'mass'),
      unit('g', 'g', 0.001, 'mass'),
      unit('kg', 'kg', 1, 'mass'),
      unit('tonne', '公噸', 1000, 'mass'),
      unit('lb', 'lb', 0.45359237, 'mass'),
      unit('oz', 'oz', 0.028349523125, 'mass'),
    ],
  },
  {
    id: 'volume',
    label: '體積',
    units: [
      unit('ml', 'mL', 1e-6, 'volume'),
      unit('l', 'L', 0.001, 'volume'),
      unit('cm3', 'cm³', 1e-6, 'volume'),
      unit('m3', 'm³', 1, 'volume'),
      unit('usgal', '美制 gallon', 0.003785411784, 'volume'),
      unit('impgal', '英制 gallon', 0.00454609, 'volume'),
    ],
  },
  {
    id: 'temperature',
    label: '溫度',
    units: [
      unit('c', '°C', 1, 'temperature', 273.15),
      unit('f', '°F', 5 / 9, 'temperature', 459.67),
      unit('k', 'K', 1, 'temperature', 0),
    ],
  },
  {
    id: 'length',
    label: '長度',
    units: [
      unit('mm', 'mm', 0.001, 'length'),
      unit('cm', 'cm', 0.01, 'length'),
      unit('m', 'm', 1, 'length'),
      unit('km', 'km', 1000, 'length'),
      unit('inch', 'inch', 0.0254, 'length'),
      unit('ft', 'ft', 0.3048, 'length'),
    ],
  },
  {
    id: 'area',
    label: '面積',
    units: [
      unit('mm2', 'mm²', 1e-6, 'area'),
      unit('cm2', 'cm²', 1e-4, 'area'),
      unit('m2', 'm²', 1, 'area'),
      unit('ha', 'ha', 10000, 'area'),
      unit('ft2', 'ft²', 0.09290304, 'area'),
    ],
  },
  {
    id: 'speed',
    label: '速度',
    units: [
      unit('mspeed', 'm/s', 1, 'speed'),
      unit('mmin', 'm/min', 1 / 60, 'speed'),
      unit('kmh', 'km/h', 1 / 3.6, 'speed'),
      unit('fts', 'ft/s', 0.3048, 'speed'),
    ],
  },
];
export function convertUnit(raw: string, fromId: string, toId: string): number {
  const all = unitGroups.flatMap((group) => group.units);
  const from = all.find((candidate) => candidate.id === fromId),
    to = all.find((candidate) => candidate.id === toId);
  if (!from || !to) throw new Error('找不到所選單位。');
  if (from.dimension !== to.dimension)
    throw new Error('這兩個單位的物理量不同，不能直接換算。');
  const value = numberInput(raw);
  const base = (value + (from.offset ?? 0)) * from.factor;
  if (from.dimension === 'temperature' && base < 0)
    throw new Error('溫度不能低於絕對零度（0 K）。');
  const output = base / to.factor - (to.offset ?? 0);
  if (!Number.isFinite(base) || !Number.isFinite(output))
    throw new Error('結果超出可表示範圍。');
  return Object.is(output, -0) ? 0 : output;
}
