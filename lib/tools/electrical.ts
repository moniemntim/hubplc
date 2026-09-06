import { formatNumber, numberInput } from './core.ts';

const positive = (value: string, label: string) => {
  const n = numberInput(value, label);
  if (n <= 0) throw new Error(`${label}必須大於 0。`);
  return n;
};
const safe = (value: number, label = '計算結果') => {
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_VALUE / 10)
    throw new Error(`${label}超出可計算範圍。`);
  return value;
};
const positiveResult = (value: number, label: string) => {
  const result = safe(value, label);
  if (result === 0) throw new Error(`${label}過小，無法表示。`);
  return result;
};

export type DividerResult = {
  vout: number;
  current: number;
  p1: number;
  p2: number;
};
export function voltageDivider(
  vin: string,
  r1: string,
  r2: string,
): DividerResult {
  const V = positive(vin, '輸入電壓'),
    R1 = positive(r1, 'R1'),
    R2 = positive(r2, 'R2');
  const total = safe(R1 + R2, '電阻總和');
  const current = positiveResult(V / total, '電流');
  return {
    vout: positiveResult(current * R2, '輸出電壓'),
    current,
    p1: positiveResult(current * current * R1, 'R1 功耗'),
    p2: positiveResult(current * current * R2, 'R2 功耗'),
  };
}
export function dividerInverse(vin: string, vout: string, r1: string) {
  const V = positive(vin, '輸入電壓'),
    out = positive(vout, '輸出電壓'),
    R1 = positive(r1, 'R1');
  if (out >= V) throw new Error('輸出電壓必須大於 0 且小於輸入電壓。');
  return { r2: positiveResult((R1 * out) / (V - out), 'R2') };
}

export type DcKey = 'v' | 'i' | 'r' | 'p';
export function dcElectrical(a: DcKey, aRaw: string, b: DcKey, bRaw: string) {
  if (a === b) throw new Error('請選擇兩個不同的已知量。');
  const values: Partial<Record<DcKey, number>> = {
    [a]: positive(aRaw, '已知量'),
    [b]: positive(bRaw, '已知量'),
  };
  let { v, i, r, p } = values;
  if (v !== undefined && i !== undefined) {
    r = v / i;
    p = v * i;
  } else if (v !== undefined && r !== undefined) {
    i = v / r;
    p = v * i;
  } else if (v !== undefined && p !== undefined) {
    i = p / v;
    r = v / i;
  } else if (i !== undefined && r !== undefined) {
    v = i * r;
    p = v * i;
  } else if (i !== undefined && p !== undefined) {
    v = p / i;
    r = v / i;
  } else if (r !== undefined && p !== undefined) {
    v = Math.sqrt(r * p);
    i = v / r;
  }
  return {
    v: positiveResult(v!, '電壓'),
    i: positiveResult(i!, '電流'),
    r: positiveResult(r!, '電阻'),
    p: positiveResult(p!, '功率'),
  };
}
export function acElectrical(
  phase: 'single' | 'three',
  voltage: string,
  pf: string,
  known: 'power' | 'current',
  raw: string,
) {
  const V = positive(voltage, 'RMS 線電壓'),
    factor = numberInput(pf, '功率因數');
  if (factor <= 0 || factor > 1)
    throw new Error('功率因數必須大於 0 且不超過 1。');
  const k = phase === 'three' ? Math.sqrt(3) : 1;
  let p: number, i: number;
  if (known === 'power') {
    p = positive(raw, '實功率');
    i = p / (k * V * factor);
  } else {
    i = positive(raw, '電流');
    p = k * V * i * factor;
  }
  return {
    p: positiveResult(p, '實功率'),
    va: positiveResult(p / factor, '視在功率'),
    i: positiveResult(i, '電流'),
  };
}

export function timer555Mono(r: string, c: string) {
  const R = positive(r, '電阻'),
    C = positive(c, '電容');
  return { time: positiveResult(Math.log(3) * R * C, '時間') };
}
export function timer555MonoInverse(time: string, c: string) {
  const t = positive(time, '時間'),
    C = positive(c, '電容');
  return { r: positiveResult(t / (Math.log(3) * C), '電阻') };
}
export function timer555Astable(ra: string, rb: string, c: string) {
  const A = positive(ra, 'RA'),
    B = positive(rb, 'RB'),
    C = positive(c, '電容');
  const high = Math.LN2 * (A + B) * C,
    low = Math.LN2 * B * C,
    period = high + low;
  return {
    high: positiveResult(high, '高電位時間'),
    low: positiveResult(low, '低電位時間'),
    period: positiveResult(period, '週期'),
    frequency: positiveResult(1 / period, '頻率'),
    duty: positiveResult((high / period) * 100, '占空比'),
  };
}
export function timer555AstableInverse(
  frequency: string,
  duty: string,
  c: string,
) {
  const f = positive(frequency, '頻率'),
    d = numberInput(duty, '占空比') / 100,
    C = positive(c, '電容');
  if (d <= 0.5 || d >= 1)
    throw new Error('標準 555 無穩態電路的占空比必須大於 50% 且小於 100%。');
  const total = 1 / f,
    rb = ((1 - d) * total) / (Math.LN2 * C),
    ra = ((2 * d - 1) * total) / (Math.LN2 * C);
  return { ra: positiveResult(ra, 'RA'), rb: positiveResult(rb, 'RB') };
}

const colors = [
  'black',
  'brown',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'violet',
  'grey',
  'white',
] as const;
const colorNames = ['黑', '棕', '紅', '橙', '黃', '綠', '藍', '紫', '灰', '白'];
const displayNames: Record<string, string> = {
  black: '黑',
  brown: '棕',
  red: '紅',
  orange: '橙',
  yellow: '黃',
  green: '綠',
  blue: '藍',
  violet: '紫',
  grey: '灰',
  white: '白',
  gold: '金',
  silver: '銀',
};
const colorHex: Record<string, string> = {
  black: '#111827',
  brown: '#75411d',
  red: '#c9362b',
  orange: '#e77c22',
  yellow: '#e5c22b',
  green: '#25804d',
  blue: '#2671b8',
  violet: '#764aa2',
  grey: '#80868b',
  white: '#fff',
  gold: '#c49b31',
  silver: '#aab3ba',
};
const tolerances: Record<string, number> = {
  brown: 1,
  red: 2,
  green: 0.5,
  blue: 0.25,
  violet: 0.1,
  grey: 0.05,
  gold: 5,
  silver: 10,
};
const multipliers: Record<string, number> = {
  silver: 0.01,
  gold: 0.1,
  black: 1,
  brown: 10,
  red: 100,
  orange: 1e3,
  yellow: 1e4,
  green: 1e5,
  blue: 1e6,
  violet: 1e7,
  grey: 1e8,
  white: 1e9,
};
export const resistorBands = {
  colors,
  colorNames,
  displayNames,
  colorHex,
  tolerances,
  multipliers,
};
export function resistorColor(bands: 4 | 5, selected: string[]) {
  if (selected.length !== bands) throw new Error('請選擇完整的色環。');
  const digits = bands === 4 ? 2 : 3,
    raw = selected.slice(0, digits);
  const digit = raw.map((x) => colors.indexOf(x as (typeof colors)[number]));
  if (digit.some((x) => x < 0) || digit[0] === 0)
    throw new Error('首位色環必須是棕至白。');
  const multiplier = multipliers[selected[digits]],
    tolerance = tolerances[selected[digits + 1]];
  if (multiplier === undefined || tolerance === undefined)
    throw new Error('倍率或容差色環無效。');
  const resistance =
    Number(
      raw.map((x) => colors.indexOf(x as (typeof colors)[number])).join(''),
    ) * multiplier;
  return {
    resistance: safe(resistance, '電阻值'),
    tolerance,
    minimum: safe(resistance * (1 - tolerance / 100)),
    maximum: safe(resistance * (1 + tolerance / 100)),
  };
}
export function resistorColorReverse(
  value: string,
  bands: 4 | 5,
  toleranceColor: string,
) {
  const resistance = positive(value, '電阻值'),
    digits = bands === 4 ? 2 : 3;
  if (tolerances[toleranceColor] === undefined)
    throw new Error('容差色環無效。');
  for (let exp = -2; exp <= 9; exp++) {
    const significand = resistance / 10 ** exp,
      rounded = Math.round(significand);
    if (
      Math.abs(significand - rounded) <=
        Math.max(1, Math.abs(significand)) * 1e-12 &&
      rounded >= 10 ** (digits - 1) &&
      rounded < 10 ** digits
    ) {
      const ds = String(rounded)
        .padStart(digits, '0')
        .split('')
        .map((d) => colors[Number(d)]);
      const multiplier = Object.entries(multipliers).find(
        ([, m]) => m === 10 ** exp,
      )?.[0];
      if (multiplier)
        return {
          bands: [...ds, multiplier, toleranceColor],
          label: `${formatNumber(resistance)} Ω`,
        };
    }
  }
  throw new Error('此阻值無法以選定色環數精確表示。');
}

export function resistorNetwork(raw: string, mode: 'series' | 'parallel') {
  const values = raw
    .split(/[\s,，]+/)
    .filter(Boolean)
    .map((v, i) => positive(v, `第 ${i + 1} 顆電阻`));
  if (values.length < 2 || values.length > 20)
    throw new Error('請輸入 2 至 20 顆電阻。');
  const resistance =
    mode === 'series'
      ? values.reduce((a, b) => safe(a + b, '電阻總和'), 0)
      : positiveResult(
          1 / values.reduce((a, b) => safe(a + 1 / b, '倒數總和'), 0),
          '等效電阻',
        );
  return {
    resistance: positiveResult(resistance, '等效電阻'),
    count: values.length,
  };
}

export function rcTime(
  r: string,
  c: string,
  time: string,
  mode: 'charge' | 'discharge',
  supply: string,
) {
  const R = positive(r, '電阻'),
    C = positive(c, '電容'),
    t = numberInput(time, '時間'),
    V = positive(supply, '輸入電壓');
  if (t < 0) throw new Error('時間不可小於 0。');
  const tau = safe(R * C, '時間常數');
  if (tau === 0) throw new Error('時間常數過小，無法表示。');
  const ratio = Math.exp(-t / tau),
    voltage = mode === 'charge' ? V * (1 - ratio) : V * ratio;
  return {
    tau,
    settle: safe(5 * tau),
    voltage: safe(voltage, '電壓'),
    percent: safe((voltage / V) * 100),
  };
}
export const electricalFormat = formatNumber;
