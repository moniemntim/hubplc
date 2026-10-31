import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, expect } from 'playwright/test';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.REMEDIATION_OUTPUT ?? 'outputs/content-remediation';
await mkdir(output, { recursive: true });
const articles = JSON.parse(
  await readFile('lib/article-index.generated.json', 'utf8'),
);
const cases = [
  'fx5u-sd-bin-read-write',
  'fx5u-sd-csv-read-write',
  'xca-ecu-https-certificate-setup',
];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const checks = [];
const errors = [];
try {
  const page = await browser.newPage();
  await mockAdsense(page);
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      (await page.goto(base, { waitUntil: 'networkidle' })).status(),
      200,
    );
    await expect(page.locator('.home-lessons .home-feature-card')).toHaveCount(
      3,
    );
    for (const slug of cases) {
      assert.ok(
        articles.some((article) => article.slug === slug),
        slug,
      );
      const card = page.locator(`.home-lessons a[href="/articles/${slug}"]`);
      await expect(card.locator('.home-case-steps li')).toHaveCount(3);
      await expect(card.locator('.home-case-result')).toContainText('完成判準');
    }
    const positions = await page.evaluate(() => ({
      cases: document.querySelector('#lessons-heading').getBoundingClientRect()
        .top,
      tools: document.querySelector('#tools-heading').getBoundingClientRect()
        .top,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.ok(
      positions.cases < positions.tools,
      'engineering cases precede generic tools',
    );
    assert.equal(positions.overflow, false);
    await page.screenshot({
      path: `${output}/home-${width}.png`,
      fullPage: true,
    });
    checks.push({ path: '/', width });
  }
  for (const slug of cases) {
    await page.goto(base);
    await page.locator(`.home-lessons a[href="/articles/${slug}"]`).click();
    await expect(page).toHaveURL(`${base}/articles/${slug}`);
    await expect(page.locator('h1')).toHaveText(
      articles.find((article) => article.slug === slug).title,
    );
    checks.push({ path: `/articles/${slug}`, navigation: true });
  }
  await page.goto(`${base}/articles`);
  for (const slug of cases)
    await expect(
      page.locator(`.library-work-paths a[href="/articles/${slug}"]`),
    ).toHaveCount(1);
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJs.newPage();
  await mockAdsense(staticPage);
  await staticPage.goto(base);
  await expect(
    staticPage.locator('.home-lessons .home-case-result'),
  ).toHaveCount(3);
  await noJs.close();
  assert.deepEqual(errors, []);
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(
      { base, checks, noJsCases: 3, errors, status: 'PASS' },
      null,
      2,
    ),
  );
  console.log(
    'PASS original cases, completion criteria, live article links, SSR and 3 responsive sizes.',
  );
} finally {
  await browser.close();
}
