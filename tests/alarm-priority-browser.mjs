import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const results = [];
await mkdir('outputs/editorial-review/priority-browser', { recursive: true });
try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(
      pathToFileURL(resolve('public/examples/alarm-priority/demo.html')).href,
    );
    const ids = () =>
      page
        .locator('#list li')
        .evaluateAll((items) => items.map((item) => item.dataset.id));
    assert.deepEqual(await ids(), ['Q2', 'Q1', 'Q4', 'Q3', 'M1']);
    assert.match(
      await page.locator('[data-id="Q2"] .due').innerText(),
      /剩餘 90 秒/,
    );
    assert.match(
      await page.locator('[data-id="Q1"] .due').innerText(),
      /剩餘 240 秒/,
    );
    await page.getByRole('button', { name: '14:03:00', exact: true }).click();
    assert.match(
      await page.locator('[data-id="Q2"] .due').innerText(),
      /已逾期 30 秒（仍為 High）/,
    );
    assert.match(
      await page.locator('[data-id="Q1"] .due').innerText(),
      /剩餘 120 秒/,
    );
    await page.locator('#time').fill('150');
    await page.locator('#time').dispatchEvent('input');
    assert.match(
      await page.locator('[data-id="Q2"] .due').innerText(),
      /已逾期 0 秒/,
    );
    await page.locator('#filter').selectOption('unacked');
    assert.deepEqual(await ids(), ['Q1', 'Q4', 'Q3', 'M1']);
    assert.match(await page.locator('#scope').innerText(), /4／5/);
    await page.locator('#filter').selectOption('active');
    assert.deepEqual(await ids(), ['Q2', 'Q1', 'Q4', 'M1']);
    await page.locator('#filter').selectOption('all');
    await page.getByRole('button', { name: '14:03:00', exact: true }).click();
    assert.match(
      await page.locator('[data-id="Q2"] .due').innerText(),
      /已逾期 30 秒/,
    );
    assert.match(
      await page.locator('[data-id="Q1"] .due').innerText(),
      /剩餘 120 秒/,
    );
    const before = await page.locator('#list').innerText();
    const border = () =>
      page
        .locator('[data-id="Q2"]')
        .evaluate((el) => getComputedStyle(el).borderLeftColor);
    const originalBorder = await border();
    await page.getByLabel('色彩版本').selectOption('v2');
    assert.notEqual(await border(), originalBorder);
    assert.equal(await page.locator('#list').innerText(), before);
    assert.match(await page.locator('#theme-status').innerText(), /theme\/v2/);
    await page.getByLabel('黑白顯示').check();
    assert.equal(
      await page.locator('body').evaluate((el) => getComputedStyle(el).filter),
      'grayscale(1)',
    );
    assert.equal(await page.locator('#list').innerText(), before);
    await page.getByLabel('色彩版本').selectOption('v1');
    assert.equal(await page.locator('#list').innerText(), before);
    await page.getByLabel('黑白顯示').uncheck();
    assert.equal(await border(), originalBorder);
    await page.getByLabel('色彩版本').selectOption('v2');
    await page.locator('#filter').selectOption('unacked');
    assert.deepEqual(await ids(), ['Q1', 'Q4', 'Q3', 'M1']);
    await page.locator('#filter').selectOption('all');
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('#theme-status').isVisible(), true);
    assert.match(await page.locator('#theme-status').innerText(), /theme\/v2/);
    assert.equal(await page.locator('#list').innerText(), before);
    await page.emulateMedia({ media: 'screen' });
    await page.getByLabel('色彩版本').selectOption('v1');
    assert.match(
      await page.locator('[data-id="Q4"] .due').innerText(),
      /未設定/,
    );
    assert.match(
      await page.locator('[data-id="Q3"] .state').innerText(),
      /條件已消失／未確認/,
    );
    await page.getByRole('button', { name: '14:01:00', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#clock').innerText(), '14:01:00');
    await page.locator('#time').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#clock').innerText(), '14:01:01');
    assert.equal(
      await page.locator('#time').getAttribute('aria-valuetext'),
      '14:01:01',
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    await page.screenshot({
      path: `outputs/editorial-review/priority-browser/${width}.png`,
      fullPage: true,
    });
    results.push({
      width,
      passed: true,
      scenarios: [
        'deadline90/240',
        'overdue30/remaining120',
        'equality0',
        'unacked-filter',
        'active-filter',
        'monochrome-text',
        'missing-deadline',
        'cleared-unacked',
        'keyboard-button-slider',
        'no-overflow-pageerror',
        'theme-change-preserves-text',
        'theme-rollback-preserves-text',
        'new-theme-filter',
        'print-keeps-version-and-text',
      ],
    });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  'outputs/editorial-review/priority-browser/report.json',
  JSON.stringify(results, null, 2),
);
console.log('PASS: 14 scenarios at 3 widths (42 browser checks)');
