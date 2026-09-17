'use client';

import { useSyncExternalStore } from 'react';

type TocItem = {
  id: string;
  title: string;
  level: 2 | 3;
};

const DIRECTORY_KEY = 'hubplc:article-directory';
const DEFAULT_DIRECTORY_HREF = '/articles';

function getDirectoryHref() {
  try {
    const saved = sessionStorage.getItem(DIRECTORY_KEY);
    if (!saved) return DEFAULT_DIRECTORY_HREF;

    const directory: unknown = JSON.parse(saved);
    if (
      !directory ||
      typeof directory !== 'object' ||
      !('url' in directory) ||
      typeof directory.url !== 'string' ||
      !('scrollY' in directory) ||
      typeof directory.scrollY !== 'number' ||
      !Number.isFinite(directory.scrollY) ||
      directory.scrollY < 0 ||
      !directory.url.startsWith('/articles')
    ) {
      return DEFAULT_DIRECTORY_HREF;
    }

    const url = new URL(directory.url, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      (url.pathname !== '/articles' && url.pathname !== '/articles/')
    ) {
      return DEFAULT_DIRECTORY_HREF;
    }

    return url.pathname + url.search + url.hash;
  } catch {
    return DEFAULT_DIRECTORY_HREF;
  }
}

function subscribeToDirectory() {
  return () => {};
}

export function ArticleDirectoryLink() {
  const href = useSyncExternalStore(
    subscribeToDirectory,
    getDirectoryHref,
    () => DEFAULT_DIRECTORY_HREF,
  );

  return (
    <a className="article-reader__back-link" href={href}>
      ← 所有文章
    </a>
  );
}

function TocLinks({ toc }: { toc: TocItem[] }) {
  return (
    <ol className="article-reader__toc-list">
      {toc.map((item) => (
        <li
          className={
            item.level === 3
              ? 'article-reader__toc-item article-reader__toc-item--sub'
              : 'article-reader__toc-item'
          }
          key={item.id}
        >
          <a href={'#' + item.id}>{item.title}</a>
        </li>
      ))}
    </ol>
  );
}

export default function ArticleReadingNav({ toc = [] }: { toc?: TocItem[] }) {
  if (!toc.length) return null;

  return (
    <>
      <aside className="article-reader__toc-desktop">
        <nav aria-label="文章目錄">
          <p>本文目錄</p>
          <TocLinks toc={toc} />
        </nav>
      </aside>
      <details className="article-reader__toc-mobile">
        <summary>本文目錄</summary>
        <nav aria-label="文章目錄">
          <TocLinks toc={toc} />
        </nav>
      </details>
    </>
  );
}
