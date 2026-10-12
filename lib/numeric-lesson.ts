function decimal(input: string, label: string) {
  const value = input.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value))
    throw new Error(`${label} 必須是有限的十進位數字。`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed))
    throw new Error(`${label} 必須是有限的十進位數字。`);
  return parsed;
}

export function compareWithTolerance(input: {
  a: string;
  b: string;
  absoluteTolerance: string;
  relativeTolerance?: string;
}) {
  const a = decimal(input.a, '第一個值');
  const b = decimal(input.b, '第二個值');
  const absoluteTolerance = decimal(input.absoluteTolerance, '絕對容差');
  if (absoluteTolerance < 0) throw new Error('絕對容差不可小於 0。');
  const relativeTolerance =
    input.relativeTolerance === undefined
      ? 0
      : decimal(input.relativeTolerance, '相對容差');
  if (relativeTolerance < 0) throw new Error('相對容差不可小於 0。');
  const difference = Math.abs(a - b);
  const relativeLimit = relativeTolerance * Math.max(Math.abs(a), Math.abs(b));
  const limit = Math.max(absoluteTolerance, relativeLimit);
  if (![difference, relativeLimit, limit].every(Number.isFinite))
    throw new Error('差值或允許差超出可計算範圍。');
  return { a, b, difference, relativeLimit, limit, close: difference <= limit };
}

export function roundRaw100(raw: string) {
  const value = raw.trim();
  if (!/^[+-]?\d+$/.test(value))
    throw new Error('Raw100 必須是整數，不能先輸入顯示小數。');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < -100000 || parsed > 100000)
    throw new Error('Raw100 必須在 −100000 到 100000 範圍內。');
  const magnitude = Math.abs(parsed);
  const quotient = Math.floor(magnitude / 10);
  const remainder = magnitude % 10;
  const roundedMagnitude = quotient + (remainder * 2 >= 10 ? 1 : 0);
  const signed = parsed < 0 ? -roundedMagnitude : roundedMagnitude;
  const rounded10 = signed === 0 ? 0 : signed;
  return {
    raw100: parsed,
    quotient,
    remainder,
    rounded10,
    rawDisplay: (parsed / 100).toFixed(2),
    display: (rounded10 / 10).toFixed(1),
  };
}
