import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outputPath = path.join(root, 'content', 'article-dates.json');
const currentOutput = JSON.parse(
  await fs.readFile(outputPath, 'utf8').catch(() => '{"articles":{}}'),
);
const ledger = JSON.parse(
  await fs.readFile(
    path.join(root, 'docs', 'editorial-review', 'ledger.json'),
    'utf8',
  ),
);
const reviewed = Object.entries(ledger.articles)
  .filter(([, entry]) => entry.status === 'reviewed-local')
  .map(([slug]) => slug)
  .sort();

function gitLog(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

const additions = gitLog([
  'log',
  '--reverse',
  '--diff-filter=A',
  '--format=@@@%H%x09%as',
  '--name-only',
  '--',
  'content/articles',
]).split(/\r?\n/);
const first = new Map();
let commit = null;
for (const line of additions) {
  if (line.startsWith('@@@')) {
    const [hash, date] = line.slice(3).split('\t');
    commit = { hash, date };
    continue;
  }
  const match = line.match(/^content\/articles\/(.+)\.md$/);
  if (match && commit && !first.has(match[1])) first.set(match[1], commit);
}

const articles = {};
for (const slug of reviewed) {
  const recorded = currentOutput.articles?.[slug];
  if (recorded?.dateSource === 'release-record') {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(recorded.publishedDate ?? '') ||
      !/^\d{4}-\d{2}-\d{2}$/.test(recorded.updatedDate ?? '') ||
      recorded.updatedDate < recorded.publishedDate
    )
      throw new Error(`${slug}: invalid release date record`);
    articles[slug] = {
      publishedDate: recorded.publishedDate,
      updatedDate: recorded.updatedDate,
      dateSource: 'release-record',
    };
    continue;
  }
  const published = first.get(slug);
  if (!published) throw new Error(`${slug}: missing first-add Git history`);
  const latest = gitLog([
    'log',
    '-1',
    '--format=%H%x09%as',
    '--',
    `content/articles/${slug}.md`,
  ]).trim();
  const [updatedCommit, updatedDate] = latest.split('\t');
  if (!updatedCommit || !/^\d{4}-\d{2}-\d{2}$/.test(updatedDate))
    throw new Error(`${slug}: missing latest Git history`);
  if (updatedDate < published.date)
    throw new Error(`${slug}: updated date predates publication`);
  articles[slug] = {
    publishedDate: published.date,
    updatedDate,
    dateSource: 'git-history',
    publishedCommit: published.hash,
    updatedCommit,
  };
}

const result = {
  purpose:
    'Truthful article dates from Git history or explicit release records. Publication dates must not be redistributed for appearance.',
  generatedAt: new Date().toISOString(),
  articles,
};
const serialized = JSON.stringify(result, null, 2) + '\n';

if (process.argv.includes('--write')) {
  await fs.writeFile(outputPath, serialized);
  console.log(`Wrote ${reviewed.length} article date records.`);
} else {
  const current = await fs.readFile(outputPath, 'utf8').catch(() => '');
  const comparable = current
    ? JSON.stringify(
        { ...JSON.parse(current), generatedAt: result.generatedAt },
        null,
        2,
      ) + '\n'
    : '';
  if (comparable !== serialized)
    throw new Error('content/article-dates.json is stale; run with --write');
  console.log(`Verified ${reviewed.length} article date records.`);
}
