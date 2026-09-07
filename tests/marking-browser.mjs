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
const page = await browser.newPage();
await mockAdsense(page);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
async function choose(label, option) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
async function layout() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.ok(
    await page
      .locator('.component-visual')
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  );
}
async function open(slug) {
  assert.equal((await page.goto(`${base}/tool/${slug}`)).status(), 200);
  await page.waitForLoadState('networkidle');
  await page.reload();
  await page.waitForLoadState('networkidle');
}
try {
  await mkdir('outputs/marking-qa', { recursive: true });
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await open('smd-capacitor');
    const capacitor = page.getByRole('textbox', {
      name: 'SMD 電容代碼',
      exact: true,
    });
    for (const code of ['104K', 'R50', '999R999M']) {
      await capacitor.fill(code);
      await expect(page.locator('.marking-token').first()).toBeVisible();
      assert.equal(
        (await page.locator('.marking-token strong').allTextContents()).join(
          '',
        ),
        code,
      );
      await layout();
      assert.ok(
        await page.locator('.marking-token').evaluateAll((tokens) => {
          const boxes = tokens.map((token) => token.getBoundingClientRect());
          return boxes.every((a, i) =>
            boxes.every(
              (b, j) =>
                i === j ||
                a.right <= b.left ||
                b.right <= a.left ||
                a.bottom <= b.top ||
                b.bottom <= a.top,
            ),
          );
        }),
      );
    }
    await capacitor.fill('104K');
    await expect(page.locator('.component-focus-outline')).toHaveCSS(
      'opacity',
      '1',
    );
    await page
      .locator('.tool-diagram')
      .screenshot({ path: `outputs/marking-qa/capacitor-${width}.png` });
    await capacitor.fill('bad');
    await expect(page.locator('.marking-token')).toHaveCount(0);
    await expect(
      page.getByRole('region', { name: '計算結果' }).locator('dd'),
    ).toHaveCount(0);

    await open('smd-resistor');
    const resistor = page.getByRole('textbox', {
      name: 'SMD 電阻代碼',
      exact: true,
    });
    for (const [format, code] of [
      ['三位數（472）', '472'],
      ['四位數（1001）', '1001'],
      ['R 小數點（4R7）', '999R999'],
      ['EIA-96（01Y）', '01Y'],
      ['三位數（472）', '000'],
    ]) {
      await choose('標記格式', format);
      await resistor.fill(code);
      await expect(page.locator('.chip-marking')).toHaveText(code);
      await expect(page.locator('.chip-marking')).toHaveCSS(
        'text-decoration-line',
        'none',
      );
      assert.ok(
        await page.locator('.chip-marking').evaluate((text) => {
          const box = text.getBBox();
          return (
            box.x >= 110 &&
            box.x + box.width <= 278 &&
            box.y >= 84 &&
            box.y + box.height <= 160
          );
        }),
        `marking must fit between terminations: ${code}`,
      );
      await layout();
    }
    await resistor.fill('472');
    await page
      .locator('.tool-diagram')
      .screenshot({ path: `outputs/marking-qa/resistor-${width}.png` });
    await resistor.fill('bad');
    await expect(page.locator('.chip-marking')).toHaveText('—');
    await expect(page.locator('.component-mark-readout strong')).toHaveText(
      '—',
    );

    await open('resistor-color');
    for (const [option, count] of [
      ['四色環', 4],
      ['五色環', 5],
    ]) {
      await choose('色環數', option);
      await expect(page.locator('.resistor-band')).toHaveCount(count);
      await choose('有效數字 1', '紫 7');
      await expect(page.locator('.band-legend strong').first()).toHaveText(
        '紫 7',
      );
      await expect(
        page.locator('[data-diagram-field="有效數字 1"]'),
      ).toHaveAttribute('data-focused', 'true');
      await expect(
        page.locator('[data-diagram-field="有效數字 1"] .band-focus-pointer'),
      ).toHaveCSS('opacity', '1');
      assert.ok(
        await page.locator('.resistor-band').evaluateAll((bands) =>
          bands.every((band) => {
            const clip = band.parentElement.getAttribute('clip-path');
            return (
              clip?.startsWith('url(#') &&
              document.getElementById(clip.slice(5, -1))?.tagName === 'clipPath'
            );
          }),
        ),
      );
      await layout();
      await page
        .locator('.tool-diagram')
        .screenshot({ path: `outputs/marking-qa/bands-${count}-${width}.png` });
    }
    await choose('轉換方式', '阻值轉色環');
    await page.getByRole('textbox', { name: '阻值', exact: true }).fill('1');
    await expect(page.locator('.resistor-band')).toHaveCount(5);
    await page.getByRole('textbox', { name: '阻值', exact: true }).fill('');
    await expect(page.locator('.resistor-band')).toHaveCount(0);
    await layout();
    console.log(`PASS: three component illustrations at ${width}px`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
