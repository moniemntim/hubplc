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
const relatedLessons: Partial<
  Record<ToolSlug, { slug: string; zh: string; en: string }>
> = {
  analog: {
    slug: 'plc-analog-scaling-pressure-temperature-level',
    zh: 'PLC 類比換算：從訊號、原始值到來源品質',
    en: 'PLC analog scaling and source quality (Chinese article)',
  },
  'plc-scaling': {
    slug: 'plc-analog-scaling-pressure-temperature-level',
    zh: 'PLC 類比換算：原始值、工程量與異常判讀',
    en: 'PLC raw-count scaling and diagnostics (Chinese article)',
  },
  'modbus-address': {
    slug: 'modbus-function-code-01-04-read-list',
    zh: '從設備資料表建立可驗收的 Modbus 讀取清單',
    en: 'Build a Modbus read list from a device map (Chinese article)',
  },
  'modbus-crc': {
    slug: 'rs485-no-response-troubleshooting',
    zh: 'RS485 沒有回應時，先確認封包停在哪一段',
    en: 'Trace an RS485 request with no response (Chinese article)',
  },
  'register-converter': {
    slug: 'blackbox-observable',
    zh: '用 FC03 離線驗收表核對位址與 Float32',
    en: 'Check FC03 address and Float32 with an offline record (Chinese article)',
  },
};
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
  const relatedLesson = relatedLessons[slug];
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
        {relatedLesson ? (
          <aside className="tool-example" aria-label="相關操作教學">
            <strong>
              <LocalizedText
                zh="接著核對實際資料"
                en="Continue with a worked lesson"
              />
            </strong>
            <p>
              <Link href={'/articles/' + relatedLesson.slug}>
                <LocalizedText zh={relatedLesson.zh} en={relatedLesson.en} />
              </Link>
            </p>
          </aside>
        ) : null}
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
