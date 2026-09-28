import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { mockAdsense } from './adsense-mock.mjs';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787',
  output =
    process.env.LAYOUT_OUTPUT ?? 'outputs/editorial-review/alias-batch29';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
    headless: true,
    executablePath:
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  }),
  reports = [];
try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } });
    await mockAdsense(page);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/articles/sampling-aliasing-frequency-validation`);
    const ui = page.locator('#alias-practice');
    await ui.getByRole('button', { name: '載入70 Hz／100 Hz' }).click();
    await ui
      .getByTestId('alias-result')
      .filter({ hasText: '折返頻率大小：30 Hz' })
      .waitFor();
    assert.ok(
      (await ui.getByTestId('alias-result').textContent()).includes(
        '折返頻率大小：30 Hz',
      ),
    );
    assert.equal(await ui.locator('tbody tr').count(), 12);
    await ui.getByRole('button', { name: '載入提高到 200 Hz' }).click();
    await ui
      .getByTestId('alias-result')
      .filter({ hasText: '折返頻率大小：70 Hz' })
      .waitFor();
    assert.ok(
      (await ui.getByTestId('alias-result').textContent()).includes(
        '折返頻率大小：70 Hz',
      ),
    );
    await ui.getByRole('button', { name: '載入邊界零相位' }).click();
    await ui
      .locator('tbody tr')
      .nth(1)
      .locator('td')
      .nth(2)
      .filter({ hasText: /^0$/ })
      .waitFor();
    assert.deepEqual(
      await ui.locator('tbody tr td:nth-child(3)').allTextContents(),
      Array(12).fill('0'),
    );
    await ui.getByRole('button', { name: '載入邊界 90°' }).click();
    await ui
      .locator('tbody tr')
      .nth(1)
      .locator('td')
      .nth(2)
      .filter({ hasText: /^-1$/ })
      .waitFor();
    assert.deepEqual(
      await ui.locator('tbody tr td:nth-child(3)').allTextContents(),
      Array.from({ length: 12 }, (_, i) => (i % 2 ? '-1' : '1')),
    );
    await ui.getByLabel('取樣率（Hz）').fill('0');
    await ui.getByRole('alert').waitFor();
    assert.equal(await ui.getByRole('alert').count(), 1);
    assert.equal(await ui.locator('table').count(), 0);
    await ui.getByRole('button', { name: '載入70 Hz／100 Hz' }).focus();
    await page.keyboard.press('Enter');
    await ui.locator('tbody tr').nth(11).waitFor();
    assert.equal(await ui.locator('tbody tr').count(), 12);
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
  'PASS 3 alias interactions: folding, rate, phase boundary, invalid input and keyboard',
);
