import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import {
  analyzeWindow,
  DAY_MS,
  rawChangeSimpleMean,
} from '../public/examples/trend-window/model.mjs';
import {
  rawChanges,
  rawSeed,
  segments,
  tenEnd,
  tenStart,
} from '../public/examples/trend-window/fixtures.mjs';
void test('fixed weighted windows and separate raw-change mean are reproducible', () => {
  const ten = analyzeWindow({
    segments,
    windowStartMs: tenStart,
    windowEndMs: tenEnd,
  });
  const day = analyzeWindow({
    segments,
    windowStartMs: 0,
    windowEndMs: DAY_MS,
  });
  assert.deepEqual(
    [
      ten.fullWindowMeanC,
      day.fullWindowMeanC,
      day.maxC,
      rawChangeSimpleMean({ seed: rawSeed, changes: rawChanges }),
    ],
    [61.5, 60.010416666666664, 75, 67.5],
  );
});
void test('Bad or missing durations produce coverage and known mean without inventing a full mean', () => {
  const missing = structuredClone(segments);
  missing[1].quality = 'Bad';
  const result = analyzeWindow({
    segments: missing,
    windowStartMs: tenStart,
    windowEndMs: tenEnd,
  });
  assert.deepEqual(
    [
      result.knownDuration,
      result.coverage,
      result.fullWindowMeanC,
      result.knownMeanC,
    ],
    [540000, 0.9, null, 60],
  );
});
void test('segments require strict shapes, no overlap, and bounded times', () => {
  assert.throws(
    () =>
      analyzeWindow({
        segments: [
          {
            startMs: 0,
            endMs: 1,
            valueTenths: 1,
            quality: 'Good',
            extra: true,
          },
        ],
        windowStartMs: 0,
        windowEndMs: 1,
      }),
    /segment shape/,
  );
  const overlap = structuredClone(segments);
  overlap[1].startMs = overlap[0].startMs;
  assert.throws(
    () =>
      analyzeWindow({
        segments: overlap,
        windowStartMs: 0,
        windowEndMs: tenEnd,
      }),
    /overlap/,
  );
});
void test('raw change seed and points use the same bounded tenths domain', () => {
  assert.throws(
    () =>
      rawChangeSimpleMean({
        seed: { atMs: 0, valueTenths: Number.MAX_SAFE_INTEGER },
        changes: [{ atMs: 1, valueTenths: 600 }],
      }),
    /raw change input invalid/,
  );
  assert.throws(
    () =>
      rawChangeSimpleMean({
        seed: { atMs: 0, valueTenths: 600 },
        changes: [{ atMs: 1, valueTenths: -1000001 }],
      }),
    /raw change input invalid/,
  );
});
void test('downloadable demo and practice execute', () => {
  assert.match(
    execFileSync(
      process.execPath,
      ['public/examples/trend-window/self-test.mjs'],
      { encoding: 'utf8' },
    ),
    /self-test: PASS/,
  );
  assert.match(
    execFileSync(
      process.execPath,
      ['public/examples/trend-window/practice.mjs'],
      { encoding: 'utf8' },
    ),
    /"fullWindowMeanC":60.75/,
  );
});
