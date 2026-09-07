import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import { currencies, RATES_URL } from '../lib/tools/currency.ts';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const context = await browser.newContext({
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();
const errors = [],
  external = [],
  writes = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  if (request.method() !== 'GET') writes.push(request.url());
  if (request.url().startsWith('https://api.frankfurter.dev'))
    external.push({ url: request.url(), headers: request.headers() });
});
async function open(slug) {
  assert.equal((await page.goto(`${base}/tool/${slug}`)).status(), 200);
  await page.waitForLoadState('networkidle');
}
async function choose(label, name) {
  const trigger = page.getByRole('combobox', { name: label, exact: true });
  await trigger.scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await trigger.click();
  await page.getByRole('option', { name, exact: true }).click();
  await expect(
    page.locator('[data-slot="select-content"]:visible'),
  ).toHaveCount(0);
}
async function layout() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
}
async function copyDownload(expected) {
  await page.getByRole('button', { name: '複製結果', exact: true }).click();
  assert.equal(
    (await page.evaluate(() => navigator.clipboard.readText())).replaceAll(
      '\r\n',
      '\n',
    ),
    expected,
  );
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載結果', exact: true }).click();
  const chunks = [];
  for await (const chunk of await (await pending).createReadStream())
    chunks.push(chunk);
  assert.equal(Buffer.concat(chunks).toString('utf8'), expected);
}
const output = page.locator('#crypto-output');
const values = page
  .getByRole('region', { name: '計算結果', exact: true })
  .locator('dd');
try {
  await mkdir('outputs/conversion-qa', { recursive: true });
  await open('currency-converter');
  assert.equal(external.length, 0, 'no fetch before explicit button');
  await page
    .getByRole('button', { name: '取得最新參考匯率', exact: true })
    .click();
  await expect(page.locator('.crypto-status')).toContainText('已取得參考匯率', {
    timeout: 20000,
  });
  await expect(values).toHaveCount(2);
  await expect(
    page.getByRole('region', { name: '計算結果', exact: true }),
  ).toContainText(/資料日期：\d{4}-\d{2}-\d{2}/);
  console.log('PASS live Frankfurter request, CORS, date and conversion');
  const fixtures = currencies
    .filter((c) => c.value !== 'USD')
    .map((c, index) => ({
      base: 'USD',
      quote: c.value,
      rate: c.value === 'TWD' ? 32 : index + 1,
      date: '2026-09-01',
    }));
  let responseMode = 'ok',
    release;
  await context.route(RATES_URL, async (route) => {
    const mode = responseMode;
    if (mode === 'hold')
      await new Promise((resolve) => {
        release = resolve;
      });
    try {
      await route.fulfill({
        status: mode === 'fail' ? 503 : 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(mode === 'malformed' ? [] : fixtures),
      });
    } catch {
      /* Cancelled requests may already be gone. */
    }
  });
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [slug, expected] of [
      ['capacitance-converter', '1,000'],
      ['storage-converter', '0.931'],
      ['angle-converter', '3.14159'],
      ['power-converter', '1,000'],
    ]) {
      await open(slug);
      await expect(values.first()).toContainText(expected);
      await layout();
      await page
        .getByRole('textbox', { name: '輸入數值', exact: true })
        .fill('');
      await expect(values).toHaveCount(0);
      await page.getByRole('button', { name: '載入範例', exact: true }).click();
      await expect(values).toHaveCount(1);
    }
    await open('temperature-converter');
    await page
      .getByRole('textbox', { name: '輸入數值', exact: true })
      .fill('-274');
    await expect(values).toHaveCount(0);
    await page.getByRole('button', { name: '載入範例', exact: true }).click();
    await choose('來源單位', '°Ré');
    await choose('目標單位', '°C');
    await page
      .getByRole('textbox', { name: '輸入數值', exact: true })
      .fill('80');
    await expect(values.first()).toContainText('100');
    await open('speed-converter');
    await choose('來源單位', 'Mach（參考音速 343 m/s）');
    await page
      .getByRole('textbox', { name: '輸入數值', exact: true })
      .fill('1');
    await expect(values.first()).toContainText('343');
    await page.screenshot({
      path: `outputs/conversion-qa/speed-${width}.png`,
      fullPage: true,
    });
    await open('rmb-uppercase');
    await page
      .getByRole('button', { name: /^(轉為大寫|轉換文字)$/ })
      .press('Enter');
    await expect(output).toHaveValue('人民币壹仟零壹元零伍分');
    await copyDownload('人民币壹仟零壹元零伍分');
    await choose('字形', '繁體中文金額（人民幣／圓）');
    await expect(output).toHaveCount(0);
    await page.getByRole('button', { name: /^(轉為大寫|轉換文字)$/ }).click();
    await expect(output).toHaveValue('人民幣壹仟零壹圓零伍分');
    await page.locator('#rmb-uppercase-input').fill('1.001');
    await expect(output).toHaveCount(0);
    await page.getByRole('button', { name: /^(轉為大寫|轉換文字)$/ }).click();
    await expect(page.locator('.crypto-status')).toContainText('十進位');
    await layout();
    await open('text-case');
    await page.locator('#text-case-input').fill('hello PLC 中文\nDON’T stop');
    await page.getByRole('button', { name: /^(轉為大寫|轉換文字)$/ }).click();
    await expect(output).toHaveValue('Hello Plc 中文\nDon’t Stop');
    await copyDownload('Hello Plc 中文\nDon’t Stop');
    await choose('轉換方式', '切換大小寫');
    await expect(output).toHaveCount(0);
    await page.getByRole('button', { name: /^(轉為大寫|轉換文字)$/ }).click();
    await expect(output).toHaveValue('HELLO plc 中文\ndon’t STOP');
    await layout();
    await page.screenshot({
      path: `outputs/conversion-qa/text-${width}.png`,
      fullPage: true,
    });
    await open('currency-converter');
    const count = external.length;
    await page
      .getByRole('button', { name: '取得最新參考匯率', exact: true })
      .click();
    await expect(values.first()).toContainText('3,200.00');
    await page.getByRole('textbox', { name: '金額', exact: true }).fill('2');
    await expect(values.first()).toContainText('64.00');
    assert.equal(external.length, count + 1, 'amount change is local');
    responseMode = 'fail';
    await page
      .getByRole('button', { name: '取得最新參考匯率', exact: true })
      .click();
    await expect(page.locator('.crypto-status')).toContainText('暫時無法');
    await expect(values).toHaveCount(0);
    responseMode = 'malformed';
    await page
      .getByRole('button', { name: '取得最新參考匯率', exact: true })
      .click();
    await expect(page.locator('.crypto-status')).toContainText('不完整');
    await expect(values).toHaveCount(0);
    responseMode = 'hold';
    release = undefined;
    await page
      .getByRole('button', { name: '取得最新參考匯率', exact: true })
      .click();
    await expect.poll(() => typeof release).toBe('function');
    await page.getByRole('button', { name: '清空', exact: true }).click();
    release();
    await page.waitForTimeout(150);
    await expect(values).toHaveCount(0);
    await expect(page.locator('.crypto-status')).toHaveText('');
    responseMode = 'ok';
    await page.getByRole('button', { name: '載入範例', exact: true }).click();
    await expect(values.first()).toContainText('3,200.00');
    await page.getByRole('button', { name: '⇄ 交換幣別', exact: true }).click();
    await expect(values.first()).toContainText('3.13');
    await page.getByRole('textbox', { name: '金額', exact: true }).fill('-1');
    await expect(values).toHaveCount(0);
    await page.getByRole('button', { name: '載入範例', exact: true }).click();
    await layout();
    await page.screenshot({
      path: `outputs/conversion-qa/currency-${width}.png`,
      fullPage: true,
    });
    console.log(
      `PASS ${width}px units, temperature, Mach, RMB/text copy/download, currency local inputs, failures and cancellation`,
    );
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, []);
  for (const request of external) {
    assert.equal(request.url, RATES_URL);
    assert.equal(request.headers.referer ?? '', '');
    assert.equal(request.headers.cookie ?? '', '');
  }
  console.log(
    'PASS fixed anonymous rate requests only; zero page errors and non-GET requests',
  );
} finally {
  await browser.close();
}
