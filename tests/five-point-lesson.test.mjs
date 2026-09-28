import assert from 'node:assert/strict';
import test from 'node:test';
import { assessFivePoints, errorPresets } from '../lib/five-point-lesson.ts';
void test('five-point patterns retain signed errors and endpoint residuals', () => {
  const expected = [
    '五點誤差均在選定容差內',
    '固定偏移線索',
    '跨度差線索',
    '中間點偏離端點直線',
    '偏移與跨度差混合線索',
  ];
  errorPresets.forEach((preset, i) =>
    assert.equal(
      assessFivePoints(preset.values.map(String), '0.05').finding,
      expected[i],
    ),
  );
  const mixed = assessFivePoints(errorPresets[4].values.map(String), '0.05');
  assert.ok(Math.abs(mixed.gain - 0.9) < 1e-12);
  assert.ok(Math.abs(mixed.points[4].percentSpan + 8) < 1e-12);
  assert.ok(mixed.maxResidual < 1e-12);
  const changed = assessFivePoints(
    ['0.4', '2.9', '5.9', '7.9', '10.4'],
    '0.05',
  );
  assert.equal(changed.finding, expected[3]);
  assert.equal(changed.maxResidual, 0.5);
  assert.equal(
    assessFivePoints(['0.05', '2.55', '5.05', '7.55', '10.05'], '0.05').finding,
    expected[0],
  );
  assert.equal(
    assessFivePoints(
      ['0.05001', '2.55001', '5.05001', '7.55001', '10.05001'],
      '0.05',
    ).finding,
    expected[1],
  );
  assert.equal(
    assessFivePoints(errorPresets[3].values.map(String), '1').finding,
    expected[0],
  );
});
void test('five-point invalid fields cannot produce a diagnosis', () => {
  for (const invalid of ['', 'NaN', 'Infinity', '0x20', '1000001']) {
    assert.throws(() =>
      assessFivePoints(['0', '2.5', invalid, '7.5', '10'], '0.05'),
    );
  }
  for (const tolerance of ['', '0', '-1', '0.0000001', '11', 'NaN'])
    assert.throws(() =>
      assessFivePoints(['0', '2.5', '5', '7.5', '10'], tolerance),
    );
  assert.throws(() => assessFivePoints(['0'], '0.05'));
  assert.doesNotThrow(() =>
    assessFivePoints(['0', '2.5', '5', '7.5', '10'], '0.000001'),
  );
});
