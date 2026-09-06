import { numberInput } from './core.ts';

const positive = (raw: string, label: string) => {
  const value = numberInput(raw, label);
  if (value <= 0) throw new Error(`${label}必須大於 0。`);
  return value;
};

const finite = (value: number, label: string) => {
  if (!Number.isFinite(value)) throw new Error(`${label}超出可計算範圍。`);
  return value;
};
const nonzero = (value: number, label: string) => {
  finite(value, label);
  if (value === 0) throw new Error(`${label}過小，無法表示。`);
  return value;
};

export type BatteryCapacityUnit = 'mAh' | 'Ah';

export function batteryCapacityToAh(
  raw: string,
  unit: BatteryCapacityUnit,
): number {
  return nonzero(
    positive(raw, '電池容量') * (unit === 'mAh' ? 1e-3 : 1),
    '電池容量',
  );
}

export function batteryLife(
  capacityAhRaw: string,
  currentRaw: string,
  usablePercentRaw: string,
) {
  const capacityAh = positive(capacityAhRaw, '電池容量');
  const currentA = positive(currentRaw, '平均負載電流');
  const usablePercent = numberInput(usablePercentRaw, '可用容量');
  if (usablePercent <= 0 || usablePercent > 100)
    throw new Error('可用容量必須大於 0% 且不超過 100%。');
  const usableCapacityAh = nonzero(
    capacityAh * (usablePercent / 100),
    '有效容量',
  );
  const hours = nonzero(usableCapacityAh / currentA, '預估時間');
  return {
    capacityAh,
    currentA,
    usablePercent,
    usableCapacityAh,
    hours,
    days: nonzero(hours / 24, '預估天數'),
  };
}

export type CapacitorDischargeMode = 'time' | 'resistance';

export function capacitorDischarge(
  mode: CapacitorDischargeMode,
  capacitanceRaw: string,
  initialVoltageRaw: string,
  targetVoltageRaw: string,
  knownRaw: string,
) {
  const capacitance = positive(capacitanceRaw, '電容量');
  const initialVoltage = positive(initialVoltageRaw, '初始電壓');
  const targetVoltage = positive(targetVoltageRaw, '目標電壓');
  if (targetVoltage >= initialVoltage)
    throw new Error('目標電壓必須大於 0 且小於初始電壓。');
  const logarithm = nonzero(
    Math.log(initialVoltage / targetVoltage),
    '電壓比的自然對數',
  );
  let resistance: number;
  let time: number;
  if (mode === 'time') {
    resistance = positive(knownRaw, '放電電阻');
    time = nonzero(resistance * capacitance * logarithm, '放電時間');
  } else {
    time = positive(knownRaw, '目標時間');
    resistance = nonzero(time / (capacitance * logarithm), '放電電阻');
  }
  const initialEnergy = nonzero(
    0.5 * capacitance * initialVoltage ** 2,
    '初始儲能',
  );
  const finalEnergy = nonzero(
    0.5 * capacitance * targetVoltage ** 2,
    '目標電壓儲能',
  );
  return {
    capacitance,
    initialVoltage,
    targetVoltage,
    resistance,
    time,
    tau: nonzero(resistance * capacitance, '時間常數'),
    initialCurrent: nonzero(initialVoltage / resistance, '初始電流'),
    initialPower: nonzero(initialVoltage ** 2 / resistance, '初始功率'),
    initialEnergy,
    finalEnergy,
    energyDissipated: nonzero(initialEnergy - finalEnergy, '已耗散能量'),
  };
}

export type DbmWattsMode = 'dbm' | 'watts';

export function dbmWatts(mode: DbmWattsMode, raw: string) {
  let dbm: number;
  let watts: number;
  if (mode === 'dbm') {
    dbm = numberInput(raw, 'dBm');
    watts = nonzero(10 ** ((dbm - 30) / 10), '瓦特值');
  } else {
    watts = positive(raw, '瓦特值');
    dbm = finite(10 * Math.log10(watts / 1e-3), 'dBm 值');
  }
  return {
    dbm,
    watts,
    milliwatts: nonzero(watts * 1e3, '毫瓦值'),
    dbw: finite(10 * Math.log10(watts), 'dBW 值'),
  };
}
