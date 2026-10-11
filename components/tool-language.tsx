'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isLocale, LANGUAGE_STORAGE_KEY, type Locale } from '@/lib/locale';

type LanguageContextValue = {
  locale: Locale;
  tr: (traditionalChinese: string, english: string) => string;
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'zh-Hant',
  tr: (traditionalChinese) => traditionalChinese,
  setLocale: () => undefined,
});

function readStoredLocale() {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

function storeLocale(locale: Locale) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  } catch {
    // The switch still works for this page when storage is unavailable.
  }
}

export function ToolLanguageProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>('zh-Hant');

  useEffect(() => {
    if (
      location.pathname !== '/tool' &&
      !location.pathname.startsWith('/tool/')
    )
      return;
    const stored = readStoredLocale();
    if (stored) {
      queueMicrotask(() => updateLocale(stored));
      return;
    }

    const controller = new AbortController();
    fetch('/api/locale', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok)
          throw new Error(`Locale lookup failed: ${response.status}`);
        return response.json() as Promise<{ locale?: unknown }>;
      })
      .then((data) => {
        if (isLocale(data.locale)) updateLocale(data.locale);
      })
      .catch(() => {
        // Preserve the site's established language when the edge endpoint is
        // unavailable (for example during a local static preview).
        updateLocale('zh-Hant');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    updateLocale(next);
    storeLocale(next);
  }, []);
  const tr = useCallback(
    (traditionalChinese: string, english: string) =>
      locale === 'en' ? english : traditionalChinese,
    [locale],
  );
  const value = useMemo(
    () => ({ locale, setLocale, tr }),
    [locale, setLocale, tr],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useToolLanguage() {
  return useContext(LanguageContext);
}

export function LocalizedText({ zh, en }: { zh: string; en: string }) {
  const { tr } = useToolLanguage();
  return <>{tr(zh, en)}</>;
}

export function LocalizedNav({
  zhLabel,
  enLabel,
  className,
  children,
}: {
  zhLabel: string;
  enLabel: string;
  className?: string;
  children: ReactNode;
}) {
  const { tr } = useToolLanguage();
  return (
    <nav className={className} aria-label={tr(zhLabel, enLabel)}>
      {children}
    </nav>
  );
}

export function LocalizedLink({
  href,
  zhLabel,
  enLabel,
  className,
  children,
}: {
  href: string;
  zhLabel: string;
  enLabel: string;
  className?: string;
  children: ReactNode;
}) {
  const { tr } = useToolLanguage();
  return (
    <a href={href} className={className} aria-label={tr(zhLabel, enLabel)}>
      {children}
    </a>
  );
}

export function LanguageSwitcher() {
  const { locale, setLocale, tr } = useToolLanguage();
  return (
    <div
      className="language-switcher"
      aria-label={tr('工具語言', 'Tool language')}
    >
      <button
        type="button"
        aria-pressed={locale === 'zh-Hant'}
        onClick={() => setLocale('zh-Hant')}
      >
        中文
      </button>
      <button
        type="button"
        aria-pressed={locale === 'en'}
        onClick={() => setLocale('en')}
      >
        EN
      </button>
    </div>
  );
}

export function LocalizedDocumentMetadata({
  titleZh,
  titleEn,
  descriptionZh,
  descriptionEn,
}: {
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
}) {
  const { locale } = useToolLanguage();
  useEffect(() => {
    document.title = `${locale === 'en' ? titleEn : titleZh}｜HubPLC`;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (description)
      description.content = locale === 'en' ? descriptionEn : descriptionZh;
  }, [descriptionEn, descriptionZh, locale, titleEn, titleZh]);
  return null;
}
