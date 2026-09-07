import CryptoJS from 'crypto-js';
import { hmac as nobleHmac } from '@noble/hashes/hmac.js';
import {
  keccak_224,
  keccak_256,
  keccak_384,
  keccak_512,
  sha3_224,
  sha3_256,
  sha3_384,
  sha3_512,
} from '@noble/hashes/sha3.js';
import { passwordBytes, utf8Bytes } from './crypto-bytes.ts';
import type { HashAlgorithm } from './crypto-options.ts';

type HashFunction = (message: CryptoJS.lib.WordArray) => CryptoJS.lib.WordArray;
type HmacFunction = (
  message: CryptoJS.lib.WordArray,
  key: CryptoJS.lib.WordArray,
) => CryptoJS.lib.WordArray;

function wordArray(value: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let index = 0; index < value.length; index += 1)
    words[index >>> 2] =
      (words[index >>> 2] ?? 0) | (value[index] << (24 - (index % 4) * 8));
  return CryptoJS.lib.WordArray.create(words, value.length);
}

const hashFunctions: Record<
  Exclude<HashAlgorithm, `sha3-${number}` | `keccak-${number}`>,
  { hash: HashFunction; hmac: HmacFunction }
> = {
  sha256: { hash: CryptoJS.SHA256, hmac: CryptoJS.HmacSHA256 },
  sha384: { hash: CryptoJS.SHA384, hmac: CryptoJS.HmacSHA384 },
  sha512: { hash: CryptoJS.SHA512, hmac: CryptoJS.HmacSHA512 },
  sha224: { hash: CryptoJS.SHA224, hmac: CryptoJS.HmacSHA224 },
  sha1: { hash: CryptoJS.SHA1, hmac: CryptoJS.HmacSHA1 },
  md5: { hash: CryptoJS.MD5, hmac: CryptoJS.HmacMD5 },
  ripemd160: { hash: CryptoJS.RIPEMD160, hmac: CryptoJS.HmacRIPEMD160 },
};

const nobleHashFunctions = {
  'sha3-224': sha3_224,
  'sha3-256': sha3_256,
  'sha3-384': sha3_384,
  'sha3-512': sha3_512,
  'keccak-224': keccak_224,
  'keccak-256': keccak_256,
  'keccak-384': keccak_384,
  'keccak-512': keccak_512,
} as const;

function hex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

export function calculateHash(
  algorithm: HashAlgorithm,
  text: string,
  hmac: boolean,
  key: string,
): string {
  if (Object.hasOwn(nobleHashFunctions, algorithm)) {
    const selected =
      nobleHashFunctions[algorithm as keyof typeof nobleHashFunctions];
    const message = utf8Bytes(text);
    if (!hmac) return hex(selected(message));
    return hex(nobleHmac(selected, passwordBytes(key), message));
  }
  if (Object.hasOwn(hashFunctions, algorithm)) {
    const selected = hashFunctions[algorithm as keyof typeof hashFunctions];
    const message = wordArray(utf8Bytes(text));
    if (!hmac)
      return selected.hash(message).toString(CryptoJS.enc.Hex).toLowerCase();
    const secret = wordArray(passwordBytes(key));
    return selected
      .hmac(message, secret)
      .toString(CryptoJS.enc.Hex)
      .toLowerCase();
  }
  throw new Error('不支援的雜湊演算法。');
}
