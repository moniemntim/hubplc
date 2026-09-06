import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { tools } from '../lib/tools/registry.ts';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {}),
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
const checks = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
const output = page.getByRole('region', { name: '計算結果' });
async function open(slug) {
  const response = await page.goto(`${base}/tool/${slug}`);
  assert.equal(response.status(), 200);
  await page.waitForLoadState('networkidle');
}
async function choose(label, option) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
try {
  await mkdir('outputs/circuit-qa', { recursive: true });
  for (const tool of tools.filter((tool) => tool.category === '電路')) {
    console.log('Checking', tool.slug);
    await open(tool.slug);
    assert.ok(
      await output.locator('dd').count(),
      `default result ${tool.slug}`,
    );
    assert.ok(
      await page.locator('.tool-diagram svg').count(),
      `diagram ${tool.slug}`,
    );
    const inputFields = page.locator('.calculator-inputs .tool-field');
    let focusChecks = 0;
    for (const field of await inputFields.all()) {
      const name = await field.getAttribute('data-field');
      const part = page.locator('[data-diagram-field]');
      const match = part.and(
        page.locator(`[data-diagram-field=${JSON.stringify(name)}]`),
      );
      if (await match.count()) {
        const control = field.locator('input, button[role="combobox"]').first();
        if (await control.count()) {
          await control.focus();
          await expect(match.first()).toHaveAttribute('data-focused', 'true');
          focusChecks++;
        }
      }
    }
    assert.ok(focusChecks, `focus linkage ${tool.slug}`);
    const quantity = page.locator('.quantity-field').first();
    if (await quantity.count()) {
      const before = await output.innerText();
      const selector = quantity.getByRole('combobox');
      await selector.click();
      const current = await selector.innerText();
      const options = page.getByRole('option');
      await options.first().waitFor({ state: 'visible' });
      for (const option of await options.all()) {
        if ((await option.innerText()).trim() !== current.trim()) {
          await option.click();
          break;
        }
      }
      assert.equal(
        await output.innerText(),
        before,
        `unit switch preserves SI ${tool.slug}`,
      );
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    const first = page
      .getByRole('region', { name: '輸入條件' })
      .getByRole('textbox')
      .first();
    if (await first.count()) {
      await first.fill('invalid');
      await expect(output.locator('dd')).toHaveCount(0);
      assert.doesNotMatch(
        await page.locator('.tool-diagram').innerText(),
        /NaN|Infinity/,
      );
    }
    await page.getByRole('button', { name: '清空', exact: true }).click();
    await expect(output.locator('dd')).toHaveCount(0);
    await page.getByRole('button', { name: '載入範例', exact: true }).click();
    assert.ok(
      await output.locator('dd').count(),
      `example recovery ${tool.slug}`,
    );
    checks.push(
      `${tool.slug}: default, SVG, ${focusChecks} focus bindings, units, invalid, clear, example`,
    );
  }
  await open('voltage-divider');
  await choose('R1 單位', 'Ω');
  await page.getByRole('textbox', { name: 'R1', exact: true }).fill('20000');
  await expect(output).toContainText('8 V');
  await expect(page.locator('.tool-diagram')).toContainText('8 V');
  await choose('計算方式', '反算 R2');
  await page.getByRole('textbox', { name: '目標 Vout', exact: true }).fill('');
  await expect(output.locator('dd')).toHaveCount(0);
  assert.doesNotMatch(
    await page.locator('.tool-diagram').innerText(),
    /20,000|12 V|24 V/,
  );
  checks.push('divider: live values and inverse invalid annotations');
  for (const slug of [
    'resistor-network',
    'capacitor-network',
    'current-divider',
  ]) {
    await open(slug);
    const add = page.getByRole('button', { name: /新增/ }).first();
    while (await add.isEnabled()) await add.click();
    await expect(
      page
        .locator('.quantity-field')
        .filter({ has: page.getByRole('textbox', { name: /^[RC]\d+$/ }) }),
    ).toHaveCount(20);
    assert.ok(
      await page
        .locator('[data-diagram-field="R20"], [data-diagram-field="C20"]')
        .count(),
      `${slug} draws twentieth component`,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `${slug} 20 mobile`,
    );
    await page.screenshot({
      path: `outputs/circuit-qa/${slug}-20-mobile.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    checks.push(`${slug}: 20 components visible and mobile containment`);
  }
  await open('resistor-color');
  await page.getByRole('combobox', { name: '有效數字 1', exact: true }).click();
  await page.screenshot({
    path: 'outputs/circuit-qa/color-options-desktop.png',
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await open('rc-filter');
  await page.screenshot({
    path: 'outputs/circuit-qa/filter-desktop.png',
    fullPage: true,
  });
  await choose('濾波器', '高通');
  await choose('計算', '由 fc、C 反推 R');
  await expect(output).toContainText('10,000');
  await page
    .getByRole('textbox', { name: '目標截止頻率', exact: true })
    .fill('');
  await expect(output.locator('dd')).toHaveCount(0);
  await open('reactance');
  await choose('計算', '反推元件值');
  await expect(output).toContainText('1e-7');
  await choose('元件', '電感（感抗）');
  await expect(output).toContainText('+j');
  await open('smd-resistor');
  for (const [format, code, value] of [
    ['三位數（472）', '472', '4,700'],
    ['四位數（1001）', '1001', '1,000'],
    ['R 小數點（4R7）', '4R7', '4.7'],
    ['EIA-96（01Y）', '10C', '12,400'],
  ]) {
    await choose('標記格式', format);
    await page
      .getByRole('textbox', { name: 'SMD 電阻代碼', exact: true })
      .fill(code);
    await expect(output).toContainText(value);
  }
  await open('smd-capacitor');
  await page
    .getByRole('textbox', { name: 'SMD 電容代碼', exact: true })
    .fill('104K');
  await expect(output).toContainText('±10%');
  await choose('轉換方向', '電容量轉代碼');
  await page.getByRole('textbox', { name: '電容量', exact: true }).fill('1');
  await expect(output).toContainText('102');
  await open('shunt-resistor');
  await choose('計算方式', '額定值與實測壓降');
  await page
    .getByRole('textbox', { name: '實測壓降', exact: true })
    .fill('37.5');
  await expect(output).toContainText('50 A');
  await page.getByRole('textbox', { name: '實測壓降', exact: true }).fill('0');
  await expect(output).toContainText('0 A');
  await open('lc-resonance');
  await choose('已知量', 'L 與頻率求 C');
  await page.getByRole('textbox', { name: 'L', exact: true }).fill('.01');
  await page
    .getByRole('textbox', { name: 'f0', exact: true })
    .fill('5032.921210448704');
  await expect(output).toContainText('1e-7');
  await choose('已知量', 'C 與頻率求 L');
  await page.getByRole('textbox', { name: 'C', exact: true }).fill('1e-7');
  await expect(output).toContainText('0.01 H');
  await open('555-timer');
  await choose('計算', '反算電阻');
  assert.ok(await output.locator('dd').count());
  await page
    .getByRole('textbox', { name: '目標占空比', exact: true })
    .fill('50');
  await expect(output.locator('dd')).toHaveCount(0);
  await choose('模式', '單穩態');
  assert.ok(await output.locator('dd').count());
  await open('resistor-color');
  await choose('色環數', '五色環');
  await expect(page.locator('.resistor-band')).toHaveCount(5);
  await choose('轉換方式', '阻值轉色環');
  await page.getByRole('textbox', { name: '阻值', exact: true }).fill('4.7');
  await expect(output).toContainText('4,700');
  await open('electrical');
  await choose('電路類型', '交流');
  await choose('系統', '平衡三相');
  await choose('已知量', '電流 A');
  await page.getByRole('textbox', { name: '線電壓', exact: true }).fill('400');
  await page.getByRole('textbox', { name: '電流', exact: true }).fill('10');
  await expect(page.locator('.tool-diagram')).toContainText('L3');
  await expect(output).toContainText('5,542.562');
  checks.push(
    'SMD all formats/reverse, shunt zero, RC/reactance/LC inverses, 555 boundary, five-band reverse, three-phase AC',
  );
  assert.deepEqual(errors, [], 'browser errors');
  await writeFile(
    'outputs/circuit-qa/report.json',
    JSON.stringify({ base, checks, errors }, null, 2),
  );
  console.log(
    `PASS: ${checks.length} interactive circuit scenarios; no browser errors.`,
  );
} finally {
  await browser.close();
}
