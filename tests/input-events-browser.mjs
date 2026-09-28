import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const folder = await mkdtemp(join(tmpdir(), 'hubplc-input-events-'));
const output = 'outputs/editorial-review/input-events-browser';
await copyFile(
  'public/examples/input-events/demo.html',
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
    const longAscii = 'A'.repeat(120);
    await page.locator('#draft').fill(longAscii);
    await page.locator('#submit').click();
    assert.match(
      await page.locator('#snapshot').innerText(),
      new RegExp(longAscii),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.locator('#reset').click();
    await page.locator('#draft').fill('組字草稿');
    await page.locator('#submit').click();
    assert.match(await page.locator('#snapshot').innerText(), /OP-01:組字草稿/);
    await page.locator('#draft').fill('新草稿');
    await page.locator('#submit').click();
    assert.match(await page.locator('#status').innerText(), /requestCount=1/);
    assert.match(await page.locator('#snapshot').innerText(), /OP-01:組字草稿/);
    assert.match(await page.locator('#log').innerText(), /DUPLICATE_PENDING/);
    await page.locator('#complete').click();
    assert.equal(await page.locator('#draft').inputValue(), '新草稿');
    await page.locator('#draft').press('Enter');
    assert.match(await page.locator('#snapshot').innerText(), /OP-02:新草稿/);
    await page.locator('#reset').click();
    await page.locator('#draft').focus();
    const repeatPrevented = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        repeat: true,
        bubbles: true,
        cancelable: true,
      });
      document.getElementById('draft').dispatchEvent(event);
      return event.defaultPrevented;
    });
    assert.equal(repeatPrevented, true);
    assert.match(await page.locator('#status').innerText(), /requestCount=0/);
    await page.locator('#test-compose-start').click();
    await page.locator('#draft').press('Enter');
    assert.match(await page.locator('#status').innerText(), /requestCount=0/);
    await page.locator('#test-compose-end').click();
    await page.locator('#draft').press('Enter');
    assert.match(await page.locator('#status').innerText(), /requestCount=1/);
    await page.locator('#reset').click();
    await page.locator('#draft').fill('focusout 保留');
    await page.locator('#submit').focus();
    assert.equal(await page.locator('#draft').inputValue(), 'focusout 保留');
    assert.match(
      await page.locator('#log').innerText(),
      /FOCUSOUT_DRAFT_RETAINED/,
    );
    await page.locator('#test-pointerup').click();
    assert.match(await page.locator('#status').innerText(), /requestCount=0/);
    await page.locator('#submit').click();
    assert.match(await page.locator('#status').innerText(), /requestCount=1/);
    await page.locator('#cancel-draft').click();
    assert.match(await page.locator('#result').innerText(), /不能由本頁撤回/);
    await page.locator('#reset').click();
    await page.locator('#draft').fill('只在本機取消');
    await page.locator('#cancel-draft').click();
    assert.equal(await page.locator('#draft').inputValue(), '');
    assert.match(
      await page.locator('#result').innerText(),
      /只清除未送出的本機草稿/,
    );
    await page.locator('#reset').click();
    await page.evaluate(() => {
      const form = document.getElementById('command-form');
      const input = document.getElementById('draft');
      const complete = document.getElementById('complete');
      for (let index = 0; index < 16; index += 1) {
        input.value = `D${index}`;
        form.requestSubmit();
        complete.click();
      }
      input.value = 'overflow';
      form.requestSubmit();
    });
    assert.match(
      await page.locator('#counts').innerText(),
      /ops=16\/16；log=16\/16/,
    );
    assert.match(await page.locator('#log').innerText(), /OP_LIMIT_REJECTED/);
    assert.match(await page.locator('#result').innerText(), /本次未送出/);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: `${output}/input-events-${width}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(
  'PASS: Edge submit, Enter, synthetic composition, repeat, focusout, pointerup, Pending, bounds, and 320/768/1440 layout',
);
