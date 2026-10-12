import assert from 'node:assert/strict';
import { chromium, expect } from 'playwright/test';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const routes = [
  ['articles/plc-scan-cycle-io-refresh', '#plc-scan-practice'],
  ['articles/plc-rising-falling-edge-button-event', '#plc-edge-practice'],
  ['articles/hmi-numeric-range-step-validation', '#hmi-numeric-value-practice'],
  [
    'articles/hmi-setting-value-change-confirm-readback',
    '#hmi-readback-proof-practice',
  ],
  ['articles/hmi-disconnected-data-paused-display', '#hmi-connection-practice'],
  [
    'articles/hmi-trend-time-range-sampling-aggregation',
    '#hmi-trend-window-practice',
  ],
  [
    'articles/hmi-manual-auto-mode-control-ownership',
    '#hmi-manual-mode-practice',
  ],
  [
    'articles/hmi-maintenance-mode-screen-permissions',
    '#hmi-maintenance-practice',
  ],
  [
    'articles/hmi-operation-permission-execution-authorization',
    '#hmi-authorization-practice',
  ],
  ['articles/hmi-role-downgrade-open-screens', '#hmi-downgrade-practice'],
  [
    'articles/alarm-acknowledge-clear-occurrence',
    '#alarm-lifecycle-lifecycle-practice',
  ],
  [
    'articles/hmi-alarm-ack-clear-reset-workflow',
    '#alarm-lifecycle-workflow-practice',
  ],
  [
    'articles/hmi-operating-procedure-ack-clear',
    '#alarm-lifecycle-procedure-practice',
  ],
  ['articles/plc-floating-point-tolerance', '#plc-tolerance-practice'],
  [
    'articles/plc-rounding-negative-display-fixed-point',
    '#plc-rounding-practice',
  ],
  [
    'articles/rs485-no-response-troubleshooting',
    'a[href="/examples/rs485-transaction-log-template.csv"]',
  ],
  ['tool/kw-to-amps', '.task-guide'],
  ['tool/pressure-converter', '.task-guide'],
];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});

try {
  const page = await browser.newPage();
  await mockAdsense(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const [route, selector] of routes) {
      const response = await page.goto(`${base}/${route}`, {
        waitUntil: 'load',
      });
      assert.equal(response.status(), 200, `${route} at ${width}px`);
      await expect(page.locator(selector)).toBeVisible();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
        `${route} horizontal overflow at ${width}px`,
      );
    }
  }
  const csv = await fetch(
    `${base}/examples/rs485-transaction-log-template.csv`,
  );
  assert.equal(csv.status, 200);
  assert.match(await csv.text(), /NOT_RUN/);
  assert.deepEqual(errors, []);
  console.log(`PASS ${routes.length} routes at 320/768/1440px; RS485 CSV HTTP`);
} finally {
  await browser.close();
}
