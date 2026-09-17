import test from 'node:test';
import assert from 'node:assert/strict';
import { articleMetadata, plainText } from '../scripts/article-metadata.mjs';
import {
  DEFAULT_FILTERS,
  filterArticles,
  filtersUrl,
  normalizeSearch,
  pageNumbers,
  paginate,
  readFilters,
} from '../lib/article-catalog.ts';

const makeArticle = (
  slug,
  title,
  category = 'PLC 程式與控制',
  date = '2026-09-17',
) => ({
  slug,
  title,
  description: '技術筆記',
  category,
  date,
  author: '作者',
  tags: [],
  readingMinutes: 2,
});

void test('catalog searches fullwidth, hyphens and multiple words across metadata and body', () => {
  const articles = [
    makeArticle('rs485', 'RS-485 終端電阻', '工業通訊與網路'),
    makeArticle('timer', 'PLC 計時器'),
  ];
  const index = {
    rs485: normalizeSearch('偏壓與特殊內文證據'),
    timer: normalizeSearch('計時器 TON'),
  };
  const found = filterArticles(
    articles,
    { ...DEFAULT_FILTERS, query: 'ＲＳ４８５ 特殊內文證據' },
    index,
  );
  assert.deepEqual(
    found.map(({ article }) => article.slug),
    ['rs485'],
  );
  assert.equal(found[0].bodyMatch, true);
  assert.equal(
    filterArticles(articles, { ...DEFAULT_FILTERS, query: '不存在' }, index)
      .length,
    0,
  );
  assert.equal(
    filterArticles(
      articles,
      { ...DEFAULT_FILTERS, query: 'RS485', category: 'PLC 程式與控制' },
      index,
    ).length,
    0,
  );
});

void test('catalog ranks title matches above body matches and sorts dates deterministically', () => {
  const articles = [
    makeArticle('body', '通訊概念'),
    makeArticle('title', 'MQTT 入門'),
    makeArticle('older', '其他內容', 'PLC 程式與控制', '2025-01-01'),
  ];
  assert.equal(
    filterArticles(
      articles,
      { ...DEFAULT_FILTERS, query: 'mqtt' },
      { body: 'mqtt' },
    )[0].article.slug,
    'title',
  );
  assert.equal(
    filterArticles(articles, { ...DEFAULT_FILTERS, sort: 'oldest' })[0].article
      .slug,
    'older',
  );
  assert.deepEqual(
    filterArticles(articles, { ...DEFAULT_FILTERS, sort: 'newest' }).map(
      ({ article }) => article.slug,
    ),
    ['body', 'title', 'older'],
  );
});

void test('249 entries remain reachable through bounded pagination including invalid pages', () => {
  const articles = Array.from({ length: 249 }, (_, index) => index);
  assert.equal(paginate(articles, 1).entries.length, 12);
  assert.equal(paginate(articles, 999).page, 21);
  assert.deepEqual(
    paginate(articles, 21).entries,
    [240, 241, 242, 243, 244, 245, 246, 247, 248],
  );
  assert.deepEqual(paginate([], 2), { page: 1, pageCount: 1, entries: [] });
  assert.equal(paginate(articles, -5).page, 1);
  assert.deepEqual(pageNumbers(11, 21), [
    1,
    'gap-left',
    10,
    11,
    12,
    'gap-right',
    21,
  ]);
});

void test('URL filters round trip and reject unknown categories and malformed page values', () => {
  const value = {
    query: 'RS485 偏壓',
    category: '工業通訊與網路',
    sort: 'oldest',
    page: 3,
    view: 'grid',
  };
  assert.deepEqual(
    readFilters(new URL(filtersUrl(value), 'https://example.test').search, [
      '工業通訊與網路',
    ]),
    value,
  );
  for (const page of ['-1', 'Infinity', '1.5', 'no', '99999999999999999999'])
    assert.equal(readFilters(`?page=${page}&category=invalid`, []).page, 1);
  assert.equal(readFilters('?q=' + 'x'.repeat(200), []).query.length, 160);
  assert.equal(readFilters('?sort=invalid&view=no', []).sort, 'relevance');
});

void test('heading anchors stay unique, inline entities decode, and explicit metadata wins', () => {
  const enriched = articleMetadata(
    { title: '測試', category: '自訂主題', tags: 'PLC, PLC，測試' },
    'modbus-demo',
    '<h2>相同 <code>A&amp;B</code></h2><p>段落</p><h3>相同</h3><h2>相同</h2>',
  );
  assert.deepEqual(
    enriched.toc.map(({ id }) => id),
    ['section-1', 'section-2', 'section-3'],
  );
  assert.equal(enriched.toc[0].title, '相同 A&B');
  assert.equal(enriched.category, '自訂主題');
  assert.deepEqual(enriched.tags, ['PLC', '測試']);
  assert.ok(enriched.readingMinutes >= 1);
  assert.equal(plainText('<p>一</p><p>二 &lt;三&gt;</p>'), '一 二 <三>');
  assert.equal(
    articleMetadata({ title: '無標題段落' }, 'plain', '<p>內容</p>').toc.length,
    0,
  );
});
