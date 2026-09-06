import { numberInput } from './core.ts';

const positive = (raw: string | number, label: string) => {
  const value = typeof raw === 'number' ? raw : numberInput(raw, label);
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`${label}必須大於 0。`);
  return value;
};
const finite = (value: number, label = '計算結果') => {
  if (!Number.isFinite(value) || value <= 0 || value > Number.MAX_VALUE / 10)
    throw new Error(`${label}超出可計算範圍。`);
  return value;
};

export type NetworkMode = 'series' | 'parallel';

export function passiveNetwork(
  values: readonly number[],
  mode: NetworkMode,
  label: string,
) {
  if (values.length < 2 || values.length > 20)
    throw new Error(`請輸入 2 至 20 顆${label}。`);
  const valid = values.map((value, index) =>
    positive(value, `第 ${index + 1} 顆${label}`),
  );
  const equivalent =
    mode === 'series'
      ? valid.reduce((total, value) => finite(total + value, `${label}總和`), 0)
      : finite(
          1 /
            valid.reduce(
              (total, value) => finite(total + 1 / value, '倒數總和'),
              0,
            ),
          `等效${label}`,
        );
  return { equivalent, count: valid.length };
}

export function capacitorNetwork(values: readonly number[], mode: NetworkMode) {
  // Capacitors use the inverse topology of resistors.
  return passiveNetwork(
    values,
    mode === 'series' ? 'parallel' : 'series',
    '電容',
  );
}

export function currentDivider(
  values: readonly number[],
  source: 'voltage' | 'current',
  raw: string,
) {
  const resistors = values.map((value, index) =>
    positive(value, `第 ${index + 1} 支路電阻`),
  );
  if (resistors.length < 2 || resistors.length > 20)
    throw new Error('請輸入 2 至 20 個支路。');
  const equivalent = finite(
    1 /
      resistors.reduce((sum, value) => finite(sum + 1 / value, '倒數總和'), 0),
    '等效電阻',
  );
  const input = positive(raw, source === 'voltage' ? '電源電壓' : '總電流');
  const voltage =
    source === 'voltage' ? input : finite(input * equivalent, '支路電壓');
  const totalCurrent =
    source === 'voltage' ? finite(voltage / equivalent, '總電流') : input;
  const branches = resistors.map((resistance) => {
    const current = finite(voltage / resistance, '支路電流');
    return {
      resistance,
      current,
      percent: finite((current / totalCurrent) * 100, '電流比例'),
      power: finite(voltage * current, '支路功耗'),
    };
  });
  return {
    equivalent,
    voltage,
    totalCurrent,
    branches,
    totalPower: finite(voltage * totalCurrent, '總功耗'),
  };
}

export function shuntFromTwo(
  known: 'voltage' | 'current' | 'resistance',
  first: string,
  second: string,
) {
  const a = positive(first, '已知量一');
  const b = positive(second, '已知量二');
  let voltage: number, current: number, resistance: number;
  if (known === 'voltage') {
    voltage = a;
    current = b;
    resistance = voltage / current;
  } else if (known === 'current') {
    current = a;
    resistance = b;
    voltage = current * resistance;
  } else {
    resistance = a;
    voltage = b;
    current = voltage / resistance;
  }
  voltage = finite(voltage, '壓降');
  current = finite(current, '電流');
  resistance = finite(resistance, '分流電阻');
  return {
    voltage,
    current,
    resistance,
    power: finite(voltage * current, '功耗'),
  };
}

export function shuntMeasured(
  ratingCurrent: string,
  ratingVoltage: string,
  measuredVoltage: string,
) {
  const ratedCurrent = positive(ratingCurrent, '額定電流');
  const ratedVoltage = positive(ratingVoltage, '額定壓降');
  const voltage = numberInput(measuredVoltage, '實測壓降');
  if (voltage < 0) throw new Error('實測壓降不可小於 0。');
  const resistance = finite(ratedVoltage / ratedCurrent, '分流電阻');
  const current = voltage === 0 ? 0 : finite(voltage / resistance, '實測電流');
  return {
    resistance,
    voltage,
    current,
    power: voltage === 0 ? 0 : finite(voltage * current, '實測功耗'),
  };
}
