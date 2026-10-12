import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 960 } });
  await mockAdsense(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/articles/hmi-alarm-ack-clear-reset-workflow`, {
    waitUntil: 'networkidle',
  });
  const ui = page.locator('#alarm-lifecycle-workflow-practice');
  await ui.getByLabel('expectedRevision').fill('1');
  await ui.getByRole('button', { name: '送出結案' }).click();
  assert.equal(
    await ui.getByTestId('alarm-decision').textContent(),
    'workflow_rejected_transition',
  );
  assert.equal(await ui.getByTestId('alarm-work').textContent(), 'Open');
  await ui.getByRole('button', { name: '來源 Clear' }).click();
  assert.equal(await ui.getByTestId('alarm-active').textContent(), 'false');
  assert.equal(await ui.getByTestId('alarm-acked').textContent(), 'false');
  await ui.getByLabel('expectedRevision').fill('2');
  await ui.getByRole('button', { name: '送出結案' }).click();
  assert.equal(
    await ui.getByTestId('alarm-decision').textContent(),
    'workflow_rejected_transition',
  );
  await ui.getByRole('button', { name: '重設 O1' }).click();
  await ui.getByRole('button', { name: 'Ack 收到' }).click();
  await ui.getByRole('button', { name: 'Operator 開始處置' }).click();
  await ui.getByRole('button', { name: '來源 Clear' }).click();
  await ui.getByLabel('expectedRevision').fill('3');
  await ui.getByRole('button', { name: '送出結案' }).click();
  assert.equal(
    await ui.getByTestId('alarm-decision').textContent(),
    'workflow_revision_conflict',
  );
  await ui.getByLabel('expectedRevision').fill('4.0');
  await ui.getByRole('button', { name: '送出結案' }).click();
  assert.match(await ui.getByRole('alert').textContent(), /正整數/);
  assert.equal(await ui.getByTestId('alarm-work').textContent(), 'InProgress');
  await ui.getByLabel('expectedRevision').fill('4');
  await ui.getByLabel('Actor').selectOption('Operator');
  await ui.getByRole('button', { name: '送出結案' }).click();
  assert.equal(
    await ui.getByTestId('alarm-decision').textContent(),
    'workflow_rejected_request',
  );
  await ui.getByLabel('Actor').selectOption('Supervisor');
  await ui.getByLabel('結案 evidence').fill('');
  await ui.getByRole('button', { name: '送出結案' }).click();
  assert.equal(
    await ui.getByTestId('alarm-decision').textContent(),
    'workflow_rejected_request',
  );
  await ui.getByLabel('結案 evidence').fill('現場記錄已核對');
  await ui.getByRole('button', { name: '送出結案' }).click();
  assert.equal(
    await ui.getByTestId('alarm-decision').textContent(),
    'workflow_resolved',
  );
  assert.equal(await ui.getByTestId('alarm-work').textContent(), 'Resolved');
  assert.match(
    await ui.getByTestId('alarm-close-status').textContent(),
    /不是設備 Reset/,
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  await page.close();
  console.log(
    'PASS: alarm lifecycle lesson distinguishes clear, ack, stale revision and supervised evidence close at 320px',
  );
} finally {
  await browser.close();
}
