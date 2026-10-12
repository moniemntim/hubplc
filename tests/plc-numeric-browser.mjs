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
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 720 } });
  await mockAdsense(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/articles/plc-floating-point-tolerance`, {
    waitUntil: 'networkidle',
  });
  const tolerance = page.locator('#plc-tolerance-practice');
  await expect(tolerance.getByTestId('numeric-close')).toHaveText('合格');
  await tolerance.getByRole('button', { name: '載入 25.051：窗口外' }).click();
  await expect(tolerance.getByTestId('numeric-close')).toHaveText('不合格');
  await tolerance.getByLabel('第一個值 a').fill('25.05');
  await expect(tolerance.getByTestId('numeric-close')).toHaveText('不合格');
  await tolerance
    .getByRole('button', { name: '載入可精確表示的等號邊界' })
    .click();
  await expect(tolerance.getByTestId('numeric-close')).toHaveText('合格');
  await tolerance.getByRole('button', { name: '載入相對容差案例' }).click();
  await expect(tolerance.getByTestId('numeric-limit')).toHaveText('1.00005');
  await expect(tolerance.getByTestId('numeric-close')).toHaveText('合格');
  await tolerance.getByLabel('第一個值 a').fill('');
  await expect(tolerance.getByRole('alert')).toBeVisible();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );

  await page.goto(
    `${base}/articles/plc-rounding-negative-display-fixed-point`,
    {
      waitUntil: 'networkidle',
    },
  );
  const rounding = page.locator('#plc-rounding-practice');
  await expect(rounding.getByTestId('numeric-rounded')).toHaveText('-124');
  await expect(rounding.getByTestId('numeric-display')).toHaveText('-12.4');
  await rounding.getByRole('button', { name: '載入負數接近零' }).click();
  await expect(rounding.getByTestId('numeric-rounded')).toHaveText('0');
  await rounding.getByLabel('Raw100（整數，−100000 至 100000）').fill('100001');
  await expect(rounding.getByRole('alert')).toContainText('範圍');
  await rounding.getByLabel('Raw100（整數，−100000 至 100000）').fill('12.5');
  await expect(rounding.getByRole('alert')).toContainText('整數');
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS PLC tolerance and fixed-point rounding on-page exercises at 320px',
  );
} finally {
  await browser.close();
}
