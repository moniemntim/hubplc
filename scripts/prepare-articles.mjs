import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { articleMetadata } from './article-metadata.mjs';
import { publicationHolds } from './article-publication.mjs';

const contentDir = path.resolve('content/articles');
const target = path.resolve('app/articles/(posts)');
await fs.mkdir(contentDir, { recursive: true });
await fs.mkdir(target, { recursive: true });
await fs.mkdir('lib', { recursive: true });
await fs.mkdir('public', { recursive: true });
const articles = [];
const searchIndex = {};
const articleDates = JSON.parse(
  await fs.readFile('content/article-dates.json', 'utf8'),
);
const editorialLedger = JSON.parse(
  await fs.readFile('docs/editorial-review/ledger.json', 'utf8'),
);
const publicationPolicy = JSON.parse(
  await fs.readFile('content/article-publication-policy.json', 'utf8'),
);
if (!/^\d{4}-\d{2}-\d{2}$/.test(editorialLedger.lastFullAuditDate ?? ''))
  throw new Error('Editorial ledger is missing lastFullAuditDate');
// Temporary publication hold is separate from source review/draft status.
const hiddenSlugs = JSON.parse(
  await fs.readFile('content/hidden-articles.json', 'utf8'),
);
if (
  !Array.isArray(hiddenSlugs) ||
  hiddenSlugs.some(
    (slug) =>
      typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),
  )
)
  throw new Error('Invalid hidden article list');
const hidden = publicationHolds(
  hiddenSlugs,
  publicationPolicy,
  editorialLedger,
);
for (const file of (await fs.readdir(contentDir)).filter((file) =>
  file.endsWith('.md'),
)) {
  const raw = await fs.readFile(path.join(contentDir, file), 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(file + ': 缺少文章資訊區塊');
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^(\w+):\s*(.*?)\s*$/);
    if (pair) meta[pair[1]] = pair[2].replace(/^["']|["']$/g, '');
  }
  if (meta.draft !== 'false') continue;
  const slug = file.slice(0, -3);
  if (hidden.has(slug)) continue;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error(file + ': 檔名請使用英文小寫、數字與連字號');
  for (const key of ['title', 'description', 'author'])
    if (!meta[key]) throw new Error(file + ': 缺少 ' + key);
  const dateRecord = articleDates.articles?.[slug];
  if (!dateRecord) throw new Error(file + ': 缺少可追溯的發布日期');
  const publishedDate = dateRecord.publishedDate;
  const updatedDate = dateRecord.updatedDate;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(publishedDate) ||
    Number.isNaN(Date.parse(publishedDate)) ||
    new Date(publishedDate).toISOString().slice(0, 10) !== publishedDate ||
    !/^\d{4}-\d{2}-\d{2}$/.test(updatedDate) ||
    Number.isNaN(Date.parse(updatedDate)) ||
    new Date(updatedDate).toISOString().slice(0, 10) !== updatedDate ||
    updatedDate < publishedDate
  )
    throw new Error(file + ': 發布／更新日期無效');
  if (!['git-history', 'release-record'].includes(dateRecord.dateSource))
    throw new Error(file + ': 缺少有效的日期來源');
  if (
    dateRecord.dateSource === 'git-history' &&
    (!/^[0-9a-f]{40}$/.test(dateRecord.publishedCommit ?? '') ||
      !/^[0-9a-f]{40}$/.test(dateRecord.updatedCommit ?? ''))
  )
    throw new Error(file + ': Git 日期來源缺少 commit');
  const review = editorialLedger.articles?.[slug];
  const currentHash = createHash('sha256')
    .update(raw.replace(/\r\n/g, '\n'))
    .digest('hex');
  if (review?.status !== 'reviewed-local')
    throw new Error(file + ': 公開文章尚未完成實質審查');
  if (review.sha256 !== currentHash)
    throw new Error(file + ': 內容已在審查後變更');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(review.reviewDate ?? ''))
    throw new Error(file + ': 缺少有效的台帳核對日期');
  if (typeof review.verification !== 'string' || !review.verification.trim())
    throw new Error(file + ': 缺少核對證據');
  const verificationKind = review.verificationKind ?? 'industrial';
  if (!['industrial', 'software'].includes(verificationKind))
    throw new Error(file + ': 驗證類型無效');
  if (
    verificationKind === 'industrial' &&
    typeof review.hardwareVerified !== 'boolean'
  )
    throw new Error(file + ': 缺少硬體驗證狀態');
  if (
    verificationKind === 'software' &&
    (typeof review.applicationVerified !== 'boolean' ||
      !Array.isArray(review.verifiedApplications) ||
      !review.verifiedApplications.length ||
      review.verifiedApplications.some(
        (application) => typeof application !== 'string' || !application.trim(),
      ) ||
      review.verificationSource !== 'author-attestation')
  )
    throw new Error(file + ': 缺少軟體實測證據');
  const safeHtml = sanitizeHtml(marked.parse(match[2]), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height', 'loading'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    transformTags: {
      a: (tagName, attribs) => {
        const url = new URL(attribs.href || '', 'https://hubplc.com');
        const linkedSlug = url.pathname.match(/^\/articles\/([^/]+)\/?$/)?.[1];
        if (url.origin === 'https://hubplc.com' && hidden.has(linkedSlug))
          return { tagName: 'span', attribs: {} };
        return { tagName, attribs };
      },
    },
  });
  const { text, ...enriched } = articleMetadata(meta, slug, safeHtml);
  const verification = {
    kind: verificationKind,
    reviewDate: review.reviewDate,
    evidence: review.verification,
    screenshotCount: (safeHtml.match(/<img\b/g) ?? []).length,
    ...(verificationKind === 'software'
      ? {
          applicationVerified: review.applicationVerified,
          verifiedApplications: review.verifiedApplications,
          verificationSource: review.verificationSource,
        }
      : {
          hardwareVerified: review.hardwareVerified,
          simulatorVerified: review.simulatorVerified === true,
        }),
  };
  articles.push({
    ...meta,
    date: publishedDate,
    publishedDate,
    updatedDate,
    slug,
    verification,
    ...enriched,
  });
  searchIndex[slug] = text;
}
articles.sort(
  (a, b) =>
    b.updatedDate.localeCompare(a.updatedDate) || a.slug.localeCompare(b.slug),
);
const summaries = articles.map(
  ({
    slug,
    title,
    description,
    date,
    author,
    publishedDate,
    updatedDate,
    category,
    tags,
    readingMinutes,
  }) => ({
    slug,
    title,
    description,
    date,
    author,
    publishedDate,
    updatedDate,
    category,
    tags,
    readingMinutes,
  }),
);
await fs.writeFile(
  'lib/articles.generated.json',
  JSON.stringify(articles, null, 2) + '\n',
);
await fs.writeFile(
  'lib/article-index.generated.json',
  JSON.stringify(summaries, null, 2) + '\n',
);
await fs.writeFile(
  'public/article-search.json',
  JSON.stringify(searchIndex) + '\n',
);

// Remove only previously generated route files; preserve manually written files.
for (const entry of await fs.readdir(target, { withFileTypes: true })) {
  if (
    !entry.isDirectory() ||
    articles.some((article) => article.slug === entry.name)
  )
    continue;
  const filename = path.join(target, entry.name, 'page.tsx');
  const source = await fs.readFile(filename, 'utf8').catch(() => '');
  if (source.startsWith('// Generated by prepare-articles')) {
    await fs.unlink(filename);
    await fs.rmdir(path.dirname(filename)).catch(() => {});
  }
}
for (const article of articles) {
  const {
    title,
    date,
    author,
    publishedDate,
    updatedDate,
    description,
    html,
    slug,
    category,
    tags,
    readingMinutes,
    toc,
    verification,
  } = article;
  const readerArticle = {
    title,
    date,
    author,
    publishedDate,
    updatedDate,
    description,
    html,
    slug,
    category,
    tags,
    readingMinutes,
    toc,
    verification,
  };
  const related = summaries
    .filter(
      (candidate) =>
        candidate.slug !== article.slug &&
        candidate.category === article.category,
    )
    .sort(
      (a, b) =>
        b.tags.filter((tag) => article.tags.includes(tag)).length -
          a.tags.filter((tag) => article.tags.includes(tag)).length ||
        b.updatedDate.localeCompare(a.updatedDate) ||
        a.slug.localeCompare(b.slug),
    )
    .slice(0, 3);
  const folder = path.join(target, article.slug);
  await fs.mkdir(folder, { recursive: true });
  const source =
    '// Generated by prepare-articles; edit content/articles instead.\nimport Article from "@/app/article";\nconst article: Parameters<typeof Article>[0]["article"]=' +
    JSON.stringify(readerArticle) +
    ';\nconst related=' +
    JSON.stringify(related) +
    ' as NonNullable<Parameters<typeof Article>[0]["related"]>;\nexport const metadata={title:article.title,description:article.description,alternates:{canonical:"https://hubplc.com/articles/"+article.slug}};\nexport default function Page(){return <Article article={article} related={related}/>;}\n';
  await fs.writeFile(path.join(folder, 'page.tsx'), source);
}
console.log(
  'Prepared ' +
    articles.length +
    ' published articles, directory and search index.',
);
