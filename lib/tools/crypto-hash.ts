import CryptoJS from 'crypto-js';
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
  HashAlgorithm,
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

export function calculateHash(
  algorithm: HashAlgorithm,
  text: string,
  hmac: boolean,
  key: string,
): string {
  if (!Object.hasOwn(hashFunctions, algorithm))
    throw new Error('不支援的雜湊演算法。');
  const message = wordArray(utf8Bytes(text));
  const selected = hashFunctions[algorithm];
  if (!hmac)
    return selected.hash(message).toString(CryptoJS.enc.Hex).toLowerCase();
  const secret = wordArray(passwordBytes(key));
  return selected
    .hmac(message, secret)
    .toString(CryptoJS.enc.Hex)
    .toLowerCase();
}
