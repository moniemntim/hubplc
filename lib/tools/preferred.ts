import { numberInput } from './core.ts';

// ROHM's IEC 60063 application note (accessed 2026-09-07) lists the E6,
// E12, E24, E48, and E96 base values used below:
// https://fscdn.rohm.com/en/products/databook/applinote/passive/resistor/common/list_of_nominal_resistance_values_an-e.pdf
const E_VALUES: Record<string, readonly number[]> = {
  E6: [10, 15, 22, 33, 47, 68],
  E12: [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82],
  E24: [
    10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56,
    62, 68, 75, 82, 91,
  ],
  E48: [
    10, 10.5, 11, 11.5, 12.1, 12.7, 13.3, 14, 14.7, 15.4, 16.2, 16.9, 17.8,
    18.7, 19.6, 20.5, 21.5, 22.6, 23.7, 24.9, 26.1, 27.4, 28.7, 30.1, 31.6,
    33.2, 34.8, 36.5, 38.3, 40.2, 42.2, 44.2, 46.4, 48.7, 51.1, 53.6, 56.2, 59,
    61.9, 64.9, 68.1, 71.5, 75, 78.7, 82.5, 86.6, 90.9, 95.3,
  ],
  E96: [
    10, 10.2, 10.5, 10.7, 11, 11.3, 11.5, 11.8, 12.1, 12.4, 12.7, 13, 13.3,
    13.7, 14, 14.3, 14.7, 15, 15.4, 15.8, 16.2, 16.5, 16.9, 17.4, 17.8, 18.2,
    18.7, 19.1, 19.6, 20, 20.5, 21, 21.5, 22.1, 22.6, 23.2, 23.7, 24.3, 24.9,
    25.5, 26.1, 26.7, 27.4, 28, 28.7, 29.4, 30.1, 30.9, 31.6, 32.4, 33.2, 34,
    34.8, 35.7, 36.5, 37.4, 38.3, 39.2, 40.2, 41.2, 42.2, 43.2, 44.2, 45.3,
    46.4, 47.5, 48.7, 49.9, 51.1, 52.3, 53.6, 54.9, 56.2, 57.6, 59, 60.4, 61.9,
    63.4, 64.9, 66.5, 68.1, 69.8, 71.5, 73.2, 75, 76.8, 78.7, 80.6, 82.5, 84.5,
    86.6, 88.7, 90.9, 93.1, 95.3, 97.6,
  ],
};
export type PreferredSeries = keyof typeof E_VALUES;

function positive(raw: string, label: string) {
  const value = numberInput(raw, label);
  if (value <= 0) throw new Error(`${label}必須大於 0。`);
  return value;
}
function finite(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`${label}超出可計算範圍。`);
  return value;
}

export function preferredValues(series: PreferredSeries) {
  const values = E_VALUES[series];
  if (!values) throw new Error('標準阻值系列無效。');
  return values;
}

export function preferredResistor(raw: string, series: PreferredSeries) {
  const target = positive(raw, '目標阻值');
  const bases = preferredValues(series);
  const decade = Math.floor(Math.log10(target));
  const candidates: number[] = [];
  for (let exponent = decade - 2; exponent <= decade + 2; exponent++) {
    for (const base of bases) candidates.push(base * 10 ** (exponent - 1));
  }
  const sorted = candidates.filter(Number.isFinite).sort((a, b) => a - b);
  const lower = sorted.filter((value) => value <= target).at(-1);
  const upper = sorted.find((value) => value >= target);
  if (!lower || !upper) throw new Error('目標阻值超出可選標準系列範圍。');
  // At the exact midpoint choose the upper value, matching the public tool policy.
  const nearest = target - lower < upper - target ? lower : upper;
  return {
    target,
    lower: finite(lower, '較小標準阻值'),
    upper: finite(upper, '較大標準阻值'),
    nearest: finite(nearest, '最接近標準阻值'),
    errorPercent: ((nearest - target) / target) * 100,
  };
}

export function ledSeriesResistor(
  supplyRaw: string,
  forwardRaw: string,
  countRaw: string,
  currentRaw: string,
  series: PreferredSeries,
) {
  const supply = positive(supplyRaw, '電源電壓');
  const forwardVoltage = positive(forwardRaw, 'LED 順向壓降');
  const count = numberInput(countRaw, 'LED 數量');
  if (!Number.isInteger(count) || count < 1 || count > 20)
    throw new Error('LED 數量必須是 1 至 20 的整數。');
  const targetCurrent = positive(currentRaw, '目標電流');
  const totalForward = finite(forwardVoltage * count, 'LED 總順向壓降');
  if (supply <= totalForward)
    throw new Error('電源電壓必須大於 LED 總順向壓降。');
  const idealResistance = finite(
    (supply - totalForward) / targetCurrent,
    '理論限流電阻',
  );
  const choice = preferredResistor(String(idealResistance), series);
  const actualCurrent = finite(
    (supply - totalForward) / choice.upper,
    '實際電流',
  );
  return {
    supply,
    forwardVoltage,
    count,
    targetCurrent,
    totalForward,
    idealResistance,
    idealPower: finite(
      targetCurrent * targetCurrent * idealResistance,
      '理論電阻功耗',
    ),
    selectedResistance: choice.upper,
    actualCurrent,
    actualPower: finite(
      actualCurrent * actualCurrent * choice.upper,
      '選用電阻功耗',
    ),
  };
}
