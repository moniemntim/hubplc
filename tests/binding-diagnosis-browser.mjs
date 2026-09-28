import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
const results = [];
await mkdir('outputs/editorial-review/binding-diagnosis', { recursive: true });
try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      pathToFileURL(resolve('public/examples/binding-diagnosis/demo.html'))
        .href,
    );
    const text = (id) => page.locator(id).innerText();
    assert.match(await text('#source'), /^25$/);
    assert.match(await text('#condition'), /flow>25=false/);
    assert.equal(await text('#result'), '條件 false；LED LOW');
    await page.getByRole('button', { name: '下一筆固定 sourceFlow' }).click();
    assert.match(await text('#source'), /^26$/);
    assert.match(await text('#condition'), /→ true$/);
    assert.equal(await text('#result'), 'LED HIGH 可見');
    await page.getByRole('button', { name: '下一筆固定 sourceFlow' }).click();
    await page.getByLabel('資料型別').selectOption('string27');
    assert.match(await text('#type'), /string rejected; no auto-cast/);
    assert.equal(await text('#result'), '條件 false；LED LOW');
    await page.getByRole('button', { name: 'Reset 固定演練' }).click();
    await page.getByRole('button', { name: '下一筆固定 sourceFlow' }).click();
    await page.getByLabel('品質').selectOption('Bad');
    assert.match(await text('#condition'), /good=false/);
    await page.getByLabel('品質').selectOption('Good');
    await page.getByLabel('模式').selectOption('Manual');
    assert.match(await text('#condition'), /auto=false/);
    await page.getByLabel('模式').selectOption('Auto');
    await page.getByLabel('enable').uncheck();
    assert.match(await text('#condition'), /enable=false/);
    await page.getByLabel('enable').check();
    for (const [fault, diagnosis] of [
      ['wrongTarget', /numberText/],
      ['styleMissing', /binding-high/],
      ['parentHidden', /parent hidden/],
      ['opaqueOverlay', /opaque overlay/],
    ]) {
      await page.getByLabel('單一綁定故障').selectOption(fault);
      assert.match(await text('#result'), /條件 true，但 binding\/render 故障/);
      assert.match(
        await text(
          fault === 'parentHidden' || fault === 'opaqueOverlay'
            ? '#visible'
            : fault === 'wrongTarget'
              ? '#target'
              : '#class',
        ),
        diagnosis,
      );
      if (fault === 'wrongTarget')
        assert.equal(await page.locator('#led').innerText(), 'LOW');
      if (fault === 'styleMissing')
        assert.equal(
          await page
            .locator('#led')
            .evaluate((item) => item.classList.contains('high')),
          false,
        );
      if (fault === 'parentHidden')
        assert.equal(await page.locator('#parent').isVisible(), false);
      if (fault === 'opaqueOverlay')
        assert.equal(await page.locator('#overlay').isVisible(), true);
    }
    await page.getByRole('button', { name: 'Reset 固定演練' }).click();
    assert.equal(await text('#result'), '條件 false；LED LOW');
    assert.equal(await page.locator('#overlay').isVisible(), false);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    await page.screenshot({
      path: 'outputs/editorial-review/binding-diagnosis/' + width + '.png',
      fullPage: true,
    });
    results.push({ width, passed: true });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  'outputs/editorial-review/binding-diagnosis/report.json',
  JSON.stringify(results, null, 2),
);
console.log('PASS: 8 scenarios at 3 widths (24 browser checks)');
