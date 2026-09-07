import { numberInput } from './core.ts';

export type Unit = {
  id: string;
  label: string;
  factor: number;
  dimension: string;
  offset?: number;
};
export type UnitGroup = {
  id: string;
  label: string;
  units: Unit[];
  note?: string;
};
const unit = (
  id: string,
  label: string,
  factor: number,
  dimension: string,
  offset?: number,
): Unit => ({ id, label, factor, dimension, offset });

export const unitGroups: UnitGroup[] = [
  {
    id: 'pressure',
    label: '壓力',
    note: '僅換算壓力單位，不會把表壓與絕對壓互相轉換；mmH₂O 使用標準重力。',
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
    note: '質量流量與體積流量是不同物理量，不能直接互換。US gpm 使用美制液量加侖。',
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
    note: 'day 固定為 24 小時。',
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
    note: '「重量」在此指質量，不是力。',
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
    note: '溫度依絕對溫標計算；輸入不得低於絕對零度（0 K）。',
    units: [
      unit('c', '°C', 1, 'temperature', 273.15),
      unit('f', '°F', 5 / 9, 'temperature', 459.67),
      unit('k', 'K', 1, 'temperature', 0),
      unit('rankine', '°R', 5 / 9, 'temperature', 0),
      unit('reaumur', '°Ré', 1.25, 'temperature', 218.52),
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
      unit('yd', 'yd', 0.9144, 'length'),
      unit('mile', 'mile', 1609.344, 'length'),
      unit('nauticalmile', '海里 nmi', 1852, 'length'),
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
    note: 'Mach 以參考音速 343 m/s 換算；實際馬赫數取決於當地音速、溫度與介質，不能視為所有環境的通用倍率。',
    units: [
      unit('mspeed', 'm/s', 1, 'speed'),
      unit('mmin', 'm/min', 1 / 60, 'speed'),
      unit('kmh', 'km/h', 1 / 3.6, 'speed'),
      unit('fts', 'ft/s', 0.3048, 'speed'),
      unit('mph', 'mph', 0.44704, 'speed'),
      unit('knot', '節 kn', 1852 / 3600, 'speed'),
      unit('mach343', 'Mach（參考音速 343 m/s）', 343, 'speed'),
    ],
  },
  {
    id: 'power',
    label: '功率',
    note: '馬力有不同定義；此處分開列出機械 hp 與公制 PS。',
    units: [
      unit('mwatt', 'mW', 0.001, 'power'),
      unit('watt', 'W', 1, 'power'),
      unit('kw', 'kW', 1000, 'power'),
      unit('mw', 'MW', 1e6, 'power'),
      unit('hp', '機械 hp', 745.6998715822702, 'power'),
      unit('ps', '公制 PS', 735.49875, 'power'),
    ],
  },
  {
    id: 'angle',
    label: '角度',
    units: [
      unit('deg', '度 °', Math.PI / 180, 'angle'),
      unit('rad', '弧度 rad', 1, 'angle'),
      unit('grad', '百分度 gon', Math.PI / 200, 'angle'),
      unit('turn', '圈 turn', 2 * Math.PI, 'angle'),
      unit('arcmin', '角分 ′', Math.PI / 10800, 'angle'),
      unit('arcsec', '角秒 ″', Math.PI / 648000, 'angle'),
    ],
  },
  {
    id: 'capacitance',
    label: '電容量',
    units: [
      unit('pf', 'pF', 1e-12, 'capacitance'),
      unit('nf', 'nF', 1e-9, 'capacitance'),
      unit('uf', 'μF', 1e-6, 'capacitance'),
      unit('mf', 'mF', 0.001, 'capacitance'),
      unit('farad', 'F', 1, 'capacitance'),
    ],
  },
  {
    id: 'storage',
    label: '資料容量',
    note: 'kB、MB、GB、TB 採十進位（1000）；KiB、MiB、GiB、TiB 採二進位（1024）。B 是 byte，b 是 bit。',
    units: [
      unit('bit', 'bit (b)', 1 / 8, 'storage'),
      unit('byte', 'byte (B)', 1, 'storage'),
      unit('kb', 'kB（十進位）', 1e3, 'storage'),
      unit('mb', 'MB（十進位）', 1e6, 'storage'),
      unit('gb', 'GB（十進位）', 1e9, 'storage'),
      unit('tb', 'TB（十進位）', 1e12, 'storage'),
      unit('kib', 'KiB（二進位）', 1024, 'storage'),
      unit('mib', 'MiB（二進位）', 1024 ** 2, 'storage'),
      unit('gib', 'GiB（二進位）', 1024 ** 3, 'storage'),
      unit('tib', 'TiB（二進位）', 1024 ** 4, 'storage'),
    ],
  },
];

export function convertUnit(raw: string, fromId: string, toId: string): number {
  const all = unitGroups.flatMap((group) => group.units);
  const from = all.find((candidate) => candidate.id === fromId);
  const to = all.find((candidate) => candidate.id === toId);
  if (!from || !to) throw new Error('找不到所選單位。');
  if (from.dimension !== to.dimension)
    throw new Error('這兩個單位的物理量不同，不能直接換算。');
  const value = numberInput(raw);
  const base = (value + (from.offset ?? 0)) * from.factor;
  if (!Number.isFinite(base)) throw new Error('結果超出可表示範圍。');
  if (from.dimension === 'temperature' && base < 0)
    throw new Error('溫度不能低於絕對零度（0 K）。');
  const output = base / to.factor - (to.offset ?? 0);
  if (!Number.isFinite(output)) throw new Error('結果超出可表示範圍。');
  return Object.is(output, -0) ? 0 : output;
}
