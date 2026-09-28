import { numberInput } from './tools/core.ts';
export function filterSequence(text: string, counts: boolean) {
  const tokens = text.split(',').map((token) => token.trim());
  if (tokens.length < 1 || tokens.length > 30)
    throw new Error('請輸入 1–30 筆資料。');
  let window: number[] = [];
  let lastGood: number | null = null;
  let lastGoodAt: number | null = null;
  return tokens.map((token, index) => {
    const time = index * 100;
    const raw =
      token.toLowerCase() === 'x'
        ? null
        : numberInput(token, `第 ${index + 1} 筆`);
    if (raw !== null && Math.abs(raw) > 1e6)
      throw new Error('數值限於 ±1,000,000。');
    const bad = raw === null || (counts && (raw < 0 || raw > 16000));
    if (bad) window = [];
    else window = [...window, raw!].slice(-3);
    const mean =
      window.length === 3
        ? window.reduce((sum, value) => sum + value, 0) / 3
        : null;
    const current = mean === null ? null : counts ? mean / 1600 : mean;
    if (current !== null) {
      lastGood = current;
      lastGoodAt = time;
    }
    return {
      time,
      raw,
      state: bad ? 'Bad' : current === null ? 'Warmup' : 'Good',
      count: window.length,
      mean,
      current,
      lastGood,
      age: lastGoodAt === null ? null : time - lastGoodAt,
    };
  });
}
