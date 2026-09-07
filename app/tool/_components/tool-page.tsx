import Link from '@/components/site-link';
import AdSense from '@/components/adsense';
import type { Metadata } from 'next';
import { getTool, toolExamples, type ToolSlug } from '@/lib/tools/registry';
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
  return (
    <main className="shell tool-page">
      {tool.category !== '編碼' && <AdSense />}
      <nav className="breadcrumbs" aria-label="所在位置">
        <Link href="/tool">工具總覽</Link>
        <span>/</span>
        <span>{tool.category}</span>
      </nav>
      <header className="tool-heading">
        <div>
          <p className="eyebrow">HUBPLC / {tool.code}</p>
          <h1>{tool.name}</h1>
          <p className="lead">{tool.description}</p>
        </div>
        <span className="local-badge">● 在瀏覽器內運算</span>
      </header>
      {['world-clock', 'timestamp-converter', 'date-calculator'].includes(
        slug,
      ) && (
        <nav className="crypto-related" aria-label="時間與日期工具">
          {(
            ['world-clock', 'timestamp-converter', 'date-calculator'] as const
          ).map((item) => (
            <Link
              key={item}
              href={`/tool/${item}`}
              aria-current={slug === item ? 'page' : undefined}
            >
              {getTool(item).name}
            </Link>
          ))}
        </nav>
      )}
      {['crypto', 'hash', 'key-derivation', 'byte-encoding'].includes(slug) && (
        <nav className="crypto-related" aria-label="加密與編碼工具">
          {(['crypto', 'hash', 'key-derivation', 'byte-encoding'] as const).map(
            (item) => (
              <Link
                key={item}
                href={`/tool/${item}`}
                aria-current={slug === item ? 'page' : undefined}
              >
                {getTool(item).name}
              </Link>
            ),
          )}
        </nav>
      )}
      {children}
      <aside className="tool-example">
        <strong>試算範例</strong>
        <p>{toolExamples[slug]}</p>
      </aside>
      <div className="tool-page-end">
        <Link href="/tool">← 返回工具總覽</Link>
        <Link href="/articles">閱讀 PLC 技術文章 ↗</Link>
      </div>
    </main>
  );
}
