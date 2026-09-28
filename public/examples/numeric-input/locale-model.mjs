import {
  CONTRACT,
  validateEngineeringText,
  validateRawEnvelope,
} from './numeric-input-model.mjs';
const contextValid = (locale, unit) =>
  ['en-US', 'de-DE'].includes(locale) && ['C', 'F'].includes(unit);
export function parseLocalized(text, locale, unit) {
  if (!contextValid(locale, unit))
    return { accepted: false, decision: 'CONTEXT_REJECTED' };
  if (
    typeof text !== 'string' ||
    text.length > 16 ||
    text.trim() !== text ||
    !(
      locale === 'de-DE'
        ? /^(?:0|[1-9][0-9]*)(?:,[0-9]+)?$/
        : /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/
    ).test(text)
  )
    return { accepted: false, decision: 'SYNTAX_REJECTED' };
  const normalized = text.replace(',', '.');
  if (unit === 'C') return validateEngineeringText(normalized);
  const [whole, fraction = ''] = normalized.split('.');
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = BigInt(whole) * denominator + BigInt(fraction || '0');
  // raw = ((F - 32) * 5 / 9) * 10, with no intermediate rounding.
  const rawNumerator = (numerator - 32n * denominator) * 50n;
  const rawDenominator = 9n * denominator;
  if (rawNumerator < 0n || rawNumerator > 1000n * rawDenominator)
    return { accepted: false, decision: 'RANGE_REJECTED' };
  if (rawNumerator % rawDenominator !== 0n)
    return { accepted: false, decision: 'STEP_REJECTED' };
  return validateRawEnvelope({
    schema: CONTRACT.schema,
    unit: 'C',
    scale: 10,
    raw: Number(rawNumerator / rawDenominator),
  });
}
export function createLocaleEditor(initialRaw = 253) {
  if (
    !validateRawEnvelope({
      schema: CONTRACT.schema,
      unit: 'C',
      scale: 10,
      raw: initialRaw,
    }).accepted
  )
    throw new RangeError('invalid initial raw');
  let raw = initialRaw,
    locale = 'en-US',
    unit = 'C',
    draft = null;
  function inspect() {
    const value = unit === 'C' ? raw / 10 : (raw * 9) / 50 + 32;
    const display =
      new Intl.NumberFormat(locale, {
        useGrouping: false,
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value) + ` °${unit}`;
    return { raw, locale, unit, display, draft: draft && { ...draft } };
  }
  return {
    inspect,
    displayAs(nextLocale, nextUnit) {
      if (!contextValid(nextLocale, nextUnit))
        throw new RangeError('unsupported display context');
      locale = nextLocale;
      unit = nextUnit;
      return inspect();
    },
    begin(text, inputLocale = locale, inputUnit = unit) {
      if (draft) throw new Error('confirm or cancel the existing draft first');
      if (typeof text !== 'string' || text.length > 16)
        throw new RangeError('draft must contain at most 16 characters');
      draft = { text, locale: inputLocale, unit: inputUnit };
      return inspect();
    },
    confirm() {
      if (!draft) return { accepted: false, decision: 'NO_DRAFT' };
      const result = parseLocalized(draft.text, draft.locale, draft.unit);
      if (result.accepted) {
        raw = result.wire;
        draft = null;
      }
      return result;
    },
    cancel() {
      draft = null;
      return inspect();
    },
  };
}
