import {
  decodeUtf8,
  fromBase64,
  passwordBytes,
  toBase64,
  utf8Bytes,
} from './crypto-bytes.ts';
import { MAX_CRYPTO_BYTES } from './crypto-options.ts';

export const CRYPTO_PREFIX = 'HPLC1.';
export const CRYPTO_ITERATIONS = 600000;
const aad = new TextEncoder().encode(CRYPTO_PREFIX);
function cryptoApi() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues)
    throw new Error('此功能需要 HTTPS 與支援 Web Crypto 的瀏覽器。');
  return globalThis.crypto;
}
async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  usage: 'encrypt' | 'decrypt',
) {
  const api = cryptoApi();
  const material = await api.subtle.importKey(
    'raw',
    passwordBytes(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return api.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: CRYPTO_ITERATIONS },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  );
}
// HPLC1: Base64(salt[16] || IV[12] || ciphertext || GCM tag[16]).
// Version fixes the KDF and iteration count; no untrusted work-factor parameters.
export async function encryptModern(
  text: string,
  password: string,
): Promise<string> {
  const bytes = utf8Bytes(text);
  if (!bytes.length) throw new Error('請輸入要加密的文字。');
  passwordBytes(password);
  const api = cryptoApi();
  const salt = api.getRandomValues(new Uint8Array(16));
  const iv = api.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt, 'encrypt');
  const ciphertext = new Uint8Array(
    await api.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 },
      key,
      bytes,
    ),
  );
  const envelope = new Uint8Array(28 + ciphertext.length);
  envelope.set(salt);
  envelope.set(iv, 16);
  envelope.set(ciphertext, 28);
  return CRYPTO_PREFIX + toBase64(envelope);
}
export async function decryptModern(
  text: string,
  password: string,
): Promise<string> {
  passwordBytes(password);
  const normalized = text.trim();
  if (!normalized.startsWith(CRYPTO_PREFIX))
    throw new Error(
      '請貼上 HPLC1. 開頭的 HubPLC AES-GCM 密文；其他格式請選擇相符演算法。',
    );
  const envelope = fromBase64(
    normalized.slice(CRYPTO_PREFIX.length),
    MAX_CRYPTO_BYTES + 44,
  );
  if (envelope.length < 45) throw new Error('密文不完整。');
  const key = await derive(password, envelope.slice(0, 16), 'decrypt');
  try {
    const plaintext = await cryptoApi().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: envelope.slice(16, 28),
        additionalData: aad,
        tagLength: 128,
      },
      key,
      envelope.slice(28),
    );
    return decodeUtf8(new Uint8Array(plaintext));
  } catch {
    throw new Error('無法解密：密碼不正確，或密文已損壞／遭修改。');
  }
}
