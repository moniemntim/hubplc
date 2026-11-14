import assert from 'node:assert/strict';
import test from 'node:test';
import { materialsWorkflows } from '../lib/tools/unit-workflows/materials.ts';
import { WorkflowError } from '../lib/tools/unit-workflows/shared.ts';

const workflow = (group) =>
  materialsWorkflows.find((item) => item.group === group);
const values = (group, input) =>
  workflow(group)
    .calculate(input)
    .map((item) => item.value);
const expectWorkflowError = (fn, pattern) =>
  assert.throws(
    fn,
    (error) => error instanceof WorkflowError && pattern.test(error.message),
  );

void test('materials workflows expose all six legacy converter groups', () => {
  assert.deepEqual(
    materialsWorkflows.map((item) => item.group),
    ['mass', 'area', 'volume', 'power', 'capacitance', 'storage'],
  );
});

void test('mass calculates net mass and an unrounded estimated count', () => {
  assert.deepEqual(
    values('mass', { grosskg: '12.6', tarekg: '0.6', itemg: '45' }),
    [12, 266.6666666666667],
  );
  expectWorkflowError(
    () => values('mass', { grosskg: '0.5', tarekg: '0.6', itemg: '45' }),
    /皮重不可大於毛重/,
  );
  expectWorkflowError(
    () => values('mass', { grosskg: '', tarekg: '0', itemg: '1' }),
    /毛重/,
  );
});

void test('area calculates material area and a ceiling sheet lower bound', () => {
  const result = values('area', {
    lengthmm: '1200',
    widthmm: '600',
    quantity: '10',
    allowancepct: '10',
    sheetm2: '1.22',
  });
  assert.equal(result[0], 7.2);
  assert.ok(Math.abs(result[1] - 7.92) < 1e-12);
  assert.equal(result[2], 7);
  expectWorkflowError(
    () =>
      values('area', {
        lengthmm: '1',
        widthmm: '1',
        quantity: '0',
        allowancepct: '0',
        sheetm2: '1',
      }),
    /件數必須大於 0/,
  );
  expectWorkflowError(
    () =>
      values('area', {
        lengthmm: '1e308',
        widthmm: '1e308',
        quantity: '1',
        allowancepct: '0',
        sheetm2: '1',
      }),
    /結果超出可表示範圍/,
  );
});

void test('volume handles a rectangular tank and rejects overfill', () => {
  assert.deepEqual(
    values('volume', {
      lengthcm: '120',
      widthcm: '50',
      heightcm: '80',
      fillheightcm: '65',
    }),
    [480, 390, 90, 81.25],
  );
  expectWorkflowError(
    () =>
      values('volume', {
        lengthcm: '1',
        widthcm: '1',
        heightcm: '100',
        fillheightcm: '101',
      }),
    /液位高度不可高於槽內高度/,
  );
  expectWorkflowError(
    () =>
      values('volume', {
        lengthcm: '',
        widthcm: '1',
        heightcm: '1',
        fillheightcm: '0',
      }),
    /槽內長度/,
  );
});

void test('power uses torque and rpm while enforcing realistic efficiency bounds', () => {
  const result = values('power', {
    torquenm: '10',
    rpm: '1450',
    efficiencypct: '90',
  });
  assert.ok(Math.abs(result[0] - 1518.43644923507) < 1e-9);
  assert.ok(Math.abs(result[3] - 1687.1516102611852) < 1e-9);
  assert.ok(Math.abs(result[4] - 168.715161026119) < 1e-9);
  expectWorkflowError(
    () => values('power', { torquenm: '1', rpm: '1', efficiencypct: '101' }),
    /效率不可大於 100/,
  );
  expectWorkflowError(
    () => values('power', { torquenm: '1', rpm: '1', efficiencypct: '0' }),
    /效率必須大於 0/,
  );
});

void test('capacitance tolerance includes exact limits without claiming a good part', () => {
  const inside = values('capacitance', {
    nominalnf: '100',
    tolerancepct: '10',
    measurednf: '90',
  });
  assert.equal(inside[0], 90);
  assert.ok(Math.abs(inside[1] - 110) < 1e-12);
  assert.deepEqual(inside[2], { zh: '是（含邊界）', en: 'Yes (inclusive)' });
  assert.deepEqual(
    values('capacitance', {
      nominalnf: '100',
      tolerancepct: '10',
      measurednf: '110.0001',
    })[2],
    { zh: '否', en: 'No' },
  );
  expectWorkflowError(
    () =>
      values('capacitance', {
        nominalnf: '',
        tolerancepct: '10',
        measurednf: '100',
      }),
    /額定電容量/,
  );
});

void test('storage distinguishes decimal bits from bytes and applies useful throughput', () => {
  const result = values('storage', {
    filevalue: '10',
    fileunit: 'GB',
    transfervalue: '100',
    transferunit: 'Mbps',
    usefulpct: '80',
  });
  assert.equal(result[0], 10_000_000_000);
  assert.equal(result[1], 800);
  assert.equal(result[2], 1000);
  assert.deepEqual(result[3], { zh: '16 分 40 秒', en: '16 min 40 s' });
  const binary = values('storage', {
    filevalue: '1',
    fileunit: 'GiB',
    transfervalue: '100',
    transferunit: 'MiBps',
    usefulpct: '100',
  });
  assert.equal(binary[1], 10.24);
  assert.equal(binary[2], 10.24);
  expectWorkflowError(
    () =>
      values('storage', {
        filevalue: '1',
        fileunit: 'GB',
        transfervalue: '1',
        transferunit: 'Mbps',
        usefulpct: '101',
      }),
    /有效吞吐率不可大於 100/,
  );
  expectWorkflowError(
    () =>
      values('storage', {
        filevalue: '1e308',
        fileunit: 'GB',
        transfervalue: '1',
        transferunit: 'Mbps',
        usefulpct: '100',
      }),
    /結果超出可表示範圍/,
  );
});
