import Link from '@/components/site-link';
import AdSense from '@/components/adsense';
import PlcGuide from './plc-guide';
import type { Metadata } from 'next';
import { getTool, toolExamples, type ToolSlug } from '@/lib/tools/registry';
import {
  LanguageSwitcher,
  LocalizedDocumentMetadata,
  LocalizedNav,
  LocalizedText,
} from '@/components/tool-language';
import { categoryEnglish, toolEnglish } from '@/lib/tools/tool-i18n';
export function toolMetadata(slug: ToolSlug): Metadata {
  const tool = getTool(slug);
  return {
    title: tool.name,
    description: tool.description,
    alternates: { canonical: `https://hubplc.com/tool/${slug}` },
  };
}
export default function ToolPage({
  slug,
  children,
}: {
  slug: ToolSlug;
  children: React.ReactNode;
}) {
  const tool = getTool(slug);
  const english = toolEnglish[slug];
  return (
    <>
      <main className="shell tool-page">
        <LocalizedDocumentMetadata
          titleZh={tool.name}
          titleEn={english.name}
          descriptionZh={tool.description}
          descriptionEn={english.description}
        />
        <LanguageSwitcher />
        <LocalizedNav
          className="breadcrumbs"
          zhLabel="所在位置"
          enLabel="Location"
        >
          <Link href="/tool">
            <LocalizedText zh="工具總覽" en="All tools" />
          </Link>
          <span>/</span>
          <span>
            <LocalizedText
              zh={tool.category}
              en={categoryEnglish[tool.category]}
            />
          </span>
        </LocalizedNav>
        <header className="tool-heading">
          <div>
            <p className="eyebrow">HUBPLC / {tool.code}</p>
            <h1>
              <LocalizedText zh={tool.name} en={english.name} />
            </h1>
            <p className="lead">
              <LocalizedText zh={tool.description} en={english.description} />
            </p>
          </div>
          <span className="local-badge">
            ● <LocalizedText zh="在瀏覽器內運算" en="Runs in your browser" />
          </span>
        </header>
        {[
          'stopwatch',
          'world-clock',
          'timestamp-converter',
          'date-calculator',
        ].includes(slug) && (
          <LocalizedNav
            className="crypto-related"
            zhLabel="時間與日期工具"
            enLabel="Time and date tools"
          >
            {(
              [
                'stopwatch',
                'world-clock',
                'timestamp-converter',
                'date-calculator',
              ] as const
            ).map((item) => (
              <Link
                key={item}
                href={`/tool/${item}`}
                aria-current={slug === item ? 'page' : undefined}
              >
                <LocalizedText
                  zh={getTool(item).name}
                  en={toolEnglish[item].name}
                />
              </Link>
            ))}
          </LocalizedNav>
        )}
        {['crypto', 'hash', 'key-derivation', 'byte-encoding'].includes(
          slug,
        ) && (
          <LocalizedNav
            className="crypto-related"
            zhLabel="加密與編碼工具"
            enLabel="Cryptography and encoding tools"
          >
            {(
              ['crypto', 'hash', 'key-derivation', 'byte-encoding'] as const
            ).map((item) => (
              <Link
                key={item}
                href={`/tool/${item}`}
                aria-current={slug === item ? 'page' : undefined}
              >
                <LocalizedText
                  zh={getTool(item).name}
                  en={toolEnglish[item].name}
                />
              </Link>
            ))}
          </LocalizedNav>
        )}
        {children}
        <aside className="tool-example">
          <strong>
            <LocalizedText zh="試算範例" en="Worked example" />
          </strong>
          <p>
            <LocalizedText zh={toolExamples[slug]} en={english.example} />
          </p>
        </aside>
        <PlcGuide slug={slug} />
        {tool.category !== '編碼' && <AdSense />}
        <div className="tool-page-end">
          <Link href="/tool">
            ← <LocalizedText zh="返回工具總覽" en="Back to all tools" />
          </Link>
          <Link href="/articles">
            <LocalizedText
              zh="閱讀 PLC 技術文章"
              en="Read PLC articles (Chinese)"
            />{' '}
            ↗
          </Link>
        </div>
      </main>
    </>
  );
}
