export const supportedLocales = ['zh-Hant', 'en'] as const;

export type Locale = (typeof supportedLocales)[number];

export const LANGUAGE_STORAGE_KEY = 'hubplc:locale';

const traditionalChineseCountries = new Set(['TW', 'HK', 'MO', 'CN']);

export function isLocale(value: unknown): value is Locale {
  return supportedLocales.includes(value as Locale);
}

export function localeFromLanguageTag(tag: string | null | undefined): Locale {
  return tag?.trim().toLowerCase().startsWith('zh') ? 'zh-Hant' : 'en';
}

export function localeFromCountry(
  country: string | null | undefined,
  acceptLanguage?: string | null,
): Locale {
  const code = country?.trim().toUpperCase();
  if (code && code !== 'XX' && code !== 'T1')
    return traditionalChineseCountries.has(code) ? 'zh-Hant' : 'en';
  return acceptLanguage
    ? localeFromLanguageTag(acceptLanguage.split(',')[0])
    : 'zh-Hant';
}
