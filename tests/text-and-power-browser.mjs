import { mockAdsense } from './adsense-mock.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';

const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const browser = await chromium.launch(
  process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {},
);
const context = await browser.newContext({
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();
await mockAdsense(page);
await page.addInitScript(() => {
  File.prototype.arrayBuffer = async function () {
    if (this.name === 'delayed.txt')
      await new Promise((resolve) => setTimeout(resolve, 250));
    return Blob.prototype.arrayBuffer.call(this);
  };
});
const errors = [];
const writes = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('request', (request) => {
  if (request.method() !== 'GET') writes.push(request.url());
});
async function open(slug) {
  assert.equal((await page.goto(`${base}/tool/${slug}`)).status(), 200);
  await page.waitForLoadState('networkidle');
}
async function choose(label, option) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
async function download() {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載文字檔', exact: true }).click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}
const result = page.getByRole('region', { name: '計算結果' });
async function noOverflow() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
}
try {
  await mkdir('outputs/text-and-power-qa', { recursive: true });
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await open('text-repair');
    await page
      .getByRole('textbox', { name: '亂碼原文', exact: true })
      .press('Control+Enter');
    const candidate = page
      .locator('.repair-candidate')
      .filter({ hasText: '原始：UTF-8' })
      .first();
    await candidate.click();
    await expect(
      page.getByRole('textbox', { name: '完整轉換結果' }),
    ).toHaveValue('中文');
    await expect(page.locator('#repair-output')).toHaveCSS(
      'color',
      'rgb(35, 74, 55)',
    );
    await page.getByRole('button', { name: '複製結果', exact: true }).click();
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      '中文',
    );
    assert.deepEqual(await download(), Buffer.from('中文', 'utf8'));
    await page.getByRole('checkbox').check();
    assert.deepEqual(
      await download(),
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('中文')]),
    );
    await choose('下載檔案編碼', 'Big5');
    assert.deepEqual(await download(), Buffer.from([0xa4, 0xa4, 0xa4, 0xe5]));
    await noOverflow();
    await page
      .locator('.calculator-grid')
      .screenshot({ path: `outputs/text-and-power-qa/text-${width}.png` });
    await page
      .getByRole('textbox', { name: '亂碼原文', exact: true })
      .fill('new');
    await expect(page.locator('#repair-output')).toHaveCount(0);
    await expect(page.locator('.repair-candidate')).toHaveCount(0);
    await choose('修復方式', '手動指定編碼');
    await page
      .getByRole('textbox', { name: '亂碼原文', exact: true })
      .fill('ðŸ˜€');
    await page.getByRole('button', { name: '開始修復', exact: true }).click();
    await expect(page.locator('#repair-output')).toHaveValue('😀');
    await page.getByRole('button', { name: '下載文字檔', exact: true }).click();
    await expect(result).toContainText('無法');
    await page
      .getByRole('textbox', { name: '亂碼原文', exact: true })
      .fill('�');
    await page.getByRole('button', { name: '開始修復', exact: true }).click();
    await expect(result).toContainText('替代字元');
    await expect(page.locator('#repair-output')).toHaveCount(0);

    await choose('操作模式', '文字檔編碼轉換');
    await page.locator('#repair-file').setInputFiles({
      name: 'legacy.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from([0xa7, 0x41, 0xa6, 0x6e, 13, 10]),
    });
    await choose('檔案原始編碼', 'Big5');
    await page.getByRole('button', { name: '解讀文字檔', exact: true }).click();
    // HTML textarea normalizes CRLF for display; download must preserve original bytes.
    await expect(page.locator('#repair-output')).toHaveValue('你好\n');
    assert.deepEqual(
      await download(),
      Buffer.from([0xa7, 0x41, 0xa6, 0x6e, 13, 10]),
    );
    await page.locator('#repair-file').setInputFiles({
      name: 'utf16.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from([0xfe, 0xff, 0x4e, 0x2d, 0x65, 0x87]),
    });
    await choose('檔案原始編碼', '比較候選（BOM 優先）');
    await page.getByRole('button', { name: '解讀文字檔', exact: true }).click();
    await expect(page.locator('.repair-candidate').first()).toContainText(
      'UTF-16 BE',
    );
    await page.locator('.repair-candidate').first().click();
    await expect(page.locator('#repair-output')).toHaveValue('中文');
    await noOverflow();
    await page.locator('#repair-file').setInputFiles({
      name: 'empty.txt',
      mimeType: 'text/plain',
      buffer: Buffer.alloc(0),
    });
    await expect(page.locator('#repair-output')).toHaveCount(0);
    await expect(result).toContainText('非空白');

    await open('battery-life');
    await expect(result.locator('dd').first()).toHaveText('20 h');
    await choose('電池容量單位', 'Ah');
    await expect(
      page.getByRole('textbox', { name: '電池容量', exact: true }),
    ).toHaveValue('2');
    await expect(result.locator('dd').first()).toHaveText('20 h');
    await page
      .getByRole('textbox', { name: '可用容量', exact: true })
      .fill('50');
    await expect(result.locator('dd').first()).toHaveText('10 h');
    await noOverflow();
    await page
      .locator('.calculator-grid')
      .screenshot({ path: `outputs/text-and-power-qa/battery-${width}.png` });

    await open('capacitor-discharge');
    const before = await result.locator('dd').first().innerText();
    await choose('計算方式', '由時間算電阻');
    await expect(result.locator('dd').first()).toHaveText(before);
    await expect(result.locator('dd').nth(1)).toHaveText('10,000 Ω');
    await page.getByRole('textbox', { name: '目標時間', exact: true }).focus();
    await expect(
      page.locator('[data-diagram-field="目標時間"]'),
    ).toHaveAttribute('data-focused', 'true');
    await page
      .getByRole('textbox', { name: '目標電壓', exact: true })
      .fill('0.001');
    await expect(page.locator('.tool-diagram')).toContainText('t =');
    await noOverflow();
    await page
      .locator('.calculator-grid')
      .screenshot({ path: `outputs/text-and-power-qa/discharge-${width}.png` });

    await open('dbm-watts');
    await page.getByRole('textbox', { name: 'dBm', exact: true }).fill('30');
    await expect(result.locator('dd').nth(1)).toHaveText('1 W');
    await choose('轉換方向', '瓦特轉 dBm');
    await expect(
      page.getByRole('textbox', { name: '瓦特', exact: true }),
    ).toHaveValue('1');
    await expect(result.locator('dd').first()).toHaveText('30 dBm');
    await choose('轉換方向', 'dBm 轉瓦特');
    await page.getByRole('textbox', { name: 'dBm', exact: true }).fill('-90');
    await expect(result.locator('dd').first()).toHaveText('-90 dBm');
    await noOverflow();
    await page
      .locator('.calculator-grid')
      .screenshot({ path: `outputs/text-and-power-qa/dbm-${width}.png` });
    await page.getByRole('textbox', { name: 'dBm', exact: true }).fill('-4000');
    await expect(result.locator('dd')).toHaveCount(0);
    console.log(
      `PASS text/file repair, downloads, and power tools at ${width}px`,
    );
  }
  await open('text-repair');
  await choose('操作模式', '文字檔編碼轉換');
  await page.locator('#repair-file').setInputFiles({
    name: 'large.txt',
    mimeType: 'text/plain',
    buffer: Buffer.alloc(1048577, 65),
  });
  await expect(result).toContainText('1 MiB');
  await expect(page.getByRole('button', { name: '解讀文字檔' })).toBeDisabled();
  await page.locator('#repair-file').setInputFiles({
    name: 'literal.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('<script>alert(1)</script>'),
  });
  await choose('檔案原始編碼', 'UTF-8');
  await page.getByRole('button', { name: '解讀文字檔' }).click();
  await expect(page.locator('#repair-output')).toHaveValue(
    '<script>alert(1)</script>',
  );
  await page.locator('#repair-file').setInputFiles({
    name: 'delayed.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('old file'),
  });
  await page.getByRole('button', { name: '清空', exact: true }).click();
  await page.waitForTimeout(350);
  await expect(page.getByRole('button', { name: '解讀文字檔' })).toBeDisabled();
  await expect(page.locator('.repair-file-name')).toHaveCount(0);
  await expect(page.locator('#repair-output')).toHaveCount(0);
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, [], 'input and files must not be uploaded');
} finally {
  await browser.close();
}
