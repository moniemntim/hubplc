import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { excelFormulaLessons } from '../lib/excel-formulas.ts';

const root = path.resolve(import.meta.dirname, '..');

void test('all public articles have current review evidence and truthful dates', async () => {
  const [inventory, ledger, dateRecords, hidden] = await Promise.all([
    fs
      .readFile(path.join(root, 'docs/editorial-review/inventory.json'), 'utf8')
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
  ]);
  const held = new Set(hidden);
  const publicArticles = inventory.articles
    .filter(
      (article) =>
        article.status === 'reviewed-local' && !held.has(article.slug),
    )
    .sort((left, right) => left.slug.localeCompare(right.slug));

  assert.match(ledger.lastFullAuditDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(Object.keys(dateRecords.articles).length, publicArticles.length);

  let hardwareVerified = 0;
  let simulatorVerified = 0;
  let screenshotArticles = 0;
  let screenshotCount = 0;
  for (const { slug } of publicArticles) {
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
      assert.equal(review.applicationVerified, true, `${slug}: app verified`);
      assert.equal(review.verificationSource, 'author-attestation');
      assert.deepEqual(review.verifiedApplications, [
        'Windows 版 Microsoft 365',
        'Excel 2021',
      ]);
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

    hardwareVerified += Number(review.hardwareVerified === true);
    simulatorVerified += Number(review.simulatorVerified === true);
    const images = (source.match(/<img\b/g) ?? []).length;
    screenshotArticles += Number(images > 0);
    screenshotCount += images;
  }

  assert.equal(hardwareVerified, 0, 'no public article has hardware evidence');
  assert.equal(
    simulatorVerified,
    0,
    'no public article has original simulator evidence',
  );
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
  assert.equal(excelFormulaLessons.length, 50);
  assert.deepEqual(
    excelSlugs.sort(),
    excelFormulaLessons.map(({ slug }) => slug).sort(),
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
