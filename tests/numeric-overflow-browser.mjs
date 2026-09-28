import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
await mkdir('outputs/editorial-review/numeric-overflow', { recursive: true });
try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(
      pathToFileURL(resolve('public/examples/numeric-overflow/demo.html')).href,
    );
    const text = (id) => page.locator(id).innerText();
    assert.equal(await text('#parsed'), '10000');
    assert.match(await text('#layout'), /^LAYOUT_OVERFLOW/);
    await page.locator('#width').selectOption('200');
    assert.match(await text('#layout'), /^LAYOUT_OK/);
    assert.equal(await text('#full'), '10000');
    for (const [raw, status, parsed] of [
      ['32767', 'OK', '32767'],
      ['32768', 'OUT_OF_INT16_RANGE', 'null'],
      ['-32768', 'OK', '-32768'],
      ['-32769', 'OUT_OF_INT16_RANGE', 'null'],
      ['', 'INVALID_FORMAT', 'null'],
      ['12.3', 'INVALID_FORMAT', 'null'],
      ['1e3', 'INVALID_FORMAT', 'null'],
      ['12°C', 'INVALID_FORMAT', 'null'],
      [' 12', 'INVALID_FORMAT', 'null'],
      ['+12', 'INVALID_FORMAT', 'null'],
      ['01', 'INVALID_FORMAT', 'null'],
      ['-0', 'OK', '0'],
      ['-1000', 'OK', '-1000'],
    ]) {
      await page.locator('#raw').fill(raw);
      assert.equal(await text('#data'), status);
      assert.equal(await text('#parsed'), parsed);
      assert.equal(await text('#raw-out'), JSON.stringify(raw));
      if (parsed === 'null') {
        assert.equal(await text('#full'), '—');
        assert.match(await text('#layout'), /^NOT_APPLICABLE/);
      }
    }
    await page.locator('#raw').evaluate((el) => {
      el.value = '123456789';
      el.dispatchEvent(new Event('input'));
    });
    assert.equal(await text('#data'), 'INPUT_TOO_LONG');
    await page.locator('#reset').click();
    assert.equal(await text('#parsed'), '10000');
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    await page.screenshot({
      path: `outputs/editorial-review/numeric-overflow/${width}.png`,
      fullPage: true,
    });
    await page.close();
  }
  console.log(
    'PASS numeric overflow: boundaries, format, independent layout, 3 widths',
  );
} finally {
  await browser.close();
}
