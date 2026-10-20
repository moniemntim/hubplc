import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();
await mockAdsense(page);
await page.route('**/api/locale', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ locale: 'en' }),
  }),
);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  assert.equal((await page.goto(`${base}/tool`)).status(), 200);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Let the tools handle the math/,
    }),
  ).toBeVisible();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(
    await page.evaluate(() => localStorage.getItem('hubplc:locale')),
    null,
    'automatic country choice must not become a permanent manual override',
  );

  await page.getByRole('button', { name: '中文', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    '把計算交給工具',
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem('hubplc:locale')),
    'zh-Hant',
  );
  await page.reload();
  // The Chinese SSR heading is present before interactive handlers hydrate.
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    '把計算交給工具',
  );

  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'EN', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('hubplc:locale')))
    .toBe('en');
  await page.goto(`${base}/tool/voltage-divider`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Voltage Divider Calculator' }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Input conditions' }),
  ).toBeVisible();
  await expect(page.getByText('Worked example', { exact: true })).toBeVisible();
  assert.equal(await page.title(), 'Voltage Divider Calculator｜HubPLC');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');

  for (const path of ['/tool', '/tool/voltage-divider']) {
    assert.equal((await page.goto(`${base}${path}`)).status(), 200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const navigation = page.getByRole('navigation', {
      name: 'Main navigation',
    });
    await expect(navigation).toBeVisible();
    for (const width of [320, 390, 480, 481, 500, 600, 601, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await navigation.evaluate((nav) => ({
        documentWidth: document.documentElement.scrollWidth,
        links: Array.from(nav.querySelectorAll('a'))
          .filter((link) => {
            const style = getComputedStyle(link);
            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              link.getClientRects().length > 0
            );
          })
          .map((link) => {
            const rect = link.getBoundingClientRect();
            return {
              text: link.textContent,
              left: rect.left,
              right: rect.right,
              height: rect.height,
            };
          }),
      }));
      assert.ok(
        layout.documentWidth <= width,
        `${path} at ${width}px overflows: ${layout.documentWidth}px`,
      );
      assert.ok(
        layout.links.length > 0,
        `${path} at ${width}px has no visible navigation links`,
      );
      for (const link of layout.links) {
        assert.ok(
          link.left >= 0 && link.right <= width && link.height >= 40,
          `${path} at ${width}px: navigation link ${link.text} has invalid bounds ${JSON.stringify(link)}`,
        );
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS IP-locale bootstrap, manual override persistence, English tool UI and responsive navigation',
  );
} finally {
  await browser.close();
}
