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
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    '把計算交給工具',
  );

  await page.getByRole('button', { name: 'EN', exact: true }).click();
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
  assert.deepEqual(errors, []);
  console.log(
    'PASS IP-locale bootstrap, manual override persistence, and English tool UI',
  );
} finally {
  await browser.close();
}
