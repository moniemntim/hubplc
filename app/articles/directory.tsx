'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  List,
  Search,
  X,
} from 'lucide-react';
import Link from '@/components/site-link';
import {
  CATEGORY_ORDER,
  DEFAULT_FILTERS,
  PAGE_SIZE,
  filterArticles,
  filtersUrl,
  normalizeSearch,
  pageNumbers,
  paginate,
  readFilters,
  type ArticleFilters,
  type ArticleSummary,
} from '@/lib/article-catalog';
import './directory.css';

export default function ArticleDirectory({
  articles,
}: {
  articles: ArticleSummary[];
}) {
  const [filters, setFilters] = useState<ArticleFilters>(DEFAULT_FILTERS);
  const [ready, setReady] = useState(false);
  const [searchIndex, setSearchIndex] = useState<Record<string, string>>({});
  const [searchStatus, setSearchStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [retry, setRetry] = useState(0);
  const indexLoaded = useRef(false);
  const restoredScroll = useRef(false);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const categories = useMemo(
    () =>
      [...new Set(articles.map((article) => article.category))].sort((a, b) => {
        const first = CATEGORY_ORDER.indexOf(a);
        const second = CATEGORY_ORDER.indexOf(b);
        return (
          (first < 0 ? 99 : first) - (second < 0 ? 99 : second) ||
          a.localeCompare(b, 'zh-Hant')
        );
      }),
    [articles],
  );
  const categoryCounts = useMemo(
    () =>
      Object.fromEntries(
        categories.map((category) => [
          category,
          articles.filter((article) => article.category === category).length,
        ]),
      ),
    [articles, categories],
  );
  const hasQuery = Boolean(filters.query.trim());
  const searchPending =
    hasQuery && (searchStatus === 'idle' || searchStatus === 'loading');
  const matches = useMemo(
    () => filterArticles(articles, filters, searchIndex),
    [articles, filters, searchIndex],
  );
  const paged = paginate(matches, filters.page);

  useEffect(() => {
    function restoreFilters() {
      setFilters(readFilters(window.location.search, categories));
      setReady(true);
    }
    restoreFilters();
    window.addEventListener('popstate', restoreFilters);
    return () => window.removeEventListener('popstate', restoreFilters);
  }, [categories]);

  useEffect(() => {
    if (!ready) return;
    if (!hasQuery) {
      if (!indexLoaded.current) setSearchStatus('idle');
      return;
    }
    if (indexLoaded.current) return;
    const controller = new AbortController();
    let active = true;
    setSearchStatus('loading');
    fetch('/article-search.json', {
      signal: controller.signal,
      cache: 'no-cache',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Search index unavailable');
        const data: unknown = await response.json();
        if (!data || typeof data !== 'object' || Array.isArray(data))
          throw new Error('Invalid search index');
        const index: Record<string, string> = {};
        for (const article of articles) {
          const text = (data as Record<string, unknown>)[article.slug];
          if (typeof text !== 'string')
            throw new Error('Incomplete search index');
          index[article.slug] = normalizeSearch(text);
        }
        if (active) {
          indexLoaded.current = true;
          setSearchIndex(index);
          setSearchStatus('ready');
        }
      })
      .catch(() => {
        if (active) setSearchStatus('error');
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [ready, hasQuery, retry, articles]);

  useEffect(() => {
    if (!ready || searchPending) return;
    const url = filtersUrl({ ...filters, page: paged.page });
    if (window.location.pathname + window.location.search !== url)
      window.history.replaceState(null, '', url);
  }, [ready, filters, paged.page, searchPending]);

  useEffect(() => {
    if (!ready || searchPending || restoredScroll.current) return;
    restoredScroll.current = true;
    let frame = 0;
    try {
      const saved = JSON.parse(
        sessionStorage.getItem('hubplc:article-directory') ?? 'null',
      );
      if (
        saved?.url === window.location.pathname + window.location.search &&
        Number.isFinite(saved.scrollY) &&
        saved.scrollY >= 0
      ) {
        frame = requestAnimationFrame(() => window.scrollTo(0, saved.scrollY));
      }
    } catch {
      /* Storage can be disabled; navigation remains available. */
    }
    return () => cancelAnimationFrame(frame);
  }, [ready, searchPending]);

  function update(next: Partial<ArticleFilters>, scroll = false) {
    restoredScroll.current = true;
    const value = { ...filters, page: paged.page, ...next };
    setFilters(value);
    window.history.replaceState(null, '', filtersUrl(value));
    if (scroll)
      requestAnimationFrame(() => {
        resultsHeading.current?.scrollIntoView({ block: 'start' });
        resultsHeading.current?.focus({ preventScroll: true });
      });
  }
  function rememberList() {
    try {
      sessionStorage.setItem(
        'hubplc:article-directory',
        JSON.stringify({
          url: window.location.pathname + window.location.search,
          scrollY: window.scrollY,
        }),
      );
    } catch {
      /* Filters are also represented in the URL. */
    }
  }
  function clear() {
    update({ ...DEFAULT_FILTERS, view: filters.view });
  }

  return (
    <main className="article-library">
      <header className="library-heading">
        <div>
          <p className="eyebrow">FIELD NOTES / 技術筆記</p>
          <h1>
            找到問題，也找到解法<span>。</span>
          </h1>
          <p>從 PLC 程式到現場除錯，依主題探索，或直接搜尋需要的內容。</p>
        </div>
        <div className="library-total">
          <strong>{articles.length}</strong>
          <span>篇技術文章</span>
        </div>
      </header>

      <section className="library-start" aria-labelledby="start-heading">
        <h2 id="start-heading">第一次來，先完成一個操作</h2>
        <p>
          以下三課可在頁面直接練習，無需安裝。屬於瀏覽器邏輯模型，並非原廠模擬或實機測試。
        </p>
        <ol>
          <li>
            <Link href="/articles/plc-self-hold-set-reset-q-series">
              自保持：啟動後保持，停止優先
            </Link>
          </li>
          <li>
            <Link href="/articles/plc-fault-reset-single-acceptance">
              故障復歸：有效釋放後才接受一次
            </Link>
          </li>
          <li>
            <Link href="/articles/plc-state-machine-three-step-sequence">
              順序控制：分清等待、執行、完成與故障
            </Link>
          </li>
        </ol>
        <p>已有特定問題，可用下方搜尋找對應文章。</p>
      </section>
      <section className="library-search-area" aria-label="搜尋文章">
        <label className="library-search">
          <Search size={22} aria-hidden="true" />
          <span className="sr-only">搜尋文章標題、關鍵字或內文</span>
          <input
            type="search"
            maxLength={160}
            value={filters.query}
            onChange={(event) => update({ query: event.target.value, page: 1 })}
            placeholder="搜尋標題、關鍵字或內文，例如 RS485、計時器…"
          />
        </label>
        <div className="library-suggestions">
          <span>常用主題</span>
          {['RS485', 'Modbus', 'HMI', 'CSV', '計時器'].map((word) => (
            <button
              type="button"
              key={word}
              onClick={() => update({ query: word, category: '', page: 1 })}
            >
              {word}
            </button>
          ))}
        </div>
      </section>

      <div className="library-layout">
        <aside className="library-categories" aria-label="文章主題分類">
          <h2>依主題探索</h2>
          <div className="library-category-options">
            <button
              type="button"
              aria-pressed={!filters.category}
              onClick={() => update({ category: '', page: 1 })}
            >
              <span>所有文章</span>
              <span>{articles.length}</span>
            </button>
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                aria-pressed={filters.category === category}
                onClick={() => update({ category, page: 1 })}
              >
                <span>{category}</span>
                <span>{categoryCounts[category]}</span>
              </button>
            ))}
          </div>
          <p className="library-category-help">
            選擇主題後，可以再用關鍵字縮小範圍。
          </p>
          <Link className="library-tool-link" href="/tool">
            需要工程換算？
            <br />
            <strong>
              打開實用工具 <ArrowUpRight size={16} aria-hidden="true" />
            </strong>
          </Link>
        </aside>

        <section
          className="library-results"
          aria-labelledby="article-results-title"
        >
          <div className="library-results-toolbar">
            <div>
              <h2 id="article-results-title" ref={resultsHeading} tabIndex={-1}>
                {filters.category || (hasQuery ? '搜尋結果' : '所有文章')}
              </h2>
              <p aria-live="polite">
                {searchPending
                  ? '正在準備內文搜尋…'
                  : matches.length
                    ? `共 ${matches.length} 篇 · 顯示第 ${(paged.page - 1) * PAGE_SIZE + 1}–${Math.min(paged.page * PAGE_SIZE, matches.length)} 篇`
                    : '沒有符合的文章'}
              </p>
            </div>
            <div className="library-display-controls">
              <label>
                <span className="sr-only">文章排序</span>
                <select
                  value={filters.sort}
                  onChange={(event) =>
                    update({
                      sort: event.target.value as ArticleFilters['sort'],
                      page: 1,
                    })
                  }
                >
                  <option value="relevance">相關性／最新</option>
                  <option value="newest">日期：新到舊</option>
                  <option value="oldest">日期：舊到新</option>
                  <option value="title">標題順序</option>
                </select>
              </label>
              <fieldset className="library-view-toggle">
                <legend className="sr-only">顯示方式</legend>
                <button
                  type="button"
                  aria-label="列表顯示"
                  aria-pressed={filters.view === 'list'}
                  onClick={() => update({ view: 'list' })}
                >
                  <List size={18} />
                </button>
                <button
                  type="button"
                  aria-label="卡片顯示"
                  aria-pressed={filters.view === 'grid'}
                  onClick={() => update({ view: 'grid' })}
                >
                  <Grid2X2 size={18} />
                </button>
              </fieldset>
            </div>
          </div>
          {(hasQuery || filters.category) && (
            <div className="library-active-filters">
              {hasQuery && <span>關鍵字：{filters.query}</span>}
              {filters.category && <span>{filters.category}</span>}
              <button type="button" onClick={clear}>
                <X size={14} aria-hidden="true" />
                清除篩選
              </button>
            </div>
          )}
          {hasQuery && searchStatus === 'error' && (
            <output className="library-search-notice">
              內文搜尋暫時無法載入，目前搜尋標題、摘要與標籤。
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
              >
                重新載入
              </button>
            </output>
          )}

          <div
            className={`library-articles library-articles-${filters.view}`}
            aria-busy={searchPending}
          >
            {paged.entries.map(({ article, bodyMatch }) => (
              <Link
                className="library-article"
                key={article.slug}
                href={`/articles/${article.slug}`}
                onClick={rememberList}
              >
                <div className="library-article-category">
                  {article.category}
                  {bodyMatch && <span>內文符合</span>}
                </div>
                <h3>{article.title}</h3>
                <p className="library-article-description">
                  {article.description}
                </p>
                <div className="library-article-footer">
                  <span>
                    <time dateTime={article.date}>{article.date}</time>
                    <span aria-hidden="true"> · </span>約{' '}
                    {article.readingMinutes} 分鐘
                  </span>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
          {!matches.length && !searchPending && (
            <div className="library-empty">
              <Search size={28} aria-hidden="true" />
              <h3>
                {articles.length
                  ? '換個關鍵字，再找找看。'
                  : '技術文章，準備中。'}
              </h3>
              <p>
                {articles.length
                  ? '試試較短的詞，或取消主題分類，搜尋所有文章。'
                  : '先到工具箱，使用免費工程換算工具。'}
              </p>
              {articles.length ? (
                <button type="button" onClick={clear}>
                  顯示所有文章
                </button>
              ) : (
                <Link href="/tool">前往工具箱 →</Link>
              )}
            </div>
          )}

          {paged.pageCount > 1 && (
            <nav className="library-pagination" aria-label="文章分頁">
              <div className="library-page-buttons">
                <button
                  type="button"
                  aria-label="上一頁"
                  disabled={paged.page === 1}
                  onClick={() => update({ page: paged.page - 1 }, true)}
                >
                  <ChevronLeft size={17} />
                </button>
                {pageNumbers(paged.page, paged.pageCount).map((page) =>
                  typeof page === 'number' ? (
                    <button
                      type="button"
                      key={page}
                      aria-label={`第 ${page} 頁`}
                      aria-current={page === paged.page ? 'page' : undefined}
                      onClick={() => update({ page }, true)}
                    >
                      {page}
                    </button>
                  ) : (
                    <span key={page} aria-hidden="true">
                      …
                    </span>
                  ),
                )}
                <button
                  type="button"
                  aria-label="下一頁"
                  disabled={paged.page === paged.pageCount}
                  onClick={() => update({ page: paged.page + 1 }, true)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
              <label className="library-page-jump">
                跳至
                <select
                  aria-label="跳至頁碼"
                  value={paged.page}
                  onChange={(event) =>
                    update({ page: Number(event.target.value) }, true)
                  }
                >
                  {Array.from({ length: paged.pageCount }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </select>
                ／{paged.pageCount} 頁
              </label>
            </nav>
          )}
        </section>
      </div>
      <noscript>
        <div className="library-noscript">
          <p>啟用 JavaScript 即可使用搜尋、分類與分頁。以下是所有文章：</p>
          <ul>
            {articles.map((article) => (
              <li key={article.slug}>
                <Link href={`/articles/${article.slug}`}>{article.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      </noscript>
    </main>
  );
}
