import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSampleProfiles,
  generateUniqueCodes,
} from '../lib/tools/sample-data.ts';

const sequence = (...values) => {
  let index = 0;
  return (maximum) => values[index++ % values.length] % maximum;
};

await test('unique codes have the requested prefix, length and deterministic uniqueness', () => {
  const codes = generateUniqueCodes(
    { prefix: 'LAB-', length: 2, count: 3, alphabet: 'digits' },
    sequence(0, 0, 0, 1, 0, 2),
  );
  assert.deepEqual(codes, ['LAB-00', 'LAB-01', 'LAB-02']);
  assert.equal(new Set(codes).size, 3);
  assert.throws(() =>
    generateUniqueCodes(
      { prefix: 'LAB-', length: 2, count: 101, alphabet: 'digits' },
      sequence(0),
    ),
  );
  assert.throws(() =>
    generateUniqueCodes(
      { prefix: 'bad space', length: 4, count: 1, alphabet: 'digits' },
      sequence(0),
    ),
  );
});

await test('bounded collisions and invalid random indexes cannot silently create duplicate codes', () => {
  assert.throws(() =>
    generateUniqueCodes(
      { prefix: '', length: 2, count: 2, alphabet: 'digits' },
      () => 0,
    ),
  );
  assert.throws(() =>
    generateUniqueCodes(
      { prefix: '', length: 2, count: 1, alphabet: 'digits' },
      () => 10,
    ),
  );
});

await test('sample profiles are explicitly test-labelled and use reserved email domains', () => {
  let value = 0;
  const profiles = generateSampleProfiles(2, (maximum) => value++ % maximum);
  assert.equal(profiles.length, 2);
  assert.equal(new Set(profiles.map((profile) => profile.id)).size, 2);
  assert.ok(profiles.every((profile) => profile.id.startsWith('TEST-')));
  assert.ok(
    profiles.every((profile) => profile.email.endsWith('@example.invalid')),
  );
  assert.ok(
    profiles.every((profile) =>
      /^(測試|範例|模擬|樣本).+號$/.test(profile.name),
    ),
  );
  assert.throws(() => generateSampleProfiles(0, sequence(0)));
});
