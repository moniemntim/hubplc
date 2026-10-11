'use client';
import Link from '@/components/site-link';
import { useState } from 'react';
import { Search, ArrowUpRight } from 'lucide-react';
import { tools, categories } from '@/lib/tools/registry';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  LanguageSwitcher,
  LocalizedDocumentMetadata,
  useToolLanguage,
} from '@/components/tool-language';
import { categoryEnglish, toolEnglish } from '@/lib/tools/tool-i18n';
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
  return (
    <main className="shell directory">
      <LocalizedDocumentMetadata
        titleZh="實用工具"
        titleEn="Engineering Tools"
        descriptionZh={`${tools.length} 個免費 PLC、電路、編碼與工程單位工具。`}
        descriptionEn={`${tools.length} free PLC, electrical, encoding and engineering unit tools.`}
      />
      <div className="directory-heading">
        <div>
          <p className="eyebrow">ENGINEERING TOOLBOX / {tools.length} TOOLS</p>
          <h1>
            {tr('把計算交給工具，', 'Let the tools handle the math,')}
            <br />
            {tr('把時間留給現場', 'and keep your time for the field')}
            <span>。</span>
          </h1>
          <p className="lead">
            {tr(
              'PLC、電路、編碼與單位換算。免費使用，無須註冊。',
              'PLC, electrical, encoding and unit-conversion tools. Free to use, with no registration.',
            )}
          </p>
        </div>
        <div className="directory-mark" aria-hidden="true">
          [ {tools.length} ]<small>READY TO USE</small>
        </div>
      </div>
      <div className="directory-toolbar">
        <LanguageSwitcher />
        <label className="tool-search">
          <Search size={19} />
          <span className="sr-only">{tr('搜尋工具', 'Search tools')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tr(
              '搜尋工具、單位或關鍵字…',
              'Search tools, units or keywords…',
            )}
          />
        </label>
        <Tabs
          value={category}
          onValueChange={(value) => setCategory(String(value))}
        >
          <TabsList className="category-tabs">
            {categories.map((value) => (
              <TabsTrigger key={value} value={value}>
                {locale === 'en' ? categoryEnglish[value] : value}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={category}>
            <output className="results-count">
              {tr(`${matches.length} 個工具`, `${matches.length} tools`)}
            </output>
            <div className="tools-grid">
              {matches.map((tool) => (
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
                  <h2>
                    {locale === 'en' ? toolEnglish[tool.slug].name : tool.name}
                  </h2>
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
      </div>
    </main>
  );
}
