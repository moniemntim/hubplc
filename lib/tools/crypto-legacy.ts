import CryptoJS from 'crypto-js';
import {
  decodeUtf8,
  fromBase64,
  passwordBytes,
  toBase64,
  utf8Bytes,
} from './crypto-bytes.ts';
import {
  MAX_CRYPTO_BYTES,
  type CryptoDirection,
  type LegacyCipher,
} from './crypto-options.ts';

const saltedPrefix = Uint8Array.of(
  0x53,
  0x61,
  0x6c,
  0x74,
  0x65,
  0x64,
  0x5f,
  0x5f,
); // "Salted__"
const base64TextLimit = Math.ceil((MAX_CRYPTO_BYTES + 64) / 3) * 4 + 4096;
const legacyAlgorithms = new Set<LegacyCipher>([
  'aes',
  'tripledes',
  'des',
  'rc4',
  'rc4drop',
  'rabbit',
  'rabbitlegacy',
]);
const directions = new Set<CryptoDirection>(['encrypt', 'decrypt']);

type CipherStatic = {
  keySize: number;
  ivSize: number;
  createEncryptor: (
    key: CryptoJS.lib.WordArray,
    config?: object,
  ) => { finalize: (data?: CryptoJS.lib.WordArray) => CryptoJS.lib.WordArray };
  createDecryptor: (
    key: CryptoJS.lib.WordArray,
    config?: object,
  ) => { finalize: (data?: CryptoJS.lib.WordArray) => CryptoJS.lib.WordArray };
};

function wordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let index = 0; index < bytes.length; index += 1)
    words[index >>> 2] =
      (words[index >>> 2] ?? 0) | (bytes[index] << (24 - (index % 4) * 8));
  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

function bytes(
  wordArrayValue: CryptoJS.lib.WordArray,
): Uint8Array<ArrayBuffer> {
  const output = new Uint8Array(wordArrayValue.sigBytes);
  for (let index = 0; index < output.length; index += 1)
    output[index] =
      (wordArrayValue.words[index >>> 2] >>> (24 - (index % 4) * 8)) & 0xff;
  return output;
}

function cipherFor(algorithm: LegacyCipher): CipherStatic {
  switch (algorithm) {
    case 'aes':
      return CryptoJS.algo.AES as unknown as CipherStatic;
    case 'tripledes':
      return CryptoJS.algo.TripleDES as unknown as CipherStatic;
    case 'des':
      return CryptoJS.algo.DES as unknown as CipherStatic;
    case 'rc4':
      return CryptoJS.algo.RC4 as unknown as CipherStatic;
    case 'rc4drop':
      return CryptoJS.algo.RC4Drop as unknown as CipherStatic;
    case 'rabbit':
      return CryptoJS.algo.Rabbit as unknown as CipherStatic;
    case 'rabbitlegacy':
      return CryptoJS.algo.RabbitLegacy as unknown as CipherStatic;
  }
}

function isCbc(
  algorithm: LegacyCipher,
): algorithm is 'aes' | 'tripledes' | 'des' {
  return (
    algorithm === 'aes' || algorithm === 'tripledes' || algorithm === 'des'
  );
}

function blockBytes(algorithm: 'aes' | 'tripledes' | 'des') {
  return algorithm === 'aes' ? 16 : 8;
}

function validateDrop(algorithm: LegacyCipher, drop: number) {
  if (
    algorithm === 'rc4drop' &&
    (!Number.isInteger(drop) || drop < 0 || drop > 4096)
  )
    throw new Error(
      'RC4Drop 丟棄量必須是 0 到 4096 的整數（單位為 32 位元字）。',
    );
}

function cryptoApi() {
  if (!globalThis.crypto?.getRandomValues)
    throw new Error('此功能需要 HTTPS 與支援 Web Crypto 的瀏覽器。');
  return globalThis.crypto;
}

function salt() {
  return cryptoApi().getRandomValues(new Uint8Array(8));
}

function options(
  algorithm: LegacyCipher,
  iv: CryptoJS.lib.WordArray,
  drop: number,
  padding: object,
) {
  if (isCbc(algorithm)) return { iv, mode: CryptoJS.mode.CBC, padding };
  if (algorithm === 'rc4drop') return { iv, drop };
  return { iv };
}

function derivedKey(
  algorithm: LegacyCipher,
  password: string,
  saltBytes: Uint8Array,
) {
  const cipher = cipherFor(algorithm);
  return CryptoJS.kdf.OpenSSL.execute(
    password,
    cipher.keySize,
    cipher.ivSize,
    wordArray(saltBytes),
  );
}

function removePkcs7Padding(value: Uint8Array, blockSize: number) {
  if (!value.length || value.length % blockSize)
    throw new Error('密文區塊長度不正確。');
  const padding = value[value.length - 1];
  if (!padding || padding > blockSize || padding > value.length)
    throw new Error('密碼不正確，或密文的 PKCS#7 填充已損壞。');
  for (let index = value.length - padding; index < value.length; index += 1)
    if (value[index] !== padding)
      throw new Error('密碼不正確，或密文的 PKCS#7 填充已損壞。');
  return value.slice(0, value.length - padding);
}

function envelope(ciphertext: Uint8Array, saltBytes: Uint8Array) {
  const output = new Uint8Array(
    saltedPrefix.length + saltBytes.length + ciphertext.length,
  );
  output.set(saltedPrefix);
  output.set(saltBytes, saltedPrefix.length);
  output.set(ciphertext, saltedPrefix.length + saltBytes.length);
  return toBase64(output);
}

function parseEnvelope(text: string, algorithm: LegacyCipher) {
  utf8Bytes(text, '密文', base64TextLimit);
  const value = fromBase64(text);
  const minimum = saltedPrefix.length + 8 + 1;
  if (
    value.length < minimum ||
    !saltedPrefix.every((byte, index) => value[index] === byte)
  )
    throw new Error(
      '密文不是含 Salted__ 與 8 位元組 salt 的 CryptoJS/OpenSSL 格式。',
    );
  const saltBytes = value.slice(saltedPrefix.length, saltedPrefix.length + 8);
  const ciphertext = value.slice(saltedPrefix.length + 8);
  if (isCbc(algorithm)) {
    const blockSize = blockBytes(algorithm);
    if (
      !ciphertext.length ||
      ciphertext.length % blockSize ||
      ciphertext.length > MAX_CRYPTO_BYTES + blockSize
    )
      throw new Error('密文區塊長度不正確。');
  } else if (!ciphertext.length || ciphertext.length > MAX_CRYPTO_BYTES) {
    throw new Error('密文長度不正確。');
  }
  return { saltBytes, ciphertext };
}

/**
 * CryptoJS/OpenSSL passphrase compatibility only.  These legacy ciphers do
 * not authenticate ciphertext; stream ciphers cannot reliably detect a wrong
 * password or modification.
 */
export function legacyCipher(
  algorithm: LegacyCipher,
  direction: CryptoDirection,
  text: string,
  password: string,
  drop = 192,
): string {
  if (!legacyAlgorithms.has(algorithm))
    throw new Error('不支援的舊式加密演算法。');
  if (!directions.has(direction)) throw new Error('加解密方向不正確。');
  validateDrop(algorithm, drop);
  passwordBytes(password);

  const cipher = cipherFor(algorithm);
  if (direction === 'encrypt') {
    const plaintext = utf8Bytes(text);
    if (!plaintext.length) throw new Error('請輸入要加密的文字。');
    const saltBytes = salt();
    const derived = derivedKey(algorithm, password, saltBytes);
    const encrypted = cipher
      .createEncryptor(
        derived.key,
        options(algorithm, derived.iv, drop, CryptoJS.pad.Pkcs7),
      )
      .finalize(wordArray(plaintext));
    return envelope(bytes(encrypted), saltBytes);
  }

  const parsed = parseEnvelope(text, algorithm);
  const derived = derivedKey(algorithm, password, parsed.saltBytes);
  const padding = isCbc(algorithm)
    ? CryptoJS.pad.NoPadding
    : CryptoJS.pad.Pkcs7;
  const decrypted = cipher
    .createDecryptor(derived.key, options(algorithm, derived.iv, drop, padding))
    .finalize(wordArray(parsed.ciphertext));
  let plaintext = bytes(decrypted);
  if (isCbc(algorithm))
    plaintext = removePkcs7Padding(plaintext, blockBytes(algorithm));
  if (plaintext.length > MAX_CRYPTO_BYTES)
    throw new Error('解密後內容超過大小上限。');
  try {
    return decodeUtf8(plaintext);
  } catch {
    throw new Error('密碼不正確，或解密結果不是有效的 UTF-8 文字。');
  }
}
