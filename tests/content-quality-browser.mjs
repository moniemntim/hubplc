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
const page = await browser.newPage();
await page.addInitScript(() =>
  localStorage.setItem('hubplc:locale', 'zh-Hant'),
);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await mockAdsense(page);
async function open(path) {
  const response = await page.goto(base + path);
  assert.equal(response.status(), 200, path);
  await page.waitForLoadState('networkidle');
}
async function choose(label, option) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
async function result(label, value) {
  await expect(
    page
      .locator('.output-rows > div')
      .filter({
        has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }),
      })
      .locator('dd'),
  ).toHaveText(value);
}
try {
  await open('/');
  const links = await page
    .locator('.home-feature-card')
    .evaluateAll((cards) => cards.map((card) => card.getAttribute('href')));
  assert.equal(links.length, 7);
  for (const link of links) await open(link);
  await open('/tool/analog');
  await page.getByLabel('工程上限', { exact: true }).fill('10');
  for (const [input, expected] of [
    ['4', '0'],
    ['12', '5'],
    ['20', '10'],
    ['3.2', '-0.5'],
  ]) {
    await page.getByLabel('訊號值', { exact: true }).fill(input);
    await result('工程值', expected);
  }
  await expect(
    page.getByText('超出量程：結果為線性外推值。', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('訊號值', { exact: true }).fill('12');
  await choose('轉換到其他訊號', '0–10 V');
  await result('目標訊號', '5 V');
  await open('/tool/plc-scaling');
  await result('工程值', '50');
  await choose('方向', '工程值 → 原始值');
  await page.getByLabel('工程值', { exact: true }).fill('75');
  await result('原始值', '20,736');
  await choose('方向', '原始值 → 工程值');
  await choose('原始值預設', '自訂');
  await page.getByLabel('原始上限', { exact: true }).fill('4000');
  await page.getByLabel('工程上限', { exact: true }).fill('10');
  for (const [input, expected] of [
    ['0', '0'],
    ['1000', '2.5'],
    ['2000', '5'],
    ['3000', '7.5'],
    ['4000', '10'],
  ]) {
    await page.getByLabel('原始值', { exact: true }).fill(input);
    await result('工程值', expected);
  }
  await expect(page.locator('.plc-guide')).toContainText(
    '先找出模組真正交給程式的原始量程',
  );
  await choose('方向', '工程值 → 原始值');
  await page.getByLabel('工程值', { exact: true }).fill('5');
  await result('原始值', '2,000');
  await page.getByLabel('工程值', { exact: true }).fill('12');
  await result('狀態', '超出範圍');
  await open('/tool/modbus-address');
  await page.getByLabel('參考編號', { exact: true }).fill('40010');
  await result('零起算位址', '9');
  await result('HEX 位址', '0009');
  await open('/tool/register-converter');
  await choose('方向', '暫存器 → 數值');
  await page
    .getByLabel('暫存器 HEX（以空白分隔）', { exact: true })
    .fill('4148 0000');
  await result('數值', '12.5');
  await choose('位元組排列', 'CDAB');
  await expect(page.locator('.output-rows dd')).not.toHaveText('12.5');
  await page
    .getByLabel('暫存器 HEX（以空白分隔）', { exact: true })
    .fill('0000 4148');
  await result('數值', '12.5');
  await choose('資料型別', 'Int16');
  await page
    .getByLabel('暫存器 HEX（以空白分隔）', { exact: true })
    .fill('FFF6');
  await result('數值', '-10');
  await open('/tool/base-converter');
  await choose('輸入進位', '十六進位');
  await choose('位元數', '8 bit');
  await page.getByLabel('數值（不含 0x／0b 前綴）').fill('FF');
  await result('十進位', '255');
  await choose('解讀方式', '有號二補數');
  await result('十進位', '-1');
  await expect(page.locator('.plc-guide')).toContainText(
    '操作案例：8-bit 的 FF 是多少？',
  );
  for (const [tool, article] of [
    ['analog', 'plc-analog-scaling-pressure-temperature-level'],
    ['plc-scaling', 'plc-analog-scaling-pressure-temperature-level'],
    ['modbus-address', 'modbus-function-code-01-04-read-list'],
    ['modbus-crc', 'rs485-no-response-troubleshooting'],
    ['register-converter', 'blackbox-observable'],
  ]) {
    await open(`/tool/${tool}`);
    await expect(page.locator('.plc-guide')).toBeVisible();
    const href = `/articles/${article}`;
    await expect(page.locator(`main a[href="${href}"]`)).toBeVisible();
    assert.equal((await page.request.get(base + href)).status(), 200, href);
  }
  await open('/about');
  await expect(page.locator('#report')).toBeVisible();
  const aboutArticleLinks = await page
    .locator('main a[href^="/articles/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  for (const href of aboutArticleLinks) {
    const linkedArticle = await page.request.get(base + href);
    assert.equal(linkedArticle.status(), 200, `about article link ${href}`);
  }
  const template = await page.request.get(
    base + '/content-report-template.txt',
  );
  assert.equal(template.status(), 200);
  assert.match(await template.text(), /預期結果及依據/);
  await open('/articles/rs485-no-response-troubleshooting');
  await expect(
    page.locator('a[href="/examples/rs485-transaction-log-template.csv"]'),
  ).toBeVisible();
  const rs485Template = await page.request.get(
    base + '/examples/rs485-transaction-log-template.csv',
  );
  assert.equal(rs485Template.status(), 200);
  assert.match(await rs485Template.text(), /observation_source/);
  assert.deepEqual(errors, []);
  console.log(
    'PASS home links, analog endpoints/overrange, PLC scaling/base guide and results, five related lessons, Modbus address, Float32 byte order, RS485 and report templates; no page errors.',
  );
} finally {
  await browser.close();
}
