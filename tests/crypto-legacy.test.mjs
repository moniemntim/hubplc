import assert from 'node:assert/strict';
import { createDecipheriv, createHash } from 'node:crypto';
import test from 'node:test';
import CryptoJS from 'crypto-js';
import { legacyCipher } from '../lib/tools/crypto-legacy.ts';

const password = 'compatibility password';
const plaintext = '\ufeff第一行\r\nsecond line 🔐';
const aesFixture =
  'U2FsdGVkX18AAQIDBAUGB28FRHIwhoVBj6ZhFibcERWZp66c09xr7lrAR+e+7ZSx';

await test('all legacy wrappers accept CryptoJS passphrase-helper output', () => {
  const helpers = {
    aes: CryptoJS.AES,
    des: CryptoJS.DES,
    tripledes: CryptoJS.TripleDES,
    rc4: CryptoJS.RC4,
    rc4drop: CryptoJS.RC4Drop,
    rabbit: CryptoJS.Rabbit,
    rabbitlegacy: CryptoJS.RabbitLegacy,
  };
  for (const [algorithm, helper] of Object.entries(helpers)) {
    const salt = CryptoJS.enc.Hex.parse('0001020304050607');
    const encrypted = helper
      .encrypt(plaintext, password, { salt, drop: 192 })
      .toString();
    assert.equal(
      legacyCipher(algorithm, 'decrypt', encrypted, password, 192),
      plaintext,
      algorithm,
    );
    const generated = legacyCipher(
      algorithm,
      'encrypt',
      plaintext,
      password,
      192,
    );
    assert.equal(
      helper
        .decrypt(generated, password, { drop: 192 })
        .toString(CryptoJS.enc.Utf8),
      plaintext,
      algorithm,
    );
  }
});

function evpBytesToKey(secret, salt, length) {
  let material = Buffer.alloc(0);
  let previous = Buffer.alloc(0);
  while (material.length < length) {
    previous = createHash('md5')
      .update(Buffer.concat([previous, Buffer.from(secret), salt]))
      .digest();
    material = Buffer.concat([material, previous]);
  }
  return material;
}

await test('decrypts a fixed CryptoJS/OpenSSL AES passphrase fixture', () => {
  assert.equal(legacyCipher('aes', 'decrypt', aesFixture, password), plaintext);
});

await test('AES output is independently readable with Node OpenSSL-compatible MD5 derivation', () => {
  const encrypted = legacyCipher('aes', 'encrypt', plaintext, password);
  const envelope = Buffer.from(encrypted, 'base64');
  assert.equal(envelope.subarray(0, 8).toString('ascii'), 'Salted__');
  const material = evpBytesToKey(password, envelope.subarray(8, 16), 48);
  const decipher = createDecipheriv(
    'aes-256-cbc',
    material.subarray(0, 32),
    material.subarray(32, 48),
  );
  const recovered = Buffer.concat([
    decipher.update(envelope.subarray(16)),
    decipher.final(),
  ]).toString('utf8');
  assert.equal(recovered, plaintext);
});

await test('all legacy algorithms round trip Unicode, CRLF, and a leading BOM', () => {
  for (const algorithm of [
    'aes',
    'tripledes',
    'des',
    'rc4',
    'rc4drop',
    'rabbit',
    'rabbitlegacy',
  ]) {
    const encrypted = legacyCipher(
      algorithm,
      'encrypt',
      plaintext,
      password,
      7,
    );
    assert.equal(
      legacyCipher(algorithm, 'decrypt', encrypted, password, 7),
      plaintext,
      algorithm,
    );
    assert.match(encrypted, /^[A-Za-z0-9+/]+={0,2}$/);
  }
});

await test('rejects malformed envelopes, missing salt, invalid padding, and CBC wrong passwords', () => {
  assert.throws(
    () => legacyCipher('aes', 'decrypt', '%%%%', password),
    /Base64/,
  );
  assert.throws(
    () =>
      legacyCipher(
        'aes',
        'decrypt',
        Buffer.from('Salted__').toString('base64'),
        password,
      ),
    /Salted__|格式/,
  );
  const broken = Buffer.from(aesFixture, 'base64');
  broken[broken.length - 1] = 0;
  assert.throws(
    () => legacyCipher('aes', 'decrypt', broken.toString('base64'), password),
    /填充/,
  );
  assert.throws(
    () => legacyCipher('aes', 'decrypt', aesFixture, 'incorrect password'),
    /填充|UTF-8/,
  );
});

await test('validates legacy inputs and keeps RC4Drop bounds isolated', () => {
  assert.throws(() => legacyCipher('aes', 'encrypt', '', password), /加密/);
  assert.throws(
    () => legacyCipher('aes', 'encrypt', '\ud800', password),
    /Unicode/,
  );
  assert.throws(
    () => legacyCipher('rc4drop', 'encrypt', 'x', password, 1.5),
    /RC4Drop/,
  );
  assert.throws(
    () => legacyCipher('rc4drop', 'encrypt', 'x', password, 4097),
    /RC4Drop/,
  );
  assert.doesNotThrow(() =>
    legacyCipher('rc4', 'encrypt', 'x', password, Number.NaN),
  );
  assert.throws(
    () => legacyCipher('unknown', 'encrypt', 'x', password),
    /不支援/,
  );
  assert.throws(() => legacyCipher('aes', 'sideways', 'x', password), /方向/);
});
