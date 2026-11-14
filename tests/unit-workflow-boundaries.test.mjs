import assert from 'node:assert/strict';
import test from 'node:test';
import { unitWorkflows } from '../lib/tools/unit-workflows/index.ts';
import { WorkflowError } from '../lib/tools/unit-workflows/shared.ts';
import { engineeringApplicationGuides } from '../lib/tools/tool-guides/unit-applications-engineering.ts';
import { materialsApplicationGuides } from '../lib/tools/tool-guides/unit-applications-materials.ts';
const values = (group, input) =>
  unitWorkflows
    .find((item) => item.group === group)
    .calculate(input)
    .map((row) => row.value);
void test('whole sheets and cycles use decimal business quantities without an extra or missing unit', () => {
  assert.equal(
    values('area', {
      lengthmm: '1200',
      widthmm: '600',
      quantity: '10',
      allowancepct: '10',
      sheetm2: '2.64',
    })[2],
    3,
  );
  assert.equal(
    values('time', {
      processSeconds: '0.1',
      transferSeconds: '0.2',
      shiftHours: '0.001',
      breakMinutes: '0',
    })[2],
    12,
  );
});
void test('application calculators reject silent underflow and imprecise enormous counts or durations', () => {
  assert.throws(
    () =>
      values('area', {
        lengthmm: '1e-200',
        widthmm: '1e-200',
        quantity: '1',
        allowancepct: '0',
        sheetm2: '1',
      }),
    /過小/,
  );
  assert.throws(
    () =>
      values('area', {
        lengthmm: '1e150',
        widthmm: '1e150',
        quantity: '1',
        allowancepct: '0',
        sheetm2: '1',
      }),
    /安全整數/,
  );
  assert.throws(
    () =>
      values('time', {
        processSeconds: '0.000001',
        transferSeconds: '0',
        shiftHours: '10000000',
        breakMinutes: '0',
      }),
    /安全整數/,
  );
  assert.throws(
    () =>
      values('storage', {
        filevalue: '1e20',
        fileunit: 'GB',
        transfervalue: '1',
        transferunit: 'Mbps',
        usefulpct: '100',
      }),
    /整數秒/,
  );
});
void test('capacitance keeps decimal tolerance boundaries inclusive without accepting a real out-of-range value', () => {
  assert.equal(
    values('capacitance', {
      nominalnf: '100.3',
      tolerancepct: '0.1',
      measurednf: '100.4003',
    })[2].en,
    'Yes (inclusive)',
  );
  assert.equal(
    values('capacitance', {
      nominalnf: '100.3',
      tolerancepct: '0.1',
      measurednf: '100.4003001',
    })[2].en,
    'No',
  );
  assert.throws(
    () =>
      values('capacitance', {
        nominalnf: '100',
        tolerancepct: '101',
        measurednf: '100',
      }),
    /100%/,
  );
});
void test('all twelve application tasks have distinct fields, bilingual results, source references and empty-input handling', () => {
  assert.equal(unitWorkflows.length, 12);
  assert.equal(new Set(unitWorkflows.map((task) => task.group)).size, 12);
  for (const task of unitWorkflows) {
    const input = Object.fromEntries(
      task.fields.map((field) => [field.key, field.defaultValue]),
    );
    const rows = task.calculate(input);
    assert.ok(rows.length >= 2, task.group);
    assert.ok(task.sources.length > 0, task.group);
    for (const row of rows) {
      assert.ok(row.label.zh && row.label.en);
      if (typeof row.value === 'number')
        assert.ok(Number.isFinite(row.value), task.group);
    }
    const field = task.fields.find((field) => !field.options);
    assert.throws(
      () => task.calculate({ ...input, [field.key]: '' }),
      WorkflowError,
      task.group,
    );
  }
});
void test('all twenty-four application cases independently name every actual input field in both languages', () => {
  const guides = {
    ...engineeringApplicationGuides,
    ...materialsApplicationGuides,
  };
  assert.equal(Object.keys(guides).length, 12);
  for (const task of unitWorkflows) {
    const guide = guides[`${task.group}-converter`];
    assert.equal(guide.cases.length, 2, task.group);
    for (const example of guide.cases) {
      for (const language of ['zh', 'en']) {
        assert.deepEqual(
          example.inputs
            .map((input) => input.label[language])
            .sort((a, b) => a.localeCompare(b)),
          task.fields
            .map((field) => field.label[language])
            .sort((a, b) => a.localeCompare(b)),
          `${task.group}: ${example.title.en} ${language} fields`,
        );
      }
    }
  }
});
