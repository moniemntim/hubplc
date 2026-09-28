import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocaleEditor, parseLocalized } from './locale-model.mjs';
void test('formatting leaves all 1001 canonical values unchanged', () => {
  for (let raw = 0; raw <= 1000; raw++) {
    const e = createLocaleEditor(raw);
    for (const [l, u] of [
      ['de-DE', 'C'],
      ['en-US', 'F'],
      ['de-DE', 'F'],
      ['en-US', 'C'],
    ])
      assert.equal(e.displayAs(l, u).raw, raw);
    // Exact hundredths of Fahrenheit round-trip to the original raw.
    const f100 = raw * 18 + 3200;
    assert.equal(
      parseLocalized(
        `${Math.trunc(f100 / 100)}.${String(f100 % 100).padStart(2, '0')}`,
        'en-US',
        'F',
      ).wire,
      raw,
    );
  }
});
void test('known locale, exact step and range gates', () => {
  for (const [s, l, u, decision] of [
    ['25,3', 'de-DE', 'C', 'ACCEPT'],
    ['25,3', 'en-US', 'C', 'SYNTAX_REJECTED'],
    ['1,234', null, 'C', 'CONTEXT_REJECTED'],
    ['1,234', 'de-DE', 'C', 'STEP_REJECTED'],
    ['77.5', 'en-US', 'F', 'STEP_REJECTED'],
    ['77.54', 'en-US', 'F', 'ACCEPT'],
    ['31.9', 'en-US', 'F', 'RANGE_REJECTED'],
    ['212.01', 'en-US', 'F', 'RANGE_REJECTED'],
  ])
    assert.equal(parseLocalized(s, l, u).decision, decision);
  for (const text of [
    '',
    ' 25',
    '25\n',
    '+25',
    '-40',
    '025',
    '1e2',
    '25°C',
    '1.000,0',
    '２５',
    '25.30000000000000',
  ])
    assert.equal(parseLocalized(text, 'en-US', 'C').accepted, false);
});
void test('draft context survives display change, explicit confirm or cancel only', () => {
  const e = createLocaleEditor();
  e.begin('26,0', 'de-DE', 'C');
  const shown = e.displayAs('en-US', 'F');
  assert.equal(shown.raw, 253);
  assert.equal(shown.display, '77.5 °F');
  shown.draft.text = '99';
  assert.equal(e.confirm().wire, 260);
  assert.equal(e.inspect().display, '78.8 °F');
  e.begin('77.5', 'en-US', 'F');
  assert.equal(e.confirm().decision, 'STEP_REJECTED');
  assert.equal(e.inspect().raw, 260);
  assert.equal(e.inspect().draft.text, '77.5');
  assert.throws(() => e.begin('32'));
  e.cancel();
  assert.equal(e.inspect().raw, 260);
  assert.equal(e.confirm().decision, 'NO_DRAFT');
  assert.throws(() => e.displayAs('unknown', 'C'));
  assert.equal(e.inspect().raw, 260);
  assert.throws(() => createLocaleEditor(NaN));
});
