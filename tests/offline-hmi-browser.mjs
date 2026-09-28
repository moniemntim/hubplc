import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, copyFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const directory = await mkdtemp(join(tmpdir(), 'hubplc-offline-hmi-download-'));
await copyFile(
  'public/examples/offline-hmi/demo.html',
  join(directory, 'demo.html'),
);
const output = 'outputs/editorial-review/offline-hmi-batch9';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const cases = [
  ['ready', true, true, '1000 ms', '52.0 °C', '所有教材條件通過'],
  ['offline', false, false, '11000 ms', '52.0 °C', '離線，無法提交'],
  ['syncing', false, false, '1000 ms', '52.0 °C', '快照不屬於現行世代'],
  ['expired', true, false, '5000 ms', '52.0 °C', '已達 5000 ms'],
  ['uncertain', true, false, '1000 ms', '52.0 °C', '來源品質不是 Good'],
  ['denied', true, false, '1000 ms', '52.0 °C', '有效寫入權限'],
  ['unknown', true, false, '1000 ms', '52.0 °C', '前一筆命令結果未知'],
  ['clock', true, false, '未知', '52.0 °C', '本機收件經過未知'],
  ['source', true, false, '1000 ms', '52.0 °C', '來源新鮮度尚未確認'],
  ['missing', true, false, '未知', '—', '不能以零補值'],
];
const results = [];
try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } });
    const errors = [];
    const network = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (request) => {
      if (/^https?:/.test(request.url())) network.push(request.url());
    });
    await page.goto(pathToFileURL(resolve(directory, 'demo.html')).href);
    for (const [name, query, write, age, value, reason] of cases) {
      await page.locator('#scenario').selectOption(name);
      assert.equal(await page.locator('#query').isEnabled(), query, name);
      assert.equal(await page.locator('#write').isEnabled(), write, name);
      assert.equal(await page.locator('#age').textContent(), age, name);
      assert.equal(await page.locator('#value').textContent(), value, name);
      assert.ok(
        (await page.locator('#reasons').textContent()).includes(reason),
        name,
      );
      assert.equal(await page.locator('#local').isEnabled(), true);
      const dimensions = await page.evaluate(() => ({
        screen: innerWidth,
        body: document.documentElement.scrollWidth,
      }));
      assert.ok(dimensions.body <= dimensions.screen, name);
      results.push({ width, name, query, write, age, value });
    }
    await page.locator('#scenario').selectOption('ready');
    await page.locator('#write').click();
    assert.match(await page.locator('#feedback').textContent(), /接受 1 次/);
    assert.deepEqual(
      await page.evaluate(() => [
        decide({ ...baseline, nowMs: 5999 }).writeEnabled,
        decide({ ...baseline, nowMs: 6000 }).writeEnabled,
      ]),
      [true, false],
    );
    await page.locator('#scenario').selectOption('offline');
    await page.locator('#local').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#history').isVisible(), true);
    assert.equal(
      await page.locator('#local').getAttribute('aria-expanded'),
      'true',
    );
    await page.evaluate(() => {
      document.getElementById('write').disabled = false;
    });
    await page.locator('#write').click();
    assert.match(
      await page.locator('#feedback').textContent(),
      /被本頁條件拒絕/,
    );
    await page.locator('#scenario').selectOption('offline');
    if (width === 320)
      await page.screenshot({
        path: `${output}/offline-320.png`,
        fullPage: true,
      });
    await page.locator('#scenario').selectOption('ready');
    if (width === 1440)
      await page.screenshot({
        path: `${output}/ready-1440.png`,
        fullPage: true,
      });
    assert.deepEqual(errors, []);
    assert.deepEqual(
      network,
      [],
      'downloaded single file must need no HTTP resources',
    );
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  `${output}/report.json`,
  JSON.stringify({ directory, results }, null, 2),
);
console.log(
  'PASS: 30 scenario/viewport checks; keyboard cache toggle, action recheck, 4999/5000 boundary; no HTTP requests',
);
