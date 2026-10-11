import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isLocale,
  localeFromCountry,
  localeFromLanguageTag,
} from '../lib/locale.ts';
import { translateToolMessage } from '../lib/tools/error-i18n.ts';

void test('country selection uses Chinese for TW, HK, MO and CN', () => {
  for (const country of ['TW', 'tw', 'HK', 'MO', 'CN'])
    assert.equal(localeFromCountry(country, 'en-US'), 'zh-Hant');
  for (const country of ['US', 'JP', 'SG', 'DE'])
    assert.equal(localeFromCountry(country, 'zh-TW'), 'en');
});

void test('unknown country falls back to the preferred browser language', () => {
  assert.equal(localeFromCountry(null, 'zh-TW,zh;q=0.9'), 'zh-Hant');
  assert.equal(localeFromCountry('XX', 'en-US,en;q=0.9'), 'en');
  assert.equal(localeFromCountry('T1', null), 'zh-Hant');
  assert.equal(localeFromLanguageTag('zh-Hant-TW'), 'zh-Hant');
  assert.equal(localeFromLanguageTag('en-US'), 'en');
});

void test('only supported locale values are accepted from storage or the API', () => {
  assert.equal(isLocale('zh-Hant'), true);
  assert.equal(isLocale('en'), true);
  assert.equal(isLocale('en-US'), false);
  assert.equal(isLocale(null), false);
});

void test('tool validation messages remain specific in English', () => {
  assert.equal(translateToolMessage('請填寫電壓。', 'en'), 'Enter voltage.');
  assert.equal(
    translateToolMessage('功率因數不可大於 1。', 'en'),
    'Power factor cannot exceed 1.',
  );
  assert.equal(
    translateToolMessage('自訂錯誤訊息。', 'en'),
    'The input is invalid or outside the supported range. Check the values and try again.',
  );
  assert.equal(translateToolMessage('請填寫電壓。', 'zh-Hant'), '請填寫電壓。');
});
