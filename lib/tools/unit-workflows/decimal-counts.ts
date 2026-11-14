import { requireCondition } from './shared.ts';
export type DecimalRatio = { numerator: bigint; denominator: bigint };
// Use the entered finite numbers' decimal representation for whole-unit decisions.
// This avoids an extra sheet/cycle being created by a binary floating-point remainder.
export function decimal(value: number): DecimalRatio {
  requireCondition(
    Number.isFinite(value),
    '數值超出可計算範圍。',
    'The value is outside the supported range.',
  );
  const [mantissa, exponent = '0'] = String(value).toLowerCase().split('e');
  const places = mantissa.split('.')[1]?.length ?? 0;
  const power = Number(exponent) - places;
  const digits = BigInt(mantissa.replace('.', ''));
  return power >= 0
    ? {
        numerator: digits * BigInt(10) ** BigInt(power),
        denominator: BigInt(1),
      }
    : { numerator: digits, denominator: BigInt(10) ** BigInt(-power) };
}
export const add = (a: DecimalRatio, b: DecimalRatio): DecimalRatio => ({
  numerator: a.numerator * b.denominator + b.numerator * a.denominator,
  denominator: a.denominator * b.denominator,
});
export const subtract = (a: DecimalRatio, b: DecimalRatio): DecimalRatio => ({
  numerator: a.numerator * b.denominator - b.numerator * a.denominator,
  denominator: a.denominator * b.denominator,
});
export const multiply = (a: DecimalRatio, b: DecimalRatio): DecimalRatio => ({
  numerator: a.numerator * b.numerator,
  denominator: a.denominator * b.denominator,
});
export function divide(a: DecimalRatio, b: DecimalRatio): DecimalRatio {
  requireCondition(
    b.numerator > BigInt(0),
    '除數必須大於 0。',
    'The divisor must be positive.',
  );
  return {
    numerator: a.numerator * b.denominator,
    denominator: a.denominator * b.numerator,
  };
}
export function wholeCount(
  value: DecimalRatio,
  mode: 'floor' | 'ceil',
): number {
  requireCondition(
    value.denominator > BigInt(0) && value.numerator >= BigInt(0),
    '可用數量不可為負數。',
    'The available quantity cannot be negative.',
  );
  const quotient = value.numerator / value.denominator;
  const count =
    quotient +
    (mode === 'ceil' && value.numerator % value.denominator !== BigInt(0)
      ? BigInt(1)
      : BigInt(0));
  requireCondition(
    count <= BigInt(Number.MAX_SAFE_INTEGER),
    '件數超出安全整數範圍，請縮小輸入。',
    'The count exceeds the safe-integer range. Reduce the input.',
  );
  return Number(count);
}
