import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from 'playwright/test';
import { everydayTools } from '../lib/tools/everyday-registry.ts';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const output =
  process.env.EVERYDAY_OUTPUT ??
  'outputs/tool-audit-2026-11-15/everyday-layout';
const actions = {
  'random-draw': '產生結果',
  'random-groups': '產生結果',
  'gift-exchange': '產生結果',
  'random-codes': '產生資料',
  'sample-data': '產生資料',
  'data-mask': '預覽遮罩',
  'email-check': '檢查格式',
  'name-transliterator': '產生草稿',
  'ip-address': '查詢我的 IP',
};
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const checks = [];
try {
  for (const width of [320, 1280]) {
    for (const tool of everydayTools) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
      });
      await context.addInitScript(() =>
        localStorage.setItem('hubplc:locale', 'zh-Hant'),
      );
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/api/network-info', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{"ip":"203.0.113.10","version":4}',
        }),
      );
      const response = await page.goto(`${base}/tool/${tool.slug}`, {
        waitUntil: 'networkidle',
      });
      assert.equal(response.status(), 200, tool.slug);
      const requests = [];
      page.on('request', (request) => requests.push(request.url()));
      await page
        .getByRole('button', { name: actions[tool.slug], exact: true })
        .click();
      const result = page.getByRole('region', {
        name: tool.slug === 'ip-address' ? '查詢結果' : '計算結果',
        exact: true,
      });
      if (tool.slug === 'data-mask')
        await expect(
          page.getByLabel('預覽結果', { exact: true }),
        ).not.toHaveValue('');
      else if (
        ['random-codes', 'sample-data', 'email-check'].includes(tool.slug)
      )
        await expect(result.locator('tbody tr').first()).toBeVisible();
      else await expect(result.locator('dd').first()).toBeVisible();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${tool.slug} ${width}: page overflow after action`,
      );
      assert.deepEqual(errors, [], `${tool.slug}: script errors`);
      await expect(
        page.locator('script[src*="adsbygoogle"],ins.adsbygoogle'),
      ).toHaveCount(0);
      assert.ok(
        requests.every(
          (url) =>
            tool.slug === 'ip-address' &&
            url === new URL('/api/network-info', base).href,
        ),
        `${tool.slug}: local processing unexpectedly used network ${requests.join(', ')}`,
      );
      const tables = await result.locator('thead').evaluateAll((heads) =>
        heads.map((head) => ({
          foreground: getComputedStyle(head.querySelector('th') ?? head).color,
          background: getComputedStyle(head).backgroundColor,
        })),
      );
      const luminance = (color) => {
        const rgb = color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map((v) => v / 255)
          .map((v) =>
            v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
          );
        return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
      };
      for (const table of tables) {
        const colors = [
          luminance(table.foreground),
          luminance(table.background),
        ].sort((a, b) => a - b);
        assert.ok(
          (colors[1] + 0.05) / (colors[0] + 0.05) >= 4.5,
          `${tool.slug}: table heading contrast ${JSON.stringify(table)}`,
        );
      }
      await page
        .locator('.calculator')
        .screenshot({ path: `${output}/${tool.slug}-${width}.png` });
      checks.push({
        slug: tool.slug,
        width,
        status: 'PASS',
        resultVisible: true,
        overflow: false,
        localNetwork: true,
      });
      await context.close();
    }
  }
  await writeFile(
    `${output}/report.json`,
    JSON.stringify({ base, checks }, null, 2),
  );
  console.log(
    `PASS ${checks.length} populated everyday-tool desktop/mobile layouts, no input upload, table contrast, no ads or script errors.`,
  );
} finally {
  await browser.close();
}
