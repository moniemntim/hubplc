import { convertTwdUppercase } from '../lib/tools/text-conversion.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  convertRmbUppercase,
  convertTextCase,
  MAX_TEXT_CASE_CODE_POINTS,
} from '../lib/tools/text-conversion.ts';

await test('converts RMB values exactly with official simplified financial characters', () => {
  assert.equal(convertRmbUppercase('0'), '人民币零元整');
  assert.equal(convertRmbUppercase(1001n), '人民币壹仟零壹元整');
  assert.equal(convertRmbUppercase('1001.05'), '人民币壹仟零壹元零伍分');
  assert.equal(convertRmbUppercase('100000001'), '人民币壹亿零壹元整');
  assert.equal(convertRmbUppercase('100010001'), '人民币壹亿零壹万零壹元整');
  assert.equal(convertRmbUppercase('100000001.01'), '人民币壹亿零壹元零壹分');
  assert.equal(
    convertRmbUppercase('999999999999.99'),
    '人民币玖仟玖佰玖拾玖亿玖仟玖佰玖拾玖万玖仟玖佰玖拾玖元玖角玖分',
  );
  assert.equal(
    convertRmbUppercase('12.3', { style: 'traditional' }),
    '人民幣壹拾貳圓參角',
  );
  assert.equal(
    convertRmbUppercase('12', { includePrefix: false }),
    '壹拾贰元整',
  );
});

await test('rejects malformed, negative, overly precise, and out-of-range RMB amounts', () => {
  for (const value of [
    '',
    '-1',
    '+1',
    '1,000',
    '1e3',
    '.5',
    '1.',
    '1.234',
    ' 1',
  ]) {
    assert.throws(() => convertRmbUppercase(value), /十進位|金額/);
  }
  assert.throws(() => convertRmbUppercase('1000000000000'), /金額/);
  assert.throws(() => convertRmbUppercase('0'.repeat(129)), /金額/);
  assert.throws(() => convertRmbUppercase('1', { style: 'invalid' }), /字形/);
  assert.throws(() => convertRmbUppercase(-1n), /金額/);
  assert.throws(() => convertRmbUppercase(1_000_000_000_000n), /金額/);
});

await test('changes only ASCII English letters in each text-case mode', () => {
  const input = 'hello, WORLD!\nDON’T stop. 中文 ÉCOLE 123';
  assert.equal(
    convertTextCase(input, 'uppercase'),
    'HELLO, WORLD!\nDON’T STOP. 中文 ÉCOLE 123',
  );
  assert.equal(
    convertTextCase(input, 'lowercase'),
    'hello, world!\ndon’t stop. 中文 École 123',
  );
  assert.equal(
    convertTextCase(input, 'titlecase'),
    'Hello, World!\nDon’t Stop. 中文 ÉCole 123',
  );
  assert.equal(
    convertTextCase(input, 'sentencecase'),
    'Hello, world!\nDon’t stop. 中文 ÉCole 123',
  );
  assert.equal(convertTextCase('aBc 中文 Z', 'togglecase'), 'AbC 中文 z');
});

await test('sentence case treats punctuation and each line as literal boundaries', () => {
  assert.equal(
    convertTextCase('one. TWO? three! FOUR\nfive', 'sentencecase'),
    'One. Two? Three! Four\nFive',
  );
});

await test('uses Unicode code points for the text length limit', () => {
  assert.equal(
    convertTextCase('😀'.repeat(MAX_TEXT_CASE_CODE_POINTS), 'uppercase').length,
    MAX_TEXT_CASE_CODE_POINTS * 2,
  );
  assert.throws(
    () =>
      convertTextCase('😀'.repeat(MAX_TEXT_CASE_CODE_POINTS + 1), 'uppercase'),
    /Unicode 碼點/,
  );
});

test('NTD uses traditional characters and preserves exact amounts', () => {
  assert.equal(convertTwdUppercase('0'), '新臺幣零圓整');
  assert.equal(convertTwdUppercase('1001'), '新臺幣壹仟零壹圓整');
  assert.equal(convertTwdUppercase('1001.05'), '新臺幣壹仟零壹圓零伍分');
  assert.equal(
    convertTwdUppercase('123456.78'),
    '新臺幣壹拾貳萬參仟肆佰伍拾陸圓柒角捌分',
  );
  assert.equal(convertTwdUppercase('100000001'), '新臺幣壹億零壹圓整');
  for (const input of ['', '-1', '1.001', '1000000000000', '1e3'])
    assert.throws(() => convertTwdUppercase(input));
});
