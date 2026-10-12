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
  const connection = await browser.newPage({
    viewport: { width: 768, height: 960 },
  });
  await mockAdsense(connection);
  const connectionErrors = [];
  connection.on('pageerror', (error) => connectionErrors.push(error.message));
  await connection.goto(
    `${base}/articles/hmi-disconnected-data-paused-display`,
    { waitUntil: 'networkidle' },
  );
  const connectionUi = connection.locator('#hmi-connection-practice');
  await connectionUi.getByRole('button', { name: 't=500 斷線' }).click();
  assert.equal(
    await connectionUi.getByTestId('connection-state').first().textContent(),
    'DISCONNECTED',
  );
  assert.equal(
    await connectionUi.getByTestId('connection-trend').first().textContent(),
    '缺口（不補零）',
  );
  await connectionUi.getByRole('button', { name: 't=1002 舊快取' }).click();
  assert.equal(
    await connectionUi.getByTestId('connection-decision').first().textContent(),
    'sample_rejected_old_cache',
  );
  await connectionUi.getByLabel('資料 epoch').fill('1');
  await connectionUi.getByLabel('acquiredAt（ms）').fill('1003');
  await connectionUi.getByRole('button', { name: '套用重連資料' }).click();
  assert.equal(
    await connectionUi.getByTestId('connection-decision').last().textContent(),
    'sample_rejected_epoch',
  );
  await connectionUi.getByLabel('資料 epoch').fill('2');
  await connectionUi.getByLabel('acquiredAt（ms）').fill('1000');
  await connectionUi.getByRole('button', { name: '套用重連資料' }).click();
  assert.equal(
    await connectionUi.getByTestId('connection-decision').last().textContent(),
    'sample_rejected_old_cache',
  );
  await connectionUi.getByLabel('acquiredAt（ms）').fill('1003');
  await connectionUi.getByRole('button', { name: '套用重連資料' }).click();
  assert.equal(
    await connectionUi.getByTestId('connection-state').last().textContent(),
    'FRESH',
  );
  await connectionUi.getByLabel('資料 epoch').fill('3');
  await connectionUi.getByRole('button', { name: '套用重連資料' }).click();
  assert.equal(
    await connectionUi.getByTestId('connection-decision').last().textContent(),
    'sample_rejected_epoch',
  );
  await connectionUi.getByLabel('資料 epoch').fill('2');
  await connectionUi.getByLabel('acquiredAt（ms）').fill('1004');
  await connectionUi.getByRole('button', { name: '套用重連資料' }).click();
  assert.equal(
    await connectionUi.getByTestId('connection-decision').last().textContent(),
    'sample_rejected_shape',
  );
  await connectionUi.getByLabel('資料 epoch').fill('');
  await connectionUi.getByRole('button', { name: '套用重連資料' }).click();
  assert.match(
    await connectionUi.getByRole('alert').textContent(),
    /請完整輸入/,
  );
  assert.ok(
    await connection.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(connectionErrors, []);
  await connection.close();

  const trend = await browser.newPage({
    viewport: { width: 320, height: 960 },
  });
  await mockAdsense(trend);
  const trendErrors = [];
  trend.on('pageerror', (error) => trendErrors.push(error.message));
  await trend.goto(
    `${base}/articles/hmi-trend-time-range-sampling-aggregation`,
    { waitUntil: 'networkidle' },
  );
  const trendUi = trend.locator('#hmi-trend-window-practice');
  await trendUi.getByRole('button', { name: '載入 1 分鐘 Good 尖峰' }).click();
  assert.equal(
    await trendUi.getByTestId('coverage').textContent(),
    '600 秒 / 1',
  );
  assert.equal(await trendUi.getByTestId('full-mean').textContent(), '61.5 °C');
  await trendUi.getByRole('button', { name: '載入 30 秒 Bad 缺口' }).click();
  assert.equal(
    await trendUi.getByTestId('coverage').textContent(),
    '570 秒 / 0.95',
  );
  assert.equal(
    await trendUi.getByTestId('full-mean').textContent(),
    '未提供（coverage 不足）',
  );
  assert.equal(
    await trendUi.getByTestId('trend-decision').textContent(),
    '只能報告已知資料平均',
  );
  await trendUi.getByLabel('75°C 尖峰持續（秒）').fill('600');
  await trendUi.getByRole('button', { name: '計算窗口' }).click();
  assert.equal(await trendUi.getByTestId('coverage').textContent(), '0 秒 / 0');
  assert.equal(
    await trendUi.getByTestId('known-mean').textContent(),
    '未提供（無已知資料）',
  );
  assert.equal(
    await trendUi.getByTestId('trend-decision').textContent(),
    '沒有可報告的已知資料',
  );
  await trendUi.getByLabel('75°C 尖峰持續（秒）').fill('1');
  await trendUi.getByRole('button', { name: '計算窗口' }).click();
  assert.equal(
    await trendUi.getByTestId('coverage').textContent(),
    '599 秒 / 0.9983',
  );
  assert.equal(
    await trendUi.getByTestId('full-mean').textContent(),
    '未提供（coverage 不足）',
  );
  await trendUi.getByLabel('75°C 尖峰持續（秒）').fill('601');
  await trendUi.getByRole('button', { name: '計算窗口' }).click();
  assert.match(await trendUi.getByRole('alert').textContent(), /0 到 600/);
  assert.ok(
    await trend.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(trendErrors, []);
  await trend.close();
  console.log(
    'PASS: HMI connection and trend lessons cover fresh, rejection, gap, coverage and invalid boundaries',
  );
} finally {
  await browser.close();
}
