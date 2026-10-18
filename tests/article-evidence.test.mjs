import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { excelFormulaLessons } from '../lib/excel-formulas.ts';
import {
  isArticleVerified,
  publicationHolds,
} from '../scripts/article-publication.mjs';

const root = path.resolve(import.meta.dirname, '..');

void test('all public articles have current review evidence and truthful dates', async () => {
  const [inventory, ledger, dateRecords, hiddenSlugs, policy] =
    await Promise.all([
      fs
        .readFile(
          path.join(root, 'docs/editorial-review/inventory.json'),
          'utf8',
        )
        .then(JSON.parse),
      fs
        .readFile(path.join(root, 'docs/editorial-review/ledger.json'), 'utf8')
        .then(JSON.parse),
      fs
        .readFile(path.join(root, 'content/article-dates.json'), 'utf8')
        .then(JSON.parse),
      fs
        .readFile(path.join(root, 'content/hidden-articles.json'), 'utf8')
        .then(JSON.parse),
      fs
        .readFile(
          path.join(root, 'content/article-publication-policy.json'),
          'utf8',
        )
        .then(JSON.parse),
    ]);
  const held = publicationHolds(hiddenSlugs, policy, ledger);
  const reviewedArticles = inventory.articles
    .filter((article) => article.status === 'reviewed-local')
    .sort((left, right) => left.slug.localeCompare(right.slug));
  const publicArticles = reviewedArticles
    .filter((article) => !held.has(article.slug))
    .sort((left, right) => left.slug.localeCompare(right.slug));

  assert.match(ledger.lastFullAuditDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(
    Object.keys(dateRecords.articles).length,
    reviewedArticles.length,
  );
  assert.ok(
    publicArticles.every(({ slug }) =>
      isArticleVerified(ledger.articles[slug]),
    ),
    'every public article must meet the verification policy',
  );

  let screenshotArticles = 0;
  let screenshotCount = 0;
  for (const { slug } of reviewedArticles) {
    const source = (
      await fs.readFile(
        path.join(root, 'content', 'articles', `${slug}.md`),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    const review = ledger.articles[slug];
    const dates = dateRecords.articles[slug];
    assert.equal(review.status, 'reviewed-local', `${slug}: review status`);
    assert.equal(
      review.sha256,
      createHash('sha256').update(source).digest('hex'),
      `${slug}: reviewed hash`,
    );
    assert.match(review.reviewDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(review.verification.trim(), `${slug}: verification evidence`);
    const verificationKind = review.verificationKind ?? 'industrial';
    assert.ok(
      verificationKind === 'industrial' || verificationKind === 'software',
      `${slug}: verification kind`,
    );
    if (verificationKind === 'industrial')
      assert.equal(typeof review.hardwareVerified, 'boolean');
    else {
      assert.equal(typeof review.applicationVerified, 'boolean');
      if (review.applicationVerified) {
        assert.equal(review.verificationSource, 'author-attestation');
        assert.ok(review.verifiedApplications.length > 0);
      }
    }
    assert.match(dates.publishedDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(dates.updatedDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(dates.updatedDate >= dates.publishedDate, `${slug}: date order`);
    assert.ok(
      dates.dateSource === 'git-history' ||
        dates.dateSource === 'release-record',
      `${slug}: date source`,
    );
    if (dates.dateSource === 'git-history') {
      assert.match(dates.publishedCommit, /^[0-9a-f]{40}$/);
      assert.match(dates.updatedCommit, /^[0-9a-f]{40}$/);
    } else {
      assert.equal('publishedCommit' in dates, false);
      assert.equal('updatedCommit' in dates, false);
    }

    const images = (source.match(/<img\b/g) ?? []).length;
    screenshotArticles += Number(images > 0);
    screenshotCount += images;
  }

  assert.ok(screenshotArticles >= 1);
  assert.ok(screenshotCount >= 19);
  await fs.access(
    path.join(
      root,
      'public/examples/latency-retry/observed-windows-node24.txt',
    ),
  );
  for (let index = 1; index <= 19; index += 1)
    await fs.access(
      path.join(
        root,
        'public/images/xca-ecu-https-certificate-setup',
        `image${index}.png`,
      ),
    );
  const excelSlugs = publicArticles
    .map(({ slug }) => slug)
    .filter((slug) => slug.startsWith('excel-'));
  const publicSlugs = new Set(publicArticles.map(({ slug }) => slug));
  const expectedExcelSlugs = excelFormulaLessons
    .map(({ slug }) => slug)
    .filter((slug) => publicSlugs.has(slug));
  assert.deepEqual(
    excelSlugs.sort(),
    expectedExcelSlugs.sort(),
    'public Excel lessons match the course registry',
  );
  for (const slug of excelSlugs) {
    const source = await fs.readFile(
      path.join(root, 'content', 'articles', `${slug}.md`),
      'utf8',
    );
    assert.equal((source.match(/<img\b/g) ?? []).length, 1, `${slug}: image`);
    await fs.access(
      path.join(root, 'public', 'images', 'excel-formulas', `${slug}.png`),
    );
  }
});
