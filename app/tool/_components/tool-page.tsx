import Link from '@/components/site-link';
import AdSense from '@/components/adsense';
import PlcGuide from './plc-guide';
import type { Metadata } from 'next';
import {
  getTool,
  toolExamples,
  tools,
  type ToolSlug,
} from '@/lib/tools/registry';
import { toolGuides } from '@/lib/tools/tool-guides';
import ToolGuide from './tool-guide';
import {
  LanguageSwitcher,
  LocalizedDocumentMetadata,
  LocalizedNav,
  LocalizedText,
} from '@/components/tool-language';
import { categoryEnglish, toolEnglish } from '@/lib/tools/tool-i18n';
import articles from '@/lib/article-index.generated.json';
import { SITE_ORIGIN } from '@/lib/site';
import { getPublicRelatedLessons } from '@/lib/tools/related-lessons';
import { unitWorkflows } from '@/lib/tools/unit-workflows';
export function toolMetadata(slug: ToolSlug): Metadata {
  const tool = getTool(slug);
  return {
    title: tool.name,
    description: tool.description,
    alternates: { canonical: `${SITE_ORIGIN}/tool/${slug}` },
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
  const application = unitWorkflows.find(
    (workflow) => `${workflow.group}-converter` === slug,
  );
  const guide = toolGuides[slug];
  const guideLinks =
    guide?.related?.flatMap((relatedSlug) => {
      const item = tools.find((candidate) => candidate.slug === relatedSlug);
      return item
        ? [
            {
              href: `/tool/${item.slug}`,
              name: { zh: item.name, en: toolEnglish[item.slug].name },
            },
          ]
        : [];
    }) ?? [];
  const relatedLessons = getPublicRelatedLessons(slug, articles);
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
          <Link href="/">
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
            ●{' '}
            {slug === 'ip-address' ? (
              <LocalizedText zh="查詢目前連線" en="Inspect your connection" />
            ) : (
              <LocalizedText zh="在瀏覽器內運算" en="Runs in your browser" />
            )}
          </span>
        </header>
        {application && (
          <LocalizedNav
            className="crypto-related"
            zhLabel="換算與應用入口"
            enLabel="Conversion and application shortcuts"
          >
            <a href="#unit-quick-conversion">
              <LocalizedText zh="快速單位換算" en="Quick unit conversion" />
            </a>
            <a href="#unit-workflow-title">
              <LocalizedText
                zh={'應用：' + application.title.zh}
                en={'Task: ' + application.title.en}
              />
            </a>
          </LocalizedNav>
        )}
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
        {guide && <ToolGuide guide={guide} related={guideLinks} />}
        {relatedLessons.length > 0 ? (
          <aside
            className="tool-example"
            aria-labelledby="related-walkthrough-title"
          >
            <strong id="related-walkthrough-title">
              <LocalizedText
                zh="相關實作與延伸操作"
                en="Related walkthroughs"
              />
            </strong>
            {relatedLessons.map((lesson) => (
              <p key={lesson.slug}>
                <Link href={'/articles/' + lesson.slug}>
                  <LocalizedText zh={lesson.zh} en={lesson.en} />
                </Link>
              </p>
            ))}
          </aside>
        ) : null}
        {!['編碼', '日常工具'].includes(tool.category) && <AdSense />}
        <div className="tool-page-end">
          <Link href="/">
            ← <LocalizedText zh="返回工具總覽" en="Back to all tools" />
          </Link>
          <Link href="/about#report">
            <LocalizedText zh="回報工具問題" en="Report a tool issue" /> ↗
          </Link>
        </div>
      </main>
    </>
  );
}
