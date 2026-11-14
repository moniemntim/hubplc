import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, expect } from 'playwright/test';
import { cases as engineering } from './unit-workflows/engineering.mjs';
import { cases as materials } from './unit-workflows/materials.mjs';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const output =
  process.env.REMEDIATION_OUTPUT ??
  'outputs/content-remediation-2026-11-15/local';
const cases = [...engineering, ...materials];
assert.equal(cases.length, 12);
assert.equal(new Set(cases.map((item) => item.slug)).size, 12);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const results = [];
try {
  for (const item of cases) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    await context.addInitScript(() =>
      localStorage.setItem('hubplc:locale', 'zh-Hant'),
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await mockAdsense(page);
    try {
      const response = await page.goto(`${base}/tool/${item.slug}`, {
        waitUntil: 'networkidle',
      });
      assert.equal(response.status(), 200, item.slug);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://hubplc.com/tool/${item.slug}`,
      );
      await expect(
        page.getByRole('region', { name: '計算結果', exact: true }),
      ).toHaveCount(1);
      await expect(page.locator('.tool-guide-case')).toHaveCount(2);
      const application = page.locator('.unit-workflow');
      await expect(application).toBeVisible();
      const choose = async (label, option) => {
        const trigger = application.getByRole('combobox', {
          name: label,
          exact: true,
        });
        await trigger.scrollIntoViewIfNeeded();
        await page.waitForTimeout(350);
        await trigger.click();
        await page.getByRole('option', { name: option, exact: true }).click();
      };
      await item.run({ page, expect, choose });
      await application
        .getByRole('button', { name: '清空應用條件', exact: true })
        .click();
      await expect(application.locator('.tool-notice')).toBeVisible();
      await expect(application.locator('.output-rows')).toHaveCount(0);
      await expect(
        application.getByRole('button', { name: '複製應用結果', exact: true }),
      ).toBeDisabled();
      await expect(
        application.getByRole('button', { name: '下載應用 CSV', exact: true }),
      ).toBeDisabled();
      await application
        .getByRole('button', { name: '載入應用範例', exact: true })
        .click();
      await expect(application.locator('.tool-notice')).toHaveCount(0);
      await expect(
        application.getByRole('button', { name: '複製應用結果', exact: true }),
      ).toBeEnabled();
      const downloading = page.waitForEvent('download');
      await application
        .getByRole('button', { name: '下載應用 CSV', exact: true })
        .click();
      const download = await downloading;
      assert.equal(
        download.suggestedFilename(),
        `hubplc-${item.slug.replace('-converter', '')}-application.csv`,
      );
      const csv = await readFile(await download.path(), 'utf8');
      assert.ok(
        csv.includes('"輸入條件","數值","單位"'),
        item.slug + ' CSV inputs',
      );
      assert.ok(
        csv.includes('"計算項目","數值","單位"'),
        item.slug + ' CSV outputs',
      );
      assert.doesNotMatch(csv, /NaN|Infinity|undefined/);
      await application
        .getByRole('button', { name: '複製應用結果', exact: true })
        .click();
      assert.equal(
        await page.evaluate(() => navigator.clipboard.readText()),
        csv,
        item.slug + ' clipboard equals CSV',
      );

      if (item.slug === 'temperature-converter') {
        await page.getByLabel('起始溫度（°C）', { exact: true }).fill('85');
        await page.getByLabel('結束溫度（°C）', { exact: true }).fill('25');
        await application
          .getByRole('button', { name: '複製應用結果', exact: true })
          .click();
        assert.match(
          await page.evaluate(() => navigator.clipboard.readText()),
          /"溫差","-60","K"/,
        );
      }
      if (
        [
          'pressure-converter',
          'area-converter',
          'storage-converter',
          'temperature-converter',
        ].includes(item.slug)
      ) {
        await application.screenshot({
          path: `${output}/${item.slug}-desktop.png`,
        });
      }
      await page.setViewportSize({ width: 320, height: 1000 });
      await application.scrollIntoViewIfNeeded();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        item.slug + ' mobile overflow',
      );
      if (
        [
          'pressure-converter',
          'area-converter',
          'storage-converter',
          'temperature-converter',
        ].includes(item.slug)
      ) {
        await application.screenshot({
          path: `${output}/${item.slug}-mobile.png`,
        });
      }
      assert.deepEqual(errors, [], item.slug + ' JS errors');
      results.push({
        slug: item.slug,
        status: 'PASS',
        checks: [
          'case',
          'invalid and empty inputs',
          'reset',
          'CSV',
          'clipboard',
          '320px',
        ],
      });
      console.log('PASS application', item.slug);
    } catch (error) {
      await page.screenshot({
        path: `${output}/${item.slug}-failure.png`,
        fullPage: true,
      });
      results.push({ slug: item.slug, status: 'FAIL', error: String(error) });
      console.log('FAIL application', item.slug, String(error));
    } finally {
      await context.close();
    }
  }
  await writeFile(
    `${output}/applications-report.json`,
    JSON.stringify({ base, results }, null, 2),
  );
  assert.equal(results.filter((item) => item.status === 'FAIL').length, 0);
  console.log(
    'PASS 12 application tasks, invalid/reset/export/clipboard and mobile checks',
  );
} finally {
  await browser.close();
}
