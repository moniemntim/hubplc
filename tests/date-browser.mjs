import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const context = await browser.newContext({
  permissions: ['clipboard-read', 'clipboard-write'],
  timezoneId: 'America/Los_Angeles',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

async function open(slug) {
  assert.equal((await page.goto(`${base}/tool/${slug}`)).status(), 200);
  await page.waitForLoadState('networkidle');
}

async function choose(label, name) {
  const trigger = page.getByRole('combobox', { name: label, exact: true });
  await trigger.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await trigger.click();
  await page.getByRole('option', { name, exact: true }).click();
}

async function layout() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
}

try {
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await open('timestamp-converter');
    await expect(page.getByText('目前台灣時間：')).toBeVisible();
    await page
      .getByRole('button', { name: '複製目前秒數', exact: true })
      .click();
    assert.match(
      await page.evaluate(() => navigator.clipboard.readText()),
      /^\d{10}$/,
    );
    await expect(
      page.getByRole('region', { name: '計算結果', exact: true }),
    ).toContainText('2024-03-01 08:00:00');
    await page.getByRole('button', { name: '複製結果', exact: true }).click();
    assert.match(
      await page.evaluate(() => navigator.clipboard.readText()),
      /Unix 秒數：1709251200/,
    );
    await page
      .getByRole('textbox', { name: 'Unix 時間戳', exact: true })
      .fill('-1');
    await expect(
      page.getByRole('region', { name: '計算結果', exact: true }),
    ).toContainText('1970-01-01 07:59:59');
    await page.getByRole('button', { name: '載入範例', exact: true }).click();
    await choose('換算方向', '台北時間 → Unix 時間戳');
    await page
      .getByRole('textbox', { name: '台北日期時間', exact: true })
      .fill('2024-02-30 08:00:00');
    await expect(
      page.getByRole('region', { name: '計算結果', exact: true }),
    ).toContainText('日期不存在');
    await layout();

    await open('date-calculator');
    await expect(
      page.getByRole('region', { name: '計算結果', exact: true }),
    ).toContainText('相差曆法日');
    await expect(
      page.getByRole('region', { name: '計算結果', exact: true }),
    ).toContainText('2');
    await page
      .getByRole('checkbox', { name: '含開始日與結束日', exact: true })
      .check();
    await expect(
      page.getByRole('region', { name: '計算結果', exact: true }),
    ).toContainText('含首尾計數');
    await page
      .getByRole('textbox', { name: '結束日期', exact: true })
      .fill('2024-02-30');
    await expect(
      page.getByRole('region', { name: '計算結果', exact: true }),
    ).toContainText('日期不存在');
    await page.getByRole('button', { name: '載入範例', exact: true }).click();
    await choose('計算方式', '日期加減天數');
    await page
      .getByRole('textbox', { name: '增減天數（正／負整數）', exact: true })
      .fill('-1');
    await expect(
      page.getByRole('region', { name: '計算結果', exact: true }),
    ).toContainText('2024-02-27');
    await page.getByRole('button', { name: '清空', exact: true }).click();
    await expect(
      page.getByRole('region', { name: '計算結果', exact: true }),
    ).toContainText('日期請使用');
    await layout();
    console.log(`PASS ${width}px timestamp and date calculator interactions`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
