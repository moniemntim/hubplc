import assert from 'node:assert/strict';
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
const errors = [];
const writes = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('request', (request) => {
  if (request.method() !== 'GET') writes.push(request.url());
});
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
const output = page.locator('#generated-password');
const generate = page.getByRole('button', { name: '產生密碼', exact: true });
try {
  await mkdir('outputs/password-qa', { recursive: true });
  const html = await (
    await context.request.get(`${base}/tool/password-generator`)
  ).text();
  assert.ok(
    !html.includes('id="generated-password"'),
    'no shared server-generated password',
  );
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      (await page.goto(`${base}/tool/password-generator`)).status(),
      200,
    );
    await page.waitForLoadState('networkidle');
    await expect(output).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: '複製密碼', exact: true }),
    ).toBeDisabled();
    await generate.press('Enter');
    const first = await output.inputValue();
    assert.equal(first.length, 20);
    assert.ok(
      /[A-Z]/.test(first) &&
        /[a-z]/.test(first) &&
        /\d/.test(first) &&
        /[^a-z0-9]/i.test(first),
    );
    await page.getByRole('button', { name: '複製密碼', exact: true }).click();
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      first,
    );
    await expect(page.locator('.password-status')).toHaveText(
      '已複製到剪貼簿。',
    );
    await page.getByRole('button', { name: '重新產生', exact: true }).click();
    assert.notEqual(await output.inputValue(), first);
    await page.getByRole('button', { name: '隱藏密碼', exact: true }).click();
    await expect(output).toHaveCount(0);
    await noOverflow();
    // Never save generated password values in screenshots or QA artifacts.
    await page.screenshot({
      path: `outputs/password-qa/hidden-${width}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: '顯示密碼', exact: true }).click();
    await page.getByRole('checkbox', { name: /排除易混淆/ }).check();
    await expect(output).toHaveCount(0);
    await generate.click();
    assert.ok(!/[Il1O0o]/.test(await output.inputValue()));
    await page.locator('#password-length').fill('128');
    await generate.click();
    assert.equal((await output.inputValue()).length, 128);
    await noOverflow();
    for (const raw of ['', '3', '129', '4.5', 'abc', '1e2']) {
      await page.locator('#password-length').fill(raw);
      await expect(output).toHaveCount(0);
      await expect(generate).toBeDisabled();
    }
    await page.locator('#password-length').fill('4');
    for (const name of [
      '大寫字母 A–Z',
      '小寫字母 a–z',
      '數字 0–9',
      '符號 !@#…',
    ])
      await page.getByRole('checkbox', { name, exact: true }).uncheck();
    await expect(generate).toBeDisabled();
    await expect(page.locator('#password-validation')).toContainText('至少');
    await page.getByRole('checkbox', { name: '數字 0–9', exact: true }).check();
    await generate.click();
    assert.ok(/^[2-9]{4}$/.test(await output.inputValue()));
    await choose('密碼類型', '好記片語');
    await expect(output).toHaveCount(0);
    await choose('分隔符號', '句點 .');
    await generate.click();
    assert.equal((await output.inputValue()).split('.').length, 6);
    await page.locator('#password-length').fill('10');
    await generate.click();
    assert.equal((await output.inputValue()).split('.').length, 10);
    await noOverflow();
    await choose('密碼類型', '數字 PIN');
    await generate.click();
    assert.ok(/^\d{6}$/.test(await output.inputValue()));
    await page.locator('#password-length').fill('32');
    await generate.click();
    assert.ok(/^\d{32}$/.test(await output.inputValue()));
    await page.getByRole('button', { name: '清空', exact: true }).click();
    await expect(output).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: '複製密碼', exact: true }),
    ).toBeDisabled();
    await page
      .getByRole('button', { name: '恢復預設設定', exact: true })
      .click();
    await expect(page.locator('#password-length')).toHaveValue('20');
    await generate.click();
    assert.equal(
      await page.evaluate(() => localStorage.length + sessionStorage.length),
      0,
    );
    assert.equal(new URL(page.url()).search, '');
    await page.reload();
    await expect(output).toHaveCount(0);
    console.log(
      `PASS password generator at ${width}px: modes, boundaries, copy, hide, reset, privacy`,
    );
  }
  // Fail closed when the browser's cryptographic random source fails.
  await page.evaluate(() => {
    Crypto.prototype.getRandomValues = () => {
      throw new Error('安全亂數測試失敗');
    };
  });
  await generate.click();
  await expect(output).toHaveCount(0);
  await expect(page.locator('.password-status')).toContainText(
    '安全亂數測試失敗',
  );
  await page.reload();
  await generate.click();
  await page.evaluate(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error('denied'));
  });
  await page.getByRole('button', { name: '複製密碼', exact: true }).click();
  await expect(page.locator('.password-status')).toContainText('手動複製');
  await page.getByRole('button', { name: '清空', exact: true }).click();
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, [], 'no uploads or analytics requests');
  console.log(
    'PASS cryptographic failure and clipboard denial; zero browser errors or POST requests',
  );
} finally {
  await browser.close();
}
