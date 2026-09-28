import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';

// A matching hash records reviewed text, not a claim of hardware validation.
const directory = new URL('../content/articles/', import.meta.url);
const ledgerPath = new URL(
  '../docs/editorial-review/ledger.json',
  import.meta.url,
);
const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
const files = (await readdir(directory))
  .filter((name) => name.endsWith('.md'))
  .sort();
const totals = {};
const articles = [];
for (const file of files) {
  const source = (await readFile(new URL(file, directory), 'utf8')).replace(
    /\r\n/g,
    '\n',
  );
  const slug = file.slice(0, -3);
  const hash = createHash('sha256').update(source).digest('hex');
  const review = ledger.articles[slug];
  const published = /^draft:\s*false\s*$/m.test(source.split('\n---')[0]);
  const status = !published
    ? 'draft'
    : !review
      ? 'unreviewed'
      : review.sha256 !== hash
        ? 'changed-since-review'
        : review.status;
  totals[status] = (totals[status] ?? 0) + 1;
  articles.push({ slug, status });
}
const missing = Object.keys(ledger.articles).filter(
  (slug) => !files.includes(`${slug}.md`),
);
if (missing.length)
  throw new Error(`Stale review entries: ${missing.join(', ')}`);
if (process.argv.includes('--write')) {
  await writeFile(
    new URL('../docs/editorial-review/inventory.json', import.meta.url),
    JSON.stringify({ totals, articles }, null, 2) + '\n',
  );
}
console.log(JSON.stringify({ totals, articleCount: articles.length }, null, 2));
