import { chromium, expect } from 'playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const output = 'outputs/article-browser';
await mkdir(output, { recursive: true });
const publishedArticles = JSON.parse(
  await readFile('lib/article-index.generated.json', 'utf8'),
);
const articles = publishedArticles.filter(
  (article) => article.category !== 'Excel 公式教學',
);
const lastPage = Math.ceil(articles.length / 12);
const lastPageCount = articles.length - (lastPage - 1) * 12;
const oldestUpdatedDate = articles
  .map((article) => article.updatedDate)
  .sort()[0];
const exampleSlug = 'blackbox-observable';
const workPathSlugs = [
  'rs485-no-response-troubleshooting',
  'modbus-function-code-01-04-read-list',
  'boundary-ticket',
  'blackbox-observable',
  'plc-self-hold-set-reset-q-series',
  'plc-fault-reset-single-acceptance',
  'hmi-numeric-range-step-validation',
  'hmi-setting-value-change-confirm-readback',
  'sampling-and-aggregation-periods',
  'resampling-original-imputed-flags',
  '24vdc-sensor-power-voltage-drop',
  '24v-input-reverse-polarity-tvs-surge-protection',
  'sensor-zero-drift-check-standard-trend',
  'sensor-replacement-compatibility-calibration-check',
  '4-20ma-scaling-open-overrange-diagnostics',
];
const hasFullDirectoryFixture =
  articles.length >= 12 &&
  [exampleSlug, ...workPathSlugs].every((slug) =>
    articles.some((article) => article.slug === slug),
  );
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
await mockAdsense(page);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
let indexRequests = 0;
page.on('request', (request) => {
  if (request.url().includes('/article-search.json')) indexRequests++;
});
const checks = [];
const search = page.getByRole('searchbox', {
  name: '搜尋文章標題、關鍵字或內文',
});
const cards = page.locator('.library-article');
async function open(path) {
  const response = await page.goto(base + path);
  assert.equal(response.status(), 200, path);
  await page.waitForLoadState('networkidle');
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

try {
  await open('/articles');
  if (articles.length === 0) {
    await expect(cards).toHaveCount(0);
    await expect(page.locator('.library-total strong')).toHaveText('0');
    await expect(
      page.locator('.library-start, .library-work-paths'),
    ).toHaveCount(0);
    await expect(page.locator('.library-empty')).toContainText(
      '未驗證的技術文章暫時下架。',
    );
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await noOverflow(`empty directory width ${width}`);
    }
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const noJsPage = await noJs.newPage();
    await noJsPage.goto(base + '/articles');
    assert.equal(
      await noJsPage.locator('main a[href^="/articles/"]').count(),
      0,
    );
    await noJs.close();
    assert.deepEqual(errors, []);
    checks.push(
      'Empty PLC directory shows a useful fallback, no unpublished links, and fits desktop and mobile',
    );
    await writeFile(
      `${output}/report.json`,
      JSON.stringify({ articles: 0, checks, errors, status: 'PASS' }, null, 2),
    );
    console.log(
      JSON.stringify(
        { status: 'PASS', checks: checks.length, articles: 0, errors },
        null,
        2,
      ),
    );
  } else if (!hasFullDirectoryFixture) {
    await expect(cards).toHaveCount(Math.min(12, articles.length));
    await expect(page.locator('.library-total strong')).toHaveText(
      String(articles.length),
    );
    const suggestionButtons = page.locator('.library-suggestions button');
    const suggestionCount = await suggestionButtons.count();
    for (let index = 0; index < suggestionCount; index++) {
      await suggestionButtons.nth(index).click();
      await expect(page.locator('.library-articles')).toHaveAttribute(
        'aria-busy',
        'false',
      );
      await expect.poll(() => cards.count()).toBeGreaterThan(0);
    }
    await search.fill('zzzz-no-such-article-999');
    await expect(page.locator('.library-articles')).toHaveAttribute(
      'aria-busy',
      'false',
    );
    await expect(cards).toHaveCount(0);
    await page.getByRole('button', { name: '顯示所有 PLC／工程文章' }).click();
    await expect(cards).toHaveCount(Math.min(12, articles.length));
    const linkedSlugs = await page
      .locator('main a[href^="/articles/"]')
      .evaluateAll((links) =>
        links.map((link) => link.getAttribute('href')?.split('/').pop()),
      );
    assert.ok(
      linkedSlugs.every((slug) =>
        articles.some((article) => article.slug === slug),
      ),
      'partial directory only links to published articles',
    );
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await noOverflow(`partial directory width ${width}`);
    }
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const noJsPage = await noJs.newPage();
    await noJsPage.goto(base + '/articles');
    assert.equal(
      await noJsPage.locator('.library-noscript a').count(),
      articles.length,
    );
    await noJs.close();
    assert.deepEqual(errors, []);
    checks.push(
      'Partially restored PLC directory exposes only published links and fits desktop and mobile',
    );
    await writeFile(
      `${output}/report.json`,
      JSON.stringify(
        { articles: articles.length, checks, errors, status: 'PASS' },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify(
        {
          status: 'PASS',
          checks: checks.length,
          articles: articles.length,
          errors,
        },
        null,
        2,
      ),
    );
  } else {
    await expect(cards).toHaveCount(12);
    await expect(page.locator('.library-total strong')).toHaveText(
      String(articles.length),
    );
    await expect(
      page.getByRole('button', { name: /^Excel 公式教學/ }),
    ).toHaveCount(0);
    await expect(
      page.locator('.library-article-category').filter({ hasText: 'Excel' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: '依工作找教學' }),
    ).toBeVisible();
    await expect(page.locator('.library-work-path')).toHaveCount(8);
    for (const slug of workPathSlugs) {
      assert.ok(
        articles.some((article) => article.slug === slug),
        `work path must reference a published article: ${slug}`,
      );
      await expect(
        page.locator(`.library-work-path a[href="/articles/${slug}"]`),
      ).toBeVisible();
    }
    assert.equal(indexRequests, 0);
    checks.push(
      `${articles.length} published articles; 8 static work paths use only published article links; first 12 rendered; fulltext not loaded initially`,
    );
    await page.screenshot({
      path: `${output}/directory-desktop.png`,
      fullPage: false,
    });

    await page.getByRole('button', { name: /^HMI 畫面與操作/ }).click();
    await expect(page.locator('#article-results-title')).toHaveText(
      'HMI 畫面與操作',
    );
    assert.ok(
      (await page.locator('.library-article-category').allTextContents()).every(
        (text) => text.includes('HMI 畫面與操作'),
      ),
    );
    await search.fill('權限');
    await expect(page.locator('.library-articles')).toHaveAttribute(
      'aria-busy',
      'false',
    );
    assert.ok((await cards.count()) > 0);
    assert.equal(
      new URL(page.url()).searchParams.get('category'),
      'HMI 畫面與操作',
    );
    await page.reload();
    await expect(search).toHaveValue('權限');
    await expect(page.locator('.library-articles')).toHaveAttribute(
      'aria-busy',
      'false',
    );
    checks.push(
      'Category + search combination and URL reload preserve controls',
    );

    await page.getByRole('button', { name: '清除篩選' }).click();
    await search.fill('offline_known_result');
    await expect(page.locator('.library-articles')).toHaveAttribute(
      'aria-busy',
      'false',
    );
    await expect(
      page.locator(`a.library-article[href="/articles/${exampleSlug}"]`),
    ).toBeVisible();
    assert.ok(
      (await page.locator('.library-article-category').allTextContents()).some(
        (text) => text.includes('內文符合'),
      ),
    );
    checks.push('Body-only search finds a published Modbus case');

    await search.fill('zzzz-no-such-article-999');
    await expect(cards).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: '顯示所有 PLC／工程文章' }),
    ).toBeVisible();
    await page.getByRole('button', { name: '顯示所有 PLC／工程文章' }).click();
    await page
      .getByRole('combobox', { name: '文章排序' })
      .selectOption('oldest');
    await expect(cards.first()).toContainText(oldestUpdatedDate);
    await page
      .getByRole('combobox', { name: '文章排序' })
      .selectOption('newest');
    await page.getByRole('button', { name: '卡片顯示' }).click();
    await expect(page.locator('.library-articles-grid')).toBeVisible();
    await page
      .getByRole('combobox', { name: '跳至頁碼' })
      .selectOption(String(lastPage));
    await expect(cards).toHaveCount(lastPageCount);
    await page.getByRole('combobox', { name: '跳至頁碼' }).selectOption('3');
    await expect(cards).toHaveCount(12);
    await expect(
      page.getByRole('button', { name: '第 3 頁', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    checks.push(
      'No-result recovery, date sorting, grid toggle, final page and page jump',
    );

    const directoryUrl =
      new URL(page.url()).pathname + new URL(page.url()).search;
    const chosen = cards.nth(2);
    const articlePath = await chosen.getAttribute('href');
    await chosen.scrollIntoViewIfNeeded();
    const beforeY = await page.evaluate(() => window.scrollY);
    await chosen.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.article-reader__back-link')).toHaveAttribute(
      'href',
      directoryUrl,
    );
    await expect(page.locator('.article-reader__toc-desktop')).toBeVisible();
    assert.ok(
      (await page.locator('.article-reader__related-card').count()) <= 3,
    );
    const tocLink = page.locator('.article-reader__toc-desktop a').nth(1);
    const targetHash = await tocLink.getAttribute('href');
    await tocLink.click();
    await expect(page).toHaveURL(new RegExp(targetHash + '$'));
    assert.ok((await page.locator(targetHash).count()) === 1);
    await page.locator('.article-reader__back-link').click();
    await expect(page.getByRole('combobox', { name: '跳至頁碼' })).toHaveValue(
      '3',
    );
    await expect(
      page.getByRole('button', { name: '卡片顯示' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(Math.max(0, beforeY - 80));
    checks.push(
      'Reader table of contents, related links, return filters/page/view/scroll',
    );

    await open('/articles?page=999999');
    await expect(cards).toHaveCount(lastPageCount);
    await expect(page.getByRole('combobox', { name: '跳至頁碼' })).toHaveValue(
      String(lastPage),
    );
    await expect(page).toHaveURL(new RegExp(`page=${lastPage}(?:&|$)`));
    checks.push('Out-of-range shared URL clamps to real last page');

    for (const width of [390, 768, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await open('/articles');
      await noOverflow(`directory width ${width}`);
      if (width === 390)
        await page.screenshot({
          path: `${output}/directory-mobile.png`,
          fullPage: true,
        });
      await open(`/articles/${exampleSlug}`);
      await expect(page.locator('.article-reader__toc-mobile')).toBeVisible();
      await page.locator('.article-reader__toc-mobile summary').click();
      await expect(
        page.locator('.article-reader__toc-mobile a').first(),
      ).toBeVisible();
      await page.locator('.article-reader__toc-mobile a').nth(1).click();
      await noOverflow(`reader width ${width}`);
      if (width === 390) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: `${output}/reader-mobile.png`,
          fullPage: false,
        });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await open(`/articles/${exampleSlug}`);
    await noOverflow('reader desktop');
    await page.screenshot({
      path: `${output}/reader-desktop.png`,
      fullPage: false,
    });
    checks.push(
      'Directory and reader at 320 / 390 / 768 / 1440, mobile TOC, no horizontal overflow',
    );

    await page.evaluate(() =>
      sessionStorage.setItem(
        'hubplc:article-directory',
        JSON.stringify({ url: '//malicious.example/articles', scrollY: 0 }),
      ),
    );
    await page.reload();
    await expect(page.locator('.article-reader__back-link')).toHaveAttribute(
      'href',
      '/articles',
    );
    checks.push(
      'Corrupt/external saved directory URL cannot redirect the reader',
    );

    const errorPage = await context.newPage();
    await mockAdsense(errorPage);
    let shouldFail = true;
    await errorPage.route('**/article-search.json', async (route) =>
      shouldFail
        ? route.fulfill({ status: 503, body: 'unavailable' })
        : route.continue(),
    );
    await errorPage.goto(base + '/articles');
    await errorPage.waitForLoadState('networkidle');
    await errorPage.getByRole('searchbox').fill('Modbus');
    await expect(errorPage.locator('.library-search-notice')).toBeVisible();
    assert.ok((await errorPage.locator('.library-article').count()) > 0);
    shouldFail = false;
    await errorPage.getByRole('button', { name: '重新載入' }).click();
    await expect(errorPage.locator('.library-search-notice')).toHaveCount(0);
    await expect(errorPage.locator('.library-articles')).toHaveAttribute(
      'aria-busy',
      'false',
    );
    await errorPage.close();
    checks.push(
      'Search fetch failure preserves metadata results; retry restores fulltext',
    );

    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const noJsPage = await noJs.newPage();
    await noJsPage.goto(base + '/articles');
    assert.equal(
      await noJsPage.locator('.library-noscript a').count(),
      articles.length,
    );
    assert.equal(await noJsPage.locator('.library-work-path').count(), 8);
    assert.equal(
      await noJsPage.locator('.library-work-path a').count(),
      workPathSlugs.length,
    );
    await noJs.close();
    checks.push('No-JavaScript page retains links to all published articles');
    assert.deepEqual(errors, []);
    await writeFile(
      `${output}/report.json`,
      JSON.stringify(
        {
          articles: articles.length,
          checks,
          errors,
          articlePath,
          status: 'PASS',
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify(
        {
          status: 'PASS',
          checks: checks.length,
          articles: articles.length,
          errors,
        },
        null,
        2,
      ),
    );
  }
} finally {
  await browser.close();
}
