import assert from 'node:assert/strict';
import { chromium, expect } from 'playwright/test';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await mockAdsense(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  assert.equal((await page.goto(base + '/tool')).status(), 200);
  const search = page.getByRole('searchbox', { name: '搜尋工具' });
  for (const [query, title] of [
    ['安培轉千瓦', '安培轉千瓦計算器'],
    ['kVA轉安培', 'kVA轉安培計算器'],
    ['MVA轉安培', 'MVA轉安培計算器'],
    ['瓦特轉VA', '瓦特轉VA計算器'],
    ['瓦特轉kWh', '用電量計算器（W／kW轉kWh）'],
    ['kWh轉瓦特', 'kWh轉平均功率計算器（W／kW）'],
    ['電費', '電費計算器'],
  ]) {
    await search.fill(query);
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
  }

  const open = async (slug) => {
    assert.equal((await page.goto(`${base}/tool/${slug}`)).status(), 200);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('combobox', { name: '換算方向' })).toHaveCount(
      0,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    return page.getByRole('region', { name: '計算結果' });
  };
  let result = await open('kw-to-amps');
  await expect(result).toContainText('18.9917851707');
  result = await open('kva-to-amps');
  await expect(result).toContainText('15.1934281366');
  await expect(page.getByRole('textbox', { name: '功率因數' })).toHaveCount(0);
  result = await open('mva-to-amps');
  await expect(result).toContainText('52.4863881081');
  result = await open('va-to-kva');
  await expect(result).toContainText('1 kVA');
  result = await open('energy-consumption');
  await expect(result).toContainText('240 kWh');
  await expect(page.getByLabel('每度電價')).toHaveCount(0);
  await expect(result).not.toContainText('估算電費');
  result = await open('kwh-to-kw');
  await expect(result).toContainText('2,000 W');
  await expect(result).toContainText('2 kW');
  await expect(page.getByLabel('每度電價')).toHaveCount(0);
  result = await open('electricity-cost');
  await expect(result).toContainText('720 元');
  await expect(page.getByLabel('每度電價')).toHaveCount(1);

  const sitemap = await (await fetch(base + '/sitemap.xml')).text();
  const intents = [
    'amps-to-watts',
    'amps-to-kilowatts',
    'amps-to-va',
    'amps-to-kva',
    'watts-to-amps',
    'kw-to-amps',
    'kva-to-amps',
    'mva-to-amps',
    'watts-to-volts',
    'kw-to-volts',
    'va-to-watts',
    'kva-to-kw',
    'watts-to-va',
    'kw-to-kva',
    'va-to-kva',
    'kwh-to-kw',
    'energy-consumption',
    'electricity-cost',
  ];
  assert.equal(intents.length, 18);
  for (const slug of intents) {
    assert.ok(sitemap.includes(`https://hubplc.com/tool/${slug}`));
    const response = await fetch(`${base}/tool/${slug}`);
    assert.equal(response.status, 200, slug);
    assert.ok(
      (await response.text()).includes(
        `href="https://hubplc.com/tool/${slug}"`,
      ),
      `canonical ${slug}`,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: 18 distinct power intents searchable, preset, responsive and indexed',
  );
} finally {
  await browser.close();
}
