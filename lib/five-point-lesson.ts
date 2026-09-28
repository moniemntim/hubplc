import { numberInput } from './tools/core.ts';

export const references = [0, 2.5, 5, 7.5, 10];
export const errorPresets = [
  { label: '理想讀值', values: [0, 2.5, 5, 7.5, 10] },
  { label: '固定偏移', values: [0.4, 2.9, 5.4, 7.9, 10.4] },
  { label: '跨度差', values: [0, 2.75, 5.5, 8.25, 11] },
  { label: '中間點偏離', values: [0, 2.8, 5.6, 7.8, 10] },
  { label: '偏移加跨度差', values: [0.2, 2.45, 4.7, 6.95, 9.2] },
];

export function assessFivePoints(inputs: string[], toleranceInput: string) {
  if (inputs.length !== 5) throw new Error('請提供五個讀值。');
  const readings = references.map((ref, i) => {
    const value = numberInput(inputs[i], `${ref} bar 對應讀值`);
    if (Math.abs(value) > 1e6) throw new Error('讀值限於 ±1,000,000 bar。');
    return value;
  });
  const tolerance = numberInput(toleranceInput, '判讀容差');
  if (tolerance < 0.000001 || tolerance > 10)
    throw new Error('判讀容差須介於 0.000001 與 10 bar。');
  const offset = readings[0];
  const gain = (readings[4] - readings[0]) / 10;
  const points = references.map((reference, i) => ({
    reference,
    reading: readings[i],
    error: readings[i] - reference,
    percentSpan: (readings[i] - reference) * 10,
    residual: readings[i] - (offset + gain * reference),
  }));
  const maxError = Math.max(...points.map((point) => Math.abs(point.error)));
  const maxResidual = Math.max(
    ...points.map((point) => Math.abs(point.residual)),
  );
  const spanDifference = points[4].error - points[0].error;
  // Floating point guard only; this is not a measurement uncertainty allowance.
  const within = (value: number) => Math.abs(value) <= tolerance + 1e-9;
  const finding = within(maxError)
    ? '五點誤差均在選定容差內'
    : !within(maxResidual)
      ? '中間點偏離端點直線'
      : within(spanDifference)
        ? '固定偏移線索'
        : within(offset)
          ? '跨度差線索'
          : '偏移與跨度差混合線索';
  return {
    points,
    offset,
    gain,
    spanDifference,
    maxError,
    maxResidual,
    finding,
  };
}
