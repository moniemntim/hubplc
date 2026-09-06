import { numberInput } from './core.ts';

const positive = (raw: string, label: string) => {
  const value = numberInput(raw, label);
  if (value <= 0) throw new Error(`${label}必須大於 0。`);
  return value;
};
const finite = (value: number, label = '計算結果') => {
  if (!Number.isFinite(value) || value <= 0 || value > Number.MAX_VALUE / 10)
    throw new Error(`${label}超出可計算範圍。`);
  return value;
};

export function rcFilter(
  type: 'lowpass' | 'highpass',
  r: string,
  c: string,
  sampleFrequency: string,
) {
  const resistance = positive(r, '電阻');
  const capacitance = positive(c, '電容');
  const frequency = positive(sampleFrequency, '指定頻率');
  const cutoff = finite(
    1 / (2 * Math.PI * resistance * capacitance),
    '截止頻率',
  );
  const ratio = frequency / cutoff;
  const magnitude =
    type === 'lowpass'
      ? 1 / Math.sqrt(1 + ratio ** 2)
      : ratio / Math.sqrt(1 + ratio ** 2);
  const phase =
    type === 'lowpass' ? -Math.atan(ratio) : Math.PI / 2 - Math.atan(ratio);
  return {
    resistance,
    capacitance,
    frequency,
    cutoff,
    gain: finite(magnitude, '增益'),
    gainDb: 20 * Math.log10(magnitude),
    phaseDeg: (phase * 180) / Math.PI,
  };
}

export function rcFilterInverse(cutoff: string, capacitance: string) {
  const frequency = positive(cutoff, '截止頻率');
  const c = positive(capacitance, '電容');
  return { resistance: finite(1 / (2 * Math.PI * frequency * c), '電阻') };
}

export function reactance(
  kind: 'capacitor' | 'inductor',
  frequency: string,
  component: string,
) {
  const f = positive(frequency, '頻率');
  const value = positive(component, kind === 'capacitor' ? '電容' : '電感');
  const magnitude =
    kind === 'capacitor'
      ? 1 / (2 * Math.PI * f * value)
      : 2 * Math.PI * f * value;
  return {
    frequency: f,
    component: value,
    magnitude: finite(magnitude, '電抗'),
    sign: kind === 'capacitor' ? -1 : 1,
  };
}

export function reactanceInverse(
  kind: 'capacitor' | 'inductor',
  frequency: string,
  magnitude: string,
) {
  const f = positive(frequency, '頻率');
  const x = positive(magnitude, '電抗');
  return {
    component: finite(
      kind === 'capacitor' ? 1 / (2 * Math.PI * f * x) : x / (2 * Math.PI * f),
      kind === 'capacitor' ? '電容' : '電感',
    ),
  };
}

export function lcResonance(
  known: 'lc' | 'lf' | 'cf',
  first: string,
  second: string,
) {
  const a = positive(first, '已知量一');
  const b = positive(second, '已知量二');
  if (known === 'lc') {
    const inductance = a,
      capacitance = b;
    return {
      inductance,
      capacitance,
      frequency: finite(
        1 / (2 * Math.PI * Math.sqrt(inductance * capacitance)),
        '諧振頻率',
      ),
    };
  }
  if (known === 'lf') {
    const inductance = a,
      frequency = b;
    return {
      inductance,
      frequency,
      capacitance: finite(
        1 / ((2 * Math.PI * frequency) ** 2 * inductance),
        '電容',
      ),
    };
  }
  const capacitance = a,
    frequency = b;
  return {
    capacitance,
    frequency,
    inductance: finite(
      1 / ((2 * Math.PI * frequency) ** 2 * capacitance),
      '電感',
    ),
  };
}
