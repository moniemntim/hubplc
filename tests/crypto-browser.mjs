import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
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
const errors = [],
  writes = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('request', (request) => {
  if (request.method() !== 'GET') writes.push(request.url());
});
const output = page.locator('#crypto-output');
const text = 'HubPLC 公開測試文字 🔐\nsecond line  ';
const password = 'public fixture password - only testing';
async function open(slug) {
  assert.equal((await page.goto(`${base}/tool/${slug}`)).status(), 200);
  await page.waitForLoadState('networkidle');
}
async function choose(label, name) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name, exact: true }).click();
}
async function noOverflow() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
}
async function fillEncryption() {
  await page.locator('#crypto-text').fill(text);
  await page.locator('#crypto-password').fill(password);
  await page.locator('#crypto-confirm').fill(password);
}
async function download() {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載結果', exact: true }).click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}
try {
  await mkdir('outputs/crypto-qa', { recursive: true });
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await open('crypto');
    await expect(output).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: '加密', exact: true }),
    ).toBeDisabled();
    await fillEncryption();
    await page.locator('#crypto-confirm').fill('mismatch');
    await expect(
      page.getByRole('button', { name: '加密', exact: true }),
    ).toBeDisabled();
    await page.locator('#crypto-confirm').fill(password);
    await page
      .getByRole('button', { name: '加密', exact: true })
      .press('Enter');
    await expect(output).toHaveValue(/^HPLC1\./);
    const encrypted = await output.inputValue();
    await page.getByRole('button', { name: '複製結果', exact: true }).click();
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      encrypted,
    );
    assert.equal(await download(), encrypted);
    await noOverflow();
    await page.screenshot({
      path: `outputs/crypto-qa/crypto-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole('button', { name: '將結果帶入反向操作', exact: true })
      .click();
    await expect(output).toHaveCount(0);
    await page.getByRole('button', { name: '解密', exact: true }).click();
    await expect(output).toHaveValue(text);
    assert.equal(await download(), text);
    await page.locator('#crypto-password').fill('incorrect fixture');
    await expect(output).toHaveCount(0);
    await page.getByRole('button', { name: '解密', exact: true }).click();
    await expect(page.locator('.crypto-status')).toContainText('無法解密');
    await expect(output).toHaveCount(0);
    await page.locator('#crypto-password').fill(password);
    await page.locator('#crypto-text').fill('HPLC1.invalid!');
    await page.getByRole('button', { name: '解密', exact: true }).click();
    await expect(page.locator('.crypto-status')).toContainText('Base64');
    await page.getByRole('button', { name: '清空', exact: true }).click();
    await expect(page.locator('#crypto-password')).toHaveValue('');
    await expect(page.locator('#crypto-text')).toHaveValue('');
    await open('hash');
    await expect(output).toHaveCount(0);
    await page.getByRole('button', { name: '計算摘要', exact: true }).click();
    await expect(output).toHaveValue(createHash('sha256').digest('hex'));
    await page.getByRole('button', { name: '載入範例', exact: true }).click();
    await expect(output).toHaveCount(0);
    await page.getByRole('button', { name: '計算摘要', exact: true }).click();
    await expect(output).toHaveValue(
      createHash('sha256').update('abc').digest('hex'),
    );
    await choose('輸出格式', 'HEX 大寫');
    await expect(output).toHaveValue(
      createHash('sha256').update('abc').digest('hex').toUpperCase(),
    );
    await choose('輸出格式', 'Base64');
    await expect(output).toHaveValue(
      createHash('sha256').update('abc').digest('base64'),
    );
    await choose('計算類型', 'HMAC（帶金鑰）');
    await expect(output).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: '計算摘要', exact: true }),
    ).toBeDisabled();
    await page.locator('#hash-key').fill('public-key');
    await page.getByRole('button', { name: '計算摘要', exact: true }).click();
    const hmac = createHmac('sha256', 'public-key')
      .update('abc')
      .digest('base64');
    await expect(output).toHaveValue(hmac);
    assert.equal(await download(), hmac);
    await noOverflow();
    await page.screenshot({
      path: `outputs/crypto-qa/hash-${width}.png`,
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(() => localStorage.length + sessionStorage.length),
      0,
    );
    assert.equal(new URL(page.url()).search, '');
    await page.reload();
    await expect(output).toHaveCount(0);
    console.log(
      `PASS crypto + hash at ${width}px: authenticated round trip, formats, copy/download, errors, privacy`,
    );
  }
  // Every legacy algorithm is actually wired into the Worker and UI.
  for (const name of [
    'AES-CBC（CryptoJS 相容）',
    'TripleDES（舊格式）',
    'DES（舊格式）',
    'RC4（舊格式）',
    'RC4Drop（舊格式）',
    'Rabbit（舊格式）',
    'RabbitLegacy（舊格式）',
  ]) {
    await open('crypto');
    await choose('演算法／格式', name);
    await fillEncryption();
    if (name === 'RC4Drop（舊格式）')
      await page.locator('#crypto-drop').fill('7');
    await page.getByRole('button', { name: '加密', exact: true }).click();
    await expect(output).toHaveValue(/^U2FsdGVkX1/);
    await page
      .getByRole('button', { name: '將結果帶入反向操作', exact: true })
      .click();
    await page.getByRole('button', { name: '解密', exact: true }).click();
    await expect(output).toHaveValue(text);
  }
  await open('crypto');
  await fillEncryption();
  await page.getByRole('button', { name: '加密', exact: true }).click();
  await page.getByRole('button', { name: '清空', exact: true }).click();
  await page.waitForTimeout(700);
  await expect(output).toHaveCount(0);
  await expect(page.locator('#crypto-password')).toHaveValue('');
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, [], 'no uploads or analytics requests');
  console.log(
    'PASS all 7 legacy UI round trips, cancellation; zero browser errors and non-GET requests',
  );
} finally {
  await browser.close();
}
