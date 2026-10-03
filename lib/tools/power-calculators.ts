import { numberInput } from './core.ts';

export type PowerUnit = 'W' | 'kW' | 'MW';
export type ApparentUnit = 'VA' | 'kVA' | 'MVA';
export type PhaseSystem = 'dc' | 'single' | 'three';

const positive = (raw: string, label: string) => {
  const value = numberInput(raw, label);
  if (value <= 0) throw new Error(`${label}必須大於 0。`);
  return value;
};
const nonnegative = (raw: string, label: string) => {
  const value = numberInput(raw, label);
  if (value < 0) throw new Error(`${label}不可小於 0。`);
  return value;
};
const finite = (value: number, label: string) => {
  if (!Number.isFinite(value)) throw new Error(`${label}超出可計算範圍。`);
  return value;
};
const powerFactor = (raw: string) => {
  const value = positive(raw, '功率因數');
  if (value > 1) throw new Error('功率因數不可大於 1。');
  return value;
};
const phaseMultiplier = (phase: PhaseSystem) => {
  if (phase === 'dc' || phase === 'single') return 1;
  if (phase === 'three') return Math.sqrt(3);
  throw new Error('請選擇有效的供電方式。');
};

export const toWatts = (value: number, unit: PowerUnit) =>
  finite(value * (unit === 'MW' ? 1e6 : unit === 'kW' ? 1e3 : 1), '實功率');
export const toVa = (value: number, unit: ApparentUnit) =>
  finite(value * (unit === 'MVA' ? 1e6 : unit === 'kVA' ? 1e3 : 1), '視在功率');

export type AcPowerMode =
  | 'current-to-power'
  | 'power-to-current'
  | 'power-to-voltage'
  | 'apparent-to-real'
  | 'real-to-apparent';

export function acPowerConvert(
  mode: AcPowerMode,
  phase: PhaseSystem,
  valueRaw: string,
  valueUnit: PowerUnit | ApparentUnit | 'A',
  voltageOrCurrentRaw: string,
  pfRaw: string,
) {
  const pf = phase === 'dc' ? 1 : powerFactor(pfRaw);
  const multiplier = phaseMultiplier(phase);
  let voltage = 0;
  let current = 0;
  let watts = 0;
  let va = 0;

  if (mode === 'current-to-power') {
    current = positive(valueRaw, '電流');
    voltage = positive(
      voltageOrCurrentRaw,
      phase === 'three' ? '線電壓' : '電壓',
    );
    va = finite(multiplier * voltage * current, '視在功率');
    watts = finite(va * pf, '實功率');
  } else if (mode === 'power-to-current' || mode === 'power-to-voltage') {
    const value = positive(valueRaw, '實功率');
    watts = toWatts(value, valueUnit as PowerUnit);
    va = finite(watts / pf, '視在功率');
    if (mode === 'power-to-current') {
      voltage = positive(
        voltageOrCurrentRaw,
        phase === 'three' ? '線電壓' : '電壓',
      );
      current = finite(watts / (multiplier * voltage * pf), '電流');
    } else {
      current = positive(voltageOrCurrentRaw, '電流');
      voltage = finite(watts / (multiplier * current * pf), '電壓');
    }
  } else if (mode === 'apparent-to-real') {
    const value = positive(valueRaw, '視在功率');
    va = toVa(value, valueUnit as ApparentUnit);
    watts = finite(va * pf, '實功率');
  } else if (mode === 'real-to-apparent') {
    const value = positive(valueRaw, '實功率');
    watts = toWatts(value, valueUnit as PowerUnit);
    va = finite(watts / pf, '視在功率');
  } else {
    throw new Error('請選擇有效的換算方向。');
  }
  return { watts, va, voltage, current, pf };
}

export type PowerFactorMode = 'active-apparent' | 'active-reactive';
export function calculatePowerFactor(
  mode: PowerFactorMode,
  activeRaw: string,
  activeUnit: PowerUnit,
  secondRaw: string,
  secondUnit: ApparentUnit | 'var' | 'kvar' | 'Mvar',
) {
  const watts = toWatts(nonnegative(activeRaw, '實功率'), activeUnit);
  let va: number;
  let vars: number;
  if (mode === 'active-apparent') {
    va = toVa(positive(secondRaw, '視在功率'), secondUnit as ApparentUnit);
    if (watts > va) throw new Error('實功率不可大於視在功率。');
    vars = finite(Math.sqrt(Math.max(0, va * va - watts * watts)), '虛功率');
  } else if (mode === 'active-reactive') {
    const reactive = numberInput(secondRaw, '虛功率');
    const scale = secondUnit === 'Mvar' ? 1e6 : secondUnit === 'kvar' ? 1e3 : 1;
    vars = finite(reactive * scale, '虛功率');
    va = finite(Math.hypot(watts, vars), '視在功率');
    if (va === 0) throw new Error('實功率與虛功率不可同時為 0。');
  } else {
    throw new Error('請選擇有效的計算方式。');
  }
  const pf = finite(watts / va, '功率因數');
  return {
    watts,
    vars,
    va,
    pf,
    angleDegrees: finite((Math.atan2(vars, watts) * 180) / Math.PI, '相位角'),
    direction: vars < 0 ? '超前' : vars > 0 ? '落後' : '同相',
  };
}

export type EnergyMode = 'from-power' | 'from-energy';
export type EnergyUnit = 'J' | 'Wh' | 'kWh' | 'MWh';
export function energyAndCost(
  mode: EnergyMode,
  valueRaw: string,
  unit: PowerUnit | EnergyUnit,
  hoursRaw: string,
  daysRaw: string,
  rateRaw: string,
) {
  const value = nonnegative(
    valueRaw,
    mode === 'from-power' ? '功率' : '用電量',
  );
  const hours = nonnegative(hoursRaw, '時間');
  const days = mode === 'from-power' ? nonnegative(daysRaw, '天數') : 1;
  const rate = nonnegative(rateRaw, '每度電價');
  let watts: number;
  let kwh: number;
  if (mode === 'from-power') {
    watts = toWatts(value, unit as PowerUnit);
    kwh = finite((watts * hours * days) / 1000, '用電量');
  } else {
    kwh = finite(
      value *
        (unit === 'J'
          ? 1 / 3.6e6
          : unit === 'Wh'
            ? 1e-3
            : unit === 'MWh'
              ? 1e3
              : 1),
      '用電量',
    );
    if (hours <= 0) throw new Error('反推平均功率時，時間必須大於 0。');
    watts = finite((kwh * 1000) / hours, '平均功率');
  }
  return {
    watts,
    kwh,
    wattHours: finite(kwh * 1000, '瓦時'),
    joules: finite(kwh * 3.6e6, '焦耳'),
    cost: finite(kwh * rate, '電費'),
  };
}
