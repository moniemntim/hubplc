import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { publicationHolds } from '../scripts/article-publication.mjs';

void test('published article source links resolve to known articles', async () => {
  const root = path.resolve('content/articles');
  const [hiddenSlugs, policy, ledger] = await Promise.all(
    [
      'content/hidden-articles.json',
      'content/article-publication-policy.json',
      'docs/editorial-review/ledger.json',
    ].map((filename) => readFile(filename, 'utf8').then(JSON.parse)),
  );
  const hidden = publicationHolds(hiddenSlugs, policy, ledger);
  const sources = new Map();
  for (const file of await readdir(root)) {
    if (file.endsWith('.md'))
      sources.set(
        file.slice(0, -3),
        await readFile(path.join(root, file), 'utf8'),
      );
  }
  const published = new Set(
    [...sources]
      .filter(
        ([slug, source]) =>
          !hidden.has(slug) && !/^draft:\s*true\s*$/m.test(source),
      )
      .map(([slug]) => slug),
  );
  const unknown = [];
  const linkPattern =
    /\]\((?:https:\/\/hubplc\.com)?\/articles\/([^/#)]+)\/?(?:[?#][^)]*)?\)/g;
  for (const [slug, source] of sources) {
    if (!published.has(slug)) continue;
    for (const match of source.matchAll(linkPattern)) {
      if (!sources.has(match[1])) unknown.push(`${slug} → ${match[1]}`);
    }
  }
  assert.deepEqual(unknown, []);
});
