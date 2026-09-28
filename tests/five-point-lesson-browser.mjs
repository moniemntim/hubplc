import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { mockAdsense } from './adsense-mock.mjs';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const output =
  process.env.LAYOUT_OUTPUT ?? 'outputs/editorial-review/five-point';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const reports = [];
try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } });
    await mockAdsense(page);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/articles/4-20ma-zero-offset-span-errors`);
    const ui = page.locator('#five-point-practice');
    for (const [label, expected] of [
      ['理想讀值', '五點誤差均在選定容差內'],
      ['固定偏移', '固定偏移線索'],
      ['跨度差', '跨度差線索'],
      ['中間點偏離', '中間點偏離端點直線'],
      ['偏移加跨度差', '偏移與跨度差混合線索'],
    ]) {
      await ui
        .getByRole('button', { name: `載入${label}`, exact: true })
        .click();
      assert.ok(
        (await ui.getByTestId('finding').textContent()).startsWith(expected),
      );
    }
    await ui.getByRole('button', { name: '載入固定偏移', exact: true }).click();
    assert.deepEqual(
      await ui.locator('tbody tr').nth(2).locator('td').allTextContents(),
      ['5', '5.4', '0.4', '4', '0'],
    );
    await ui
      .getByLabel('基準 5 bar 時的讀值（bar）', { exact: true })
      .fill('5.9');
    assert.ok(
      (await ui.getByTestId('finding').textContent()).startsWith('中間點偏離'),
    );
    assert.deepEqual(
      await ui.locator('tbody tr').nth(2).locator('td').allTextContents(),
      ['5', '5.9', '0.9', '9', '0.5'],
    );
    await ui.getByLabel('基準 5 bar 時的讀值（bar）', { exact: true }).fill('');
    assert.equal(await ui.getByRole('alert').count(), 1);
    assert.equal(await ui.locator('table').count(), 0);
    await ui.getByRole('button', { name: '載入固定偏移', exact: true }).click();
    await ui.getByLabel('判讀容差（bar）').fill('0');
    assert.equal(await ui.getByRole('alert').count(), 1);
    assert.equal(await ui.getByTestId('finding').count(), 0);
    await ui.getByRole('button', { name: '載入固定偏移', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.ok(
      (await ui.getByTestId('finding').textContent()).startsWith('固定偏移'),
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    await ui.screenshot({ path: `${output}/${width}.png` });
    reports.push({ width, pass: true });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
console.log(
  'PASS: 3 widths, five presets, edited mid-point, invalid fields, keyboard recovery, no page errors or overflow',
);
