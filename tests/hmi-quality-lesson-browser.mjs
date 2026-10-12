import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
try {
  const page = await browser.newPage({ viewport: { width: 768, height: 960 } });
  await mockAdsense(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/articles/hmi-bad-quality-stale-value`, {
    waitUntil: 'networkidle',
  });
  const ui = page.locator('#hmi-quality-practice');
  await ui.getByRole('button', { name: 't=0 Good 0' }).click();
  assert.equal(
    await ui.getByTestId('raw-quality').first().textContent(),
    'Good',
  );
  assert.equal(
    await ui.getByTestId('last-good-value').first().textContent(),
    '0',
  );
  assert.equal(await ui.getByTestId('trend-point').first().textContent(), '0');
  await ui.getByRole('button', { name: 't=500 Bad' }).click();
  assert.equal(
    await ui.getByTestId('data-state').first().textContent(),
    'BAD_LAST_GOOD',
  );
  assert.equal(
    await ui.getByTestId('last-good-received').first().textContent(),
    '0 ms',
  );
  assert.equal(
    await ui.getByTestId('last-received').first().textContent(),
    '500 ms',
  );
  assert.equal(
    await ui.getByTestId('trend-point').first().textContent(),
    '缺口（不補零）',
  );
  await ui.getByRole('button', { name: 't=2500 Good 0' }).click();
  assert.equal(
    await ui.getByTestId('last-good-acquired').first().textContent(),
    '2500 ms',
  );
  await ui.getByRole('button', { name: 't=4500 stale' }).click();
  assert.equal(
    await ui.getByTestId('data-state').first().textContent(),
    'STALE',
  );
  assert.equal(
    await ui.getByTestId('last-good-age').first().textContent(),
    '2000 ms',
  );

  await ui.getByRole('button', { name: '載入合法零值' }).click();
  await ui.getByRole('button', { name: '套用這筆資料' }).click();
  assert.equal(
    await ui.getByTestId('data-state').last().textContent(),
    'FRESH',
  );
  assert.equal(
    await ui.getByTestId('last-good-value').last().textContent(),
    '0',
  );
  await ui.getByRole('button', { name: '載入 Bad' }).click();
  await ui.getByRole('button', { name: '套用這筆資料' }).click();
  assert.equal(
    await ui.getByTestId('data-state').last().textContent(),
    'BAD_LAST_GOOD',
  );
  assert.equal(
    await ui.getByTestId('trend-point').last().textContent(),
    '缺口（不補零）',
  );
  await ui.getByRole('button', { name: '載入序列拒絕' }).click();
  await ui.getByRole('button', { name: '套用這筆資料' }).click();
  assert.equal(
    await ui.getByTestId('decision').last().textContent(),
    'sample_rejected_seq',
  );
  await ui.getByLabel('現在時間（ms）').fill('-1');
  await ui.getByRole('button', { name: '套用這筆資料' }).click();
  assert.match(await ui.getByRole('alert').textContent(), /時間不可為負/);
  await ui.getByLabel('現在時間（ms）').fill('2500');
  await ui.getByLabel('資料值').fill('');
  await ui.getByRole('button', { name: '套用這筆資料' }).click();
  assert.match(await ui.getByRole('alert').textContent(), /請完整輸入/);
  await ui.getByLabel('資料值').fill('0.5');
  await ui.getByLabel('序列 seq').fill('2');
  await ui.getByRole('button', { name: '套用這筆資料' }).click();
  assert.equal(
    await ui.getByTestId('last-good-value').last().textContent(),
    '0.5',
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.setViewportSize({ width: 320, height: 720 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: HMI quality replay shows zero, Bad, stale and rejected sequence states',
  );
} finally {
  await browser.close();
}
