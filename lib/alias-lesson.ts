import { numberInput } from './tools/core.ts';
export function aliasExample(fText: string, fsText: string, phaseText: string) {
  const frequency = numberInput(fText, '輸入頻率'),
    rate = numberInput(fsText, '取樣率'),
    phase = numberInput(phaseText, '相位');
  if (
    frequency < 0 ||
    frequency > 10000 ||
    rate < 1 ||
    rate > 10000 ||
    Math.abs(phase) > 360
  )
    throw new Error('頻率限 0–10000 Hz，取樣率限 1–10000 Hz，相位限 ±360°。');
  const signed = frequency - Math.round(frequency / rate) * rate;
  const rows = Array.from({ length: 12 }, (_, index) => {
    const time = index / rate;
    const original = Math.sin(
      2 * Math.PI * frequency * time + (phase * Math.PI) / 180,
    );
    const equivalent = Math.sin(
      2 * Math.PI * signed * time + (phase * Math.PI) / 180,
    );
    return { index, time, original, equivalent };
  });
  return { signed, alias: Math.abs(signed), nyquist: rate / 2, rows };
}
