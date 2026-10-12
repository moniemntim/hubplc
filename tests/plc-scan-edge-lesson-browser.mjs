import assert from 'node:assert/strict';
import { chromium, expect } from 'playwright/test';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
  await mockAdsense(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${base}/articles/plc-scan-cycle-io-refresh`, {
    waitUntil: 'networkidle',
  });
  const scan = page.locator('#plc-scan-practice');
  await expect(scan.getByTestId('scan-3-m11-value')).toHaveText('1');
  await expect(scan.getByTestId('scan-3-applied')).toHaveText('0');
  await scan.getByRole('button', { name: '載入交換順序五次掃描' }).click();
  await expect(scan.getByTestId('scan-3-m11-value')).toHaveText('0');
  await expect(scan.getByTestId('scan-4-m11-value')).toHaveText('1');
  await scan.getByRole('button', { name: '8–12 ms：取樣一次' }).click();
  await expect(scan.getByTestId('pulse-samples')).toContainText('10 ms=1');
  await scan.getByRole('button', { name: '2–5 ms：未取樣' }).click();
  await expect(scan.getByTestId('pulse-samples')).toHaveText(
    '0 ms=0；10 ms=0；20 ms=0；30 ms=0',
  );
  await scan.getByLabel('各輪 Input（0／1，逗號分隔）').fill('0,2');
  await scan.getByRole('button', { name: '重播輸入' }).click();
  await expect(scan.getByRole('alert')).toContainText('1 至 12 筆');
  await scan.getByLabel('ON 起點（ms）').fill('5');
  await scan.getByLabel('ON 終點（ms）').fill('5');
  await scan.getByRole('button', { name: '取樣脈衝' }).click();
  await expect(scan.getByRole('alert').last()).toContainText('起點 < 終點');
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );

  await page.goto(`${base}/articles/plc-rising-falling-edge-button-event`, {
    waitUntil: 'networkidle',
  });
  const edge = page.locator('#plc-edge-practice');
  await expect(edge.getByTestId('edge-count')).toHaveText('1');
  await edge.getByRole('button', { name: '本輪取樣 1（按住）' }).click();
  await expect(edge.getByTestId('edge-count')).toHaveText('2');
  await expect(edge.getByTestId('edge-events')).toHaveText('1 / 0');
  await edge.getByRole('button', { name: '本輪取樣 1（按住）' }).click();
  await expect(edge.getByTestId('edge-count')).toHaveText('2');
  await edge.getByRole('button', { name: '本輪取樣 0（放開）' }).click();
  await expect(edge.getByTestId('edge-events')).toHaveText('0 / 1');
  await edge.getByRole('button', { name: '本輪取樣 1（按住）' }).click();
  await expect(edge.getByTestId('edge-count')).toHaveText('3');
  await edge.getByRole('button', { name: '從初值重設' }).click();
  await expect(edge.getByTestId('edge-count')).toHaveText('0');
  await expect(edge.getByTestId('edge-previous')).toHaveText('0（初值）');
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS scan order, pulse sampling and edge events on-page at 320px',
  );
} finally {
  await browser.close();
}
