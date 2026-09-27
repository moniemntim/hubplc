import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const articleDirectory = path.join(root, 'content', 'articles');
const outputDirectory = path.join(root, 'outputs', 'content-quality');
const generatedAt = new Date().toISOString();

function frontMatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { metadata: {}, body: source };
  const metadata = Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .map((line) => line.match(/^([^:]+):\s*(.*)$/))
      .filter(Boolean)
      .map(([, key, value]) => [
        key.trim(),
        value.trim().replace(/^['"]|['"]$/g, ''),
      ]),
  );
  return { metadata, body: match[2] };
}

function normalize(value) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/https?:\/\/[^\s)]+/g, ' URL ')
    .replace(/[\u005B\u005D()`*_>#|:：，,。；;！？!?（）()–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value) {
  return (
    normalize(value).match(/[\p{Script=Han}]|[a-z0-9]+(?:\.[a-z0-9]+)?/gu) ?? []
  );
}

function shingles(value, width = 4) {
  const words = tokens(value);
  const result = new Set();
  for (let index = 0; index <= words.length - width; index += 1) {
    result.add(words.slice(index, index + width).join(''));
  }
  return result;
}

function jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  const [smaller, larger] =
    left.size < right.size ? [left, right] : [right, left];
  let shared = 0;
  for (const item of smaller) if (larger.has(item)) shared += 1;
  return shared / (left.size + right.size - shared);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isCoreTopic(slug) {
  return /(^plc-|analog|modbus|register|hex-decimal|float-|ladder-st)/.test(
    slug,
  );
}

const filenames = (await readdir(articleDirectory))
  .filter((name) => name.endsWith('.md'))
  .sort();
const articles = await Promise.all(
  filenames.map(async (filename) => {
    const source = await readFile(
      path.join(articleDirectory, filename),
      'utf8',
    );
    const { metadata, body } = frontMatter(source);
    const slug = filename.replace(/\.md$/, '');
    const paragraphs = body
      .split(/\r?\n\s*\r?\n/)
      .filter((paragraph) => !/^\s*#{1,6}\s[^\r\n]*\s*$/.test(paragraph))
      .map((paragraph) => normalize(paragraph))
      .filter(
        (paragraph) => paragraph.length >= 40 && !paragraph.startsWith('參考 '),
      );
    return {
      filename,
      slug,
      title: metadata.title ?? slug,
      description: metadata.description ?? '',
      body,
      wordCount: tokens(body).length,
      titleTokens: new Set(tokens(metadata.title ?? slug)),
      bodyShingles: shingles(body),
      paragraphHashes: paragraphs.map((paragraph) => ({
        hash: sha256(paragraph),
        text: paragraph,
      })),
      coreTopic: isCoreTopic(slug),
    };
  }),
);

const exactDocuments = new Map();
const paragraphIndex = new Map();
for (const article of articles) {
  const documentHash = sha256(normalize(article.body));
  exactDocuments.set(documentHash, [
    ...(exactDocuments.get(documentHash) ?? []),
    article.slug,
  ]);
  for (const paragraph of article.paragraphHashes) {
    paragraphIndex.set(paragraph.hash, [
      ...(paragraphIndex.get(paragraph.hash) ?? []),
      { slug: article.slug, text: paragraph.text },
    ]);
  }
}

const pairs = [];
for (let left = 0; left < articles.length; left += 1) {
  for (let right = left + 1; right < articles.length; right += 1) {
    const titleSimilarity = jaccard(
      articles[left].titleTokens,
      articles[right].titleTokens,
    );
    const bodySimilarity = jaccard(
      articles[left].bodyShingles,
      articles[right].bodyShingles,
    );
    if (titleSimilarity >= 0.2 || bodySimilarity >= 0.035) {
      pairs.push({
        left: articles[left].slug,
        right: articles[right].slug,
        leftTitle: articles[left].title,
        rightTitle: articles[right].title,
        titleSimilarity: Number(titleSimilarity.toFixed(4)),
        bodySimilarity: Number(bodySimilarity.toFixed(4)),
        coreTopic: articles[left].coreTopic || articles[right].coreTopic,
      });
    }
  }
}
pairs.sort(
  (left, right) =>
    right.bodySimilarity +
    right.titleSimilarity -
    (left.bodySimilarity + left.titleSimilarity),
);

const repeatedParagraphs = [...paragraphIndex.values()]
  .filter((entries) => new Set(entries.map((entry) => entry.slug)).size > 1)
  .map((entries) => ({
    slugs: [...new Set(entries.map((entry) => entry.slug))].sort(
      (left, right) => left.localeCompare(right),
    ),
    text: entries[0].text,
    characterCount: entries[0].text.length,
  }))
  .sort(
    (left, right) =>
      right.slugs.length - left.slugs.length ||
      right.characterCount - left.characterCount,
  );

const repeatedParagraphsWithinArticle = articles
  .map((article) => {
    const occurrencesByHash = new Map();
    for (const paragraph of article.paragraphHashes) {
      occurrencesByHash.set(paragraph.hash, [
        ...(occurrencesByHash.get(paragraph.hash) ?? []),
        paragraph.text,
      ]);
    }
    const groups = [...occurrencesByHash.values()]
      .filter((entries) => entries.length > 1)
      .map((entries) => ({
        text: entries[0],
        characterCount: entries[0].length,
        occurrences: entries.length,
      }))
      .sort(
        (left, right) =>
          right.occurrences - left.occurrences ||
          right.characterCount - left.characterCount,
      );
    return { slug: article.slug, groups };
  })
  .filter((article) => article.groups.length > 0);

const report = {
  generatedAt,
  method: {
    bodySimilarity:
      'Jaccard similarity of normalized four-token shingles; candidate threshold body >= 0.035 or title >= 0.20.',
    titleSimilarity: 'Jaccard similarity of normalized title tokens.',
    exactDuplicate: 'SHA-256 of normalized full body.',
    repeatedParagraph:
      'SHA-256 of normalized paragraph blocks at least 40 characters long.',
    withinArticleRepeatedParagraph:
      'The same paragraph-block hash occurring more than once in one article; headings and reference-only blocks are excluded.',
    limitations:
      'Similarity is a review queue, not deletion evidence. Tables, shared safety caveats, and common technical terminology can raise scores.',
    coreTopicRule:
      'Slugs starting plc-, or containing analog, modbus, register, hex-decimal, float-, or ladder-st are classified as core topics for filtering and reporting.',
  },
  counts: {
    articles: articles.length,
    coreTopicArticles: articles.filter((article) => article.coreTopic).length,
    candidatePairs: pairs.length,
    exactDuplicateGroups: [...exactDocuments.values()].filter(
      (group) => group.length > 1,
    ).length,
    repeatedParagraphGroups: repeatedParagraphs.length,
    articlesWithRepeatedParagraphs: repeatedParagraphsWithinArticle.length,
    withinArticleRepeatedParagraphGroups:
      repeatedParagraphsWithinArticle.reduce(
        (total, article) => total + article.groups.length,
        0,
      ),
  },
  articles: articles.map(
    ({ slug, title, description, wordCount, coreTopic }) => ({
      slug,
      title,
      description,
      wordCount,
      coreTopic,
    }),
  ),
  pairs,
  exactDuplicateGroups: [...exactDocuments.values()].filter(
    (group) => group.length > 1,
  ),
  repeatedParagraphs,
  repeatedParagraphsWithinArticle,
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(
  path.join(outputDirectory, 'similarity-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);

const rows = pairs
  .slice(0, 80)
  .map(
    (pair) =>
      `| ${pair.left} | ${pair.right} | ${(pair.titleSimilarity * 100).toFixed(1)}% | ${(pair.bodySimilarity * 100).toFixed(1)}% | ${pair.coreTopic ? '核心主題' : '人工複核'} |`,
  );
const summary = [
  '# 文章全文重複與主題重疊稽核',
  '',
  `產生時間：${generatedAt}`,
  '',
  '此報告將相似度作為人工閱讀的排序線索；沒有以分數自動刪文、合併 URL 或宣稱內容重複。完整機器可讀資料見 `similarity-report.json`。',
  '',
  '## 範圍與方法',
  '',
  `- 掃描：${articles.length} 篇 content/articles/*.md，含 front matter 的標題、描述及全文。`,
  `- 核心主題：${articles.filter((article) => article.coreTopic).length} 篇 PLC／類比／Modbus／暫存器相關文，以分類標示候選配對。`,
  '- 正文分數是正規化後四 token 片段的 Jaccard 相似度；標題分數是標題 token 的 Jaccard 相似度。共同的安全提醒、規格限制與術語會造成較高分，必須全文複核。',
  '',
  '## 計數',
  '',
  `- 完全相同全文群組：${report.counts.exactDuplicateGroups}`,
  `- 跨篇重複的長段落群組：${report.counts.repeatedParagraphGroups}`,
  `- 文內重複長段落：${report.counts.withinArticleRepeatedParagraphGroups} 群，分布於 ${report.counts.articlesWithRepeatedParagraphs} 篇文章。`,
  `- 進入人工複核佇列的文章配對：${report.counts.candidatePairs}`,
  '',
  '## 相似度最高的候選配對（前 80）',
  '',
  '| 文章 A | 文章 B | 標題 | 正文 | 狀態 |',
  '| --- | --- | ---: | ---: | --- |',
  ...rows,
  '',
].join('\n');
await writeFile(
  path.join(outputDirectory, 'similarity-report.md'),
  `${summary}\n`,
);

console.log(JSON.stringify(report.counts));
