import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  defaultPasswordOptions,
  generatePassword,
  randomIndex,
  validatePasswordOptions,
  passwordCharacters,
  similarCharacters,
} from '../lib/tools/password-generator.ts';
import { passwordWords } from '../lib/tools/password-words.ts';

const zero = (values) => values.fill(0);
const sequence = (...values) => {
  let index = 0;
  return (buffer) => {
    buffer[0] = values[index++ % values.length];
  };
};
await test('password random index rejects modulo tail, keeps zero and upper endpoints', () => {
  assert.equal(randomIndex(10, sequence(0xffffffff, 9)), 9);
  assert.equal(randomIndex(10, zero), 0);
  assert.equal(randomIndex(0x100000000, sequence(0xffffffff)), 0xffffffff);
  assert.throws(() => randomIndex(10, sequence(0xffffffff)), /亂數來源/);
  for (const size of [0, -1, 1.5, NaN, Infinity, 0x100000001])
    assert.throws(() => randomIndex(size, zero));
  assert.throws(
    () =>
      randomIndex(10, () => {
        throw new Error('unavailable');
      }),
    /unavailable/,
  );
});
await test('password validation rejects empty, fractional and out of range settings', () => {
  for (const length of [0, 3, 129, 4.5, NaN, Infinity])
    assert.throws(() =>
      generatePassword({ ...defaultPasswordOptions, length }, zero),
    );
  for (const length of [0, 3, 33, 6.1, NaN])
    assert.throws(() => generatePassword({ mode: 'pin', length }, zero));
  for (const count of [0, 3, 11, 6.1, NaN])
    assert.throws(() =>
      generatePassword({ mode: 'words', count, separator: '-' }, zero),
    );
  assert.throws(() =>
    validatePasswordOptions({ mode: 'words', count: 6, separator: '' }),
  );
  assert.throws(() => validatePasswordOptions({ mode: 'other' }));
  assert.throws(
    () =>
      generatePassword(
        {
          ...defaultPasswordOptions,
          uppercase: false,
          lowercase: false,
          digits: false,
          symbols: false,
        },
        zero,
      ),
    /至少/,
  );
});
await test('random passwords cover all 15 category combinations and both length bounds', () => {
  const keys = Object.keys(passwordCharacters);
  for (let mask = 1; mask < 16; mask++) {
    for (const length of [4, 20, 128]) {
      const options = { ...defaultPasswordOptions, length };
      keys.forEach((key, i) => {
        options[key] = Boolean(mask & (1 << i));
      });
      const value = generatePassword(options);
      assert.equal(value.length, length);
      const alphabet = keys
        .filter((key) => options[key])
        .map((key) => passwordCharacters[key])
        .join('');
      assert.ok(value.split('').every((char) => alphabet.includes(char)));
      for (const key of keys.filter((key) => options[key]))
        assert.ok(
          value
            .split('')
            .some((char) => passwordCharacters[key].includes(char)),
        );
    }
  }
});
await test('whole-password rejection discards candidates missing categories without fixed positions', () => {
  const options = {
    ...defaultPasswordOptions,
    length: 4,
    digits: false,
    symbols: false,
  };
  assert.equal(
    generatePassword(options, sequence(0, 0, 0, 0, 26, 0, 0, 0)),
    'aAAA',
  );
  assert.equal(generatePassword(options, sequence(0, 0, 0, 26)), 'AAAa');
  assert.throws(() => generatePassword(options, zero), /無法依目前/);
});
await test('similar characters are excluded while selected categories remain present', () => {
  for (let i = 0; i < 20; i++) {
    const value = generatePassword({
      ...defaultPasswordOptions,
      length: 128,
      excludeSimilar: true,
    });
    assert.ok(
      value.split('').every((char) => !similarCharacters.includes(char)),
    );
    for (const group of Object.values(passwordCharacters))
      assert.ok(value.split('').some((char) => group.includes(char)));
  }
});
await test('PIN retains leading zeros and word list retains all official unique entries', () => {
  assert.equal(generatePassword({ mode: 'pin', length: 4 }, zero), '0000');
  assert.equal(
    generatePassword({ mode: 'pin', length: 32 }, sequence(9)).length,
    32,
  );
  assert.equal(passwordWords.length, 1296);
  assert.equal(new Set(passwordWords).size, 1296);
  assert.equal(passwordWords[0], 'acid');
  assert.equal(passwordWords.at(-1), 'zoom');
  assert.ok(passwordWords.includes('yo-yo'));
  for (const separator of ['-', ' ', '.']) {
    assert.equal(
      generatePassword(
        { mode: 'words', count: 4, separator },
        sequence(0, 1295),
      ),
      ['acid', 'zoom', 'acid', 'zoom'].join(separator),
    );
    assert.equal(
      generatePassword({ mode: 'words', count: 10, separator }, zero),
      Array(10).fill('acid').join(separator),
    );
  }
});
