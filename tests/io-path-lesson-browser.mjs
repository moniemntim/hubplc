import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const output =
  process.env.LAYOUT_OUTPUT ?? 'outputs/editorial-review/io-path-batch31';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const cases = [
  {
    slug: '0-10v-analog-load-ground-response-open-circuit',
    button: '載入 10 kΩ 輸入',
    expected: '超出 0–10 V',
  },
  {
    slug: '24v-high-low-side-bjt-mosfet-switching',
    button: '載入二極體箝位',
    expected: '28.571',
  },
  {
    slug: '24v-input-reverse-polarity-tvs-surge-protection',
    button: '載入可繼續驗證',
    expected: '三項通過，仍須波形驗證',
  },
  {
    slug: 'actuator-output-end-to-end',
    button: '載入電氣層成立',
    expected: '電氣層初步成立',
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
      const lesson = page.locator('#io-path-practice');
      await lesson.getByRole('button', { name: item.button }).click();
      await lesson
        .getByTestId('io-path-result')
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
    await page.goto(
      `${base}/articles/0-10v-analog-load-ground-response-open-circuit`,
    );
    const lesson = page.locator('#io-path-practice');
    await lesson.getByLabel('PLC 輸入阻抗（Ω）').fill('0');
    await lesson.getByRole('alert').waitFor();
    assert.equal(await lesson.getByTestId('io-path-result').count(), 0);
    await lesson.getByRole('button', { name: '載入 1 MΩ 輸入' }).focus();
    await page.keyboard.press('Enter');
    await lesson
      .getByTestId('io-path-result')
      .filter({ hasText: '10.199' })
      .waitFor();
    assert.deepEqual(errors, []);
    await lesson.screenshot({ path: `${output}/${width}.png` });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
console.log('PASS 12 I/O path cases plus invalid input and keyboard recovery');
