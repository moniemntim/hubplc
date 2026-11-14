import test from 'node:test';
import assert from 'node:assert/strict';
import {
  drawParticipants,
  makeGiftExchange,
  makeGroups,
  parseParticipants,
} from '../lib/tools/random-tasks.ts';
const sequence = (...values) => {
  let index = 0;
  return (max) => values[index++ % values.length] % max;
};
await test('draw validates names, weights, counts and non-repeat picks', () => {
  const entries = parseParticipants('A | 2\nB | 1', true);
  assert.deepEqual(
    drawParticipants(entries, 2, false, sequence(0, 0)).map((x) => x.name),
    ['A', 'B'],
  );
  assert.throws(() => parseParticipants('A\nA'));
  assert.throws(() => parseParticipants('A | 0', true));
  assert.throws(() => drawParticipants(entries, 3, false, sequence(0)));
});
await test('groups partition everyone exactly once and pair leftovers visibly', () => {
  const names = ['A', 'B', 'C', 'D', 'E'];
  const groups = makeGroups(names, 'count', 2, sequence(0));
  assert.deepEqual(groups.flat().sort(), names);
  assert.ok(Math.abs(groups[0].length - groups[1].length) <= 1);
  assert.deepEqual(
    makeGroups(names, 'pairs', 1, sequence(0)).map((x) => x.length),
    [2, 2, 1],
  );
  assert.deepEqual(
    makeGroups(names, 'size', 2, sequence(0)).map((x) => x.length),
    [2, 2, 1],
  );
});
await test('gift exchange is a single no-self give/receive cycle', () => {
  const names = ['A', 'B', 'C', 'D'];
  const pairs = makeGiftExchange(names, sequence(0));
  assert.equal(new Set(pairs.map((x) => x.giver)).size, names.length);
  assert.equal(new Set(pairs.map((x) => x.receiver)).size, names.length);
  assert.ok(pairs.every((x) => x.giver !== x.receiver));
  assert.throws(() => makeGiftExchange(['A', 'B'], sequence(0)));
});
