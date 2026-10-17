import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from 'playwright/test';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const articles = JSON.parse(
  await readFile('lib/articles.generated.json', 'utf8'),
);
const bySlug = new Map(articles.map((article) => [article.slug, article]));
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});

try {
  const page = await browser.newPage();
  await mockAdsense(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const slug of [
      'xca-ecu-https-certificate-setup',
      'latency-injection-timeout-retry',
    ]) {
      const article = bySlug.get(slug);
      assert.ok(article, slug);
      const response = await page.goto(`${base}/articles/${slug}`, {
        waitUntil: 'load',
      });
      assert.equal(response.status(), 200, `${slug} at ${width}px`);
      await expect(
        page.getByRole('heading', { name: '本頁證據與限制' }),
      ).toBeVisible();
      await expect(page.locator('.article-reader__verification')).toContainText(
        article.verification.reviewDate,
      );
      await expect(page.locator('.article-reader__verification')).toContainText(
        '未實測',
      );
      await expect(page.locator('.article-reader__meta')).toContainText(
        `發布：${article.publishedDate}`,
      );
      if (article.updatedDate > article.publishedDate)
        await expect(page.locator('.article-reader__meta')).toContainText(
          `更新：${article.updatedDate}`,
        );
      const jsonLd = JSON.parse(
        await page.locator('script[type="application/ld+json"]').textContent(),
      );
      assert.equal(jsonLd.datePublished, article.publishedDate);
      assert.equal(jsonLd.dateModified, article.updatedDate);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
        `${slug} horizontal overflow at ${width}px`,
      );
    }
  }

  await page.goto(`${base}/articles/xca-ecu-https-certificate-setup`);
  await expect(page.locator('.article-reader__verification')).toContainText(
    '19 張',
  );
  await expect(page.locator('.article-reader__content img')).toHaveCount(19);
  await page.goto(`${base}/articles/latency-injection-timeout-retry`);
  await page.locator('.article-reader__verification summary').click();
  await expect(
    page.locator('.article-reader__verification details'),
  ).toContainText('saved stdout matches article');
  const excel = bySlug.get('excel-average');
  assert.ok(excel, 'excel-average');
  await page.goto(`${base}/articles/excel-average`);
  await expect(page.locator('.article-reader__verification')).toContainText(
    '作者實際操作',
  );
  await expect(page.locator('.article-reader__verification')).toContainText(
    'Windows 版 Microsoft 365、Excel 2021',
  );
  await expect(page.locator('.article-reader__verification')).not.toContainText(
    '實體設備',
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS article dates, evidence status, JSON-LD and responsive layout',
  );
} finally {
  await browser.close();
}
