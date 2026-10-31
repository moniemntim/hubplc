import assert from 'node:assert/strict';
import { chromium, expect } from 'playwright/test';
import { mockAdsense } from './adsense-mock.mjs';
import {
  energyIntentPresets,
  powerIntentPresets,
} from '../lib/tools/power-presets.ts';
import { tools } from '../lib/tools/registry.ts';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const powerAliases = Object.keys(powerIntentPresets);
const energyAliases = Object.keys(energyIntentPresets);
const aliases = [...powerAliases, ...energyAliases];

for (const slug of aliases) {
  const canonical = powerAliases.includes(slug)
    ? '/tool/ac-power-converter'
    : '/tool/energy-cost';
  const response = await fetch(
    `${base}/tool/${slug}?campaign=legacy&task=untrusted`,
    { redirect: 'manual' },
  );
  assert.equal(response.status, 308, `${slug} is permanently redirected`);
  const destination = new URL(response.headers.get('location'), base);
  assert.equal(
    destination.pathname,
    canonical,
    `${slug} canonical destination`,
  );
  assert.equal(destination.searchParams.get('task'), slug, `${slug} preset`);
  assert.equal(destination.searchParams.get('campaign'), 'legacy');
}

for (const canonical of ['/tool/ac-power-converter', '/tool/energy-cost']) {
  const response = await fetch(base + canonical);
  assert.equal(response.status, 200, `${canonical} is public`);
  const html = await response.text();
  assert.match(
    html,
    new RegExp(`href="https://hubplc\\.com${canonical}"`),
    `${canonical} has a query-free canonical tag`,
  );
}

const sitemap = await (await fetch(base + '/sitemap.xml')).text();
assert.equal(tools.length, 57, 'retired presets are not public tool cards');
for (const slug of aliases) {
  assert.equal(
    tools.some((tool) => tool.slug === slug),
    false,
    slug,
  );
  assert.equal(sitemap.includes(`/tool/${slug}`), false, `${slug} sitemap`);
}
for (const slug of ['ac-power-converter', 'energy-cost'])
  assert.ok(sitemap.includes(`https://hubplc.com/tool/${slug}`), slug);

const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await mockAdsense(page);
  await page.route('**/api/locale', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ locale: 'zh-Hant' }),
    }),
  );
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const result = () => page.getByRole('region', { name: '計算結果' });
  const textbox = (name) => page.getByRole('textbox', { name, exact: true });
  const choose = async (label, option) => {
    await page.getByRole('combobox', { name: label, exact: true }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
  };
  const expectUpsApparentPower = async () => {
    const text = await result().textContent();
    const match = text?.match(/視在功率\s*([\d,.]+)\s*VA/);
    assert.ok(match, 'the apparent-power VA row is present');
    const va = Number(match[1].replaceAll(',', ''));
    assert.ok(Math.abs(va - 800 / 0.6) < 1e-8, `UPS VA: ${va}`);
    assert.match(text, /實功率\s*800\s*W/);
  };

  assert.equal(
    (await page.goto(`${base}/tool/ac-power-converter`)).status(),
    200,
  );
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('combobox', { name: '換算方向' })).toHaveCount(1);
  await choose('換算方向', 'W／kW／MW → 安培');
  await choose('供電方式', '平衡三相交流');

  const acResults = [
    ['1,760 W', '2,200 VA'],
    ['18.9917851707', '12.5 kVA'],
    ['800 W'],
  ];
  for (const [index, expected] of acResults.entries()) {
    await page.locator('.worked-case').nth(index).getByRole('button').click();
    for (const value of expected) await expect(result()).toContainText(value);
    if (index === 2) await expectUpsApparentPower();
  }

  await textbox('實功率').fill('not-a-number');
  await expect(result()).toContainText('有效的十進位數字');
  await page.getByRole('button', { name: '清空', exact: true }).click();
  await page.getByRole('button', { name: '載入範例', exact: true }).click();
  await expectUpsApparentPower();

  for (const [task, expected, shouldHavePf] of [
    ['kw-to-amps', '18.9917851707', true],
    ['kva-to-amps', '15.1934281366', false],
    ['mva-to-amps', '52.4863881081', false],
    ['va-to-kva', '1 kVA', false],
  ]) {
    await page.goto(`${base}/tool/ac-power-converter?task=${task}`);
    await expect(result()).toContainText(expected);
    await expect(page.getByLabel('功率因數')).toHaveCount(shouldHavePf ? 1 : 0);
  }
  for (const task of ['unknown', '__proto__']) {
    await page.goto(`${base}/tool/ac-power-converter?task=${task}`);
    await expect(page.getByRole('combobox', { name: '換算方向' })).toHaveCount(
      1,
    );
    await expect(result()).toContainText('1,760 W');
  }

  await page.goto(`${base}/tool/energy-cost`);
  await expect(page.getByRole('combobox', { name: '計算方向' })).toHaveCount(1);
  const energyResults = [
    ['198 kWh', '633.6 元'],
    ['2,000 W', '30 元'],
  ];
  for (const [index, expected] of energyResults.entries()) {
    await page.locator('.worked-case').nth(index).getByRole('button').click();
    for (const value of expected) await expect(result()).toContainText(value);
  }
  for (const [task, expected] of [
    ['energy-consumption', '240 kWh'],
    ['kwh-to-kw', '2,000 W'],
    ['electricity-cost', '720 元'],
  ]) {
    await page.goto(`${base}/tool/energy-cost?task=${task}`);
    await expect(result()).toContainText(expected);
    await expect(textbox('每度電價')).toHaveCount(
      task === 'electricity-cost' ? 1 : 0,
    );
    if (task !== 'electricity-cost')
      await expect(result()).not.toContainText('估算電費');
  }
  await page.goto(`${base}/tool/energy-cost?task=energy-consumption`);
  await expect(textbox('每度電價')).toHaveCount(0);
  await choose('費率計算', '加入自訂單一費率');
  await textbox('每度電價').fill('not-a-number');
  await expect(result().locator('dd')).toHaveCount(0);
  await choose('費率計算', '只看功率與用電量');
  await expect(result()).toContainText('240 kWh');

  await page.goto(`${base}/tool`);
  const search = page.getByRole('searchbox', { name: '搜尋工具' });
  for (const [query, slug] of [
    ['千瓦轉安培', 'ac-power-converter'],
    ['amps', 'ac-power-converter'],
    ['電費', 'energy-cost'],
    ['electricity', 'energy-cost'],
  ]) {
    await search.fill(query);
    await expect(page.locator(`a[href="/tool/${slug}"]`)).toBeVisible();
  }

  await page.goto(`${base}/tool/ac-power-converter`);
  await page.waitForLoadState('networkidle');
  const english = page.getByRole('button', { name: 'EN', exact: true });
  await english.click();
  await expect(english).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('combobox', { name: 'Conversion direction' }),
  ).toHaveCount(1);
  await expect(
    page.getByRole('region', { name: 'Calculation results' }),
  ).toContainText('Real power');
  await expect(
    page.getByRole('button', { name: 'Load this case' }),
  ).toHaveCount(3);
  const visibleCaseText = await page
    .locator('.worked-case h3, .worked-case-load')
    .allTextContents();
  assert.ok(visibleCaseText.every((text) => !/[\u3400-\u9fff]/.test(text)));

  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
      `AC cases fit ${width}px`,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: consolidated power and energy tools, redirects, cases, and search',
  );
} finally {
  await browser.close();
}
