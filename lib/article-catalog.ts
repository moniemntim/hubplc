export type ArticleSummary = {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  readingMinutes: number;
};
export type ArticleFilters = {
  query: string;
  category: string;
  sort: 'relevance' | 'newest' | 'oldest' | 'title';
  page: number;
  view: 'list' | 'grid';
};
export const PAGE_SIZE = 12;
export const DEFAULT_FILTERS: ArticleFilters = {
  query: '',
  category: '',
  sort: 'relevance',
  page: 1,
  view: 'list',
};
export const CATEGORY_ORDER = [
  'PLC 程式與控制',
  '工業通訊與網路',
  '感測器與量測',
  '電氣介面與配線',
  'HMI 畫面與操作',
  '資料記錄與報表',
  '維護與故障排查',
];
export function normalizeSearch(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\-‐‑–—]+/g, '');
}
export function readFilters(
  search: string,
  categories: string[],
): ArticleFilters {
  const params = new URLSearchParams(search);
  const sort = params.get('sort');
  const category = params.get('category') ?? '';
  const requestedPage = Number(params.get('page') ?? 1);
  return {
    query: (params.get('q') ?? '').slice(0, 160),
    category: categories.includes(category) ? category : '',
    sort:
      sort === 'newest' || sort === 'oldest' || sort === 'title'
        ? sort
        : 'relevance',
    page:
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1,
    view: params.get('view') === 'grid' ? 'grid' : 'list',
  };
}
export function filtersUrl(filters: ArticleFilters) {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.category) params.set('category', filters.category);
  if (filters.sort !== 'relevance') params.set('sort', filters.sort);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.view !== 'list') params.set('view', filters.view);
  return '/articles' + (params.size ? `?${params.toString()}` : '');
}
export function filterArticles(
  articles: ArticleSummary[],
  filters: ArticleFilters,
  searchIndex: Record<string, string> = {},
) {
  const words = filters.query
    .trim()
    .split(/\s+/)
    .map(normalizeSearch)
    .filter(Boolean);
  return articles
    .filter(
      (article) => !filters.category || article.category === filters.category,
    )
    .map((article) => {
      const title = normalizeSearch(article.title);
      const metadata = normalizeSearch(
        `${article.title} ${article.description} ${article.category} ${article.tags.join(' ')} ${article.slug}`,
      );
      const text = metadata + (searchIndex[article.slug] ?? '');
      const matches = words.every((word) => text.includes(word));
      const score = words.reduce(
        (sum, word) =>
          sum + (title.includes(word) ? 3 : metadata.includes(word) ? 1 : 0),
        0,
      );
      return {
        article,
        matches,
        score,
        bodyMatch:
          words.length > 0 && !words.every((word) => metadata.includes(word)),
      };
    })
    .filter((entry) => entry.matches)
    .sort((a, b) => {
      if (filters.sort === 'title')
        return (
          a.article.title.localeCompare(b.article.title, 'zh-Hant') ||
          a.article.slug.localeCompare(b.article.slug)
        );
      if (filters.sort === 'relevance' && a.score !== b.score)
        return b.score - a.score;
      const date = a.article.date.localeCompare(b.article.date);
      return (
        (filters.sort === 'oldest' ? date : -date) ||
        a.article.slug.localeCompare(b.article.slug)
      );
    });
}
export function paginate<T>(
  entries: T[],
  requestedPage: number,
  pageSize = PAGE_SIZE,
) {
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  const page = Math.min(Math.max(1, Math.floor(requestedPage) || 1), pageCount);
  return {
    page,
    pageCount,
    entries: entries.slice((page - 1) * pageSize, page * pageSize),
  };
}
export function pageNumbers(
  page: number,
  pageCount: number,
): (number | 'gap-left' | 'gap-right')[] {
  const values: (number | 'gap-left' | 'gap-right')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) values.push('gap-left');
  for (let value = start; value <= end; value++) values.push(value);
  if (end < pageCount - 1) values.push('gap-right');
  if (pageCount > 1) values.push(pageCount);
  return values;
}
