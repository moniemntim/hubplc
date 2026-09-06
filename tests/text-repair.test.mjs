import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_REPAIR_TEXT,
  MAX_TEXT_FILE_BYTES,
  decodeText,
  encodeText,
  repairText,
  suggestFileDecodings,
  suggestRepairs,
} from '../lib/tools/text-repair.ts';

const bytes = (...values) => new Uint8Array(values);

void test('strict codecs produce representative known byte sequences and round-trip text', () => {
  assert.deepEqual(
    Array.from(encodeText('你好', 'big5')),
    [0xa7, 0x41, 0xa6, 0x6e],
  );
  assert.deepEqual(
    Array.from(encodeText('中文', 'utf-8')),
    [0xe4, 0xb8, 0xad, 0xe6, 0x96, 0x87],
  );
  assert.equal(decodeText(bytes(0xa4, 0xa2, 0xa4, 0xa4), 'euc-jp'), 'あい');
  assert.equal(decodeText(bytes(0xbe, 0xc8, 0xb3, 0xe7), 'euc-kr'), '안녕');

  const samples = {
    'utf-8': '中文 日本語 안녕',
    'utf-16le': '中文 日本語 안녕',
    'utf-16be': '中文 日本語 안녕',
    big5: '你好',
    gbk: '中文',
    gb18030: '中文',
    shift_jis: '日本語',
    'euc-jp': '日本語',
    'iso-2022-jp': '日本語 ABC 日本語',
    'euc-kr': '안녕',
    'windows-1252': 'café €',
    latin1: 'café\x80',
  };
  for (const [encoding, text] of Object.entries(samples)) {
    const encoded = encodeText(text, encoding);
    assert.equal(decodeText(encoded, encoding), text, encoding);
  }
  // ISO-2022-JP is stateful, so a later conversion must start in ASCII again.
  assert.equal(
    decodeText(encodeText('日本語', 'iso-2022-jp'), 'iso-2022-jp'),
    '日本語',
  );
  assert.deepEqual(
    Array.from(encodeText('ABC', 'iso-2022-jp')),
    [0x41, 0x42, 0x43],
  );
});

void test('recovers UTF-8 bytes mistakenly decoded as Windows-1252', () => {
  const mojibake = 'ä¸­æ–‡';
  assert.equal(repairText(mojibake, 'windows-1252', 'utf-8'), '中文');
  const candidates = suggestRepairs(mojibake);
  assert.ok(candidates.some((candidate) => candidate.text === '中文'));
  assert.equal(candidates[0]?.text, '中文');
  assert.ok(candidates.length <= 20);
  assert.ok(candidates.every((candidate) => candidate.text !== mojibake));

  const originalWithBom = '\uFEFF中文';
  const bomMojibake = decodeText(
    encodeText(originalWithBom, 'utf-8'),
    'windows-1252',
  );
  assert.equal(
    repairText(bomMojibake, 'windows-1252', 'utf-8'),
    originalWithBom,
  );
});

void test('Latin-1 is a true byte-to-code-unit mapping, unlike Windows-1252', () => {
  assert.equal(decodeText(bytes(0x80), 'latin1'), '\x80');
  assert.equal(decodeText(bytes(0x80), 'windows-1252'), '€');
  assert.deepEqual(Array.from(encodeText('\x80', 'latin1')), [0x80]);
  assert.throws(() => encodeText('\x80', 'windows-1252'), /無損|encoded/);
});

void test('strict conversion rejects replacement characters, lone surrogates, and lossy code points', () => {
  assert.throws(() => encodeText('\uFFFD', 'utf-8'), /替代字元/);
  assert.throws(() => encodeText('\ud800', 'utf-8'), /代理/);
  assert.throws(() => encodeText('中文', 'windows-1252'), /無損|encoded/);
  assert.throws(() => repairText('', 'utf-8', 'big5'), /輸入/);
  assert.throws(
    () => repairText('x'.repeat(MAX_REPAIR_TEXT + 1), 'utf-8', 'big5'),
    /超過/,
  );
  assert.throws(() => decodeText(bytes(0xc3, 0x28), 'utf-8'), /嚴格解碼/);
  // The package's EUC-KR decoder used to invent a NUL for this invalid byte run.
  assert.throws(
    () => decodeText(bytes(0xe4, 0xb8, 0xad, 0xe6, 0x96, 0x87), 'euc-kr'),
    /嚴格解碼/,
  );
});

void test('file suggestions honour Unicode BOMs and decode UTF-8 and UTF-16 files', () => {
  const utf8Bom = bytes(0xef, 0xbb, 0xbf, 0xe4, 0xb8, 0xad, 0xe6, 0x96, 0x87);
  const utf16LeBom = bytes(0xff, 0xfe, 0x2d, 0x4e, 0x87, 0x65);
  const utf16BeBom = bytes(0xfe, 0xff, 0x4e, 0x2d, 0x65, 0x87);
  for (const [input, encoding] of [
    [utf8Bom, 'utf-8'],
    [utf16LeBom, 'utf-16le'],
    [utf16BeBom, 'utf-16be'],
  ]) {
    const candidates = suggestFileDecodings(input);
    assert.deepEqual(candidates[0], { text: '中文', encoding });
    assert.ok(candidates.length <= 12);
  }
});

void test('valid UTF-8 is first without a BOM, before readable fallback decodings', () => {
  const ascii = suggestFileDecodings(bytes(0x48, 0x75, 0x62, 0x50, 0x4c, 0x43));
  assert.deepEqual(ascii[0], { text: 'HubPLC', encoding: 'utf-8' });
  const chinese = suggestFileDecodings(
    bytes(0xe4, 0xb8, 0xad, 0xe6, 0x96, 0x87),
  );
  assert.deepEqual(chinese[0], { text: '中文', encoding: 'utf-8' });
});

void test('file suggestions reject empty, oversized, and malformed-only input', () => {
  assert.throws(() => suggestFileDecodings(bytes()), /空/);
  assert.throws(
    () => suggestFileDecodings(new Uint8Array(MAX_TEXT_FILE_BYTES + 1)),
    /超過/,
  );
  assert.throws(() => decodeText(bytes(), 'utf-8'), /空/);
  assert.throws(
    () => decodeText(new Uint8Array(MAX_TEXT_FILE_BYTES + 1), 'utf-8'),
    /超過/,
  );
  assert.throws(() => decodeText(bytes(0xff), 'utf-8'), /嚴格解碼/);
});
