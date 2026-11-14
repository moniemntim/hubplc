import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from 'playwright/test';
import { tools } from '../lib/tools/registry.ts';
import { retainedGuideSlugs } from '../lib/tools/tool-guides/index.ts';
import { cases as electrical } from './tool-audit/electrical-plc.mjs';
import { cases as encoding } from './tool-audit/encoding.mjs';
import { cases as units } from './tool-audit/units-time.mjs';
import { cases as batch } from './tool-audit/unit-batch.mjs';
import { cases as random } from './tool-audit/random-tasks.mjs';
import { cases as samples } from './tool-audit/sample-data.mjs';
import { cases as data } from './tool-audit/data-utilities.mjs';
import { cases as network } from './tool-audit/network-info.mjs';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const output =
  process.env.TOOL_AUDIT_OUTPUT ?? 'outputs/tool-audit-2026-11-15/local';
const allCases = [
  ...electrical,
  ...encoding,
  ...units,
  ...batch,
  ...random,
  ...samples,
  ...data,
  ...network,
];
const selected = new Set(process.argv.slice(2));
assert.equal(
  new Set(allCases.map((item) => item.slug)).size,
  allCases.length,
  'each tool has exactly one audit fixture',
);
if (selected.size === 0)
  assert.deepEqual(
    allCases.map((item) => item.slug).sort(),
    tools.map((item) => item.slug).sort(),
    'all public tools are audited once',
  );
for (const slug of selected) {
  assert.ok(
    tools.some((tool) => tool.slug === slug),
    slug,
  );
  assert.ok(
    allCases.some((item) => item.slug === slug),
    `${slug} has a fixture`,
  );
}
const cases = allCases.filter(
  (item) => selected.size === 0 || selected.has(item.slug),
);
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
      timezoneId: 'Asia/Taipei',
    });
    await context.addInitScript(() =>
      localStorage.setItem('hubplc:locale', 'zh-Hant'),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    page.setDefaultNavigationTimeout(20000);
    await mockAdsense(page);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      if (item.beforeOpen) await item.beforeOpen(page);
      const response = await page.goto(`${base}/tool/${item.slug}`, {
        waitUntil: 'networkidle',
      });
      assert.equal(response.status(), 200, item.slug);
      const choose = async (label, option) => {
        const trigger = page.getByRole('combobox', {
          name: label,
          exact: true,
        });
        await trigger.scrollIntoViewIfNeeded();
        // Let native smooth scrolling settle before opening the anchored menu.
        await page.waitForTimeout(350);
        await trigger.click();
        await page.getByRole('option', { name: option, exact: true }).click();
      };
      const tool = tools.find((tool) => tool.slug === item.slug);
      const result =
        tool.category === '編碼'
          ? page.locator('#crypto-output')
          : page.getByRole('region', { name: '計算結果', exact: true });
      await item.run({ page, expect, assert, choose, result });
      const guide = retainedGuideSlugs.includes(item.slug)
        ? page.locator('.plc-guide, .worked-cases')
        : page.locator('.tool-guide');
      await expect(guide).toBeVisible();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        item.slug + ' layout',
      );
      assert.deepEqual(errors, [], item.slug + ' script errors');
      if (
        [
          'unit-converter',
          'hash',
          'voltage-divider',
          'temperature-converter',
        ].includes(item.slug)
      ) {
        await guide.screenshot({
          path: `${output}/${item.slug}-guide-desktop.png`,
        });
        await page.setViewportSize({ width: 320, height: 1000 });
        await guide.screenshot({
          path: `${output}/${item.slug}-guide-mobile.png`,
        });
      }
      results.push({
        slug: item.slug,
        status: 'PASS',
        guide: retainedGuideSlugs.includes(item.slug)
          ? 'retained'
          : 'specific worked case',
      });
      console.log('PASS', item.slug);
    } catch (error) {
      await page.screenshot({ path: `${output}/${item.slug}-failure.png` });
      results.push({ slug: item.slug, status: 'FAIL', error: String(error) });
      console.log('FAIL', item.slug, String(error));
    } finally {
      await context.close();
    }
  }
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(
      {
        base,
        results,
        passed: results.filter((item) => item.status === 'PASS').length,
        total: cases.length,
      },
      null,
      2,
    ),
  );
  assert.equal(
    results.filter((item) => item.status === 'FAIL').length,
    0,
    'tool-specific case failures',
  );
  console.log(
    `PASS ${results.length} tool-specific worked cases and edge/workflow checks.`,
  );
} finally {
  await browser.close();
}
