import { mockAdsense } from './adsense-mock.mjs';
import assert from 'node:assert/strict';
import { createHash, createHmac, pbkdf2Sync } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import CryptoJS from 'crypto-js';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
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
const errors = [],
  writes = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('request', (request) => {
  if (request.method() !== 'GET') writes.push(request.url());
});
const output = page.locator('#crypto-output');
async function open(slug) {
  assert.equal((await page.goto(`${base}/tool/${slug}`)).status(), 200);
  await page.waitForLoadState('networkidle');
  await expect(
    page.getByRole('navigation', { name: '加密與編碼工具' }).getByRole('link'),
  ).toHaveCount(4);
}
async function choose(label, name) {
  const trigger = page.getByRole('combobox', { name: label, exact: true });
  await trigger.scrollIntoViewIfNeeded();
  // Let the site's smooth page scroll finish before opening the popup.
  await page.waitForTimeout(350);
  await trigger.click();
  await page.getByRole('option', { name, exact: true }).click();
  await expect(
    page.locator('[data-slot="select-content"]:visible'),
  ).toHaveCount(0);
}
async function noOverflow() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
}
async function copyDownload(expected) {
  await page.getByRole('button', { name: '複製結果', exact: true }).click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    expected,
  );
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載結果', exact: true }).click();
  const chunks = [];
  for await (const chunk of await (await pending).createReadStream())
    chunks.push(chunk);
  assert.equal(Buffer.concat(chunks).toString('utf8'), expected);
}
try {
  await mkdir('outputs/crypto-extras-qa', { recursive: true });
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await open('hash');
    await page.locator('#hash-text').fill('abc');
    await choose('雜湊演算法', 'SHA3-256（標準）');
    await page
      .getByRole('button', { name: '計算摘要', exact: true })
      .press('Enter');
    await expect(output).toHaveValue(
      createHash('sha3-256').update('abc').digest('hex'),
    );
    await choose('計算類型', 'HMAC（帶金鑰）');
    await expect(output).toHaveCount(0);
    await page.locator('#hash-key').fill('public key');
    await page.getByRole('button', { name: '計算摘要', exact: true }).click();
    await expect(output).toHaveValue(
      createHmac('sha3-256', 'public key').update('abc').digest('hex'),
    );
    await choose('計算類型', '雜湊摘要');
    await choose('雜湊演算法', 'Keccak-256（CryptoJS SHA3 相容）');
    await page.getByRole('button', { name: '計算摘要', exact: true }).click();
    await expect(output).toHaveValue(
      CryptoJS.SHA3('abc', { outputLength: 256 }).toString(),
    );
    await noOverflow();

    await open('key-derivation');
    await expect(
      page.getByRole('button', { name: '派生密鑰', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: '載入範例', exact: true }).click();
    await page
      .getByRole('button', { name: '派生密鑰', exact: true })
      .press('Enter');
    const known = pbkdf2Sync('password', 'salt', 1, 32, 'sha256').toString(
      'hex',
    );
    await expect(output).toHaveValue(known);
    await copyDownload(known);
    await choose('輸出格式', 'Base64');
    await expect(output).toHaveValue(
      Buffer.from(known, 'hex').toString('base64'),
    );
    await choose('輸出格式', 'HEX 小寫');
    await page
      .getByRole('textbox', { name: '迭代次數', exact: true })
      .fill('1.2');
    await expect(output).toHaveCount(0);
    await page.getByRole('button', { name: '派生密鑰', exact: true }).click();
    await expect(page.locator('.crypto-status')).toContainText('正整數');
    await page
      .getByRole('textbox', { name: '迭代次數', exact: true })
      .fill('1');
    await page
      .getByRole('button', { name: '產生隨機鹽值（16 bytes）', exact: true })
      .click();
    const first = await page
      .getByRole('textbox', { name: '鹽值（HEX）', exact: true })
      .inputValue();
    assert.match(first, /^[a-f0-9]{32}$/);
    await page
      .getByRole('button', { name: '產生隨機鹽值（16 bytes）', exact: true })
      .click();
    const salt = await page
      .getByRole('textbox', { name: '鹽值（HEX）', exact: true })
      .inputValue();
    assert.notEqual(first, salt);
    await page.getByRole('button', { name: '派生密鑰', exact: true }).click();
    await expect(output).toHaveValue(
      pbkdf2Sync(
        'password',
        Buffer.from(salt, 'hex'),
        1,
        32,
        'sha256',
      ).toString('hex'),
    );
    await choose('派生算法', 'EvpKDF（舊格式相容）');
    await expect(output).toHaveCount(0);
    await page.getByRole('button', { name: '派生密鑰', exact: true }).click();
    await expect(output).toHaveValue(
      CryptoJS.EvpKDF('password', CryptoJS.enc.Hex.parse(salt), {
        keySize: 8,
        iterations: 1,
        hasher: CryptoJS.algo.MD5,
      }).toString(),
    );
    await noOverflow();
    await page.screenshot({
      path: `outputs/crypto-extras-qa/kdf-${width}.png`,
      fullPage: true,
    });
    await choose('派生算法', 'PBKDF2');
    await page
      .getByRole('textbox', { name: '迭代次數', exact: true })
      .fill('2000000');
    await page.getByRole('button', { name: '派生密鑰', exact: true }).click();
    await page.getByRole('button', { name: '清空', exact: true }).click();
    await page.waitForTimeout(400);
    await expect(output).toHaveCount(0);
    await expect(page.locator('.crypto-status')).toHaveText('');
    await expect(page.getByLabel('密碼（UTF-8）', { exact: true })).toHaveValue(
      '',
    );

    await open('byte-encoding');
    const text = '中文 🔐\nsecond line  ';
    await page.locator('#byte-encoding-input').fill(text);
    await page
      .getByRole('button', { name: '轉換', exact: true })
      .press('Enter');
    await expect(output).toHaveValue(Buffer.from(text).toString('base64'));
    await copyDownload(Buffer.from(text).toString('base64'));
    await page.getByRole('button', { name: '交換格式', exact: true }).click();
    await expect(output).toHaveCount(0);
    await page.getByRole('button', { name: '轉換', exact: true }).click();
    await expect(output).toHaveValue(text);
    await page.locator('#byte-encoding-input').fill('Zh==');
    await expect(output).toHaveCount(0);
    await page.getByRole('button', { name: '轉換', exact: true }).click();
    await expect(page.locator('.crypto-status')).toContainText('Base64');
    await choose('輸入格式', 'UTF-8 文字');
    await page.locator('#byte-encoding-input').fill('中文');
    await choose('輸出格式', 'UTF-16BE 文字（HEX）');
    await page.getByRole('button', { name: '轉換', exact: true }).click();
    await expect(output).toHaveValue('4e2d6587');
    await noOverflow();
    await page.screenshot({
      path: `outputs/crypto-extras-qa/encoding-${width}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: '清空', exact: true }).click();
    await expect(output).toHaveCount(0);
    await page.getByRole('button', { name: '轉換', exact: true }).click();
    await expect(output).toHaveValue('');
    console.log(
      `PASS ${width}px: SHA3/Keccak/HMAC, PBKDF2/EvpKDF, random salt, cancellation, encoding round trips, errors, keyboard, copy/download, layout`,
    );
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, []);
  console.log('PASS zero browser errors and non-GET requests');
} finally {
  await browser.close();
}
