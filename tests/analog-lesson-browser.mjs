import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { mockAdsense } from './adsense-mock.mjs';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const output =
  process.env.LAYOUT_OUTPUT ?? 'outputs/editorial-review/analog-remediation';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const reports = [];
try {
  for (const width of [320, 768, 1440])
    for (const slug of [
      'plc-analog-scaling-pressure-temperature-level',
      '4-20ma-scaling-open-overrange-diagnostics',
    ]) {
      const page = await browser.newPage({ viewport: { width, height: 960 } });
      await mockAdsense(page);
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${base}/articles/${slug}`);
      const ui = page.locator('#analog-practice');
      await ui.getByRole('button', { name: '載入壓力 0–10 bar' }).click();
      for (const [input, calc, usable] of [
        ['4', '0 bar', '0 bar'],
        ['12', '5 bar', '5 bar'],
        ['20', '10 bar', '10 bar'],
        ['3.2', '-0.5 bar', '未提供'],
        ['0', '-2.5 bar', '未提供'],
        ['22', '11.25 bar', '未提供'],
      ]) {
        await ui.getByLabel('輸入值', { exact: true }).fill(input);
        assert.equal(await ui.getByTestId('calculated').textContent(), calc);
        assert.equal(await ui.getByTestId('usable').textContent(), usable);
      }
      await ui.getByLabel('輸入值', { exact: true }).fill('12');
      for (const quality of ['bad', 'unknown']) {
        await ui.getByLabel('來源品質').selectOption(quality);
        assert.equal(await ui.getByTestId('calculated').textContent(), '5 bar');
        assert.equal(await ui.getByTestId('usable').textContent(), '未提供');
      }
      await ui
        .getByRole('button', { name: '載入原始值 0–4000 counts' })
        .click();
      assert.equal(await ui.getByLabel('輸入單位').inputValue(), 'counts');
      assert.equal(await ui.getByTestId('usable').textContent(), '5 bar');
      await ui.getByLabel('輸入值', { exact: true }).fill('1000');
      assert.equal(await ui.getByTestId('calculated').textContent(), '2.5 bar');
      await ui.getByRole('button', { name: '載入溫度 −50–150 °C' }).click();
      assert.equal(await ui.getByTestId('usable').textContent(), '50 °C');
      await ui.getByRole('button', { name: '載入液位 0–6 m' }).click();
      assert.equal(await ui.getByTestId('usable').textContent(), '3 m');
      await ui.getByLabel('輸入值', { exact: true }).fill('');
      assert.match(await ui.getByRole('alert').textContent(), /請填寫/);
      assert.equal(await ui.getByTestId('usable').count(), 0);
      await ui.getByLabel('輸入值', { exact: true }).fill('12');
      await ui.getByLabel('輸入上限').fill('4');
      assert.match(await ui.getByRole('alert').textContent(), /上限必須/);
      await ui.getByRole('button', { name: '載入壓力 0–10 bar' }).click();
      await ui.getByLabel('工程上限').fill('0');
      assert.match(await ui.getByRole('alert').textContent(), /上限必須/);
      await ui.getByRole('button', { name: '載入壓力 0–10 bar' }).focus();
      await page.keyboard.press('Enter');
      assert.equal(await ui.getByTestId('usable').textContent(), '5 bar');
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.deepEqual(errors, []);
      await ui.screenshot({ path: `${output}/${slug}-${width}.png` });
      reports.push({ slug, width, pass: true });
      await page.close();
    }
} finally {
  await browser.close();
}
await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
console.log(
  'PASS: both analog lessons at 3 widths; presets, quality, out-of-range, input errors and keyboard recovery',
);
