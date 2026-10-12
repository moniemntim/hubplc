import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
try {
  const numeric = await browser.newPage({
    viewport: { width: 320, height: 960 },
  });
  await mockAdsense(numeric);
  const numericErrors = [];
  numeric.on('pageerror', (error) => numericErrors.push(error.message));
  await numeric.goto(`${base}/articles/hmi-numeric-range-step-validation`, {
    waitUntil: 'networkidle',
  });
  const numericUi = numeric.locator('#hmi-numeric-value-practice');
  for (const [value, decision, wire] of [
    ['100.04', 'RANGE_REJECTED', '250'],
    ['25.35', 'STEP_REJECTED', '250'],
    ['25.30', 'ACCEPT', '253'],
  ]) {
    await numericUi.getByRole('button', { name: `載入 ${value}` }).click();
    await numericUi.getByRole('button', { name: '以工程文字檢查' }).click();
    assert.equal(
      await numericUi.getByTestId('numeric-decision').textContent(),
      decision,
    );
    assert.equal(
      await numericUi.getByTestId('numeric-last-wire').textContent(),
      wire,
    );
  }
  await numericUi.getByRole('button', { name: '載入 7' }).click();
  await numericUi.getByRole('button', { name: '以 raw 字串檢查' }).click();
  assert.equal(
    await numericUi.getByTestId('numeric-decision').textContent(),
    'RAW_TYPE_REJECTED',
  );
  assert.equal(
    await numericUi.getByTestId('numeric-last-wire').textContent(),
    '253',
  );
  assert.ok(
    await numeric.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(numericErrors, []);
  await numeric.close();

  const readback = await browser.newPage({
    viewport: { width: 320, height: 960 },
  });
  await mockAdsense(readback);
  const readbackErrors = [];
  readback.on('pageerror', (error) => readbackErrors.push(error.message));
  await readback.goto(
    `${base}/articles/hmi-setting-value-change-confirm-readback`,
    { waitUntil: 'networkidle' },
  );
  const readbackUi = readback.locator('#hmi-readback-proof-practice');
  for (const [button, state] of [
    ['只有 accepted', 'accepted'],
    ['55 但 operationId 錯誤', 'unknown'],
    ['版本衝突', 'rejected'],
    ['完整讀回匹配', 'applied'],
  ]) {
    await readbackUi.getByRole('button', { name: button }).click();
    assert.equal(
      await readbackUi.getByTestId('readback-state').textContent(),
      state,
    );
  }
  assert.match(
    await readbackUi.getByTestId('readback-reason').textContent(),
    /correlated_readback_proof/,
  );
  assert.ok(
    await readback.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(readbackErrors, []);
  await readback.close();
  console.log(
    'PASS: HMI value lessons distinguish exact numeric rejection and readback proof at 320px',
  );
} finally {
  await browser.close();
}
