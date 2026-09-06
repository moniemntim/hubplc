import { TextEncoder } from '@kayahr/text-encoding/no-encodings';
import '@kayahr/text-encoding/encodings/big5';
import '@kayahr/text-encoding/encodings/euc-jp';
import '@kayahr/text-encoding/encodings/euc-kr';
import '@kayahr/text-encoding/encodings/gb18030';
import '@kayahr/text-encoding/encodings/gbk';
import '@kayahr/text-encoding/encodings/iso-2022-jp';
import '@kayahr/text-encoding/encodings/shift_jis';
import '@kayahr/text-encoding/encodings/utf-16be';
import '@kayahr/text-encoding/encodings/utf-16le';
import '@kayahr/text-encoding/encodings/utf-8';
import '@kayahr/text-encoding/encodings/windows-1252';
import {
  MAX_REPAIR_TEXT,
  MAX_TEXT_FILE_BYTES,
  textEncodings,
  type TextEncoding,
} from './text-encoding-options.ts';

export {
  MAX_REPAIR_TEXT,
  MAX_TEXT_FILE_BYTES,
  textEncodings,
  type TextEncoding,
} from './text-encoding-options.ts';

export type RepairCandidate = {
  text: string;
  mistaken: TextEncoding;
  original: TextEncoding;
};

export type FileDecodingCandidate = {
  text: string;
  encoding: TextEncoding;
};

const autoRepairEncodings = [
  'utf-8',
  'big5',
  'gbk',
  'shift_jis',
  'euc-jp',
  'euc-kr',
  'windows-1252',
  'latin1',
] as const satisfies readonly TextEncoding[];

const fileDecodingEncodings = textEncodings.map(({ value }) => value);

function assertValidString(text: string): void {
  // A replacement character means a prior conversion has already discarded data.
  if (text.includes('\uFFFD'))
    throw new TypeError('文字含有替代字元，無法進行無損轉換。');
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit < 0xd800 || unit > 0xdfff) continue;
    const next = text.charCodeAt(index + 1);
    if (unit <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
      index += 1;
      continue;
    }
    throw new TypeError('文字含有未配對的代理字元。');
  }
}

function encodeLatin1(text: string): Uint8Array {
  const result = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code > 0xff) throw new TypeError('文字無法以 ISO-8859-1 無損編碼。');
    result[index] = code;
  }
  return result;
}

function decodeLatin1(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return text;
}

/** Decodes without BOM stripping, used only to prove an encode/decode round trip. */
function decodeExactly(bytes: Uint8Array, encoding: TextEncoding): string {
  if (encoding === 'latin1') return decodeLatin1(bytes);
  try {
    return new globalThis.TextDecoder(encoding, {
      fatal: true,
      ignoreBOM: true,
    }).decode(bytes);
  } catch {
    throw new TypeError(`資料無法以 ${encoding} 嚴格解碼，請確認原始編碼。`);
  }
}

/**
 * Encodes only when every input code point is representable and decodes back exactly.
 * The package encoder is instantiated per call so stateful ISO-2022-JP output cannot
 * leak a shift state into a later conversion.
 */
export function encodeText(text: string, encoding: TextEncoding): Uint8Array {
  assertValidString(text);
  let bytes: Uint8Array;
  try {
    bytes =
      encoding === 'latin1'
        ? encodeLatin1(text)
        : new TextEncoder(encoding).encode(text);
  } catch {
    throw new TypeError(
      `文字無法以 ${encoding} 無損編碼，請選擇可表示所有字元的編碼。`,
    );
  }
  if (decodeExactly(bytes, encoding) !== text) {
    throw new TypeError(`${encoding} 會造成文字遺失，已拒絕轉換。`);
  }
  return bytes;
}

function assertFileBytes(bytes: Uint8Array): void {
  if (!bytes.length) throw new RangeError('檔案是空的。');
  if (bytes.byteLength > MAX_TEXT_FILE_BYTES) {
    throw new RangeError(
      `文字檔不可超過 ${MAX_TEXT_FILE_BYTES.toLocaleString()} bytes。`,
    );
  }
}

/**
 * Strictly decodes a file payload. One leading Unicode BOM is removed for display;
 * repairText instead uses decodeExactly so its byte round-trip remains exact.
 */
export function decodeText(bytes: Uint8Array, encoding: TextEncoding): string {
  assertFileBytes(bytes);
  const text = decodeExactly(bytes, encoding);
  return text.startsWith('\uFEFF') ? text.slice(1) : text;
}

function assertRepairInput(text: string): void {
  if (!text) throw new RangeError('請輸入要修復的文字。');
  if (text.length > MAX_REPAIR_TEXT) {
    throw new RangeError(
      `文字不可超過 ${MAX_REPAIR_TEXT.toLocaleString()} 字元。`,
    );
  }
  assertValidString(text);
}

/** Reverses a single mistaken decode: text -> mistaken bytes -> original text. */
export function repairText(
  text: string,
  mistaken: TextEncoding,
  original: TextEncoding,
): string {
  assertRepairInput(text);
  return decodeExactly(encodeText(text, mistaken), original);
}

function readabilityScore(text: string): number {
  let score = 0;
  for (const character of text) {
    const code = character.codePointAt(0)!;
    if (character === '\uFFFD') score -= 30;
    else if (
      code < 0x20 &&
      character !== '\n' &&
      character !== '\r' &&
      character !== '\t'
    )
      score -= 12;
    else if (code >= 0xe000 && code <= 0xf8ff) score -= 2;
    else if (code >= 0xff61 && code <= 0xff9f) score -= 2;
    else if (
      (code >= 0x3400 && code <= 0x9fff) ||
      (code >= 0xf900 && code <= 0xfaff)
    )
      score += 4;
    else if (
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    )
      score += 3;
    else if (/[A-Za-z0-9]/.test(character)) score += 0.35;
    else if (code >= 0x20 && code <= 0x7e) score += 0.1;
    else score += 0.05;
  }
  // Common signatures of UTF-8 bytes decoded as a Western single-byte encoding.
  score -= (text.match(/[ÃÂÐÑä¸æ]/g)?.length ?? 0) * 1.2;
  return score;
}

/** Returns plausible single-step repairs, ranked by a lightweight readability heuristic. */
export function suggestRepairs(text: string): RepairCandidate[] {
  assertRepairInput(text);
  const candidates: Array<RepairCandidate & { score: number }> = [];
  const seen = new Set<string>();
  for (const mistaken of autoRepairEncodings) {
    let encoded: Uint8Array;
    try {
      encoded = encodeText(text, mistaken);
    } catch {
      continue;
    }
    for (const original of autoRepairEncodings) {
      if (mistaken === original) continue;
      try {
        const repaired = decodeExactly(encoded, original);
        if (repaired === text || seen.has(repaired)) continue;
        seen.add(repaired);
        candidates.push({
          text: repaired,
          mistaken,
          original,
          score: readabilityScore(repaired),
        });
      } catch {
        // A strict codec failure means this pair cannot be a lossless repair.
      }
    }
  }
  return candidates
    .sort((left, right) => right.score - left.score)
    .slice(0, 20)
    .map(({ score: _score, ...candidate }) => candidate);
}

function bomEncoding(bytes: Uint8Array): TextEncoding | undefined {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    return 'utf-8';
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le';
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be';
  return undefined;
}

/** Suggests strict decodings for a local text file; a detected Unicode BOM is first. */
export function suggestFileDecodings(
  bytes: Uint8Array,
): FileDecodingCandidate[] {
  assertFileBytes(bytes);
  const bom = bomEncoding(bytes);
  const encodings = bom
    ? [bom, ...fileDecodingEncodings.filter((encoding) => encoding !== bom)]
    : fileDecodingEncodings;
  const candidates: FileDecodingCandidate[] = [];
  const seen = new Set<string>();
  for (const encoding of encodings) {
    try {
      const text = decodeText(bytes, encoding);
      if (seen.has(text)) continue;
      seen.add(text);
      candidates.push({ text, encoding });
    } catch {
      // Invalid byte sequences are intentionally excluded rather than replaced.
    }
  }
  return candidates
    .sort((left, right) => {
      if (left.encoding === bom) return -1;
      if (right.encoding === bom) return 1;
      if (left.encoding === 'utf-8') return -1;
      if (right.encoding === 'utf-8') return 1;
      return readabilityScore(right.text) - readabilityScore(left.text);
    })
    .slice(0, 12);
}
