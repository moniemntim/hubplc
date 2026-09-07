import { passwordWords } from './password-words.ts';

export type PasswordOptions =
  | {
      mode: 'random';
      length: number;
      uppercase: boolean;
      lowercase: boolean;
      digits: boolean;
      symbols: boolean;
      excludeSimilar: boolean;
    }
  | { mode: 'words'; count: number; separator: '-' | ' ' | '.' }
  | { mode: 'pin'; length: number };

export const defaultPasswordOptions: PasswordOptions = {
  mode: 'random',
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  excludeSimilar: false,
};
export const passwordCharacters = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/',
} as const;
export const similarCharacters = 'Il1O0o';
export type RandomFill = (values: Uint32Array) => void;

const secureFill: RandomFill = (values) => {
  if (!globalThis.crypto?.getRandomValues)
    throw new Error(
      '此瀏覽器無法提供安全亂數，請改用支援 Web Crypto 的瀏覽器。',
    );
  globalThis.crypto.getRandomValues(values);
};

// Reject the incomplete tail instead of using a biased modulo of all 2^32 values.
export function randomIndex(
  size: number,
  fill: RandomFill = secureFill,
): number {
  if (!Number.isInteger(size) || size < 1 || size > 0x100000000)
    throw new Error('亂數範圍無效。');
  const limit = Math.floor(0x100000000 / size) * size;
  const sample = new Uint32Array(1);
  for (let attempt = 0; attempt < 128; attempt++) {
    fill(sample);
    if (sample[0] < limit) return sample[0] % size;
  }
  throw new Error('亂數來源未能產生有效結果，請重新產生。');
}

function integer(value: number, min: number, max: number, label: string) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${label}請輸入 ${min}～${max} 的整數。`);
}

function characterGroups(
  options: Extract<PasswordOptions, { mode: 'random' }>,
) {
  const groups = (
    Object.keys(passwordCharacters) as (keyof typeof passwordCharacters)[]
  )
    .filter((key) => options[key])
    .map((key) =>
      passwordCharacters[key]
        .split('')
        .filter(
          (char) =>
            !options.excludeSimilar || !similarCharacters.includes(char),
        )
        .join(''),
    );
  if (!groups.length) throw new Error('請至少勾選一種字元。');
  return groups;
}

export function validatePasswordOptions(options: PasswordOptions): void {
  switch (options.mode) {
    case 'random':
      integer(options.length, 4, 128, '密碼長度');
      characterGroups(options);
      break;
    case 'pin':
      integer(options.length, 4, 32, 'PIN 長度');
      break;
    case 'words':
      integer(options.count, 4, 10, '單字數量');
      if (!['-', ' ', '.'].includes(options.separator))
        throw new Error('請選擇有效的分隔符號。');
      break;
    default:
      throw new Error('密碼類型無效。');
  }
}

export function generatePassword(
  options: PasswordOptions,
  fill: RandomFill = secureFill,
): string {
  validatePasswordOptions(options);
  if (options.mode === 'words')
    return Array.from(
      { length: options.count },
      () => passwordWords[randomIndex(passwordWords.length, fill)],
    ).join(options.separator);
  if (options.mode === 'pin')
    return Array.from({ length: options.length }, () =>
      String(randomIndex(10, fill)),
    ).join('');
  const groups = characterGroups(options);
  const alphabet = groups.join('');
  // Whole-candidate rejection keeps every valid password equally likely while
  // ensuring every selected category occurs at least once. No fixed positions.
  for (let attempt = 0; attempt < 10000; attempt++) {
    const value = Array.from(
      { length: options.length },
      () => alphabet[randomIndex(alphabet.length, fill)],
    ).join('');
    if (
      groups.every((group) =>
        value.split('').some((char) => group.includes(char)),
      )
    )
      return value;
  }
  throw new Error('無法依目前條件產生密碼，請重新產生。');
}
