import assert from 'node:assert/strict';
import { chromium, expect } from 'playwright/test';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const guidedUnitSlugs = [
  'length-converter',
  'temperature-converter',
  'mass-converter',
  'area-converter',
  'volume-converter',
  'pressure-converter',
  'power-converter',
  'time-converter',
  'angle-converter',
  'capacitance-converter',
  'speed-converter',
  'storage-converter',
];
const unitCases = [
  ['pressure-converter', '表壓與絕壓不能只靠單位換算互換。'],
  ['temperature-converter', '攝氏與華氏的溫差換算沒有相同零點偏移。'],
  ['storage-converter', 'GB 採 1000，GiB 採 1024。'],
];

for (const [slug, pitfall] of unitCases) {
  const response = await fetch(`${base}/tool/${slug}`);
  assert.equal(response.status, 200, slug);
  const html = await response.text();
  assert.ok(html.includes('任務指引'), `${slug}: task guide`);
  assert.ok(html.includes(pitfall), `${slug}: group limitation`);
}
for (const slug of guidedUnitSlugs) {
  const response = await fetch(`${base}/tool/${slug}`);
  assert.equal(response.status, 200, `${slug}: HTTP`);
  const html = await response.text();
  assert.ok(html.includes('任務指引'), `${slug}: guide missing`);
  assert.ok(html.includes('預設範例'), `${slug}: worked example missing`);
}

const pressureHtml = await (
  await fetch(`${base}/tool/pressure-converter`)
).text();
assert.ok(
  !pressureHtml.includes('/articles/gauge-absolute-pressure-4-20ma'),
  'pressure guide must not link to a non-public article',
);

/** @type {Array<[string, string[]]>} */
const canonicalCases = [
  [
    '/tool/ac-power-converter',
    ['案例 1：單相 10 A', '線電壓', 'PF 不能只從電流猜出', 'UPS'],
  ],
  [
    '/tool/energy-cost',
    ['案例 1：用功率、時數與天數', '自訂單一費率', '瞬時峰值'],
  ],
];
for (const [path, required] of canonicalCases) {
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, 200, `${path}: HTTP`);
  const html = await response.text();
  for (const text of required)
    assert.ok(html.includes(text), `${path}: SSR case text ${text}`);
}

const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await mockAdsense(page);
  await page.route('**/api/locale', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ locale: 'zh-Hant' }),
    }),
  );
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${base}/tool/ac-power-converter`);
  const acCases = page.locator('.worked-case');
  await expect(acCases).toHaveCount(3);
  await expect(acCases.nth(1)).toContainText('線電壓');
  await expect(acCases.nth(1)).toContainText('平衡三相');
  await expect(acCases.nth(0)).toContainText('PF 不能只從電流猜出');
  await expect(acCases.nth(2)).toContainText('啟動／突入電流');

  await page.goto(`${base}/tool/energy-cost`);
  const energyCases = page.locator('.worked-case');
  await expect(energyCases).toHaveCount(2);
  await expect(energyCases.nth(0)).toContainText('自訂單一費率');
  await expect(energyCases.nth(1)).toContainText('瞬時峰值');
  await expect(energyCases.nth(1)).toContainText('平均值');

  await page.goto(`${base}/tool/pressure-converter`);
  await expect(page.getByTestId('task-guide')).toContainText('表壓與絕壓');
  await page.getByRole('textbox', { name: '輸入數值', exact: true }).fill('1');
  await expect(
    page.getByRole('combobox', { name: '來源單位', exact: true }),
  ).toContainText('bar');
  await expect(
    page.getByRole('combobox', { name: '目標單位', exact: true }),
  ).toContainText('kPa');
  await expect(page.getByRole('region', { name: '計算結果' })).toContainText(
    '100',
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log('PASS: unit guides and SSR-visible power/energy worked cases');
} finally {
  await browser.close();
}
