import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from 'playwright/test';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const published = new Set(
  JSON.parse(await readFile('lib/article-index.generated.json', 'utf8')).map(
    (article) => article.slug,
  ),
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const page = await browser.newPage();
await mockAdsense(page);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
async function open(path) {
  const response = await page.goto(base + path, { waitUntil: 'load' });
  assert.equal(response.status(), 200, path);
}
async function checkArticleLinks() {
  const hrefs = await page
    .locator('main a[href^="/articles/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  for (const href of hrefs) {
    assert.ok(published.has(href.slice('/articles/'.length)), href);
    assert.equal((await page.request.get(base + href)).status(), 200, href);
  }
}
try {
  for (const path of ['/', '/about', '/articles', '/excel-formulas']) {
    await open(path);
    await checkArticleLinks();
  }
  if (published.has('excel-average')) {
    await open('/articles/excel-average');
    await checkArticleLinks();
  }
  await open('/articles');
  const start = [
    'plc-self-hold-set-reset-q-series',
    'plc-fault-reset-single-acceptance',
    'plc-state-machine-three-step-sequence',
    'plc-analog-scaling-pressure-temperature-level',
  ];
  for (const slug of start) {
    await expect(
      page.locator(`.library-start a[href="/articles/${slug}"]`),
    ).toHaveCount(published.has(slug) ? 1 : 0);
  }
  if (
    !published.size ||
    [...published].every((slug) => slug.startsWith('excel-'))
  ) {
    await expect(
      page.locator('.library-start, .library-work-paths'),
    ).toHaveCount(0);
    await expect(page.locator('.library-empty')).toContainText(
      '未驗證的技術文章暫時下架。',
    );
  }
  for (const [tool, slug] of [
    ['analog', 'plc-analog-scaling-pressure-temperature-level'],
    ['plc-scaling', 'plc-analog-scaling-pressure-temperature-level'],
    ['modbus-address', 'modbus-function-code-01-04-read-list'],
    ['modbus-crc', 'rs485-no-response-troubleshooting'],
    ['register-converter', 'blackbox-observable'],
  ]) {
    await open(`/tool/${tool}`);
    await checkArticleLinks();
    await expect(
      page.locator(
        `aside[aria-label="相關操作教學"] a[href="/articles/${slug}"]`,
      ),
    ).toHaveCount(published.has(slug) ? 1 : 0);
  }
  assert.deepEqual(errors, []);
  console.log(
    `PASS published article links on home, about, directory and five tools; ${published.size} published; no page errors`,
  );
} finally {
  await browser.close();
}
