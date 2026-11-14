import assert from 'node:assert/strict';
import test from 'node:test';
import { engineeringWorkflows } from '../lib/tools/unit-workflows/engineering.ts';

const workflow = (group) =>
  engineeringWorkflows.find((item) => item.group === group);
const values = (group, input) =>
  Object.fromEntries(
    workflow(group)
      .calculate(input)
      .map((item) => [
        item.label.en + (item.unit ? ` (${item.unit})` : ''),
        item.value,
      ]),
  );

void test('drawing dimensions use the exact 25.4 mm per inch relationship', () => {
  const result = values('length', { nominalMm: '100', toleranceMm: '0.1' });
  assert.equal(result['Nominal dimension (in)'], 100 / 25.4);
  assert.equal(result['Lower limit (in)'], 99.9 / 25.4);
  assert.equal(result['Upper limit (in)'], 100.1 / 25.4);
  assert.equal(result['Symmetric tolerance (± in)'], 0.1 / 25.4);
  assert.throws(
    () => workflow('length').calculate({ nominalMm: '', toleranceMm: '0.1' }),
    /圖面標稱尺寸/,
  );
  assert.throws(
    () =>
      workflow('length').calculate({ nominalMm: '0.1', toleranceMm: '0.1' }),
    /公差/,
  );
});

void test('temperature keeps absolute conversion separate from temperature delta', () => {
  const result = values('temperature', { startC: '25', endC: '85' });
  assert.equal(result['Start absolute temperature (K)'], 298.15);
  assert.equal(result['Start Fahrenheit temperature (°F)'], 77);
  assert.equal(result['End absolute temperature (K)'], 358.15);
  assert.equal(result['End Fahrenheit temperature (°F)'], 185);
  assert.equal(result['Temperature delta (K)'], 60);
  assert.equal(result['Fahrenheit delta (°F)'], 108);
  assert.throws(
    () => workflow('temperature').calculate({ startC: '-273.16', endC: '0' }),
    /絕對零度/,
  );
});

void test('pressure permits a negative gauge value but never negative absolute pressure', () => {
  const result = values('pressure', {
    reference: 'absolute',
    pressureKpa: '90',
    atmosphereKpa: '101.325',
  });
  assert.equal(result['Absolute pressure (kPa)'], 90);
  assert.equal(result['Absolute pressure (bar)'], 0.9);
  assert.equal(result['Gauge pressure (kPa)'], 90 - 101.325);
  assert.equal(result['Gauge pressure (bar)'], (90 - 101.325) / 100);
  assert.throws(
    () =>
      workflow('pressure').calculate({
        reference: 'gauge',
        pressureKpa: '',
        atmosphereKpa: '101.325',
      }),
    /輸入壓力/,
  );
  assert.throws(
    () =>
      workflow('pressure').calculate({
        reference: 'absolute',
        pressureKpa: '-1',
        atmosphereKpa: '101.325',
      }),
    /絕對壓/,
  );
});

void test('encoder workflow rounds counts and reports the realized angle error', () => {
  const result = values('angle', {
    ppr: '1024',
    multiplier: '4',
    targetDegrees: '1',
  });
  assert.equal(result['Effective counts per revolution (counts/rev)'], 4096);
  assert.equal(result['Exact count (counts)'], 1024 / 90);
  assert.equal(result['Nearest integer count (counts)'], 11);
  assert.equal(result['Realized angle (°)'], (11 * 360) / 4096);
  assert.equal(
    result['Quantization error (realized − target) (°)'],
    (11 * 360) / 4096 - 1,
  );
  assert.throws(
    () =>
      workflow('angle').calculate({
        ppr: '1.5',
        multiplier: '4',
        targetDegrees: '1',
      }),
    /安全整數/,
  );
  assert.throws(
    () =>
      workflow('angle').calculate({
        ppr: '1000',
        multiplier: '3',
        targetDegrees: '1',
      }),
    /倍率/,
  );
});

void test('belt workflow states its constant-speed arithmetic explicitly', () => {
  const result = values('speed', {
    distanceMm: '1000',
    speedMMin: '30',
    pitchMm: '50',
  });
  assert.equal(result['Specified travel time (s)'], 2);
  assert.equal(result['Interval per pitch (s)'], 0.1);
  assert.equal(result['Pitch count over specified distance (pitches)'], 20);
  assert.equal(result['Theoretical throughput (parts/min)'], 600);
  assert.throws(
    () =>
      workflow('speed').calculate({
        distanceMm: '1000',
        speedMMin: '0',
        pitchMm: '50',
      }),
    /皮帶速度/,
  );
  assert.throws(
    () =>
      workflow('speed').calculate({
        distanceMm: '1000',
        speedMMin: '30',
        pitchMm: '1e-999',
      }),
    /超出/,
  );
});

void test('shift workflow only returns whole complete cycles', () => {
  const result = values('time', {
    processSeconds: '50',
    transferSeconds: '20',
    shiftHours: '1',
    breakMinutes: '15',
  });
  assert.equal(result['Cycle time (s)'], 70);
  assert.equal(result['Available production time (s)'], 2700);
  assert.equal(result['Complete cycles (cycles)'], 38);
  assert.equal(result['Remaining incomplete-cycle time (s)'], 40);
  assert.throws(
    () =>
      workflow('time').calculate({
        processSeconds: '',
        transferSeconds: '6',
        shiftHours: '8',
        breakMinutes: '30',
      }),
    /加工時間/,
  );
  assert.throws(
    () =>
      workflow('time').calculate({
        processSeconds: '24',
        transferSeconds: '6',
        shiftHours: '1',
        breakMinutes: '61',
      }),
    /休息時間/,
  );
});
