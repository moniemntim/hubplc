import assert from 'node:assert/strict';
import test from 'node:test';
import {
  acPowerConvert,
  energyAndCost,
} from '../lib/tools/power-calculators.ts';
import {
  powerWorkedCases,
  energyWorkedCases,
} from '../lib/tools/worked-power-cases.ts';

function powerCase(index) {
  const p = powerWorkedCases[index].preset;
  return acPowerConvert(
    p.mode,
    p.phase ?? 'single',
    p.value ?? '',
    p.unit,
    p.other ?? '',
    p.pf ?? '1',
  );
}
function energyCase(index) {
  const p = energyWorkedCases[index].preset;
  return energyAndCost(
    p.mode,
    p.value ?? '',
    p.unit,
    p.hours ?? '',
    p.days ?? '',
    p.rate ?? '',
  );
}

const closeTo = (actual, expected, tolerance = 1e-9) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} is not within ${tolerance} of ${expected}`,
  );

void test('worked AC cases calculate the documented teaching results', () => {
  const current = powerCase(0);
  assert.equal(current.watts, 1760);
  assert.equal(current.va, 2200);

  const threePhase = powerCase(1);
  closeTo(threePhase.current, 18.991785170711374);
  assert.equal(threePhase.va, 12500);

  const ups = powerCase(2);
  closeTo(ups.va, 1333.3333333333335);
  assert.ok(ups.va > 1200);
  assert.ok(ups.watts < 900);
});

void test('worked energy cases calculate documented interval values', () => {
  const monthly = energyCase(0);
  assert.equal(monthly.kwh, 198);
  closeTo(monthly.cost, 633.6);

  const average = energyCase(1);
  assert.equal(average.watts, 2000);
  assert.equal(average.kwh, 10);
  assert.equal(average.cost, 30);
});
