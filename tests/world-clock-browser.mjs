import { mockAdsense, ADSENSE_URL } from './adsense-mock.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
await mkdir('outputs/time-qa', { recursive: true });
try {
  for (const width of [1280, 390, 320]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      timezoneId: 'America/Los_Angeles',
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    await mockAdsense(page);
    const errors = [];
    const external = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (req) => {
      if (!req.url().startsWith(base)) external.push(req.url());
    });
    await page.clock.install({ time: new Date('2026-01-01T16:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T16:00:01Z'));
    assert.equal((await page.goto(`${base}/tool/world-clock`)).status(), 200);
    await expect(page.locator('.world-hero')).toContainText('台灣・台北');
    await expect(page.locator('.world-time')).toHaveText('00:00:01');
    await expect(page.locator('.world-hero')).toContainText('2026-01-02');
    await expect(
      page.getByRole('option', { name: '台灣', exact: true }),
    ).toHaveCount(1);
    await page.getByRole('button', { name: '暫停更新', exact: true }).click();
    await page.clock.runFor(3000);
    await expect(page.locator('.world-time')).toHaveText('00:00:01');
    await page.getByRole('button', { name: '複製時間', exact: true }).click();
    assert.match(
      await page.evaluate(() => navigator.clipboard.readText()),
      /台灣・台北.*2026-01-02 00:00:01.*Asia\/Taipei/,
    );
    await page.getByLabel('國家／地區', { exact: true }).selectOption('TW');
    await expect(page.locator('.world-card')).toHaveCount(1);
    await page.getByRole('button', { name: '清空篩選', exact: true }).click();
    await page.getByLabel('搜尋城市、國家或時區').fill('New_York');
    await expect(page.locator('.world-card')).toHaveCount(1);
    await page.locator('.world-card').press('Enter');
    await expect(page.locator('.world-hero')).toContainText('美國・紐約');
    await expect(page.locator('.world-time')).toHaveText('11:00:01');
    await expect(page.locator('.world-hero')).toContainText('比台北慢 13 小時');
    await page.getByLabel('搜尋城市、國家或時區').fill('not-a-city');
    await expect(page.locator('.world-card')).toHaveCount(0);
    await page
      .getByRole('button', { name: '回到台灣・台北', exact: true })
      .click();
    await expect(page.locator('.world-hero')).toContainText('台灣・台北');
    await page.clock.runFor(2000);
    await expect(page.locator('.world-time')).toHaveText('00:00:06');
    await page.reload();
    await expect(page.locator('.world-hero')).toContainText('台灣・台北');
    assert.equal(
      await page.locator('link[rel="canonical"]').getAttribute('href'),
      'https://hubplc.com/tool/world-clock',
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: `outputs/time-qa/world-${width}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(external, [ADSENSE_URL, ADSENSE_URL]);
    await context.close();
    console.log(
      `PASS world-clock ${width}px: Taipei default independent of device timezone, Taiwan, search, keyboard, pause/copy/resume, reload, only expected mocked ad requests, no overflow`,
    );
  }
} finally {
  await browser.close();
}
