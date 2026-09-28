import { numberInput } from './tools/core.ts';
import { analogConvert } from './tools/plc.ts';
export function directionExample(current: string) {
  const value = analogConvert({
    signal: current,
    signalLow: '4',
    signalHigh: '20',
    engineeringLow: '0',
    engineeringHigh: '100',
  });
  return {
    forward: value.engineering,
    reverse: 100 - value.engineering,
    outside: value.outside,
  };
}
export function stepExample(
  tauText: string,
  delayText: string,
  intervalText: string,
  falling: boolean,
) {
  const tau = numberInput(tauText, '時間常數'),
    delay = numberInput(delayText, '固定延遲'),
    interval = numberInput(intervalText, '取樣間隔');
  if (
    tau < 0.001 ||
    tau > 1000 ||
    delay < 0 ||
    delay > 1000 ||
    interval < 0.001 ||
    interval > 1000
  )
    throw new Error('τ 與取樣間隔須為 0.001–1000 秒，延遲須為 0–1000 秒。');
  const start = falling ? 80 : 20,
    end = falling ? 20 : 80;
  const rows = [0.1, 1 - Math.exp(-1), 0.9].map((fraction) => {
    const crossing = delay - tau * Math.log1p(-fraction);
    const sample = Math.ceil(crossing / interval - 1e-12) * interval;
    const observed =
      start + (end - start) * -Math.expm1(-Math.max(0, sample - delay) / tau);
    return {
      fraction,
      threshold: start + (end - start) * fraction,
      crossing,
      sample,
      observed,
    };
  });
  return { rows, rise: tau * Math.log(9), t90: tau * Math.log(10), start, end };
}
