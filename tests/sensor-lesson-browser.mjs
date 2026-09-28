import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { mockAdsense } from './adsense-mock.mjs';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787',
  output =
    process.env.LAYOUT_OUTPUT ?? 'outputs/editorial-review/sensor-batch28';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
    headless: true,
    executablePath:
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  }),
  reports = [];
try {
  for (const width of [320, 768, 1440])
    for (const slug of [
      'sensor-polarity-reverse-range',
      'sensor-step-response-acceptance',
    ]) {
      const page = await browser.newPage({ viewport: { width, height: 960 } });
      await mockAdsense(page);
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${base}/articles/${slug}`);
      const ui = page.locator('#sensor-practice');
      if (slug.includes('polarity')) {
        for (const [i, f, r] of [
          ['8', '25', '75'],
          ['16', '75', '25'],
          ['12', '50', '50'],
        ]) {
          await ui
            .getByRole('button', { name: `載入 ${i} mA`, exact: true })
            .click();
          assert.equal(
            await ui.getByTestId('direction-result').textContent(),
            `正向：${f} °C；反向：${r} °C`,
          );
        }
        await ui.getByLabel('輸入電流（mA）').fill('3');
        assert.ok((await ui.textContent()).includes('超出本例 4–20 mA'));
        await ui.getByLabel('輸入電流（mA）').fill('');
        assert.equal(await ui.getByRole('alert').count(), 1);
        assert.equal(await ui.getByTestId('direction-result').count(), 0);
        await ui
          .getByRole('button', { name: '載入 8 mA', exact: true })
          .focus();
        await page.keyboard.press('Enter');
        assert.equal(await ui.getByTestId('direction-result').count(), 1);
      } else {
        await ui.getByRole('button', { name: '重設範例' }).click();
        const row = ui.locator('tbody tr').nth(2);
        assert.equal(await row.locator('td').nth(1).textContent(), '74');
        assert.equal(await row.locator('td').nth(3).textContent(), '1.2');
        await ui.getByLabel('固定延遲（秒）').fill('0.3');
        assert.equal(await row.locator('td').nth(3).textContent(), '1.5');
        await ui.getByRole('button', { name: '切換為下降階躍' }).click();
        assert.equal(await row.locator('td').nth(1).textContent(), '26');
        await ui.getByLabel('時間常數 τ（秒）').fill('0');
        assert.equal(await ui.getByRole('alert').count(), 1);
        assert.equal(await ui.locator('table').count(), 0);
        await ui.getByRole('button', { name: '重設範例' }).focus();
        await page.keyboard.press('Enter');
        assert.equal(await ui.locator('tbody tr').count(), 3);
      }
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.deepEqual(errors, []);
      await ui.screenshot({ path: `${output}/${slug}-${width}.png` });
      reports.push({ slug, width, pass: true });
      await page.close();
    }
} finally {
  await browser.close();
}
await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
console.log(
  'PASS 6 sensor interactions: direction, midpoint, outside, delay, falling, invalid and keyboard',
);
