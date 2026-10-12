import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

void test('published article reading paths only link to published articles', async () => {
  const root = path.resolve('content/articles');
  const hidden = new Set(
    JSON.parse(await readFile('content/hidden-articles.json', 'utf8')),
  );
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
  const unavailable = [];
  const linkPattern =
    /\]\((?:https:\/\/hubplc\.com)?\/articles\/([^/#)]+)\/?(?:[?#][^)]*)?\)/g;
  for (const [slug, source] of sources) {
    if (!published.has(slug)) continue;
    for (const match of source.matchAll(linkPattern)) {
      if (!published.has(match[1])) unavailable.push(`${slug} → ${match[1]}`);
    }
  }
  assert.deepEqual(unavailable, []);
});
