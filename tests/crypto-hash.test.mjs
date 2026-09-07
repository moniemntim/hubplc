import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import test from 'node:test';
import CryptoJS from 'crypto-js';
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
const sha3Algorithms = ['sha3-224', 'sha3-256', 'sha3-384', 'sha3-512'];
const keccakAlgorithms = [
  'keccak-224',
  'keccak-256',
  'keccak-384',
  'keccak-512',
];

function cryptoJsKeccak(message, outputLength) {
  return CryptoJS.algo.SHA3.create({ outputLength })
    .finalize(message)
    .toString(CryptoJS.enc.Hex);
}

function cryptoJsKeccakHmac(message, secret, outputLength) {
  const hasher = CryptoJS.algo.SHA3.extend({
    cfg: CryptoJS.algo.SHA3.cfg.extend({ outputLength }),
  });
  return CryptoJS.algo.HMAC.create(hasher, secret)
    .finalize(message)
    .toString(CryptoJS.enc.Hex);
}

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

await test('matches Node SHA-3 hashes and HMACs at every output length', () => {
  for (const algorithm of sha3Algorithms) {
    assert.equal(
      calculateHash(algorithm, message, false, ''),
      createHash(algorithm).update(message, 'utf8').digest('hex'),
      algorithm,
    );
    assert.equal(
      calculateHash(algorithm, message, true, key),
      createHmac(algorithm, key).update(message, 'utf8').digest('hex'),
      `${algorithm} HMAC`,
    );
  }
});

await test('matches CryptoJS Keccak SHA3 configuration at every output length', () => {
  for (const algorithm of keccakAlgorithms) {
    const outputLength = Number(algorithm.slice('keccak-'.length));
    assert.equal(
      calculateHash(algorithm, message, false, ''),
      cryptoJsKeccak(message, outputLength),
      algorithm,
    );
    assert.equal(
      calculateHash(algorithm, message, true, key),
      cryptoJsKeccakHmac(message, key, outputLength),
      `${algorithm} HMAC`,
    );
  }
  assert.equal(
    calculateHash('keccak-256', '', false, ''),
    'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
  );
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
  for (const algorithm of [...sha3Algorithms, ...keccakAlgorithms]) {
    assert.equal(typeof calculateHash(algorithm, '', false, ''), 'string');
    assert.throws(
      () => calculateHash(algorithm, '\ud800', false, ''),
      /Unicode/,
      algorithm,
    );
  }
});
