import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { chromium, expect } from 'playwright/test';
import { tools } from '../lib/tools/registry.ts';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const live = process.env.IP_LOOKUP_LIVE === '1';
const output = process.env.IP_LOOKUP_OUTPUT ?? 'outputs/ip-lookup-copy/local';
await mkdir(output, { recursive: true });
const labels = {
  'zh-Hant': {
    controls: '查詢操作',
    results: '查詢結果',
    notes: '查詢方式與隱私',
    example: '使用範例',
    query: '查詢我的 IP',
    copy: '複製結果',
    clear: '清空',
    idle: '按「查詢我的 IP」',
    error: '暫時無法取得',
  },
  en: {
    controls: 'Lookup controls',
    results: 'Lookup results',
    notes: 'Lookup & privacy',
    example: 'Usage example',
    query: 'Look up my IP',
    copy: 'Copy result',
    clear: 'Clear',
    idle: 'Select Look up my IP',
    error: 'Connection information is unavailable',
  },
};
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const checks = [];
try {
  for (const locale of ['zh-Hant', 'en']) {
    for (const width of [320, 1280]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        permissions: ['clipboard-read', 'clipboard-write'],
      });
      await context.addInitScript(
        (locale) => localStorage.setItem('hubplc:locale', locale),
        locale,
      );
      const page = await context.newPage();
      await mockAdsense(page);
      const errors = [];
      let requests = 0;
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('request', (request) => {
        if (new URL(request.url()).pathname === '/api/network-info') requests++;
      });
      if (!live)
        await page.route('**/api/network-info', (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: '{"ip":"203.0.113.10","version":4}',
          }),
        );
      try {
        const response = await page.goto(base + '/tool/ip-address', {
          waitUntil: 'networkidle',
        });
        assert.equal(response.status(), 200);
        const text = labels[locale];
        await expect(
          page.getByRole('region', { name: text.controls, exact: true }),
        ).toBeVisible();
        const result = page.getByRole('region', {
          name: text.results,
          exact: true,
        });
        await expect(result).toContainText(text.idle);
        await expect(page.locator('.tool-foot > span')).toHaveText(text.notes);
        await expect(page.locator('.tool-example > strong').first()).toHaveText(
          text.example,
        );
        assert.doesNotMatch(
          await page.locator('main').innerText(),
          /公式與說明|Formula & notes|試算範例|計算結果|CALCULATION RESULTS/,
        );
        assert.equal(requests, 0, 'IP lookup must wait for an explicit click');
        const pending = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname === '/api/network-info',
        );
        await page
          .getByRole('button', { name: text.query, exact: true })
          .click();
        const lookup = await pending;
        assert.equal(lookup.status(), 200, 'first IP query succeeds');
        if (live)
          assert.match(
            lookup.headers()['cache-control'],
            /private,\s*no-store/,
          );
        const data = await lookup.json();
        assert.ok(
          isIP(data.ip) === data.version && [4, 6].includes(data.version),
          'response has a valid IP and matching version (address redacted)',
        );
        await expect
          .poll(
            async () =>
              (await result.locator('dd').first().textContent())?.trim() ===
              data.ip,
          )
          .toBe(true);
        await expect(result.locator('dd').nth(1)).toHaveText(
          `IPv${data.version}`,
        );
        assert.equal(requests, 1);
        await page
          .getByRole('button', { name: text.copy, exact: true })
          .click();
        assert.ok(
          (await page.evaluate(() => navigator.clipboard.readText())) ===
            data.ip,
          'clipboard matches the returned IP (address redacted)',
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
          'no page overflow',
        );
        await page.locator('.calculator').screenshot({
          path: `${output}/${locale}-${width}.png`,
          mask: [result.locator('dd').first()],
        });
        await page
          .getByRole('button', { name: text.clear, exact: true })
          .click();
        await expect(result.locator('dd')).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: text.copy, exact: true }),
        ).toBeDisabled();

        // The first production query above is real. Failure and cancellation are
        // controlled fixtures so these states remain reproducible on any network.
        await page.unroute('**/api/network-info');
        await page.route('**/api/network-info', (route) =>
          route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: '{"error":"address_unavailable"}',
          }),
        );
        await page
          .getByRole('button', { name: text.query, exact: true })
          .click();
        await expect(result).toContainText(text.error);
        await expect(result.locator('dd')).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: text.copy, exact: true }),
        ).toBeDisabled();
        await page.unroute('**/api/network-info');
        let release;
        await page.route('**/api/network-info', async (route) => {
          await new Promise((resolve) => {
            release = resolve;
          });
          await route
            .fulfill({
              status: 200,
              contentType: 'application/json',
              body: '{"ip":"203.0.113.11","version":4}',
            })
            .catch(() => {});
        });
        await page
          .getByRole('button', { name: text.query, exact: true })
          .click();
        await expect.poll(() => Boolean(release)).toBe(true);
        await page
          .getByRole('button', { name: text.clear, exact: true })
          .click();
        release();
        await page.waitForTimeout(100);
        await expect(result).toContainText(text.idle);
        await expect(result.locator('dd')).toHaveCount(0);
        assert.deepEqual(errors, []);
        checks.push({
          locale,
          width,
          firstQuery: live ? 'real Cloudflare API' : 'fixture',
          version: data.version,
          labels: 'PASS',
          copyClearErrorCancel: 'PASS',
          addressStored: false,
        });
      } finally {
        await context.close();
      }
    }
  }
  // Check the rendered shared headings on every public tool, rather than
  // interpreting functional-test success as a copy review.
  const headings = [];
  for (const tool of tools) {
    const response = await fetch(`${base}/tool/${tool.slug}`);
    assert.equal(response.status, 200, tool.slug);
    const html = await response.text();
    const notes = [
      ...html.matchAll(/class="tool-foot"[\s\S]*?<span>(.*?)<\/span>/g),
    ].map((match) => match[1]);
    assert.ok(
      notes.every((label) => label !== '公式與說明'),
      tool.slug + ': no formula-only default title',
    );
    assert.ok(
      html.includes('使用範例'),
      tool.slug + ': neutral shared example title',
    );
    headings.push({ slug: tool.slug, notes, example: '使用範例' });
  }
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(
      {
        base,
        liveFirstQuery: live,
        checks,
        sharedHeadingPages: headings.length,
        headings,
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS IP labels/query/copy/clear/error/cancel at 2 languages × 2 widths; first query ${live ? 'real' : 'fixture'}; ${headings.length} shared-heading pages checked; IP addresses redacted.`,
  );
} finally {
  await browser.close();
}
