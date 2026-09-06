import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { tools } from '../lib/tools/registry.ts';
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const output = 'outputs/browser-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  acceptDownloads: true,
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (e) => {
  if (e.type() === 'error') errors.push(e.text());
});
const fields = {
  analog: '訊號值',
  'plc-scaling': '原始值',
  'base-converter': '數值（不含 0x／0b 前綴）',
  'modbus-address': '參考編號',
  'modbus-crc': 'HEX 位元組（空白或逗號分隔）',
  'register-converter': '數值',
  'voltage-divider': 'Vin',
  electrical: '數值 1',
  '555-timer': 'RA',
  'rc-time': 'R',
  'unit-converter': '輸入數值',
};
const checks = [];
async function choose(label, option) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
async function open(slug) {
  const response = await page.goto(`${base}/tool/${slug}`);
  assert.equal(response.status(), 200);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.waitForLoadState('networkidle');
}
function decode(buffer) {
  const p = PNG.sync.read(buffer);
  return jsQR(new Uint8ClampedArray(p.data), p.width, p.height)?.data;
}
try {
  for (const size of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const tool of tools) {
      await open(tool.slug);
      assert.equal(await page.title(), `${tool.name}｜HubPLC`);
      assert.equal(
        await page.locator('link[rel="canonical"]').getAttribute('href'),
        `https://hubplc.com/tool/${tool.slug}`,
      );
      assert.ok(
        await page.locator('meta[name="description"]').getAttribute('content'),
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `horizontal overflow ${tool.slug} ${size.width}`,
      );
      await page.reload();
      await page.waitForLoadState('networkidle');
      const newCircuit = ![
        'analog',
        'plc-scaling',
        'base-converter',
        'modbus-address',
        'modbus-crc',
        'register-converter',
        'qrcode',
        'big5',
        'unit-converter',
        'resistor-color',
      ].includes(tool.slug);
      if (fields[tool.slug] || newCircuit) {
        const input = fields[tool.slug]
          ? page.getByRole('textbox', { name: fields[tool.slug], exact: true })
          : page
              .getByRole('region', { name: '輸入條件' })
              .getByRole('textbox')
              .first();
        await input.fill('');
        assert.equal(
          await page
            .getByRole('region', { name: '計算結果' })
            .locator('dd')
            .count(),
          0,
          `stale result ${tool.slug}`,
        );
        if (newCircuit) {
          await page
            .getByRole('button', { name: '載入範例', exact: true })
            .click();
          assert.ok(
            await page
              .getByRole('region', { name: '計算結果' })
              .locator('dd')
              .count(),
            `example ${tool.slug}`,
          );
          await page.getByRole('button', { name: '清空', exact: true }).click();
          assert.equal(
            await page
              .getByRole('region', { name: '計算結果' })
              .locator('dd')
              .count(),
            0,
            `clear ${tool.slug}`,
          );
        }
      }
      checks.push(
        `${size.width}: ${tool.slug} direct/reload/metadata/layout/invalid`,
      );
    }
  }
  await page.goto(`${base}/tool`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('searchbox').fill('Modbus');
  await expect(page.locator('.tool-card')).toHaveCount(2);
  await page.getByRole('searchbox').fill('');
  await page.getByRole('tab', { name: '編碼', exact: true }).click();
  await expect(page.locator('.tool-card')).toHaveCount(2);
  await page
    .getByRole('tab', { name: '編碼', exact: true })
    .press('ArrowRight');
  await page.getByRole('tab', { name: '單位', exact: true }).press('Enter');
  await expect(page.locator('.tool-card')).toHaveCount(1);
  await page.getByRole('tab', { name: '全部', exact: true }).click();
  await page.getByRole('link').filter({ hasText: '類比訊號換算' }).click();
  await page.waitForURL('**/tool/analog');
  await page.getByRole('link', { name: '← 返回工具總覽', exact: true }).click();
  await page.waitForURL('**/tool');
  await page
    .getByRole('navigation', { name: '主選單' })
    .getByRole('link', { name: 'PLC 文章' })
    .click();
  await page.waitForURL('**/articles');
  await page.getByRole('link', { name: 'HubPLC 首頁' }).click();
  await page.waitForURL(base + '/');
  await page.goto(`${base}/tool`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: `${output}/directory-mobile.png`,
    fullPage: true,
  });
  await open('analog');
  await choose('轉換到其他訊號', '0–10 V');
  assert.match(
    await page.getByRole('region', { name: '計算結果' }).innerText(),
    /5 V/,
  );
  await choose('轉換到其他訊號', '4–20 mA');
  assert.equal(
    await page
      .getByRole('textbox', { name: '目標訊號下限', exact: true })
      .inputValue(),
    '4',
  );
  await open('big5');
  await page.getByRole('textbox', { name: '輸入文字' }).fill('你好');
  await page
    .getByRole('button', { name: '複製整段位元組', exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    'A7 41 A6 6E',
  );
  await page
    .getByRole('textbox', { name: '輸入文字' })
    .press('ControlOrMeta+Enter');
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    'A741 A66E',
  );
  await page.getByRole('textbox', { name: '輸入文字' }).fill('😀😀');
  assert.equal(
    await page
      .getByRole('button', { name: '複製整段位元組', exact: true })
      .isEnabled(),
    false,
  );
  await page.getByRole('button', { name: '清空', exact: true }).click();
  assert.match(
    await page.getByRole('region', { name: '計算結果' }).innerText(),
    /輸入文字後/,
  );
  await open('qrcode');
  await choose('內容類型', '文字');
  const payload = '繁體中文 QR 測試';
  await page.getByRole('textbox', { name: '文字內容' }).fill(payload);
  await page.getByRole('button', { name: '下載 PNG', exact: true }).waitFor();
  for (const format of ['PNG', 'SVG']) {
    const pending = page.waitForEvent('download');
    await page
      .getByRole('button', { name: `下載 ${format}`, exact: true })
      .click();
    const download = await pending;
    const path = `${output}/${download.suggestedFilename()}`;
    await download.saveAs(path);
    const bytes = await readFile(path);
    if (format === 'PNG') assert.equal(decode(bytes), payload);
    else {
      assert.match(bytes.toString(), /<svg/);
      const raster = await context.newPage();
      await raster.setContent(
        `<img width="512" height="512" src="data:image/svg+xml;base64,${bytes.toString('base64')}">`,
      );
      await raster.locator('img').evaluate((img) => img.decode());
      assert.equal(decode(await raster.locator('img').screenshot()), payload);
      await raster.close();
    }
  }
  await page.getByRole('textbox', { name: '文字內容' }).fill('');
  assert.equal(
    await page.getByRole('img', { name: '可掃描的 QR Code' }).count(),
    0,
  );
  assert.equal(
    await page.getByRole('button', { name: '下載 PNG', exact: true }).count(),
    0,
  );
  await open('555-timer');
  await page.screenshot({ path: `${output}/555-mobile.png`, fullPage: true });
  await choose('模式', '單穩態');
  await page.screenshot({
    path: `${output}/555-mono-mobile.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await open('rc-time');
  await page.screenshot({ path: `${output}/rc-desktop.png`, fullPage: true });
  assert.deepEqual(errors, [], 'browser console/page errors');
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(
      {
        base,
        checks,
        downloads: ['PNG independent decode', 'SVG raster independent decode'],
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS: ${checks.length} route/viewport checks; search, keyboard, analog presets, Big5 copy/shortcut, PNG+SVG downloads independently decoded; no browser errors.`,
  );
} finally {
  await browser.close();
}
