import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { mockAdsense } from './adsense-mock.mjs';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const output =
  process.env.LAYOUT_OUTPUT ?? 'outputs/editorial-review/filter-batch27';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const reports = [];
try {
  for (const width of [320, 768, 1440])
    for (const slug of [
      'analog-raw-quality-filter-overrange',
      'filtered-peaks-raw-data-traceability',
    ]) {
      const page = await browser.newPage({ viewport: { width, height: 960 } });
      await mockAdsense(page);
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${base}/articles/${slug}`);
      const ui = page.locator('#filter-practice'),
        counts = slug.startsWith('analog');
      await ui
        .getByRole('button', {
          name: counts ? '載入故障後恢復' : '載入單點尖峰',
        })
        .click();
      const rows = ui.locator('tbody tr');
      assert.equal(await rows.count(), counts ? 8 : 5);
      assert.deepEqual(
        await rows
          .nth(counts ? 7 : 2)
          .locator('td')
          .allTextContents(),
        counts
          ? ['700', '12,010', 'Good', '3', '11,920', '7.45', '7.45', '0']
          : [
              '200',
              '50',
              'Good',
              '3',
              '23.3333333333',
              '23.3333333333',
              '23.3333333333',
              '0',
            ],
      );
      if (counts) {
        await ui.getByRole('button', { name: '載入缺樣不補零' }).click();
        assert.equal(
          await rows.nth(3).locator('td').nth(2).textContent(),
          'Bad',
        );
        await ui.getByRole('button', { name: '載入零是合法值' }).click();
        assert.equal(await rows.nth(2).locator('td').nth(5).textContent(), '0');
      } else {
        await ui.getByRole('button', { name: '載入階躍' }).click();
        assert.equal(
          await rows.nth(5).locator('td').nth(5).textContent(),
          '50',
        );
        await ui.getByRole('button', { name: '載入尖峰後缺樣' }).click();
        assert.equal(await rows.nth(3).locator('td').nth(5).textContent(), '—');
      }
      await ui.getByLabel('依序輸入資料（逗號分隔）').fill('10,,20');
      assert.equal(await ui.getByRole('alert').count(), 1);
      assert.equal(await rows.count(), 0);
      await ui
        .getByRole('button', {
          name: counts ? '載入故障後恢復' : '載入單點尖峰',
        })
        .focus();
      await page.keyboard.press('Enter');
      assert.equal(await rows.count(), counts ? 8 : 5);
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
  'PASS 6 filter interactions: recovery, peak, missing data, zero, invalid input and keyboard',
);
