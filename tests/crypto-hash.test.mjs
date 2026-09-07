import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import test from 'node:test';
import { calculateHash } from '../lib/tools/crypto-hash.ts';

const message = '\ufeff雜湊\r\nmessage 🔐';
const key = 'HMAC key 🔑';
const algorithms = [
  'sha256',
  'sha384',
  'sha512',
  'sha224',
  'sha1',
  'md5',
  'ripemd160',
];

await test('matches Node hashes and HMACs for every supported algorithm', () => {
  for (const algorithm of algorithms) {
    const nodeAlgorithm = algorithm === 'ripemd160' ? 'ripemd160' : algorithm;
    assert.equal(
      calculateHash(algorithm, message, false, ''),
      createHash(nodeAlgorithm).update(message, 'utf8').digest('hex'),
      algorithm,
    );
    assert.equal(
      calculateHash(algorithm, message, true, key),
      createHmac(nodeAlgorithm, key).update(message, 'utf8').digest('hex'),
      `${algorithm} HMAC`,
    );
  }
});

await test('hashes empty text and enforces HMAC/key and Unicode input rules', () => {
  assert.equal(
    calculateHash('sha256', '', false, ''),
    createHash('sha256').digest('hex'),
  );
  assert.throws(
    () => calculateHash('sha256', 'message', true, ''),
    /密碼／金鑰/,
  );
  assert.throws(() => calculateHash('sha256', '\ud800', false, ''), /Unicode/);
  assert.throws(
    () => calculateHash('unsupported', 'message', false, ''),
    /不支援/,
  );
  assert.throws(
    () => calculateHash('__proto__', 'message', false, ''),
    /不支援/,
  );
});
