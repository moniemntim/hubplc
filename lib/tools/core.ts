export function numberInput(raw: string, label = '數值'): number {
  const text = raw.trim();
  if (!text) throw new Error(`請填寫${label}。`);
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) {
    throw new Error(`${label}必須是有效的十進位數字。`);
  }
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error(`${label}超出可計算範圍。`);
  return value;
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '無法表示';
  if (value !== 0 && (Math.abs(value) < 1e-6 || Math.abs(value) >= 1e12)) {
    return value.toExponential(8).replace(/\.?0+e/, 'e');
  }
  return new Intl.NumberFormat('zh-TW', {
    maximumSignificantDigits: 12,
  }).format(value);
}

function checkFinite(value: unknown): void {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('結果超出可表示範圍，請調整輸入。');
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach(checkFinite);
  }
}

export function attempt<T>(fn: () => T): { data?: T; error?: string } {
  try {
    const data = fn();
    checkFinite(data);
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : '無法完成計算。' };
  }
}
