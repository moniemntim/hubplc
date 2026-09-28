import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
const out = 'outputs/editorial-review/pointer-batch21';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const reports = [];
try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [],
      network = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => {
      if (r.url().startsWith('http')) network.push(r.url());
    });
    await page.goto(
      pathToFileURL(resolve('public/examples/release-only/demo.html')).href,
    );
    const reset = () => page.locator('#reset').click();
    const rows = () => page.locator('#results').textContent().then(JSON.parse);
    const run = async (name) => {
      await reset();
      await page.locator(`[data-case="${name}"]`).click();
      return rows();
    };
    for (const [duration, kind] of [
      [799, 'ShortPress'],
      [800, 'LongPress'],
      [801, 'LongPress'],
    ]) {
      const r = await run(String(duration));
      assert.equal(r.length, 1);
      assert.equal(r[0].duration, duration);
      assert.equal(r[0].kind, kind);
    }
    for (const name of ['取消', '舊世代', '時間倒退'])
      assert.equal((await run(name)).length, 0);
    assert.equal((await run('第二 pointer'))[0].duration, 799);
    assert.equal((await run('延遲 callback'))[0].kind, 'ShortPress');
    assert.equal((await run('重複 release')).length, 1);
    await reset();
    for (let i = 0; i < 17; i++)
      await page.locator('[data-case="800"]').click();
    assert.equal((await rows()).length, 16);
    assert.match(await page.locator('#trace').textContent(), /CAPACITY/);
    await reset();
    await page.locator('#pad').scrollIntoViewIfNeeded();
    let b = await page.locator('#pad').boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(900);
    assert.equal((await rows()).length, 0);
    await page.mouse.up();
    assert.equal((await rows())[0].kind, 'LongPress');
    await reset();
    await page.locator('#pad').scrollIntoViewIfNeeded();
    b = await page.locator('#pad').boundingBox();
    await page.mouse.move(b.x + 10, b.y + 10);
    await page.mouse.down();
    await page.mouse.move(1, 1);
    await page.mouse.up();
    assert.equal((await rows()).length, 0);
    for (const event of ['blur', 'pointercancel', 'lostpointercapture']) {
      await reset();
      await page.locator('#pad').scrollIntoViewIfNeeded();
      b = await page.locator('#pad').boundingBox();
      await page.mouse.move(b.x + 10, b.y + 10);
      await page.mouse.down();
      await page.evaluate((type) => {
        if (type === 'blur') window.dispatchEvent(new Event('blur'));
        else
          document
            .getElementById('pad')
            .dispatchEvent(new PointerEvent(type, { pointerId: 1 }));
      }, event);
      await page.mouse.up();
      assert.equal((await rows()).length, 0, event);
    }
    await page.locator('#allowed').uncheck();
    await page.locator('[data-case="800"]').click();
    assert.equal((await rows()).length, 0);
    await page.locator('#allowed').check();
    await page.locator('#short').focus();
    await page.keyboard.press('Enter');
    await page.locator('#long').focus();
    await page.keyboard.press('Space');
    assert.deepEqual(
      (await rows()).map((x) => x.kind),
      ['ShortPress', 'LongPress'],
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    await page.screenshot({ path: `${out}/${width}.png`, fullPage: true });
    reports.push({ width, result: 'PASS', errors, network });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(`${out}/report.json`, JSON.stringify(reports, null, 2));
console.log('PASS: pointer fixture and native mouse, 3 widths; no network');
