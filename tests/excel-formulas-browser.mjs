import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from 'playwright/test';
import { excelFormulaLessons } from '../lib/excel-formulas.ts';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const output = 'outputs/excel-formulas-browser';
await mkdir(output, { recursive: true });

const sitemapResponse = await fetch(`${base}/sitemap.xml`);
assert.equal(sitemapResponse.status, 200, 'sitemap');
const sitemap = await sitemapResponse.text();
assert.match(sitemap, /<loc>https:\/\/hubplc\.com\/excel-formulas<\/loc>/);
for (const lesson of excelFormulaLessons) {
  assert.match(
    sitemap,
    new RegExp(
      `<loc>https://hubplc\\.com/articles/${lesson.slug}</loc><lastmod>2026-10-17</lastmod>`,
    ),
    `${lesson.function}: sitemap`,
  );
  const image = await fetch(`${base}${lesson.image}`);
  assert.equal(image.status, 200, `${lesson.function}: image`);
  assert.match(image.headers.get('content-type') ?? '', /^image\/png/);
}

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const context = await browser.newContext();
const page = await context.newPage();
await mockAdsense(page);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (entry) => {
  if (entry.type() === 'error') errors.push(entry.text());
});

async function open(path) {
  const response = await page.goto(`${base}${path}`, { waitUntil: 'load' });
  assert.equal(response.status(), 200, path);
  await page.locator('h1').waitFor();
}

async function noOverflow(label) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    true,
    label,
  );
}

const results = [];
try {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await open('/excel-formulas');
    await expect(
      page.getByRole('heading', { name: 'Excel 公式教學。' }),
    ).toBeVisible();
    await expect(page.locator('.excel-course-card')).toHaveCount(20);
    await expect(page.locator('.excel-course-evidence')).toContainText(
      'Windows 版 Microsoft 365 與 Excel 2021 實際操作驗證',
    );
    assert.equal(
      await page.locator('link[rel="canonical"]').getAttribute('href'),
      'https://hubplc.com/excel-formulas',
    );
    await noOverflow(`course home at ${width}px`);
    if (width !== 768)
      await page.screenshot({
        path: `${output}/course-${width}.png`,
        fullPage: true,
      });

    for (const [index, lesson] of excelFormulaLessons.entries()) {
      await open(`/articles/${lesson.slug}`);
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: new RegExp(`^${lesson.function} `),
        }),
      ).toBeVisible();
      await expect(page.locator('.article-reader__category')).toHaveText(
        'Excel 公式教學',
      );
      await expect(page.locator('.article-reader__verification')).toContainText(
        '作者實際操作',
      );
      await expect(page.locator('.article-reader__verification')).toContainText(
        'Windows 版 Microsoft 365、Excel 2021',
      );
      await expect(
        page.locator('.article-reader__verification'),
      ).not.toContainText('實體設備');
      const lessonImage = page.locator('.article-reader__content img');
      await expect(lessonImage).toHaveCount(1);
      await lessonImage.scrollIntoViewIfNeeded();
      await expect
        .poll(() => lessonImage.evaluate((image) => image.naturalWidth))
        .toBeGreaterThan(0);
      const imageState = await page
        .locator('.article-reader__content img')
        .evaluate((image) => ({
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          loading: image.loading,
          alt: image.alt,
        }));
      assert.equal(imageState.complete, true, `${lesson.function}: image load`);
      assert.ok(
        imageState.naturalWidth > 0,
        `${lesson.function}: image pixels`,
      );
      assert.equal(
        imageState.loading,
        'lazy',
        `${lesson.function}: lazy image`,
      );
      assert.ok(imageState.alt, `${lesson.function}: image alt`);
      assert.equal(
        await page.locator('link[rel="canonical"]').getAttribute('href'),
        `https://hubplc.com/articles/${lesson.slug}`,
      );
      const jsonLd = JSON.parse(
        await page.locator('script[type="application/ld+json"]').textContent(),
      );
      assert.equal(jsonLd['@type'], 'TechArticle');
      assert.equal(jsonLd.author.name, '茂伯');
      assert.equal(jsonLd.datePublished, '2026-10-17');
      assert.equal(jsonLd.dateModified, '2026-10-17');
      const courseNav = page.getByRole('navigation', {
        name: 'Excel 公式課程導覽',
      });
      await expect(
        courseNav.getByRole('link', { name: '返回課程首頁' }),
      ).toHaveAttribute('href', '/excel-formulas');
      const previous = excelFormulaLessons[index - 1];
      const next = excelFormulaLessons[index + 1];
      await expect(courseNav.getByText(/^上一課：/)).toHaveCount(
        previous ? 1 : 0,
      );
      await expect(courseNav.getByText(/^下一課：/)).toHaveCount(next ? 1 : 0);
      if (previous)
        await expect(
          courseNav.getByText(`上一課：${previous.function}`),
        ).toHaveAttribute('href', `/articles/${previous.slug}`);
      if (next)
        await expect(
          courseNav.getByText(`下一課：${next.function}`),
        ).toHaveAttribute('href', `/articles/${next.slug}`);
      await noOverflow(`${lesson.slug} at ${width}px`);
      results.push({ path: `/articles/${lesson.slug}`, width, status: 200 });
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await open('/articles');
  await page.getByRole('button', { name: /^Excel 公式教學/ }).click();
  await expect(page.locator('#article-results-title')).toHaveText(
    'Excel 公式教學',
  );
  await expect(page.locator('.library-results-toolbar p')).toContainText(
    '共 20 篇',
  );
  await page
    .getByRole('searchbox', { name: '搜尋文章標題、關鍵字或內文' })
    .fill('XLOOKUP');
  await expect(page.locator('.library-article')).toHaveCount(1);
  await expect(page.locator('.library-article')).toContainText('XLOOKUP');
  assert.equal(
    new URL(page.url()).searchParams.get('category'),
    'Excel 公式教學',
  );
  assert.deepEqual(errors, []);
  await writeFile(`${output}/report.json`, JSON.stringify(results, null, 2));
  console.log(
    `PASS course home, 20 lessons at 3 widths, images, SEO, navigation, category and search (${results.length} article checks)`,
  );
} finally {
  await context.close();
  await browser.close();
}
