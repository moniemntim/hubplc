import test from 'node:test';
import assert from 'node:assert/strict';
import { convertUnit, unitGroups } from '../lib/tools/units.ts';
import { numberInput, attempt, formatNumber } from '../lib/tools/core.ts';
const close = (actual, expected) =>
  assert.ok(
    Math.abs(actual - expected) < Math.max(1, Math.abs(expected)) * 1e-10,
    `${actual} != ${expected}`,
  );
await test('thirteen dimensions have established conversion anchors', () => {
  assert.equal(unitGroups.length, 13);
  close(convertUnit('1', 'bar', 'kpa'), 100);
  close(convertUnit('1', 'usgpm', 'lmin'), 3.785411784);
  close(convertUnit('1', 'h', 's'), 3600);
  close(convertUnit('1', 'lb', 'kg'), 0.45359237);
  close(convertUnit('1', 'impgal', 'l'), 4.54609);
  close(convertUnit('1', 'inch', 'mm'), 25.4);
  close(convertUnit('1', 'ha', 'm2'), 10000);
  close(convertUnit('36', 'kmh', 'mspeed'), 10);
  close(convertUnit('3600', 'kgh', 'kgs'), 1);
  close(convertUnit('1', 'hp', 'watt'), 745.6998715822702);
  close(convertUnit('180', 'deg', 'rad'), Math.PI);
  close(convertUnit('1', 'farad', 'uf'), 1e6);
  close(convertUnit('1', 'gib', 'mib'), 1024);
  close(convertUnit('1', 'gb', 'mb'), 1000);
  close(convertUnit('1', 'bit', 'byte'), 0.125);
  close(convertUnit('1', 'mile', 'm'), 1609.344);
  close(convertUnit('1', 'knot', 'kmh'), 1.852);
  close(convertUnit('1', 'mach343', 'mspeed'), 343);
});
await test('temperature offsets and absolute zero', () => {
  close(convertUnit('-273.15', 'c', 'k'), 0);
  close(convertUnit('-459.67', 'f', 'k'), 0);
  close(convertUnit('0', 'k', 'c'), -273.15);
  close(convertUnit('0', 'rankine', 'k'), 0);
  close(convertUnit('-218.52', 'reaumur', 'k'), 0);
  close(convertUnit('0', 'c', 'f'), 32);
  close(convertUnit('-40', 'f', 'c'), -40);
  close(convertUnit('80', 'reaumur', 'c'), 100);
  assert.throws(() => convertUnit('-1', 'k', 'c'));
  assert.throws(() => convertUnit('-273.16', 'c', 'f'));
  assert.throws(() => convertUnit('-1', 'rankine', 'c'));
  assert.throws(() => convertUnit('-218.53', 'reaumur', 'k'));
});
await test('every compatible unit round trips', () => {
  for (const group of unitGroups)
    for (const from of group.units)
      for (const to of group.units) {
        if (from.dimension !== to.dimension) continue;
        const out = convertUnit('12.345', from.id, to.id);
        close(convertUnit(String(out), to.id, from.id), 12.345);
      }
});
await test('incompatible and nonfinite inputs cannot produce usable results', () => {
  assert.throws(() => convertUnit('1', 'kgh', 'lmin'));
  assert.throws(() => convertUnit('1', 'kg', 'm'));
  assert.throws(() => convertUnit('1', 'byte', 'm'));
  for (const input of ['', 'NaN', '0xFF', 'Infinity'])
    assert.throws(() => numberInput(input));
  assert.equal(attempt(() => ({ value: Infinity })).data, undefined);
  assert.throws(() => convertUnit('1e308', 'h', 'us'));
  assert.notEqual(formatNumber(1e-12), '0');
});
