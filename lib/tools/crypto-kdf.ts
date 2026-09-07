import CryptoJS from 'crypto-js';
import { passwordBytes, utf8Bytes } from './crypto-bytes.ts';
import type { KdfJob } from './crypto-options.ts';

export function saltBytes(
  salt: string,
  format: KdfJob['saltFormat'],
): Uint8Array<ArrayBuffer> {
  if (format === 'text') return utf8Bytes(salt, '鹽值', 1024);
  if (format !== 'hex') throw new Error('不支援的鹽值格式。');
  if (salt.length > 6144) throw new Error('鹽值超過 1,024 bytes。');
  const value = salt.replace(/[\t\r\n ]/g, '');
  if (!/^(?:[\da-fA-F]{2})*$/.test(value))
    throw new Error('鹽值 HEX 必須是完整的兩位數位元組。');
  if (value.length > 2048) throw new Error('鹽值超過 1,024 bytes。');
  return Uint8Array.from(value.match(/../g) ?? [], (byte) =>
    parseInt(byte, 16),
  );
}
function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}
export async function deriveKdf(job: KdfJob): Promise<string> {
  if (job.algorithm !== 'pbkdf2' && job.algorithm !== 'evpkdf')
    throw new Error('不支援的密鑰派生算法。');
  const max = job.algorithm === 'pbkdf2' ? 2000000 : 100000;
  if (
    !Number.isInteger(job.iterations) ||
    job.iterations < 1 ||
    job.iterations > max
  )
    throw new Error(`迭代次數必須是 1～${max.toLocaleString()} 的整數。`);
  if (![128, 192, 256, 384, 512].includes(job.bits))
    throw new Error('請選擇有效的輸出長度。');
  const hashes = {
    sha1: CryptoJS.algo.SHA1,
    sha256: CryptoJS.algo.SHA256,
    sha384: CryptoJS.algo.SHA384,
    sha512: CryptoJS.algo.SHA512,
    md5: CryptoJS.algo.MD5,
  };
  if (
    !Object.hasOwn(hashes, job.hash) ||
    (job.algorithm === 'pbkdf2' && job.hash === 'md5')
  )
    throw new Error('不支援的派生雜湊算法。');
  const password = passwordBytes(job.password);
  const salt = saltBytes(job.salt, job.saltFormat);
  if (job.algorithm === 'evpkdf') {
    return CryptoJS.EvpKDF(
      CryptoJS.enc.Hex.parse(hex(password)),
      CryptoJS.enc.Hex.parse(hex(salt)),
      {
        keySize: job.bits / 32,
        iterations: job.iterations,
        hasher: hashes[job.hash],
      },
    ).toString(CryptoJS.enc.Hex);
  }
  const nativeHashes = {
    sha1: 'SHA-1',
    sha256: 'SHA-256',
    sha384: 'SHA-384',
    sha512: 'SHA-512',
  };
  if (job.hash === 'md5') throw new Error('PBKDF2 不支援 MD5。');
  const subtle = globalThis.crypto?.subtle;
  if (!subtle)
    throw new Error(
      '此瀏覽器無法使用 Web Crypto；請以 HTTPS 開啟並使用支援的瀏覽器。',
    );
  const key = await subtle.importKey('raw', password, 'PBKDF2', false, [
    'deriveBits',
  ]);
  const result = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: nativeHashes[job.hash],
      salt,
      iterations: job.iterations,
    },
    key,
    job.bits,
  );
  return hex(new Uint8Array(result));
}
