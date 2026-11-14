export const MAX_MASK_TEXT = 100_000;
export const MAX_CUSTOM_TERMS = 100;

export type MaskOptions = {
  emails: boolean;
  phones: boolean;
  identifiers: boolean;
  customTerms: string;
};

export type MaskSummary = {
  text: string;
  emails: number;
  phones: number;
  identifiers: number;
  custom: number;
};

function assertInput(text: string) {
  if (text.length > MAX_MASK_TEXT)
    throw new RangeError(
      `文字不可超過 ${MAX_MASK_TEXT.toLocaleString()} 個字元。`,
    );
}

function maskEmail(value: string) {
  const [local, domain] = value.split('@');
  if (!local || !domain) return value;
  return `${local[0]}${'*'.repeat(Math.max(3, local.length - 1))}@${domain}`;
}

function maskDigits(value: string) {
  const digits = value.split('').filter((character) => /\d/.test(character));
  if (digits.length < 7) return value;
  let index = 0;
  const hiddenDigits = digits.length - Math.min(4, digits.length);
  return value
    .split('')
    .map((character) => {
      if (!/\d/.test(character)) return character;
      return index++ < hiddenDigits ? '*' : character;
    })
    .join('');
}

function maskIdentifier(value: string) {
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`;
}

function replaceCount(
  text: string,
  expression: RegExp,
  replace: (value: string) => string,
) {
  let count = 0;
  return {
    text: text.replace(expression, (value) => {
      const masked = replace(value);
      if (masked !== value) count++;
      return masked;
    }),
    count,
  };
}

/** Masks selected recognisable patterns locally; it is not anonymisation certification. */
export function maskData(text: string, options: MaskOptions): MaskSummary {
  assertInput(text);
  let output = text;
  let emails = 0,
    phones = 0,
    identifiers = 0,
    custom = 0;
  if (options.emails) {
    const result = replaceCount(
      output,
      /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+/giu,
      maskEmail,
    );
    output = result.text;
    emails = result.count;
  }
  if (options.identifiers) {
    const result = replaceCount(
      output,
      /\b[A-Z][12]\d{8}\b|\b[A-Z]{2}\d{6,12}\b/gu,
      maskIdentifier,
    );
    output = result.text;
    identifiers = result.count;
  }
  if (options.phones) {
    const result = replaceCount(
      output,
      /(?:\+?\d[\d() .-]{5,}\d)/gu,
      maskDigits,
    );
    output = result.text;
    phones = result.count;
  }
  const terms = Array.from(
    new Set(
      options.customTerms
        .split(/\r?\n/u)
        .map((term) => term.trim())
        .filter(Boolean),
    ),
  );
  if (terms.length > MAX_CUSTOM_TERMS)
    throw new RangeError(`自訂文字不可超過 ${MAX_CUSTOM_TERMS} 筆。`);
  for (const term of terms) {
    if (term.length > 200)
      throw new RangeError('每筆自訂文字不可超過 200 個字元。');
    let index = output.indexOf(term);
    while (index !== -1) {
      custom++;
      output = `${output.slice(0, index)}${'*'.repeat(Math.max(3, term.length))}${output.slice(index + term.length)}`;
      index = output.indexOf(term, index + Math.max(3, term.length));
    }
  }
  return { text: output, emails, phones, identifiers, custom };
}
