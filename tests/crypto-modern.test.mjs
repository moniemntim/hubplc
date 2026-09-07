import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCipheriv, createDecipheriv, pbkdf2Sync } from 'node:crypto';
import {
  encryptModern,
  decryptModern,
  CRYPTO_ITERATIONS,
  CRYPTO_PREFIX,
} from '../lib/tools/crypto-modern.ts';
import {
  fromBase64,
  toBase64,
  utf8Bytes,
  passwordBytes,
  decodeUtf8,
} from '../lib/tools/crypto-bytes.ts';
import { MAX_CRYPTO_BYTES } from '../lib/tools/crypto-options.ts';

await test('strict crypto bytes preserve Unicode and reject malformed input/oversize', () => {
  assert.equal(
    decodeUtf8(utf8Bytes('\ufeff中文😀\r\n  ')),
    '\ufeff中文😀\r\n  ',
  );
  assert.throws(() => utf8Bytes('\ud800'));
  assert.throws(() => utf8Bytes('a'.repeat(MAX_CRYPTO_BYTES + 1)));
  assert.throws(() => utf8Bytes('中'.repeat(Math.ceil(MAX_CRYPTO_BYTES / 3))));
  assert.throws(() => passwordBytes(''));
  assert.throws(() => passwordBytes('a'.repeat(1025)));
  for (const value of ['', 'AA', 'AA=', 'AA==!', 'AB==', '____', 'AAA==='])
    assert.throws(() => fromBase64(value));
  assert.equal(toBase64(fromBase64('AA==\r\n')), 'AA==');
  assert.equal(toBase64(Uint8Array.from([0, 255, 1])), 'AP8B');
});
await test('AES-GCM roundtrips Unicode, whitespace, BOM and uses fresh salt and IV', async () => {
  const message = '\ufeff中文 🔐\r\n line 2  ';
  const password = '  example password 中文  ';
  const first = await encryptModern(message, password);
  const second = await encryptModern(message, password);
  assert.notEqual(first, second);
  const a = fromBase64(first.slice(CRYPTO_PREFIX.length));
  const b = fromBase64(second.slice(CRYPTO_PREFIX.length));
  assert.notDeepEqual(a.slice(0, 16), b.slice(0, 16));
  assert.notDeepEqual(a.slice(16, 28), b.slice(16, 28));
  assert.equal(await decryptModern(first, password), message);
  assert.equal(await decryptModern(' \n' + second + '\r\n', password), message);
  await assert.rejects(decryptModern(first, password.trim()), /無法解密/);
});
await test('HPLC1 independently interoperates with Node crypto in both directions', async () => {
  const text = 'independent fixture 中文\r\n';
  const password = 'fixture only - not a user credential';
  const generated = await encryptModern(text, password);
  const bytes = Buffer.from(generated.slice(CRYPTO_PREFIX.length), 'base64');
  const key = pbkdf2Sync(
    password,
    bytes.subarray(0, 16),
    CRYPTO_ITERATIONS,
    32,
    'sha256',
  );
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(16, 28));
  decipher.setAAD(Buffer.from(CRYPTO_PREFIX));
  decipher.setAuthTag(bytes.subarray(-16));
  assert.equal(
    Buffer.concat([
      decipher.update(bytes.subarray(28, -16)),
      decipher.final(),
    ]).toString('utf8'),
    text,
  );
  const salt = Buffer.alloc(16, 7),
    iv = Buffer.alloc(12, 8);
  const cipher = createCipheriv(
    'aes-256-gcm',
    pbkdf2Sync(password, salt, CRYPTO_ITERATIONS, 32, 'sha256'),
    iv,
  );
  cipher.setAAD(Buffer.from(CRYPTO_PREFIX));
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  const fixture =
    CRYPTO_PREFIX +
    Buffer.concat([salt, iv, encrypted, cipher.getAuthTag()]).toString(
      'base64',
    );
  assert.equal(await decryptModern(fixture, password), text);
});
await test('GCM rejects wrong key, corrupt salt/IV/ciphertext/tag and invalid versions', async () => {
  const encrypted = await encryptModern('test input', 'fixture-password');
  await assert.rejects(decryptModern(encrypted, 'wrong-password'), /無法解密/);
  for (const offset of [0, 16, 28, -1]) {
    const bytes = fromBase64(encrypted.slice(CRYPTO_PREFIX.length));
    bytes[offset < 0 ? bytes.length - 1 : offset] ^= 1;
    await assert.rejects(
      decryptModern(CRYPTO_PREFIX + toBase64(bytes), 'fixture-password'),
      /無法解密/,
    );
  }
  for (const value of ['', 'HPLC2.AA==', 'HPLC1.AA==', 'U2FsdGVkX1=='])
    await assert.rejects(decryptModern(value, 'fixture-password'));
  await assert.rejects(encryptModern('', 'p'), /請輸入/);
  await assert.rejects(encryptModern('test', ''), /密碼/);
});
