import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, expect } from 'playwright/test';
import { tools, categories } from '../lib/tools/registry.ts';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.TOOL_HOME_OUTPUT ?? 'outputs/tool-home';
const articles = JSON.parse(
  await readFile('lib/article-index.generated.json', 'utf8'),
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const checks = [];
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    if (!localStorage.getItem('hubplc:locale'))
      localStorage.setItem('hubplc:locale', 'zh-Hant');
  });
  await mockAdsense(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      (await page.goto(base, { waitUntil: 'networkidle' })).status(),
      200,
    );
    await expect(page.locator('.tool-card')).toHaveCount(tools.length);
    await expect(page.locator('.tool-category-section')).toHaveCount(
      categories.length - 1,
    );
    await expect(
      page.locator('.tool-category-section').first().locator('.tool-card'),
    ).toHaveCount(
      tools.filter((tool) => tool.category === 'PLC 與通訊').length,
    );
    await expect(page.locator('h1')).toContainText('常用工具');
    await expect(
      page.locator(
        '.site-header nav a[href^="/articles"], .site-header nav a[href^="/excel-formulas"], .tool-home a[href^="/articles"], .tool-home a[href^="/excel-formulas"]',
      ),
    ).toHaveCount(0);
    await expect(page.locator('ins.adsbygoogle')).toHaveCount(0);
    assert.equal(
      new URL(await page.locator('link[rel="canonical"]').getAttribute('href'))
        .href,
      'https://hubplc.com/',
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({ path: `${output}/home-${width}.png` });
    checks.push({ width, toolLinks: tools.length, overflow: false });
  }
  const search = page.getByRole('searchbox', { name: '搜尋工具' });
  await search.fill('Modbus');
  await expect(page.locator('.tool-card')).toHaveCount(2);
  await page.getByRole('button', { name: '清除搜尋', exact: true }).click();
  await expect(page.locator('.tool-card')).toHaveCount(tools.length);
  for (const category of categories.filter((value) => value !== '全部')) {
    await page.getByRole('tab', { name: category, exact: true }).click();
    await expect(page.locator('.tool-card')).toHaveCount(
      tools.filter((tool) => tool.category === category).length,
    );
  }
  await search.fill('no-matching-tool-7482');
  await expect(
    page.getByRole('heading', { name: '找不到符合的工具' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '顯示所有工具', exact: true }).click();
  await expect(page.locator('.tool-card')).toHaveCount(tools.length);
  await page.getByRole('button', { name: '電費', exact: true }).click();
  await expect(
    page.locator('.tool-card[href="/tool/energy-cost"]'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'QR Code', exact: true }).click();
  await expect(page.locator('.tool-card')).toHaveCount(1);
  await page.locator('.tool-card[href="/tool/qrcode"]').click();
  await expect(page).toHaveURL(`${base}/tool/qrcode`);
  await page.getByRole('link', { name: '← 返回工具總覽', exact: true }).click();
  await expect(page).toHaveURL(`${base}/`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('h1')).toContainText('Useful tools');
  await expect(
    page.getByRole('searchbox', { name: 'Search tools' }),
  ).toBeVisible();
  await expect(page).toHaveTitle('Free Online Tools｜HubPLC');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'About the tools', exact: true })
    .click();
  await expect(page.locator('h1')).toContainText(
    'Keep engineering calculations',
  );
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.goto(base + '/privacy');
  await expect(page.locator('h1')).toHaveText('Privacy');
  await expect(page.locator('main')).toContainText(
    'The tool directory on the home page',
  );
  for (const path of ['/tool', '/tool/']) {
    const response = await fetch(base + path + '?q=QR&q=Modbus', {
      redirect: 'manual',
    });
    assert.equal(response.status, 308);
    const destination = new URL(response.headers.get('location'));
    assert.equal(destination.pathname, '/');
    assert.deepEqual(destination.searchParams.getAll('q'), ['QR', 'Modbus']);
  }
  for (const slug of [
    'fx5u-sd-bin-read-write',
    'fx5u-sd-csv-read-write',
    'xca-ecu-https-certificate-setup',
    'excel-average',
  ]) {
    const response = await page.goto(`${base}/articles/${slug}`);
    assert.equal(response.status(), 200);
    await expect(page.locator('h1')).toHaveText(
      articles.find((article) => article.slug === slug).title,
    );
  }
  assert.equal((await fetch(base + '/articles')).status, 200);
  assert.equal((await fetch(base + '/excel-formulas')).status, 200);
  const staticContext = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await staticContext.newPage();
  await mockAdsense(staticPage);
  await staticPage.goto(base);
  await expect(staticPage.locator('.tool-card')).toHaveCount(tools.length);
  await staticContext.close();
  assert.deepEqual(errors, []);
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(
      {
        base,
        status: 'PASS',
        checks,
        tools: tools.length,
        retainedArticles: articles.length,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS tool homepage, ${tools.length} SSR tool links, search/categories/reset, navigation, languages, old directory redirects, retained article URLs, and 3 viewport widths.`,
  );
} finally {
  await browser.close();
}
