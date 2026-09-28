import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(join(tmpdir(), 'hubplc-loading-'));
const out = 'outputs/editorial-review/loading-states-browser';
await copyFile(
  'public/examples/loading-states/demo.html',
  join(dir, 'demo.html'),
);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
try {
  for (const width of [320, 768, 1440]) {
    const p = await browser.newPage({ viewport: { width, height: 900 } }),
      errors = [],
      network = [];
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('request', (r) => {
      if (/^https?:/.test(r.url())) network.push(r.url());
    });
    await p.goto(pathToFileURL(resolve(dir, 'demo.html')).href);
    await p.locator('#start-a').click();
    await p.locator('#a-page1').click();
    await p.locator('#start-b').click();
    assert.match(
      await p.locator('#view').innerText(),
      /query=B.*rows=|query=B/,
    );
    assert.equal(await p.locator('#rows li').count(), 0);
    await p.locator('#b-page1').click();
    await p.locator('#a-late').click();
    assert.match(await p.locator('#diag').innerText(), /STALE_REJECTED/);
    await p.locator('#b-page2').click();
    assert.match(await p.locator('#view').innerText(), /status=complete/);
    await p.locator('#dup').click();
    await p.locator('#conflict').click();
    assert.match(
      await p.locator('#diag').innerText(),
      /EXACT_DUPLICATE.*PAGE_CONFLICT_REJECTED/s,
    );
    await p.locator('#empty').click();
    assert.match(await p.locator('#view').innerText(), /status=empty/);
    await p.locator('#late-cancel').click();
    assert.match(await p.locator('#diag').innerText(), /TERMINAL_REJECTED/);
    await p.locator('#error').click();
    assert.match(await p.locator('#view').innerText(), /status=error/);
    await p.locator('#late-cancel').click();
    assert.match(await p.locator('#diag').innerText(), /TERMINAL_REJECTED/);
    await p.locator('#start-b').click();
    await p.locator('#cancel').click();
    await p.locator('#late-cancel').click();
    assert.match(await p.locator('#view').innerText(), /status=cancelled/);
    assert.match(await p.locator('#diag').innerText(), /STALE_REJECTED/);
    await p.locator('#unknown').click();
    assert.match(
      await p.locator('#view').innerText(),
      /已收到 1 筆（總數未知）/,
    );
    await p.locator('#start-b').click();
    await p.locator('#b-page2').click();
    assert.match(
      await p.locator('#view').innerText(),
      /status=partial.*pages=1\/2/,
    );
    await p.locator('#b-page1').click();
    assert.match(
      await p.locator('#view').innerText(),
      /status=complete.*pages=2\/2/,
    );
    await p.locator('#start-a').click();
    await p.locator('#a-page1').click();
    await p.locator('#start-b').click();
    await p.locator('#b-page1').click();
    await p.locator('#a-late').click();
    assert.match(await p.locator('#view').innerText(), /epoch=\d+ query=B/);
    assert.match(await p.locator('#diag').innerText(), /STALE_REJECTED/);
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await p.screenshot({ path: `${out}/loading-${width}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    await p.close();
  }
} finally {
  await browser.close();
}
console.log(
  'PASS: stale A/B, partial/complete, empty/error/cancel, duplicate/conflict, unknown total, and 320/768/1440',
);
