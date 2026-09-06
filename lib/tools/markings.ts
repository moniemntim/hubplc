import { numberInput } from './core.ts';

// Bourns CR0603 EIA-96 table (accessed 2026-09-07):
// https://www.bourns.com/docs/Product-Datasheets/chpreztr.pdf?sfvrsn=6
// The published three-character scheme documents Y, X, and A–F multipliers.
const EIA96_BASES = [
  100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140,
  143, 147, 150, 154, 158, 162, 165, 169, 174, 178, 182, 187, 191, 196, 200,
  205, 210, 215, 221, 226, 232, 237, 243, 249, 255, 261, 267, 274, 280, 287,
  294, 301, 309, 316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412,
  422, 432, 442, 453, 464, 475, 487, 499, 511, 523, 536, 549, 562, 576, 590,
  604, 619, 634, 649, 665, 681, 698, 715, 732, 750, 768, 787, 806, 825, 845,
  866, 887, 909, 931, 953, 976,
] as const;
const EIA96_MULTIPLIERS: Record<string, number> = {
  Y: 0.01,
  X: 0.1,
  A: 1,
  B: 10,
  C: 100,
  D: 1e3,
  E: 1e4,
  F: 1e5,
};
export type ResistorMarkFormat = 'three' | 'four' | 'decimal' | 'eia96';

function positive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`${label}必須大於 0。`);
  return value;
}
function normalCode(raw: string) {
  const code = raw.trim().toUpperCase();
  if (!code) throw new Error('請填寫代碼。');
  return code;
}
function nearInteger(value: number) {
  const rounded = Math.round(value);
  return Math.abs(value - rounded) <= Math.max(1, Math.abs(value)) * 1e-12
    ? rounded
    : undefined;
}
function decimalMark(value: number) {
  for (let decimals = 1; decimals <= 3; decimals++) {
    const scaled = nearInteger(value * 10 ** decimals);
    if (scaled === undefined || scaled === 0) continue;
    const whole = Math.floor(value);
    if (whole < 0 || whole > 999) continue;
    const fraction = scaled - whole * 10 ** decimals;
    if (fraction < 0 || fraction >= 10 ** decimals) continue;
    const code = `${whole}R${String(fraction).padStart(decimals, '0')}`;
    if (/^\d{1,3}R\d{1,3}$/.test(code)) return code;
  }
  return undefined;
}
function capacitorDecimalMark(pf: number) {
  const decimal = decimalMark(pf);
  if (!decimal) return undefined;
  if (!decimal.startsWith('0R')) return decimal;
  const fraction = decimal.slice(2);
  return `R${fraction.length === 1 ? `${fraction}0` : fraction}`;
}
export function decodeSmdResistor(raw: string, format: ResistorMarkFormat) {
  const code = normalCode(raw);
  if (code === '0' || code === '000' || code === '0000')
    return { code, resistance: 0, zeroOhm: true };
  let resistance: number;
  if (format === 'three' || format === 'four') {
    const length = format === 'three' ? 3 : 4;
    if (!new RegExp(`^\\d{${length}}$`).test(code))
      throw new Error(`請輸入 ${length} 位數字代碼。`);
    const significant = Number(code.slice(0, -1));
    const minimum = 10 ** (length - 2);
    if (significant < minimum)
      throw new Error('有效數字位數不足，請改用相容的代碼格式。');
    resistance = significant * 10 ** Number(code.at(-1));
  } else if (format === 'decimal') {
    if (!/^\d{1,3}R\d{1,3}$/.test(code))
      throw new Error('R 小數點格式例如 4R7 或 0R1。');
    resistance = Number(code.replace('R', '.'));
  } else {
    const match = /^(\d{2})([ZYXABCDEF])$/.exec(code);
    if (!match) throw new Error('EIA-96 格式例如 01Y、10C 或 96F。');
    const index = Number(match[1]);
    if (index < 1 || index > 96)
      throw new Error('EIA-96 前兩碼必須為 01 至 96。');
    resistance = EIA96_BASES[index - 1] * EIA96_MULTIPLIERS[match[2]];
  }
  return { code, resistance: positive(resistance, '阻值'), zeroOhm: false };
}
export function encodeSmdResistor(raw: string, format: ResistorMarkFormat) {
  const resistance = numberInput(raw, '阻值');
  if (resistance === 0)
    return { code: format === 'four' ? '0000' : '000', resistance };
  positive(resistance, '阻值');
  if (format === 'decimal') {
    const code = decimalMark(resistance);
    if (code) return { code, resistance };
    throw new Error('此阻值無法以 R 小數點格式精確表示。');
  }
  if (format === 'eia96') {
    for (const [suffix, multiplier] of Object.entries(EIA96_MULTIPLIERS)) {
      const base = resistance / multiplier;
      const index = EIA96_BASES.findIndex(
        (value) =>
          Math.abs(value - base) <= Math.max(1, Math.abs(value)) * 1e-12,
      );
      if (index >= 0)
        return {
          code: `${String(index + 1).padStart(2, '0')}${suffix}`,
          resistance,
        };
    }
    throw new Error('此阻值無法以 EIA-96 代碼精確表示。');
  }
  const digits = format === 'three' ? 2 : 3;
  for (let exponent = 0; exponent <= 9; exponent++) {
    const significand = resistance / 10 ** exponent;
    const rounded = nearInteger(significand);
    if (
      rounded !== undefined &&
      rounded >= 10 ** (digits - 1) &&
      rounded < 10 ** digits
    )
      return { code: `${rounded}${exponent}`, resistance };
  }
  throw new Error(
    `此阻值無法以 ${format === 'three' ? '三位' : '四位'}數字代碼精確表示。`,
  );
}

export type CapacitorTolerance = '' | 'J' | 'K' | 'M';
const CAP_TOLERANCE: Record<Exclude<CapacitorTolerance, ''>, number> = {
  J: 5,
  K: 10,
  M: 20,
};
export function decodeSmdCapacitor(
  raw: string,
  tolerance: CapacitorTolerance = '',
) {
  const code = normalCode(raw);
  const match = /^(\d{3}|(?:\d{1,3})?R\d{1,3})([JKM])?$/.exec(code);
  if (!match)
    throw new Error(
      '請輸入三位數 pF 代碼（如 104K）或 R 小數點代碼（如 R50）。',
    );
  const baseCode = match[1];
  const codeTolerance = match[2] as CapacitorTolerance | undefined;
  let capacitance: number;
  if (/^\d{3}$/.test(baseCode)) {
    capacitance =
      Number(baseCode.slice(0, 2)) * 10 ** Number(baseCode[2]) * 1e-12;
  } else if (/^(?:\d{1,3})?R\d{1,3}$/.test(baseCode)) {
    capacitance = Number(baseCode.replace('R', '.')) * 1e-12;
  } else {
    throw new Error(
      '請輸入三位數 pF 代碼（如 104）或 R 小數點代碼（如 4R7）。',
    );
  }
  return {
    code,
    capacitance: positive(capacitance, '電容量'),
    tolerance: codeTolerance
      ? CAP_TOLERANCE[codeTolerance]
      : tolerance
        ? CAP_TOLERANCE[tolerance]
        : undefined,
  };
}
export function encodeSmdCapacitor(
  raw: string,
  tolerance: CapacitorTolerance = '',
) {
  const capacitance = positive(numberInput(raw, '電容量'), '電容量');
  const pf = capacitance * 1e12;
  for (let exponent = 0; exponent <= 9; exponent++) {
    const significant = pf / 10 ** exponent;
    const rounded = nearInteger(significant);
    if (rounded !== undefined && rounded >= 1 && rounded <= 99)
      return {
        code: `${String(rounded).padStart(2, '0')}${exponent}${tolerance}`,
        capacitance,
        tolerance: tolerance ? CAP_TOLERANCE[tolerance] : undefined,
      };
  }
  const decimal = capacitorDecimalMark(pf);
  if (decimal)
    return {
      code: `${decimal}${tolerance}`,
      capacitance,
      tolerance: tolerance ? CAP_TOLERANCE[tolerance] : undefined,
    };
  throw new Error('此電容量無法以通用三位數或 R 小數點代碼精確表示。');
}
export const smdMarkingReference = {
  eia96Bases: EIA96_BASES,
  eia96Multipliers: EIA96_MULTIPLIERS,
};
