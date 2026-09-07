import {
  MAX_CRYPTO_BYTES,
  MAX_CRYPTO_PASSWORD_BYTES,
} from './crypto-options.ts';

export function utf8Bytes(
  text: string,
  label = '輸入內容',
  max = MAX_CRYPTO_BYTES,
): Uint8Array<ArrayBuffer> {
  if (text.length > max) throw new Error(`${label}超過大小上限。`);
  if (!text.isWellFormed())
    throw new Error(`${label}包含不完整的 Unicode 字元。`);
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > max) throw new Error(`${label}超過大小上限。`);
  return bytes;
}
export function passwordBytes(password: string): Uint8Array<ArrayBuffer> {
  if (!password.length) throw new Error('請輸入密碼／金鑰。');
  return utf8Bytes(password, '密碼／金鑰', MAX_CRYPTO_PASSWORD_BYTES);
}
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export function fromBase64(
  text: string,
  maxBytes = MAX_CRYPTO_BYTES + 64,
): Uint8Array<ArrayBuffer> {
  if (text.length > Math.ceil(maxBytes / 3) * 4 + 4096)
    throw new Error('密文超過大小上限。');
  const value = text.replace(/[\t\r\n ]/g, '');
  if (
    !value ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    )
  )
    throw new Error('密文不是有效的 Base64 格式。');
  const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  if (bytes.length > maxBytes) throw new Error('密文超過大小上限。');
  if (toBase64(bytes) !== value)
    throw new Error('密文的 Base64 編碼不完整或不正確。');
  return bytes;
}
export function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
    bytes,
  );
}
