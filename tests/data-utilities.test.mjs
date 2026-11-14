import assert from 'node:assert/strict';
import test from 'node:test';
import { maskData } from '../lib/tools/data-mask.ts';
import { checkEmails } from '../lib/tools/email-check.ts';
import { transliterateName } from '../lib/tools/name-transliterator.ts';

void test('masks selected email, phone, identifier and literal terms without changing other text', () => {
  assert.equal(
    maskData('1-----2', {
      emails: false,
      phones: true,
      identifiers: false,
      customTerms: '',
    }).phones,
    0,
    'an unchanged digit-like pattern must not be reported as masked',
  );
  const result = maskData(
    '王小明 alice@example.com 0912-345-678 A123456789 專案甲',
    {
      emails: true,
      phones: true,
      identifiers: true,
      customTerms: '王小明\n專案甲',
    },
  );
  assert.equal(
    result.text,
    '*** a****@example.com ****-**5-678 A1******89 ***',
  );
  assert.deepEqual(
    {
      emails: result.emails,
      phones: result.phones,
      identifiers: result.identifiers,
      custom: result.custom,
    },
    { emails: 1, phones: 1, identifiers: 1, custom: 2 },
  );
  assert.equal(
    maskData('keep', {
      emails: false,
      phones: false,
      identifiers: false,
      customTerms: '',
    }).text,
    'keep',
  );
});

void test('checks basic email syntax, IDN normalization, duplicates and review-only complex syntax', () => {
  const rows = checkEmails(
    'alice@example.com\nAlice@EXAMPLE.com\nuser@例子.测试\nalice@@example.com\n"quoted"@example.com\nfoo..bar@example.com\nalice@example.com/path\nalice@example.com?x\nalice@example.com#x\nalice@exa%6dple.com',
  );
  assert.equal(rows[0].status, 'valid');
  assert.equal(rows[1].status, 'valid');
  assert.match(rows[2].normalized, /^user@xn--/);
  assert.equal(rows[3].status, 'invalid');
  assert.equal(rows[4].status, 'review');
  assert.equal(rows[5].status, 'invalid');
  for (const row of rows.slice(6)) assert.equal(row.status, 'invalid');
});

void test('drafts Hanyu Pinyin with surname splitting, polyphonic review and unsupported characters', () => {
  const wang = transliterateName('王小明');
  assert.equal(wang.surname, '王');
  assert.equal(wang.givenName, '小明');
  assert.equal(wang.surnameFirst, 'WANG, Xiao-Ming');
  assert.equal(transliterateName('歐陽,娜娜').surname, '歐陽');
  assert.deepEqual(transliterateName('曾小明').ambiguities[0], {
    character: '曾',
    readings: ['ceng', 'zeng'],
  });
  assert.deepEqual(transliterateName('王😀').unsupported, ['😀']);
  assert.deepEqual(transliterateName('王𠀀').unsupported, ['𠀀']);
  assert.throws(() => transliterateName('王,小,明'), /一個逗號/);
  assert.throws(() => transliterateName('王'.repeat(41)), /40/);
});
