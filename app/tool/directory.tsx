'use client';
import Link from '@/components/site-link';
import { useState } from 'react';
import { Search, ArrowUpRight, X } from 'lucide-react';
import { tools, categories } from '@/lib/tools/registry';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  LanguageSwitcher,
  LocalizedDocumentMetadata,
  useToolLanguage,
} from '@/components/tool-language';
import { categoryEnglish, toolEnglish } from '@/lib/tools/tool-i18n';

const shortcuts = [
  'analog',
  'ac-power-converter',
  'qrcode',
  'date-calculator',
] as const;
const suggestions = [
  { zh: '4–20 mA', en: '4–20 mA', query: 'analog' },
  { zh: '電費', en: 'Energy cost', query: 'energy cost' },
  { zh: 'QR Code', en: 'QR Code', query: 'QR' },
  { zh: '日期', en: 'Dates', query: 'date' },
];
export default function Directory() {
  const { locale, tr } = useToolLanguage();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matches = tools.filter(
    (tool) =>
      (category === '全部' || tool.category === category) &&
      words.every((word) =>
        `${tool.name} ${tool.description} ${tool.keywords} ${toolEnglish[tool.slug].name} ${toolEnglish[tool.slug].description}`
          .toLocaleLowerCase()
          .includes(word),
      ),
  );
  const groups = categories
    .filter((name) => name !== '全部')
    .map((name) => ({
      name,
      tools: matches.filter((tool) => tool.category === name),
    }))
    .filter((group) => group.tools.length > 0);
  return (
    <main className="shell directory tool-home">
      <LocalizedDocumentMetadata
        titleZh="免費線上工具箱"
        titleEn="Free Online Tools"
        descriptionZh={`${tools.length} 個免費線上工具：PLC 與電路計算、文字編碼、單位換算及時間工具，免註冊直接使用。`}
        descriptionEn={`${tools.length} free online tools for PLC and electrical calculations, encoding, unit conversion, and time. No registration required.`}
      />
      <div className="tool-home-topline">
        <p className="eyebrow">HUBPLC / ONLINE TOOLS</p>
        <LanguageSwitcher />
      </div>
      <header className="directory-heading tool-home-heading">
        <div>
          <h1>
            {tr('常用工具，', 'Useful tools,')}
            <br />
            {tr('打開就能用', 'ready when you are')}
            <span>{tr('。', '.')}</span>
          </h1>
          <p className="lead">
            {tr(
              'PLC 與電路計算、文字編碼、單位換算及時間工具。選一個工具直接開始，免費使用，無須註冊。',
              'PLC and electrical calculations, encoding, unit conversion, and time tools. Choose a tool and get started for free, with no registration.',
            )}
          </p>
        </div>
        <dl className="tool-home-summary">
          <div>
            <dt>{tr('線上工具', 'Online tools')}</dt>
            <dd>
              {tools.length}
              <span>{tr(' 個', ' tools')}</span>
            </dd>
          </div>
          <div>
            <dt>{tr('工具分類', 'Categories')}</dt>
            <dd>
              {categories.length - 1}
              <span>{tr(' 類', ' groups')}</span>
            </dd>
          </div>
        </dl>
      </header>
      <section
        id="tools"
        className="directory-toolbar"
        aria-label={tr('尋找工具', 'Find a tool')}
      >
        <label className="tool-search">
          <Search size={19} />
          <span className="sr-only">{tr('搜尋工具', 'Search tools')}</span>
          <input
            id="tool-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tr(
              '搜尋工具、單位或關鍵字…',
              'Search tools, units or keywords…',
            )}
          />
          {query && (
            <button
              type="button"
              className="tool-search-clear"
              aria-label={tr('清除搜尋', 'Clear search')}
              onClick={() => setQuery('')}
            >
              <X size={18} />
            </button>
          )}
        </label>
        <div className="tool-home-suggestions">
          <span>{tr('試試搜尋', 'Try searching')}</span>
          {suggestions.map((item) => (
            <button
              key={item.query}
              type="button"
              onClick={() => {
                setQuery(item.query);
                setCategory('全部');
              }}
            >
              {tr(item.zh, item.en)}
            </button>
          ))}
        </div>
        <nav
          className="tool-home-shortcuts"
          aria-label={tr('快速開啟工具', 'Quick tool links')}
        >
          <span>{tr('快速開啟', 'Quick access')}</span>
          {shortcuts.map((slug) => (
            <Link key={slug} href={`/tool/${slug}`}>
              {locale === 'en'
                ? toolEnglish[slug].name
                : tools.find((tool) => tool.slug === slug)!.name}
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          ))}
        </nav>
        <Tabs
          value={category}
          onValueChange={(value) => setCategory(String(value))}
        >
          <TabsList className="category-tabs">
            {categories.map((value) => (
              <TabsTrigger
                key={value}
                value={value}
                aria-label={locale === 'en' ? categoryEnglish[value] : value}
              >
                {locale === 'en' ? categoryEnglish[value] : value}
                <span className="tool-category-count" aria-hidden="true">
                  {value === '全部'
                    ? tools.length
                    : tools.filter((tool) => tool.category === value).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={category}>
            <output className="results-count" aria-live="polite">
              {tr(`${matches.length} 個工具`, `${matches.length} tools`)}
            </output>
            <div className="tool-groups">
              {groups.map((group, index) => (
                <section
                  className="tool-category-section"
                  key={group.name}
                  aria-labelledby={`tool-group-${index}`}
                >
                  <div className="tool-category-heading">
                    <h2 id={`tool-group-${index}`}>
                      {group.name === '單位'
                        ? tr('單位與時間工具', 'Units and time tools')
                        : locale === 'en'
                          ? categoryEnglish[group.name]
                          : group.name}
                    </h2>
                    <span>
                      {tr(
                        `${group.tools.length} 個工具`,
                        `${group.tools.length} tools`,
                      )}
                    </span>
                  </div>
                  <div className="tools-grid">
                    {group.tools.map((tool) => (
                      <Link
                        key={tool.slug}
                        className="tool-card"
                        href={`/tool/${tool.slug}`}
                      >
                        <div className="tool-card-top">
                          <span className="tool-code">{tool.code}</span>
                          <ArrowUpRight size={20} />
                        </div>
                        <span className="tool-category">
                          {locale === 'en'
                            ? categoryEnglish[tool.category]
                            : tool.category}
                        </span>
                        <h3>
                          {locale === 'en'
                            ? toolEnglish[tool.slug].name
                            : tool.name}
                        </h3>
                        <p>
                          {locale === 'en'
                            ? toolEnglish[tool.slug].description
                            : tool.description}
                        </p>
                        <span className="tool-open">
                          {tr('打開工具', 'Open tool')} <span>→</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            {matches.length === 0 && (
              <div className="empty-state">
                <h2>{tr('找不到符合的工具', 'No matching tools')}</h2>
                <p>
                  {tr(
                    '試試「類比」、「電阻」、「HEX」或清除篩選。',
                    'Try “analog”, “resistor”, “HEX”, or clear the filters.',
                  )}
                </p>
                <button
                  className="action"
                  onClick={() => {
                    setQuery('');
                    setCategory('全部');
                  }}
                >
                  {tr('顯示所有工具', 'Show all tools')}
                </button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
