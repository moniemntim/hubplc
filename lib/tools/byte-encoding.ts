export const MAX_BYTE_ENCODING_BYTES = 1_048_576;

export const byteEncodings = [
  { value: 'utf8', label: 'UTF-8 文字' },
  { value: 'base64', label: 'Base64' },
  { value: 'base64url', label: 'Base64URL' },
  { value: 'hex', label: 'HEX' },
  { value: 'latin1', label: 'Latin-1 文字' },
  { value: 'utf16behex', label: 'UTF-16BE 文字（HEX）' },
  { value: 'utf16lehex', label: 'UTF-16LE 文字（HEX）' },
] as const;

export type ByteEncoding = (typeof byteEncodings)[number]['value'];

const MAX_TEXT_INPUT = MAX_BYTE_ENCODING_BYTES;
const MAX_HEX_INPUT = MAX_BYTE_ENCODING_BYTES * 2;
const MAX_BASE64_INPUT = Math.ceil(MAX_BYTE_ENCODING_BYTES / 3) * 4;

function assertSize(input: string, max: number) {
  if (input.length > max) throw new Error('輸入內容超過 1 MiB 位元組上限。');
}

function assertWellFormed(text: string, label: string) {
  if (!text.isWellFormed())
    throw new Error(`${label}包含不完整的 Unicode 字元。`);
}

function assertByteSize(bytes: Uint8Array) {
  if (bytes.length > MAX_BYTE_ENCODING_BYTES)
    throw new Error('輸入內容超過 1 MiB 位元組上限。');
}

function bytesToBinary(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return binary;
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(bytesToBinary(bytes));
}

function parseHex(input: string, label: string): Uint8Array {
  assertSize(input, MAX_HEX_INPUT);
  if (!/^(?:[\dA-Fa-f]{2})*$/.test(input))
    throw new Error(`${label}必須是偶數個 HEX 字元。`);
  const bytes = new Uint8Array(input.length / 2);
  for (let index = 0; index < input.length; index += 2)
    bytes[index / 2] = Number.parseInt(input.slice(index, index + 2), 16);
  return bytes;
}

function parseBase64(input: string): Uint8Array {
  assertSize(input, MAX_BASE64_INPUT);
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      input,
    )
  )
    throw new Error('Base64 格式或補齊字元無效。');
  const bytes = Uint8Array.from(atob(input), (character) =>
    character.charCodeAt(0),
  );
  assertByteSize(bytes);
  if (bytesToBase64(bytes) !== input) throw new Error('Base64 不是標準編碼。');
  return bytes;
}

function parseBase64Url(input: string): Uint8Array {
  assertSize(input, MAX_BASE64_INPUT);
  if (!/^[A-Za-z0-9_-]*$/.test(input) || input.length % 4 === 1)
    throw new Error('Base64URL 格式無效。');
  const padded = input
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(input.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(padded), (character) =>
    character.charCodeAt(0),
  );
  assertByteSize(bytes);
  if (encodeBase64Url(bytes) !== input)
    throw new Error('Base64URL 不是標準未補齊編碼。');
  return bytes;
}

function encodeBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
      bytes,
    );
  } catch {
    throw new Error('UTF-8 位元組格式無效。');
  }
}

function decodeUtf16(bytes: Uint8Array, endian: 'be' | 'le'): string {
  if (bytes.length % 2 !== 0) throw new Error('UTF-16 位元組數必須是偶數。');
  const encoding = endian === 'be' ? 'utf-16be' : 'utf-16le';
  let text: string;
  try {
    text = new TextDecoder(encoding, { fatal: true, ignoreBOM: true }).decode(
      bytes,
    );
  } catch {
    throw new Error('UTF-16 位元組格式無效。');
  }
  assertWellFormed(text, 'UTF-16');
  return text;
}

function encodeUtf16(text: string, endian: 'be' | 'le'): Uint8Array {
  assertSize(text, MAX_TEXT_INPUT);
  assertWellFormed(text, 'UTF-16');
  const bytes = new Uint8Array(text.length * 2);
  for (let index = 0; index < text.length; index += 1) {
    const codeUnit = text.charCodeAt(index);
    if (endian === 'be') {
      bytes[index * 2] = codeUnit >>> 8;
      bytes[index * 2 + 1] = codeUnit & 0xff;
    } else {
      bytes[index * 2] = codeUnit & 0xff;
      bytes[index * 2 + 1] = codeUnit >>> 8;
    }
  }
  return bytes;
}

function decodeInput(input: string, from: ByteEncoding): Uint8Array {
  switch (from) {
    case 'utf8': {
      assertSize(input, MAX_TEXT_INPUT);
      assertWellFormed(input, 'UTF-8');
      const bytes = new TextEncoder().encode(input);
      assertByteSize(bytes);
      return bytes;
    }
    case 'base64':
      return parseBase64(input);
    case 'base64url':
      return parseBase64Url(input);
    case 'hex':
      return parseHex(input, 'HEX');
    case 'latin1': {
      assertSize(input, MAX_TEXT_INPUT);
      const bytes = new Uint8Array(input.length);
      for (let index = 0; index < input.length; index += 1) {
        const codeUnit = input.charCodeAt(index);
        if (codeUnit > 0xff)
          throw new Error('Latin-1 文字只能包含 U+0000 到 U+00FF。');
        bytes[index] = codeUnit;
      }
      return bytes;
    }
    case 'utf16behex':
      return new TextEncoder().encode(
        decodeUtf16(parseHex(input, 'UTF-16BE HEX'), 'be'),
      );
    case 'utf16lehex':
      return new TextEncoder().encode(
        decodeUtf16(parseHex(input, 'UTF-16LE HEX'), 'le'),
      );
    default:
      throw new Error('不支援的位元組編碼。');
  }
}

function encodeOutput(bytes: Uint8Array, to: ByteEncoding): string {
  switch (to) {
    case 'utf8':
      return decodeUtf8(bytes);
    case 'base64':
      return bytesToBase64(bytes);
    case 'base64url':
      return encodeBase64Url(bytes);
    case 'hex':
      return Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
    case 'latin1':
      return bytesToBinary(bytes);
    case 'utf16behex':
      return encodeOutput(encodeUtf16(decodeUtf8(bytes), 'be'), 'hex');
    case 'utf16lehex':
      return encodeOutput(encodeUtf16(decodeUtf8(bytes), 'le'), 'hex');
    default:
      throw new Error('不支援的位元組編碼。');
  }
}

/**
 * Converts byte representations and text encodings. UTF-16 HEX is decoded to
 * Unicode text, then normalized through strict UTF-8 before another text
 * encoding is emitted; it is not a raw UTF-16 byte inspection mode.
 */
export function convertBytes(
  input: string,
  from: ByteEncoding,
  to: ByteEncoding,
): string {
  const bytes = decodeInput(input, from);
  assertByteSize(bytes);
  return encodeOutput(bytes, to);
}
