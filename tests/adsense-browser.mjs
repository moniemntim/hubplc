import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import { tools } from '../lib/tools/registry.ts';
import { ADSENSE_URL, mockAdsense } from './adsense-mock.mjs';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const cases = [
  ['/', true],
  ['/tool', true],
  ['/articles', false],
  ['/privacy', false],
  ['/about', false],
  ...tools.map((t) => [`/tool/${t.slug}`, t.category !== '編碼']),
];
for (const [path, allowed] of cases) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  const tags = [...html.matchAll(/<script\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((t) => t.includes('pagead2.googlesyndication.com'));
  assert.equal(
    tags.length,
    allowed ? 1 : 0,
    `${path}: actual AdSense script count`,
  );
  if (allowed) {
    assert.ok(head.includes(tags[0]), `${path}: script in head`);
    assert.ok(tags[0].includes(`src="${ADSENSE_URL}"`));
    assert.match(tags[0], /\basync(?:="")?[\s>]/);
    assert.match(tags[0], /crossorigin="anonymous"/i);
  }
}
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
try {
  const page = await browser.newPage();
  await mockAdsense(page);
  const errors = [];
  const adRequests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (r.url() === ADSENSE_URL) adRequests.push(r.url());
  });
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + '/tool/analog');
    await expect(
      page.locator('head script[src*="adsbygoogle.js"]'),
    ).toHaveCount(1);
    await page.getByRole('textbox', { name: '訊號值', exact: true }).fill('12');
    await expect(page.getByRole('region', { name: '計算結果' })).toContainText(
      '50',
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.goto(base + '/tool');
    const count = adRequests.length;
    await page.locator('a[href="/tool/password-generator"]').click();
    await expect(page.locator('h1')).toContainText('密碼');
    await expect(page.locator('script[src*="adsbygoogle.js"]')).toHaveCount(0);
    assert.equal(
      adRequests.length,
      count,
      'native navigation to sensitive tool must not load ads',
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    `PASS ${cases.length} HTML pages: correct publisher, one async anonymous script in head only on allowed pages; desktop/mobile calculator and sensitive-page navigation; no real ad impressions`,
  );
} finally {
  await browser.close();
}
