import assert from 'node:assert/strict';
import { chromium, expect } from 'playwright/test';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await mockAdsense(page);
const status = page.locator('.plc-practice-status');
async function open(slug) {
  const response = await page.goto(`${base}/articles/${slug}`);
  assert.equal(response.status(), 200);
  await page.waitForLoadState('networkidle');
}
async function set(name, value) {
  await page
    .locator('.plc-practice label')
    .filter({ hasText: new RegExp(`^${name} =`) })
    .locator('input')
    .setChecked(value);
}
async function step(count = 1) {
  await page
    .getByRole('button', { name: `執行 ${count} 掃描`, exact: true })
    .click();
}
try {
  await open('plc-self-hold-set-reset-q-series');
  await set('Start', true);
  await expect(status).toContainText('FanReq=0');
  await step();
  await expect(status).toContainText('FanReq=1');
  await set('Start', false);
  await step();
  await expect(status).toContainText('FanReq=1');
  await set('Stop', true);
  await step();
  await expect(status).toContainText('FanReq=0');
  await set('Start', true);
  await step();
  await expect(status).toContainText('FanReq=0');
  await set('Stop', false);
  await step();
  await expect(status).toContainText('FanReq=1');
  await page.getByRole('button', { name: '全部重設' }).click();
  await expect(status).toContainText('已執行 0 掃描');
  await expect(page.locator('.plc-practice tbody')).toContainText('尚無紀錄');

  await open('plc-ton-tof-tp-timer-selection');
  await set('IN', true);
  await step();
  await expect(status).toContainText('ET=0 ms');
  await step(10);
  await expect(status).toContainText('Q=0 · ET=1000 ms');
  await step(10);
  await expect(status).toContainText('Q=1 · ET=2000 ms');
  await set('IN', false);
  await step();
  await expect(status).toContainText('Q=0 · ET=0 ms');
  for (let i = 0; i < 10; i++) await step(10);
  await expect(page.locator('.plc-practice tbody tr')).toHaveCount(100);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );

  await open('plc-state-machine-three-step-sequence');
  await set('Start', true);
  await step();
  await expect(status).toContainText('State=RUN');
  await set('Start', false);
  await step(10);
  for (let i = 0; i < 9; i++) await step();
  await expect(status).toContainText('ET=1900 ms');
  await set('DoneInput', true);
  await step();
  await expect(status).toContainText('State=FAULT');
  await expect(status).toContainText('TIMEOUT');
  await set('Reset', true);
  await step();
  await expect(status).toContainText('State=FAULT');
  await set('DoneInput', false);
  await step();
  await expect(status).toContainText('State=WAIT');
  assert.deepEqual(errors, []);

  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const offline = await noJs.newPage();
  await offline.goto(`${base}/articles/plc-ton-tof-tp-timer-selection`);
  assert.match(
    await offline.locator('noscript').textContent(),
    /請啟用 JavaScript/,
  );
  await expect(offline.locator('noscript')).toBeVisible();
  await expect(offline.locator('.article-reader__content')).toContainText(
    'DelayOn(IN := Condition',
  );
  await noJs.close();
  console.log(
    'PASS three interactive lessons: latch, TON, timeout priority/reset, history bound, mobile overflow, no-JS article.',
  );
} finally {
  await browser.close();
}
