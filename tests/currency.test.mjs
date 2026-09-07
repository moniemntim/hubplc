import assert from 'node:assert/strict';
import test from 'node:test';
import {
  currencies,
  validateRates,
  currencyQuote,
  convertCurrency,
  RATES_URL,
} from '../lib/tools/currency.ts';
const rows = currencies
  .filter((c) => c.value !== 'USD')
  .map((c, index) => ({
    base: 'USD',
    quote: c.value,
    rate: c.value === 'TWD' ? 32 : c.value === 'EUR' ? 0.8 : index + 1,
    date: '2026-09-01',
  }));
await test('cross-currency conversions preserve known ratios and round trips', () => {
  const rates = validateRates(rows, Date.parse('2026-09-07'));
  assert.equal(currencyQuote('USD', 'TWD', rates).rate, 32);
  assert.equal(currencyQuote('EUR', 'TWD', rates).rate, 40);
  assert.equal(convertCurrency('100', 40), 4000);
  for (const from of currencies)
    for (const to of currencies) {
      const rate = currencyQuote(from.value, to.value, rates).rate;
      const reverse = currencyQuote(to.value, from.value, rates).rate;
      assert.ok(
        Math.abs(
          convertCurrency(String(convertCurrency('123.45', rate)), reverse) -
            123.45,
        ) < 1e-10,
      );
    }
  assert.deepEqual(currencyQuote('USD', 'USD', rates), { rate: 1, dates: [] });
  assert.equal(convertCurrency('0', 32), 0);
  assert.equal(convertCurrency('0.5', 32), 16);
  assert.equal(convertCurrency('1000000000000000', 1), 1e15);
});
await test('reference dates remain visible independently for both cross-rate legs', () => {
  const data = structuredClone(rows);
  data.find((row) => row.quote === 'EUR').date = '2026-08-30';
  const rates = validateRates(data, Date.parse('2026-09-07'));
  assert.deepEqual(currencyQuote('EUR', 'TWD', rates).dates, [
    '2026-08-30',
    '2026-09-01',
  ]);
});
await test('rate payload rejects malformed, missing, duplicate, nonfinite and invalid-date data', () => {
  for (const value of [null, {}, [], rows.slice(1), [...rows, rows[0]]])
    assert.throws(() => validateRates(value));
  for (const change of [
    { base: 'EUR' },
    { quote: '__proto__' },
    { rate: 0 },
    { rate: -1 },
    { rate: Infinity },
    { rate: '32' },
    { date: '2026-02-30' },
    { date: 'tomorrow' },
    { date: '2099-01-01' },
  ]) {
    const data = structuredClone(rows);
    Object.assign(data[0], change);
    assert.throws(() => validateRates(data, Date.parse('2026-09-07')));
  }
  const duplicate = structuredClone(rows);
  duplicate[0] = duplicate[1];
  assert.throws(() => validateRates(duplicate));
  assert.throws(
    () => currencyQuote('__proto__', 'TWD', validateRates(rows)),
    /幣別/,
  );
});
await test('amount and manual-rate validation rejects blanks, loss, overflow and invalid values', () => {
  for (const amount of ['', ' ', 'abc', '-1', '1,000', '1e16', 'Infinity'])
    assert.throws(() => convertCurrency(amount, 32));
  for (const rate of [0, -1, Infinity, NaN])
    assert.throws(() => convertCurrency('1', rate));
  assert.throws(() => convertCurrency('1e15', Number.MAX_VALUE));
  assert.throws(() => convertCurrency('1e-100', Number.MIN_VALUE));
  assert.equal(new URL(RATES_URL).searchParams.get('base'), 'USD');
  assert.equal(new URL(RATES_URL).searchParams.has('amount'), false);
});
