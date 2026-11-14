import { secureRandomInt, type RandomIndex } from './random-source.ts';

export const codeAlphabets = {
  alphanumeric: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  uppercase: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  digits: '0123456789',
} as const;

export type CodeAlphabet = keyof typeof codeAlphabets;
export type CodeOptions = {
  prefix: string;
  length: number;
  count: number;
  alphabet: CodeAlphabet;
};

export type SampleProfile = {
  id: string;
  name: string;
  role: string;
  email: string;
};

const maximumCount = 1000;
const maximumLength = 32;
const maximumPrefixLength = 32;
const maximumAttemptsPerCode = 128;

function capacityFor(alphabetLength: number, length: number): bigint {
  return BigInt(alphabetLength) ** BigInt(length);
}

function validateCodeOptions(options: CodeOptions) {
  if (
    !Number.isSafeInteger(options.count) ||
    options.count < 1 ||
    options.count > maximumCount
  )
    throw new Error('產生數量必須是 1 到 1000 的整數。');
  if (
    !Number.isSafeInteger(options.length) ||
    options.length < 2 ||
    options.length > maximumLength
  )
    throw new Error(`代碼長度必須是 2 到 ${maximumLength} 的整數。`);
  if (
    options.prefix.length > maximumPrefixLength ||
    !/^[A-Za-z0-9_-]*$/.test(options.prefix)
  )
    throw new Error('前綴限 32 個英數、底線或連字號字元。');
  const alphabet = codeAlphabets[options.alphabet];
  if (!alphabet) throw new Error('請選擇有效的字元集。');
  if (capacityFor(alphabet.length, options.length) < BigInt(options.count))
    throw new Error(
      '目前字元集與長度可產生的不同代碼不足，請增加長度或縮小數量。',
    );
  return alphabet;
}

function randomSuffix(
  alphabet: string,
  length: number,
  random: RandomIndex,
): string {
  return Array.from({ length }, () => {
    const index = random(alphabet.length);
    if (!Number.isInteger(index) || index < 0 || index >= alphabet.length)
      throw new Error('安全亂數來源回傳無效索引。');
    return alphabet[index];
  }).join('');
}

function pick<T>(values: readonly T[], random: RandomIndex): T {
  const index = random(values.length);
  if (!Number.isInteger(index) || index < 0 || index >= values.length)
    throw new Error('安全亂數來源回傳無效索引。');
  return values[index];
}

export function generateUniqueCodes(
  options: CodeOptions,
  random: RandomIndex = secureRandomInt,
): string[] {
  const alphabet = validateCodeOptions(options);
  const suffixes = new Set<string>();
  const maximumAttempts = options.count * maximumAttemptsPerCode;
  let attempts = 0;
  while (suffixes.size < options.count) {
    if (attempts++ >= maximumAttempts)
      throw new Error(
        '安全亂數重複過多，無法在限制內產生唯一代碼，請重試或增加長度。',
      );
    suffixes.add(randomSuffix(alphabet, options.length, random));
  }
  return [...suffixes].map((suffix) => `${options.prefix}${suffix}`);
}

const syntheticFamilies = ['測試', '範例', '模擬', '樣本'];
const syntheticGivenNames = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'];
const syntheticRoles = ['QA 測試帳號', '範例資料列', '模擬匯入列'];

export function generateSampleProfiles(
  count: number,
  random: RandomIndex = secureRandomInt,
): SampleProfile[] {
  if (!Number.isSafeInteger(count) || count < 1 || count > maximumCount)
    throw new Error('產生數量必須是 1 到 1000 的整數。');
  const ids = generateUniqueCodes(
    { prefix: 'TEST-', length: 8, count, alphabet: 'alphanumeric' },
    random,
  );
  return ids.map((id) => {
    const family = pick(syntheticFamilies, random);
    const given = pick(syntheticGivenNames, random);
    const role = pick(syntheticRoles, random);
    const suffix = id.slice('TEST-'.length).toLowerCase();
    return {
      id,
      name: `${family}${given}號`,
      role,
      email: `test-${suffix}@example.invalid`,
    };
  });
}
