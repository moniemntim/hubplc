import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  initialReset,
  resetScan,
} from '../public/examples/fault-reset/reset-model.mjs';
import { mockAdsense } from './adsense-mock.mjs';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const output =
  process.env.LAYOUT_OUTPUT ?? 'outputs/editorial-review/reset-remediation';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const reports = [];
try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    await mockAdsense(page);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/articles/plc-fault-reset-single-acceptance');
    const practice = page.locator('#practice');
    await practice
      .getByRole('button', { name: '執行 1 掃描', exact: true })
      .click();
    assert.match(await practice.locator('output').textContent(), /接受 0 次/);
    await practice.getByLabel('復歸按鈕按住').uncheck();
    await practice
      .getByRole('button', { name: '執行 1 掃描', exact: true })
      .click();
    await practice.getByLabel('復歸按鈕按住').check();
    await practice
      .getByRole('button', { name: '執行 1 掃描', exact: true })
      .click();
    assert.match(
      await practice.locator('output').textContent(),
      /pulse=1 · 接受 1 次/,
    );
    await practice.getByRole('button', { name: '維持輸入 10 掃描' }).click();
    assert.match(
      await practice.locator('output').textContent(),
      /pulse=0 · 接受 1 次/,
    );
    await practice.getByRole('button', { name: '載入正文 11 步案例' }).click();
    const rows = await practice.locator('tbody tr').allTextContents();
    assert.equal(rows.length, 11);
    const numeric = await practice.locator('tbody tr').evaluateAll((rows) =>
      rows.map((r) =>
        Array.from(r.querySelectorAll('td'))
          .slice(0, 8)
          .map((x) => Number(x.textContent)),
      ),
    );
    let state = initialReset();
    const expected = [
      [1, 1, 0],
      [1, 0, 0],
      [1, 1, 1],
      [1, 1, 0],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 0],
      [0, 0, 1],
      [1, 1, 0],
      [1, 0, 0],
      [1, 1, 0],
    ].map(([v, b, c], i) => {
      state = resetScan(state, { valid: !!v, button: !!b, cause: !!c });
      return [
        i + 1,
        v,
        b,
        c,
        +state.fault,
        +state.armed,
        +state.pulse,
        state.accepted,
      ];
    });
    assert.deepEqual(numeric, expected);
    for (let i = 0; i < 9; i++)
      await practice.getByRole('button', { name: '維持輸入 10 掃描' }).click();
    assert.equal(await practice.locator('tbody tr').count(), 100);
    assert.equal(
      await practice
        .getByRole('button', { name: '執行 1 掃描', exact: true })
        .isDisabled(),
      true,
    );
    await practice.getByRole('button', { name: '重新開始' }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await practice.locator('tbody tr').count(), 0);
    assert.match(
      await practice.locator('output').textContent(),
      /fault=1 · armed=0 · pulse=0 · 接受 0 次/,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    await practice.screenshot({ path: `${output}/${width}.png` });
    reports.push({ width, pass: true });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
console.log(
  'PASS: reset UI and 11-row parity, 100-row limit, keyboard restart at three widths',
);
