import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const output = process.env.LAYOUT_OUTPUT ?? 'outputs/layout-qa';
await mkdir(output, { recursive: true });
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
const sitemapPaths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
  ([, url]) => new URL(url).pathname,
);
const paths = process.argv.length > 2 ? process.argv.slice(2) : sitemapPaths;
for (const path of paths)
  assert.ok(sitemapPaths.includes(path), `Unknown page: ${path}`);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {}),
});
const results = [];
try {
  for (const width of [320, 768, 1440]) {
    const pending = [...paths, '/missing-layout-check'];
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        const page = await browser.newPage({
          viewport: { width, height: 960 },
        });
        await mockAdsense(page);
        let errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        while (pending.length) {
          const path = pending.shift();
          errors = [];
          const response = await page.goto(base + path);
          await page.locator('h1').waitFor();
          await page.evaluate(() => document.fonts.ready);
          await page.evaluate(() => new Promise(requestAnimationFrame));
          const layout = await page.evaluate(() => {
            const overflow = [...document.querySelectorAll('body *')]
              .filter((el) => {
                if (el.closest('.sr-only, .skip, [hidden]')) return false;
                const rect = el.getBoundingClientRect();
                return (
                  rect.width > 0 &&
                  (rect.right > innerWidth + 1 || rect.left < -1) &&
                  getComputedStyle(el).position !== 'absolute' &&
                  !el.closest('pre, .article-table-scroll')
                );
              })
              .slice(0, 8)
              .map((el) => `${el.tagName}.${el.className}`);
            return {
              width: document.documentElement.scrollWidth,
              headings: document.querySelectorAll('h1').length,
              title: document.title,
              overflow,
            };
          });
          results.push({
            path,
            viewport: width,
            status: response.status(),
            ...layout,
            errors: [...errors],
          });
          if (
            [
              '/',
              '/tool',
              '/about',
              '/privacy',
              '/articles',
              '/tool/analog',
              '/tool/world-clock',
              '/tool/crypto',
              '/tool/register-converter',
              '/articles/batch-statistics-empty-batch',
              '/articles/sort-product-index-records',
            ].includes(path)
          ) {
            await page.screenshot({
              path: `${output}/${path.replaceAll('/', '_') || 'home'}-${width}.png`,
              fullPage: true,
            });
          }
        }
        await page.close();
      }),
    );
    console.log(`Checked ${paths.length + 1} pages at ${width}px`);
  }
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify(results, null, 2));
}
const failures = results.filter(
  (r) =>
    r.width > r.viewport ||
    r.headings !== 1 ||
    r.errors.length ||
    r.status !== (r.path === '/missing-layout-check' ? 404 : 200),
);
console.log(JSON.stringify(failures, null, 2));
assert.equal(
  failures.length,
  0,
  `${failures.length} layout/page failures; see ${output}/report.json`,
);
console.log(`PASS ${results.length} page/viewport checks`);
