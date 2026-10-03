import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from 'playwright/test';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await mockAdsense(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const open = async (slug) => {
    assert.equal((await page.goto(`${base}/tool/${slug}`)).status(), 200);
    await page.waitForLoadState('networkidle');
  };
  const choose = async (label, option) => {
    await page.getByRole('combobox', { name: label, exact: true }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
  };
  const result = page.getByRole('region', { name: '計算結果' });

  await open('ac-power-converter');
  await choose('換算方向', 'W／kW／MW → 安培');
  await choose('供電方式', '平衡三相交流');
  await choose('已知量單位', 'kW');
  await page.getByLabel('實功率', { exact: true }).fill('10');
  await page.getByLabel('線電壓', { exact: true }).fill('380');
  await page.getByLabel('功率因數', { exact: true }).fill('0.8');
  await expect(result).toContainText('18.9917851707');
  await choose('換算方向', 'VA／kVA／MVA → W／kW');
  await choose('已知量單位', 'MVA');
  await page.getByLabel('視在功率', { exact: true }).fill('1');
  await page.getByLabel('功率因數', { exact: true }).fill('0.9');
  await expect(result).toContainText('900 kW');

  await open('power-factor');
  await page.getByLabel('實功率 P', { exact: true }).fill('8');
  await page.getByLabel('視在功率 S', { exact: true }).fill('10');
  await expect(result).toContainText('0.8');
  await expect(result).toContainText('6 kvar');
  await choose('已知資料', '實功率 P＋虛功率 Q');
  await page.getByLabel('虛功率 Q', { exact: true }).fill('-6');
  await expect(result).toContainText('超前');

  await open('energy-cost');
  await page.getByLabel('功率', { exact: true }).fill('1');
  await page.getByLabel('每日使用時間', { exact: true }).fill('8');
  await page.getByLabel('使用天數', { exact: true }).fill('30');
  await page.getByLabel('每度電價', { exact: true }).fill('3');
  await expect(result).toContainText('240 kWh');
  await expect(result).toContainText('720 元');
  await choose('計算方向', '用電量＋時間 → 平均功率');
  await choose('能量單位', 'J');
  await page.getByLabel('用電量', { exact: true }).fill('3600000');
  await page.getByLabel('總時間', { exact: true }).fill('1');
  await expect(result).toContainText('1 kW');

  await mkdir('outputs/power-calculators', { recursive: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await page.screenshot({
      path: `outputs/power-calculators/energy-${width}.png`,
      fullPage: true,
    });
  }
  const directory = await (await fetch(base + '/tool')).text();
  const sitemap = await (await fetch(base + '/sitemap.xml')).text();
  for (const slug of ['ac-power-converter', 'power-factor', 'energy-cost']) {
    assert.ok(directory.includes(`/tool/${slug}`));
    assert.ok(sitemap.includes(`https://hubplc.com/tool/${slug}`));
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: power conversion, PF, energy/cost, mobile, directory, sitemap',
  );
} finally {
  await browser.close();
}
