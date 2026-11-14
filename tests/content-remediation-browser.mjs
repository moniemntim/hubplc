import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from 'playwright/test';
import { relatedLessons } from '../lib/tools/related-lessons.ts';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const output =
  process.env.REMEDIATION_OUTPUT ??
  'outputs/content-remediation-2026-11-15/local';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 1000 },
  permissions: ['clipboard-read', 'clipboard-write'],
  timezoneId: 'Asia/Taipei',
});
await context.addInitScript(() =>
  localStorage.setItem('hubplc:locale', 'zh-Hant'),
);
const page = await context.newPage();
await mockAdsense(page);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const results = [];
const open = async (path) => {
  const response = await page.goto(base + path, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200, path);
};
try {
  await open('/tool/world-clock');
  await expect(page.getByTestId('world-time')).toHaveText(/\d\d:\d\d:\d\d/);
  await page.getByRole('button', { name: '暫停更新', exact: true }).click();
  const taipei = await page.getByTestId('world-time').textContent();
  await page.waitForTimeout(1100);
  await expect(page.getByTestId('world-time')).toHaveText(taipei);
  await page
    .getByLabel('搜尋城市、國家或時區', { exact: true })
    .fill('America/New_York');
  await page.getByRole('button', { name: /美國・紐約/ }).click();
  await expect(
    page.getByRole('region', { name: '選取城市時間' }),
  ).toContainText('America/New_York');
  await expect(
    page.getByRole('region', { name: '選取城市時間' }),
  ).toContainText('已暫停顯示');
  const newYork = await page.getByTestId('world-time').textContent();
  assert.equal(
    newYork.slice(-5),
    taipei.slice(-5),
    'paused instant preserves minute and second for Taipei/New York',
  );
  await page
    .getByRole('button', { name: '回到台灣・台北', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: '選取城市時間' }),
  ).toContainText('Asia/Taipei');
  await expect(
    page.getByRole('button', { name: '暫停更新', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.tool-guide')).not.toContainText('固定測試時鐘');
  results.push({
    path: '/tool/world-clock',
    checks: 'visitor pause/search/select/reset workflow',
    status: 'PASS',
  });
  await open('/tool/hash');
  await expect(page.locator('.tool-guide')).toContainText(
    '抗碰撞不代表保證沒有碰撞',
  );
  await open('/tool/password-generator');
  await expect(page.locator('.tool-guide')).toContainText(
    '不保證與歷次結果不同',
  );

  const checkedTargets = new Set();
  for (const [slug, lessons] of Object.entries(relatedLessons)) {
    await open(`/tool/${slug}`);
    const related = page.getByRole('complementary', {
      name: '相關實作與延伸操作',
      exact: true,
    });
    await expect(related.getByRole('link')).toHaveCount(lessons.length);
    for (const lesson of lessons) {
      await expect(
        related.getByRole('link', { name: lesson.zh, exact: true }),
      ).toHaveAttribute('href', `/articles/${lesson.slug}`);
      checkedTargets.add(lesson.slug);
    }
    results.push({
      path: `/tool/${slug}`,
      checks: 'published contextual walkthrough links',
      status: 'PASS',
    });
  }
  assert.equal(checkedTargets.size, 8);
  for (const slug of checkedTargets) {
    await open(`/articles/${slug}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://hubplc.com/articles/${slug}`,
    );
    await expect(page.locator('.article-reader__content')).toBeVisible();
  }
  const lessons = [
    ['excel-maxifs', '交班前找加熱區的溫度峰值', '無量測資料'],
    ['excel-minifs', '找出最短的有效校正循環', '故障'],
    ['excel-roundup', '依整包規格採購樹脂', '262.5'],
    ['excel-rounddown', '計算料條可完成件數與剩料', '35 mm'],
    ['excel-large', '找出壓力曲線的第二高峰', '94'],
    ['excel-small', '找出第二短的有效循環', '19'],
  ];
  for (const [slug, task, result] of lessons) {
    await open(`/articles/${slug}`);
    const content = page.locator('.article-reader__content');
    await expect(
      content.getByRole('heading', { name: `主案例：${task}`, exact: true }),
    ).toBeVisible();
    await expect(content).toContainText(result);
    await expect(
      content.getByRole('heading', {
        name: '快速驗證：保留的基礎範例',
        exact: true,
      }),
    ).toBeVisible();
    const image = content.locator('img');
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate((image) => image.complete && image.naturalWidth === 900),
      )
      .toBe(true);
    await expect(page.locator('.article-reader__verification')).toHaveCount(0);
    if (slug === 'excel-rounddown' || slug === 'excel-minifs') {
      await page.setViewportSize({ width: 320, height: 1000 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        slug + ' mobile overflow',
      );
      await page.screenshot({
        path: `${output}/${slug}-mobile.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 1280, height: 1000 });
    }
    results.push({
      path: `/articles/${slug}`,
      checks: 'distinct case, result, legacy image and URL',
      status: 'PASS',
    });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${output}/content-report.json`,
    JSON.stringify({ base, results }, null, 2),
  );
  console.log(
    'PASS public clock workflow, hash/random wording, 9 contextual link panels, 8 public targets and 6 distinct Excel cases',
  );
} finally {
  await browser.close();
}
