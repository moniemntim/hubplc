import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const folder = await mkdtemp(join(tmpdir(), 'hubplc-alert-dialog-'));
const output = 'outputs/editorial-review/dialog-browser';
await copyFile(
  'public/examples/alert-dialog/demo.html',
  join(folder, 'demo.html'),
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});

try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    const network = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (/^https?:/.test(request.url())) network.push(request.url());
    });
    await page.goto(pathToFileURL(resolve(folder, 'demo.html')).href);
    await page.locator('#draft').focus();
    await page.evaluate(() => window.alertDialogDemo.injectAfter(20));
    await page.waitForFunction(() =>
      document.querySelector('#alert-summary').textContent.includes('1 筆'),
    );
    assert.equal(await page.evaluate(() => document.activeElement.id), 'draft');
    await page.evaluate(() => window.alertDialogDemo.injectAfter(40));
    await page.evaluate(() => window.alertDialogDemo.reset());
    await page.waitForTimeout(60);
    assert.match(await page.locator('#alert-summary').innerText(), /0 筆/);
    await page.locator('#inject-after').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'draft');
    await page.waitForFunction(() =>
      document.querySelector('#alert-summary').textContent.includes('1 筆'),
    );
    assert.equal(await page.evaluate(() => document.activeElement.id), 'draft');

    await page.locator('#request-delete').click();
    assert.equal(
      await page.locator('#delete-dialog').evaluate((node) => node.open),
      true,
    );
    assert.equal(
      await page.locator('#background').evaluate((node) => node.inert),
      true,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.equal(
      await page.locator('#confirm-delete').evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return (
          rect.left >= 0 &&
          rect.right <= innerWidth &&
          rect.bottom <= innerHeight
        );
      }),
      true,
    );
    await page.screenshot({
      path: `${output}/modal-${width}.png`,
      fullPage: true,
    });
    await page.evaluate(() =>
      document.getElementById('request-delete').click(),
    );
    assert.equal(await page.locator('#delete-dialog').count(), 1);
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      'cancel-delete',
    );
    await page.locator('#draft').evaluate((node) => node.focus());
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      'cancel-delete',
    );
    await page.locator('#cancel-delete').press('Shift+Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      'inject-dialog',
    );
    await page.locator('#inject-dialog').press('Shift+Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      'confirm-delete',
    );
    await page.locator('#confirm-delete').press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      'inject-dialog',
    );
    await page.locator('#inject-dialog').click();
    assert.match(await page.locator('#dialog-alert').innerText(), /2 筆/);
    assert.equal(await page.locator('#delete-dialog').count(), 1);
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () => !document.getElementById('delete-dialog').open,
    );
    await page.waitForFunction(
      () => !document.getElementById('background').inert,
    );
    assert.equal(
      await page.locator('#delete-dialog').evaluate((node) => node.open),
      false,
    );
    assert.equal(
      await page.locator('#background').evaluate((node) => node.inert),
      false,
    );
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      'request-delete',
    );
    assert.equal(
      await page.locator('#draft').inputValue(),
      'Batch 7 local draft',
    );

    await page.locator('#request-delete').click();
    await page.locator('#cancel-delete').click();
    await page.waitForFunction(
      () => !document.getElementById('delete-dialog').open,
    );
    await page.waitForFunction(
      () => !document.getElementById('background').inert,
    );
    assert.equal(
      await page.locator('#draft').inputValue(),
      'Batch 7 local draft',
    );
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      'request-delete',
    );
    await page.locator('#request-delete').click();
    await page.locator('#confirm-delete').click();
    assert.equal(await page.locator('#draft').inputValue(), '');
    assert.match(
      await page.locator('#result').innerText(),
      /Ack=未確認；Reset=0/,
    );
    assert.match(
      await page.locator('#control-state').innerText(),
      /Ack=未確認；Reset=0/,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(
  'PASS: Edge keyboard focus loop, Escape, inert background, alert updates, local-only delete, and 320/768/1440 layout',
);
