import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const output =
  process.env.LAYOUT_OUTPUT ?? 'outputs/editorial-review/power-batch30';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const cases = [
  {
    slug: '24vdc-sensor-power-voltage-drop',
    button: '載入接點劣化',
    expected: '不足 0.037 V',
  },
  {
    slug: '24vdc-oring-redundancy-capacity-overload',
    button: '載入可繼續驗證',
    expected: '容量與穩態電壓通過',
  },
  {
    slug: '24vdc-field-box-pluggable-power-integrity-hot-swap',
    button: '載入無法充電',
    expected: '無法到達目標',
  },
  {
    slug: '24vdc-ups-branch-event-correlation',
    button: '載入可排序案例',
    expected: '事件 B 較晚',
  },
];
const reports = [];
try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } });
    await mockAdsense(page);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const item of cases) {
      const response = await page.goto(`${base}/articles/${item.slug}`);
      assert.equal(response.status(), 200);
      const lesson = page.locator('#power-practice');
      await lesson.getByRole('button', { name: item.button }).click();
      await lesson
        .getByTestId('power-result')
        .filter({ hasText: item.expected })
        .waitFor();
      assert.ok((await lesson.textContent()).includes(item.expected));
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      reports.push({ width, slug: item.slug, pass: true });
    }
    await page.goto(`${base}/articles/24vdc-sensor-power-voltage-drop`);
    const lesson = page.locator('#power-practice');
    await lesson.getByLabel('支路電流（A）').fill('-1');
    await lesson.getByRole('alert').waitFor();
    assert.equal(await lesson.getByTestId('power-result').count(), 0);
    await lesson.getByRole('button', { name: '載入文章案例' }).focus();
    await page.keyboard.press('Enter');
    await lesson
      .getByTestId('power-result')
      .filter({ hasText: '23.892 V' })
      .waitFor();
    assert.deepEqual(errors, []);
    await lesson.screenshot({ path: `${output}/${width}.png` });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
console.log(
  'PASS 12 power lesson cases plus invalid input and keyboard recovery',
);
