// Standalone synthetic application-array mapping, not PLC device addresses.
import assert from 'node:assert/strict';
function mapModuleB(raw, start) {
  if (
    !Array.isArray(raw) ||
    raw.length !== 6 ||
    raw.some((value) => !Number.isFinite(value))
  )
    throw new TypeError('Exactly six finite values required');
  if (!Number.isSafeInteger(start) || start < 0 || start + 2 > raw.length)
    throw new RangeError('Mapping exceeds array');
  return { ch1: raw[start], ch2: raw[start + 1] };
}
const snapshots = [
  {
    seq: 17,
    raw: [101, 202, 303, 404, 505, 606],
    expected: { ch1: 505, ch2: 606 },
  },
  {
    seq: 18,
    raw: [111, 222, 333, 444, 555, 666],
    expected: { ch1: 555, ch2: 666 },
  },
];
for (const snapshot of snapshots) {
  const before = [...snapshot.raw];
  const wrong = mapModuleB(snapshot.raw, 2);
  const corrected = mapModuleB(snapshot.raw, 4);
  assert.notDeepEqual(wrong, snapshot.expected);
  assert.deepEqual(corrected, snapshot.expected);
  assert.deepEqual(snapshot.raw, before);
  console.log(
    JSON.stringify({ seq: snapshot.seq, raw: snapshot.raw, wrong, corrected }),
  );
}
assert.throws(() => mapModuleB([101, 202], 4), TypeError);
assert.throws(() => mapModuleB(snapshots[0].raw, 5), RangeError);
console.log(
  'PASS: wrong start reproduced; corrected mapping verified for 2 snapshots; invalid lengths rejected',
);
