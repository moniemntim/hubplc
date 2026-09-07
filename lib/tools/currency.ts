import { numberInput } from './core.ts';
export const currencies = [
  { value: 'TWD', label: 'TWD 新台幣' },
  { value: 'USD', label: 'USD 美元' },
  { value: 'CNY', label: 'CNY 人民幣' },
  { value: 'EUR', label: 'EUR 歐元' },
  { value: 'JPY', label: 'JPY 日圓' },
  { value: 'GBP', label: 'GBP 英鎊' },
  { value: 'HKD', label: 'HKD 港幣' },
  { value: 'AUD', label: 'AUD 澳幣' },
  { value: 'CAD', label: 'CAD 加拿大元' },
  { value: 'CHF', label: 'CHF 瑞士法郎' },
  { value: 'SGD', label: 'SGD 新加坡元' },
  { value: 'NZD', label: 'NZD 紐西蘭元' },
  { value: 'KRW', label: 'KRW 韓元' },
  { value: 'THB', label: 'THB 泰銖' },
  { value: 'MYR', label: 'MYR 馬來西亞令吉' },
  { value: 'IDR', label: 'IDR 印尼盾' },
  { value: 'PHP', label: 'PHP 菲律賓披索' },
  { value: 'INR', label: 'INR 印度盧比' },
  { value: 'VND', label: 'VND 越南盾' },
  { value: 'ZAR', label: 'ZAR 南非蘭特' },
] as const;
export type Currency = (typeof currencies)[number]['value'];
export type Rates = Record<Currency, { rate: number; date: string }>;
export const RATES_URL =
  'https://api.frankfurter.dev/v2/rates?base=USD&quotes=TWD,CNY,EUR,JPY,GBP,HKD,AUD,CAD,CHF,SGD,NZD,KRW,THB,MYR,IDR,PHP,INR,VND,ZAR';
export function validateRates(data: unknown, now = Date.now()): Rates {
  if (!Array.isArray(data) || data.length !== currencies.length - 1)
    throw new Error('匯率資料不完整，請稍後重試或改用手動匯率。');
  const result = { USD: { rate: 1, date: '' } } as Rates;
  for (const row of data) {
    if (
      !row ||
      typeof row !== 'object' ||
      row.base !== 'USD' ||
      !currencies.some((c) => c.value === row.quote) ||
      row.quote === 'USD' ||
      Object.hasOwn(result, row.quote)
    )
      throw new Error('匯率資料的幣別格式不正確。');
    if (
      typeof row.rate !== 'number' ||
      !Number.isFinite(row.rate) ||
      row.rate <= 0
    )
      throw new Error('匯率資料包含無效數值。');
    if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date))
      throw new Error('匯率資料缺少有效日期。');
    const date = Date.parse(row.date);
    if (
      !Number.isFinite(date) ||
      new Date(date).toISOString().slice(0, 10) !== row.date ||
      date > now + 86400000
    )
      throw new Error('匯率資料的日期不正確。');
    result[row.quote as Currency] = { rate: row.rate, date: row.date };
  }
  return result;
}
export function currencyQuote(
  from: Currency,
  to: Currency,
  rates: Rates,
): { rate: number; dates: string[] } {
  if (!Object.hasOwn(rates, from) || !Object.hasOwn(rates, to))
    throw new Error('找不到所選幣別的匯率。');
  if (from === to) return { rate: 1, dates: [] };
  const source = rates[from],
    target = rates[to];
  if (
    ![source.rate, target.rate].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  )
    throw new Error('匯率必須是正數。');
  const rate = target.rate / source.rate;
  if (!Number.isFinite(rate) || rate <= 0)
    throw new Error('匯率超出可表示範圍。');
  return {
    rate,
    dates: [...new Set([source.date, target.date].filter(Boolean))].sort(),
  };
}
export function convertCurrency(amount: string, rate: number): number {
  const value = numberInput(amount, '金額');
  if (value < 0 || value > 1e15)
    throw new Error('金額必須介於 0 與 10¹⁵ 之間。');
  if (!Number.isFinite(rate) || rate <= 0)
    throw new Error('匯率必須是有限的正數。');
  const result = value * rate;
  if (!Number.isFinite(result) || (value > 0 && result === 0))
    throw new Error('結果超出可表示範圍。');
  return result;
}
