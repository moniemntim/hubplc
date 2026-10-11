import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { tools } from '../lib/tools/registry.ts';
import { toolEnglish } from '../lib/tools/tool-i18n.ts';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
await context.addInitScript(() => localStorage.setItem('hubplc:locale', 'en'));
const page = await context.newPage();
await mockAdsense(page);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  for (const tool of tools) {
    const response = await page.goto(`${base}/tool/${tool.slug}`);
    assert.equal(response.status(), 200, tool.slug);
    await page.locator('h1').waitFor();
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    assert.equal(await page.title(), `${toolEnglish[tool.slug].name}｜HubPLC`);
    const untranslated = await page.evaluate((slug) => {
      const han = /[\p{Script=Han}]/u;
      const selectors = [
        'h1',
        'h2',
        'h3',
        'label',
        'button',
        'nav',
        'caption',
        'th',
        '.tool-foot',
        '.tool-notice',
        '.local-badge',
        '.tool-category',
        '.tool-open',
        '.lead',
        'svg title',
      ].join(',');
      const text = [...document.querySelectorAll(selectors)]
        .filter((element) => {
          if (
            ['rmb-uppercase', 'big5', 'byte-encoding', 'text-repair'].includes(
              slug,
            ) &&
            element.closest('.tool-foot')
          )
            return false;
          const style = getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden';
        })
        .map((element) => element.textContent?.trim() ?? '')
        .filter((value) => han.test(value));
      const attributes = [...document.querySelectorAll('*')]
        .flatMap((element) =>
          ['aria-label', 'title', 'placeholder', 'data-diagram-field'].map(
            (name) => element.getAttribute(name) ?? '',
          ),
        )
        .filter((value) => han.test(value));
      return [...new Set([...text, ...attributes])].filter(
        (value) => value !== '中文',
      );
    }, tool.slug);
    assert.deepEqual(
      untranslated,
      [],
      `${tool.slug}: ${untranslated.join(' | ')}`,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    `PASS ${tools.length} English tool pages contain no untranslated UI labels`,
  );
} finally {
  await browser.close();
}
