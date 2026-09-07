import assert from 'node:assert/strict';
import test from 'node:test';
import {
  convertBytes,
  MAX_BYTE_ENCODING_BYTES,
} from '../lib/tools/byte-encoding.ts';

const text = '\ufeff台灣\r\nPLC 😀\t';
const utf8 = Buffer.from(text, 'utf8');

await test('converts UTF-8, Base64, Base64URL, HEX, and Latin-1 against Buffer', () => {
  assert.equal(convertBytes(text, 'utf8', 'hex'), utf8.toString('hex'));
  assert.equal(convertBytes(text, 'utf8', 'base64'), utf8.toString('base64'));
  assert.equal(
    convertBytes(text, 'utf8', 'base64url'),
    utf8.toString('base64url'),
  );
  assert.equal(convertBytes(utf8.toString('hex'), 'hex', 'utf8'), text);
  assert.equal(convertBytes('\x00\xffA\n', 'latin1', 'hex'), '00ff410a');
  assert.equal(convertBytes('00ff410a', 'hex', 'latin1'), '\x00\xffA\n');
  assert.equal(convertBytes('', 'base64', 'hex'), '');
});

await test('converts UTF-16 byte order and preserves an explicit BOM', () => {
  const utf16Text = '\ufeffA台😀\n';
  const be = Buffer.from(utf16Text, 'utf16le').swap16().toString('hex');
  const le = Buffer.from(utf16Text, 'utf16le').toString('hex');
  assert.equal(convertBytes(utf16Text, 'utf8', 'utf16behex'), be);
  assert.equal(convertBytes(utf16Text, 'utf8', 'utf16lehex'), le);
  assert.equal(convertBytes(be, 'utf16behex', 'utf8'), utf16Text);
  assert.equal(convertBytes(le, 'utf16lehex', 'utf8'), utf16Text);
  assert.equal(
    convertBytes('4e2d6587', 'utf16behex', 'hex'),
    Buffer.from('中文', 'utf8').toString('hex'),
  );
});

await test('rejects malformed encodings without accepting lossy input', () => {
  for (const value of ['Zg=', 'Zg', 'Zh==', 'Zg===', 'Zm9v\n', 'Zm9v='])
    assert.throws(() => convertBytes(value, 'base64', 'hex'), /Base64/);
  for (const value of ['A', '0x01', '0 1'])
    assert.throws(() => convertBytes(value, 'hex', 'utf8'), /HEX/);
  for (const value of ['Zg=', 'Z', 'Zh', 'Zg=='])
    assert.throws(() => convertBytes(value, 'base64url', 'hex'), /Base64URL/);
  assert.throws(() => convertBytes('Ā', 'latin1', 'hex'), /Latin-1/);
  assert.throws(() => convertBytes('ff', 'utf16behex', 'utf8'), /偶數/);
  assert.throws(() => convertBytes('d800', 'utf16behex', 'utf8'), /UTF-16/);
  assert.throws(() => convertBytes('ff', 'hex', 'utf8'), /encoded|UTF-8/i);
  assert.throws(() => convertBytes('\ud800', 'utf8', 'hex'), /Unicode/);
});

await test('enforces decoded-byte and preparse limits', () => {
  assert.equal(
    convertBytes('a'.repeat(MAX_BYTE_ENCODING_BYTES), 'utf8', 'hex').length,
    MAX_BYTE_ENCODING_BYTES * 2,
  );
  assert.equal(
    convertBytes('a'.repeat(MAX_BYTE_ENCODING_BYTES), 'utf8', 'utf16behex')
      .length,
    MAX_BYTE_ENCODING_BYTES * 4,
  );
  assert.throws(
    () => convertBytes('a'.repeat(MAX_BYTE_ENCODING_BYTES + 1), 'utf8', 'hex'),
    /1 MiB/,
  );
  assert.throws(
    () => convertBytes('00'.repeat(MAX_BYTE_ENCODING_BYTES + 1), 'hex', 'utf8'),
    /1 MiB/,
  );
});
