import assert from 'node:assert/strict';
import { createHash, pbkdf2Sync } from 'node:crypto';
import test from 'node:test';
import { deriveKdf, saltBytes } from '../lib/tools/crypto-kdf.ts';

const base = {
  kind: 'kdf',
  algorithm: 'pbkdf2',
  password: 'password',
  salt: 'salt',
  saltFormat: 'text',
  hash: 'sha256',
  iterations: 1,
  bits: 256,
};
await test('PBKDF2 reports unavailable Web Crypto without a raw runtime error', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true,
    });
    await assert.rejects(deriveKdf(base), /HTTPS/);
  } finally {
    Object.defineProperty(globalThis, 'crypto', descriptor);
  }
});
function evp(password, salt, hash, iterations, length) {
  let block = Buffer.alloc(0),
    result = Buffer.alloc(0);
  while (result.length < length) {
    block = createHash(hash)
      .update(block)
      .update(password, 'utf8')
      .update(salt)
      .digest();
    for (let i = 1; i < iterations; i++)
      block = createHash(hash).update(block).digest();
    result = Buffer.concat([result, block]);
  }
  return result.subarray(0, length).toString('hex');
}
await test('PBKDF2 native matches Node across digests, iterations, lengths and Unicode', async () => {
  for (const hash of ['sha1', 'sha256', 'sha384', 'sha512']) {
    for (const bits of [128, 192, 256, 384, 512]) {
      const job = {
        ...base,
        hash,
        bits,
        iterations: 13,
        password: '\ufeff密碼 🔑\r\n ',
        salt: '鹽值\n ',
      };
      assert.equal(
        await deriveKdf(job),
        pbkdf2Sync(
          job.password,
          job.salt,
          job.iterations,
          bits / 8,
          hash,
        ).toString('hex'),
      );
    }
  }
  assert.equal(
    await deriveKdf(base),
    '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b',
  );
});
await test('EvpKDF independently matches EVP recurrence including output spanning blocks', async () => {
  for (const hash of ['md5', 'sha1', 'sha256', 'sha384', 'sha512']) {
    for (const iterations of [1, 3]) {
      for (const bits of [128, 192, 256, 384, 512]) {
        const job = {
          ...base,
          algorithm: 'evpkdf',
          hash,
          iterations,
          bits,
          password: '密碼\r\n',
          salt: '0001020304050607',
          saltFormat: 'hex',
        };
        assert.equal(
          await deriveKdf(job),
          evp(
            job.password,
            Buffer.from(job.salt, 'hex'),
            hash,
            iterations,
            bits / 8,
          ),
        );
      }
    }
  }
});
await test('salt byte representations and empty compatibility salt are explicit', async () => {
  assert.equal(
    await deriveKdf(base),
    await deriveKdf({ ...base, salt: '73 61\n6c 74', saltFormat: 'hex' }),
  );
  for (const algorithm of ['pbkdf2', 'evpkdf']) {
    const job = { ...base, algorithm, salt: '' };
    const expected =
      algorithm === 'pbkdf2'
        ? pbkdf2Sync(base.password, '', 1, 32, 'sha256').toString('hex')
        : evp(base.password, Buffer.alloc(0), 'sha256', 1, 32);
    assert.equal(await deriveKdf(job), expected);
  }
  assert.equal(saltBytes('a'.repeat(1024), 'text').length, 1024);
  assert.equal(saltBytes('ff'.repeat(1024), 'hex').length, 1024);
  assert.throws(() => saltBytes('fff', 'hex'), /HEX/);
  assert.throws(() => saltBytes('gg', 'hex'), /HEX/);
  assert.throws(() => saltBytes('\ud800', 'text'), /Unicode/);
  assert.throws(() => saltBytes('中'.repeat(400), 'text'), /上限/);
  assert.throws(() => saltBytes('ff'.repeat(1025), 'hex'), /1,024/);
});
await test('KDF rejects malformed, excessive and unsupported parameters before work', async () => {
  for (const iterations of [0, -1, 1.5, NaN, Infinity, 2000001])
    await assert.rejects(deriveKdf({ ...base, iterations }), /迭代/);
  await assert.rejects(
    deriveKdf({ ...base, algorithm: 'evpkdf', iterations: 100001 }),
    /迭代/,
  );
  for (const bits of [0, -128, 255, 1024, Infinity])
    await assert.rejects(deriveKdf({ ...base, bits }), /長度/);
  for (const password of ['', '\ud800', 'a'.repeat(1025)])
    await assert.rejects(deriveKdf({ ...base, password }));
  for (const hash of ['md5', '__proto__', 'invalid'])
    await assert.rejects(deriveKdf({ ...base, hash }), /算法/);
  await assert.rejects(deriveKdf({ ...base, algorithm: 'invalid' }), /算法/);
  await assert.rejects(deriveKdf({ ...base, saltFormat: 'invalid' }), /格式/);
});
