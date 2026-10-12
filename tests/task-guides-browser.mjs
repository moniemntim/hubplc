import assert from 'node:assert/strict';
import { chromium, expect } from 'playwright/test';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const guidedPowerSlugs =
  'amps-to-watts amps-to-kilowatts amps-to-va amps-to-kva volts-to-watts volts-to-amps watts-to-amps kw-to-amps kva-to-amps mva-to-amps watts-to-volts kw-to-volts va-to-watts kva-to-kw watts-to-va watts-to-kva kw-to-kva va-to-kva kva-to-va kw-to-kwh watts-to-kwh kwh-to-kw kwh-to-watts energy-consumption electricity-cost'.split(
    ' ',
  );
const guidedUnitSlugs =
  'length temperature mass area volume pressure power time angle capacitance speed storage'
    .split(' ')
    .map((group) => `${group}-converter`);
const powerCases = [
  [
    'volts-to-amps',
    'I(A) = P(kW) × 1000 ÷ [V(V) × PF]',
    '馬達啟動電流不能用穩態 kW 反推。',
  ],
  [
    'kw-to-amps',
    'I(A) = P(kW) × 1000 ÷ [√3 × VL(V) × PF]',
    '不可把相電壓填入線電壓欄。',
  ],
  [
    'kva-to-amps',
    'I(A) = S(kVA) × 1000 ÷ [√3 × VL(V)]',
    '這個換算不需要 PF；加入 PF 反而改變問題。',
  ],
  [
    'mva-to-amps',
    'I(A) = S(MVA) × 1,000,000 ÷ [√3 × VL(V)]',
    'kV 與 V 混用會造成千倍誤差。',
  ],
  [
    'kw-to-volts',
    'VL(V) = P(kW) × 1000 ÷ [√3 × I(A) × PF]',
    '量到單相支路時不應套用三相總功率。',
  ],
  ['watts-to-kva', 'S(kVA) = P(W) ÷ PF ÷ 1000', '不要把效率當成功率因數。'],
  ['watts-to-kwh', 'E(kWh) = P(W) × t(h) ÷ 1000', '分鐘需先換算成小時。'],
  [
    'electricity-cost',
    'cost(currency) = E(kWh) × rate(currency/kWh)',
    '本工具不套用電力公司的分段、需量或稅費規則。',
  ],
];
const unitCases = [
  ['pressure-converter', '表壓與絕壓不能只靠單位換算互換。'],
  ['temperature-converter', '攝氏與華氏的溫差換算沒有相同零點偏移。'],
  ['storage-converter', 'GB 採 1000，GiB 採 1024。'],
];

for (const [slug, formula, pitfall] of powerCases) {
  const response = await fetch(`${base}/tool/${slug}`);
  assert.equal(response.status, 200, slug);
  const html = await response.text();
  assert.ok(html.includes('任務指引'), `${slug}: task guide`);
  assert.ok(html.includes(formula), `${slug}: distinct formula`);
  assert.ok(html.includes(pitfall), `${slug}: distinct limitation`);
}
for (const [slug, pitfall] of unitCases) {
  const response = await fetch(`${base}/tool/${slug}`);
  assert.equal(response.status, 200, slug);
  const html = await response.text();
  assert.ok(html.includes('任務指引'), `${slug}: task guide`);
  assert.ok(html.includes(pitfall), `${slug}: group limitation`);
}
for (const slug of [...guidedPowerSlugs, ...guidedUnitSlugs]) {
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

const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await mockAdsense(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${base}/tool/kw-to-amps`);
  await expect(page.getByTestId('task-guide')).toContainText('線電壓');
  await expect(page.getByRole('region', { name: '計算結果' })).toContainText(
    '18.9917851707',
  );
  await page.goto(`${base}/tool/pressure-converter`);
  await expect(page.getByTestId('task-guide')).toContainText('表壓與絕壓');
  await page.getByLabel('輸入數值', { exact: true }).fill('1');
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
  await page.addInitScript(() => localStorage.setItem('hubplc:locale', 'en'));
  await page.goto(`${base}/tool/kw-to-amps`);
  await expect(page.getByTestId('task-guide')).toContainText('Use case');
  await expect(page.getByTestId('task-guide')).toContainText('Worked default');
  await expect(page.getByTestId('task-guide')).toContainText('line-to-line');
  await page.goto(`${base}/tool/pressure-converter`);
  await expect(page.getByTestId('task-guide')).toContainText(
    'Uses pascals as the reference unit.',
  );
  assert.deepEqual(errors, []);
  console.log('PASS task-specific power/unit guides and calculator results');
} finally {
  await browser.close();
}
