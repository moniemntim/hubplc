export const MAX_TEXT_CASE_CODE_POINTS = 100_000;
export const MAX_RMB_YUAN = BigInt(999_999_999_999);

export const textCaseModes = [
  { value: 'uppercase', label: '全部大寫' },
  { value: 'lowercase', label: '全部小寫' },
  { value: 'titlecase', label: '英文標題式' },
  { value: 'sentencecase', label: '句首大寫' },
  { value: 'togglecase', label: '切換大小寫' },
] as const;

export type TextCaseMode = (typeof textCaseModes)[number]['value'];

export const rmbStyles = [
  { value: 'simplified', label: '簡體財務大寫（人民币／元）' },
  { value: 'traditional', label: '繁體中文金額（人民幣／圓）' },
] as const;

export type RmbStyle = (typeof rmbStyles)[number]['value'];

type FinancialCharacters = {
  digits: readonly string[];
  ten: string;
  hundred: string;
  thousand: string;
  tenThousand: string;
  hundredMillion: string;
  yuan: string;
  jiao: string;
  fen: string;
  whole: string;
  prefix: string;
};

const simplified: FinancialCharacters = {
  digits: ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'],
  ten: '拾',
  hundred: '佰',
  thousand: '仟',
  tenThousand: '万',
  hundredMillion: '亿',
  yuan: '元',
  jiao: '角',
  fen: '分',
  whole: '整',
  prefix: '人民币',
};

const traditional: FinancialCharacters = {
  digits: ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖'],
  ten: '拾',
  hundred: '佰',
  thousand: '仟',
  tenThousand: '萬',
  hundredMillion: '億',
  yuan: '圓',
  jiao: '角',
  fen: '分',
  whole: '整',
  prefix: '人民幣',
};

function assertTextLength(text: string): void {
  if (text.length > MAX_TEXT_CASE_CODE_POINTS * 2)
    throw new RangeError('文字不可超過 100,000 個 Unicode 碼點。');
  const length = Array.from(text).length;
  if (length > MAX_TEXT_CASE_CODE_POINTS) {
    throw new RangeError(
      `文字不可超過 ${MAX_TEXT_CASE_CODE_POINTS.toLocaleString()} 個 Unicode 碼點。`,
    );
  }
}

function asciiUpper(character: string): string {
  const code = character.charCodeAt(0);
  return code >= 97 && code <= 122 ? String.fromCharCode(code - 32) : character;
}

function asciiLower(character: string): string {
  const code = character.charCodeAt(0);
  return code >= 65 && code <= 90 ? String.fromCharCode(code + 32) : character;
}

function isAsciiLetter(character: string): boolean {
  const code = character.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function titleCase(text: string): string {
  return text.replace(
    /[A-Za-z]+(?:['’][A-Za-z]+)*/g,
    (word) =>
      asciiUpper(word[0]!) + word.slice(1).replace(/[A-Za-z]/g, asciiLower),
  );
}

function sentenceCase(text: string): string {
  let capitalizeNext = true;
  let result = '';
  for (const character of text) {
    if (isAsciiLetter(character)) {
      result += capitalizeNext ? asciiUpper(character) : asciiLower(character);
      capitalizeNext = false;
    } else {
      result += character;
      if (
        character === '.' ||
        character === '!' ||
        character === '?' ||
        character === '\n' ||
        character === '\r'
      ) {
        capitalizeNext = true;
      }
    }
  }
  return result;
}

/** Transforms ASCII English letters only, preserving every other code point. */
export function convertTextCase(text: string, mode: TextCaseMode): string {
  assertTextLength(text);
  switch (mode) {
    case 'uppercase':
      return text.replace(/[a-z]/g, asciiUpper);
    case 'lowercase':
      return text.replace(/[A-Z]/g, asciiLower);
    case 'titlecase':
      return titleCase(text);
    case 'sentencecase':
      return sentenceCase(text);
    case 'togglecase':
      return text.replace(/[A-Za-z]/g, (character) =>
        character === asciiUpper(character)
          ? asciiLower(character)
          : asciiUpper(character),
      );
    default:
      throw new TypeError('不支援的英文大小寫模式。');
  }
}

function parseRmbAmount(input: string | bigint): {
  yuan: bigint;
  jiao: number;
  fen: number;
} {
  if (typeof input === 'bigint') {
    if (input < BigInt(0) || input > MAX_RMB_YUAN) {
      throw new RangeError('金額必須介於 0 與 999,999,999,999.99 元之間。');
    }
    return { yuan: input, jiao: 0, fen: 0 };
  }
  if (input.length > 128 || !/^\d+(?:\.\d{1,2})?$/.test(input)) {
    throw new TypeError(
      '請輸入 0 到 999999999999.99 的十進位金額；不可使用逗號、負數或指數記法。',
    );
  }
  const [yuanText, decimal = ''] = input.split('.');
  const yuan = BigInt(yuanText!);
  if (yuan > MAX_RMB_YUAN) {
    throw new RangeError('金額必須介於 0 與 999,999,999,999.99 元之間。');
  }
  return {
    yuan,
    jiao: decimal ? Number(decimal[0]) : 0,
    fen: decimal.length === 2 ? Number(decimal[1]) : 0,
  };
}

function groupToFinancial(
  group: number,
  characters: FinancialCharacters,
): string {
  const units = ['', characters.ten, characters.hundred, characters.thousand];
  const digits = String(group).padStart(4, '0');
  let result = '';
  let pendingZero = false;
  for (let index = 0; index < digits.length; index += 1) {
    const digit = Number(digits[index]);
    if (digit === 0) {
      if (result) pendingZero = true;
      continue;
    }
    if (pendingZero) result += characters.digits[0];
    result += characters.digits[digit] + units[3 - index];
    pendingZero = false;
  }
  return result;
}

function yuanToFinancial(
  yuan: bigint,
  characters: FinancialCharacters,
): string {
  if (yuan === BigInt(0)) return characters.digits[0];
  const groups: number[] = [];
  let remaining = yuan;
  while (remaining > BigInt(0)) {
    groups.unshift(Number(remaining % BigInt(10_000)));
    remaining /= BigInt(10_000);
  }
  const groupUnits = ['', characters.tenThousand, characters.hundredMillion];
  let result = '';
  let pendingZero = false;
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index]!;
    if (group === 0) {
      if (result) pendingZero = true;
      continue;
    }
    if (result && (pendingZero || group < 1000)) result += characters.digits[0];
    result +=
      groupToFinancial(group, characters) +
      groupUnits[groups.length - index - 1]!;
    pendingZero = false;
  }
  return result;
}

/**
 * Converts a non-negative RMB decimal amount without using floating point.
 * Strings must be plain decimal notation with at most two fraction digits.
 */
export function convertRmbUppercase(
  input: string | bigint,
  options: { style?: RmbStyle; includePrefix?: boolean } = {},
): string {
  const { style = 'simplified', includePrefix = true } = options;
  if (style !== 'simplified' && style !== 'traditional')
    throw new TypeError('不支援的大寫字形。');
  const characters = style === 'traditional' ? traditional : simplified;
  const { yuan, jiao, fen } = parseRmbAmount(input);
  let result = yuanToFinancial(yuan, characters) + characters.yuan;
  if (jiao === 0 && fen === 0) result += characters.whole;
  else {
    if (jiao > 0) result += characters.digits[jiao] + characters.jiao;
    if (fen > 0) {
      if (jiao === 0 && yuan > BigInt(0)) result += characters.digits[0];
      result += characters.digits[fen] + characters.fen;
    }
  }
  return includePrefix ? characters.prefix + result : result;
}

/** Formats an NTD amount using traditional financial characters. */
export function convertTwdUppercase(input: string | bigint): string {
  return (
    '新臺幣' +
    convertRmbUppercase(input, { style: 'traditional', includePrefix: false })
  );
}
