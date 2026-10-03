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
  const page = await browser.newPage();
  await mockAdsense(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  assert.equal((await page.goto(base + '/tool/va-to-amps')).status(), 200);
  const result = page.getByRole('region', { name: '計算結果' });
  await expect(result).toContainText('4.54545454545');
  const choose = async (label, option) => {
    await page.getByRole('combobox', { name: label, exact: true }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
  };
  await choose('供電方式', '三相平衡／線電壓');
  await choose('功率單位', 'kVA');
  await page.getByLabel('三相總視在功率', { exact: true }).fill('10');
  await page.getByLabel('線電壓 VLL', { exact: true }).fill('380');
  await expect(result).toContainText('15.1934281366');
  await choose('功率單位', 'MVA');
  await page.getByLabel('三相總視在功率', { exact: true }).fill('0.01');
  await expect(result).toContainText('15.1934281366');
  await expect(result).toContainText('10,000');
  await choose('功率單位', 'kVA');
  await choose('供電方式', '三相平衡／相對中性線電壓');
  await page.getByLabel('三相總視在功率', { exact: true }).fill('6.6');
  await page.getByLabel('相對中性線電壓 VLN', { exact: true }).fill('220');
  await expect(result).toContainText('10 A');
  await page.getByLabel('相對中性線電壓 VLN', { exact: true }).fill('0');
  await expect(result).toContainText('電壓必須大於 0');
  await page.getByRole('button', { name: '清空', exact: true }).click();
  await expect(result).toContainText('請填寫');
  await page.getByRole('button', { name: '載入範例', exact: true }).click();
  await expect(result).toContainText('4.54545454545');
  await mkdir('outputs/va-to-amps', { recursive: true });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: `outputs/va-to-amps/${width}.png`,
      fullPage: true,
    });
  }
  const sitemap = await (await fetch(base + '/sitemap.xml')).text();
  assert.ok(sitemap.includes('https://hubplc.com/tool/va-to-amps'));
  const index = await (await fetch(base + '/tool')).text();
  assert.ok(index.includes('/tool/va-to-amps'));
  assert.deepEqual(errors, []);
  console.log(
    'PASS: single/three phase, VA/kVA/MVA, validation, reset, responsive layout, directory and sitemap',
  );
} finally {
  await browser.close();
}
