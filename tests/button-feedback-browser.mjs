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
await mkdir('outputs/editorial-review/button-feedback', { recursive: true });
try {
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      pathToFileURL(resolve('public/examples/button-feedback/demo.html')).href,
    );
    const state = () => page.locator('#state').innerText();
    await page.getByRole('button', { name: '送出 OP17=55' }).click();
    assert.equal(await state(), 'Pressed');
    assert.match(await page.locator('#snapshot').innerText(), /OP17.*55/);
    assert.equal(await page.getByLabel('情境').isDisabled(), true);
    await page.getByRole('button', { name: '測試：舊命令回覆' }).click();
    assert.equal(await state(), 'Pressed');
    assert.match(
      await page.locator('#history').innerText(),
      /REJECTED_WRONG_ID CMD-PRIOR-SESSION/,
    );
    for (const expected of ['Accepted', 'Executing', 'Completed']) {
      await page.getByRole('button', { name: '下一步虛擬事件' }).click();
      assert.equal(await state(), expected);
    }
    const completedHistory = await page.locator('#history').innerText();
    await page.getByRole('button', { name: '下一步虛擬事件' }).click();
    assert.equal(await state(), 'Completed');
    assert.match(
      await page.locator('#history').innerText(),
      /TERMINAL_IGNORED Accepted/,
    );
    assert.notEqual(
      await page.locator('#history').innerText(),
      completedHistory,
    );

    await page.getByRole('button', { name: '新的本機演練' }).click();
    await page.getByLabel('情境').selectOption('rejected');
    await page.getByRole('button', { name: '送出 OP17=55' }).click();
    await page.getByRole('button', { name: '下一步虛擬事件' }).click();
    assert.equal(await state(), 'Rejected');

    await page.getByRole('button', { name: '新的本機演練' }).click();
    await page.getByLabel('情境').selectOption('lost');
    await page.getByRole('button', { name: '送出 OP17=55' }).click();
    const currentId = await page.locator('#command-id').innerText();
    await page.getByRole('button', { name: '下一步虛擬事件' }).click();
    await page.getByRole('button', { name: '下一步虛擬事件' }).click();
    assert.equal(await state(), 'Unknown');
    assert.equal(
      await page.getByRole('button', { name: '送出 OP17=55' }).isDisabled(),
      true,
    );
    assert.match(
      await page.locator('#next-expectation').innerText(),
      /只能查詢此 commandId/,
    );
    await page.getByRole('button', { name: '查詢原 commandId' }).click();
    assert.equal(await state(), 'Completed');
    assert.equal(await page.locator('#command-id').innerText(), currentId);

    await page.getByRole('button', { name: '新的本機演練' }).click();
    await page.getByLabel('情境').selectOption('lost');
    await page.getByLabel('Unknown 的查詢結果').selectOption('Rejected');
    await page.getByRole('button', { name: '送出 OP17=55' }).click();
    await page.getByRole('button', { name: '下一步虛擬事件' }).click();
    await page.getByRole('button', { name: '下一步虛擬事件' }).click();
    assert.equal(await state(), 'Unknown');
    await page.getByRole('button', { name: '查詢原 commandId' }).click();
    assert.equal(await state(), 'Rejected');

    await page.getByRole('button', { name: '新的本機演練' }).click();
    await page.getByRole('button', { name: '送出 OP17=55' }).click();
    const newId = await page.locator('#command-id').innerText();
    assert.notEqual(newId, currentId);
    await page.getByRole('button', { name: '測試：舊命令回覆' }).click();
    assert.equal(await state(), 'Pressed');
    assert.match(
      await page.locator('#history').innerText(),
      /REJECTED_WRONG_ID/,
    );
    for (let index = 0; index < 6; index += 1)
      await page.getByRole('button', { name: '測試：舊命令回覆' }).click();
    assert.match(await page.locator('#capacity').innerText(), /容量已滿/);
    assert.equal(await state(), 'Pressed');
    assert.equal(
      await page.getByRole('button', { name: '下一步虛擬事件' }).isDisabled(),
      true,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    await page.screenshot({
      path: 'outputs/editorial-review/button-feedback/' + width + '.png',
      fullPage: true,
    });
    results.push({ width, passed: true });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  'outputs/editorial-review/button-feedback/report.json',
  JSON.stringify(results, null, 2),
);
console.log('PASS: 8 scenarios at 3 widths (24 browser checks)');
