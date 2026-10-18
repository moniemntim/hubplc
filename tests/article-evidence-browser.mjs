import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from 'playwright/test';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const articles = JSON.parse(
  await readFile('lib/articles.generated.json', 'utf8'),
);
const bySlug = new Map(articles.map((article) => [article.slug, article]));
const heldSlugs = ['latency-injection-timeout-retry'];
const verifiedHardwareArticles = [
  {
    slug: 'xca-ecu-https-certificate-setup',
    title: 'XCA 建立 ECU HTTPS 憑證完整教學',
    imageCount: 19,
  },
  {
    slug: 'fx5u-sd-bin-read-write',
    title: 'FX5U BIN 讀寫教學',
    imageCount: 9,
  },
  {
    slug: 'fx5u-sd-csv-read-write',
    title: 'FX5U CSV 讀寫教學',
    imageCount: 7,
  },
];
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

  const excel = bySlug.get('excel-average');
  assert.ok(excel, 'excel-average remains published');
  for (const article of verifiedHardwareArticles)
    assert.ok(bySlug.has(article.slug), `${article.slug} is published`);

  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const response = await page.goto(`${base}/articles/excel-average`, {
      waitUntil: 'load',
    });
    assert.equal(response.status(), 200, `excel-average at ${width}px`);
    await expect(page.locator('.article-reader__verification')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: '本頁證據與限制' }),
    ).toHaveCount(0);
    await expect(page.locator('.article-reader__meta')).toContainText(
      `發布：${excel.publishedDate}`,
    );
    if (excel.updatedDate > excel.publishedDate)
      await expect(page.locator('.article-reader__meta')).toContainText(
        `更新：${excel.updatedDate}`,
      );
    const jsonLd = JSON.parse(
      await page.locator('script[type="application/ld+json"]').textContent(),
    );
    assert.equal(jsonLd.datePublished, excel.publishedDate);
    assert.equal(jsonLd.dateModified, excel.updatedDate);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      true,
      `excel-average horizontal overflow at ${width}px`,
    );
  }

  for (const article of verifiedHardwareArticles) {
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto(`${base}/articles/${article.slug}`, {
        waitUntil: 'load',
      });
      assert.equal(response.status(), 200, `${article.slug} at ${width}px`);
      await expect(
        page.getByRole('heading', { level: 1, name: article.title }),
      ).toBeVisible();
      await expect(page.locator('.article-reader img')).toHaveCount(
        article.imageCount,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
        `${article.slug} horizontal overflow at ${width}px`,
      );
    }
  }

  for (const slug of heldSlugs) {
    assert.equal(
      bySlug.has(slug),
      false,
      `${slug} is absent from public index`,
    );
    const response = await page.goto(`${base}/articles/${slug}`, {
      waitUntil: 'load',
    });
    assert.equal(response.status(), 404, `${slug} is not publicly routable`);
  }

  assert.deepEqual(errors, []);
  console.log(
    'PASS public Excel and verified hardware articles render responsively; verification-held routes return 404',
  );
} finally {
  await browser.close();
}
