import assert from 'node:assert/strict';
import { chromium, expect } from 'playwright/test';
import { mockAdsense } from './adsense-mock.mjs';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8787';
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ??
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
});
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 720 } });
  await mockAdsense(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  async function open(slug) {
    const response = await page.goto(`${base}/articles/${slug}`, {
      waitUntil: 'networkidle',
    });
    assert.equal(response.status(), 200);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      slug,
    );
  }

  await open('hmi-manual-auto-mode-control-ownership');
  const manual = page.locator('#hmi-manual-mode-practice');
  await expect(manual.getByTestId('mode-confirmed')).toHaveText('Manual');
  await manual.getByRole('button', { name: '載入等號逾時' }).click();
  await expect(manual.getByTestId('mode-decision')).toContainText('TIMEOUT');
  await expect(manual.getByTestId('mode-confirmed')).toHaveText('Auto');
  await manual.getByRole('button', { name: '載入互鎖拒絕' }).click();
  await expect(manual.getByTestId('mode-decision')).toContainText(
    'INTERLOCK_DENIED',
  );

  await open('hmi-maintenance-mode-screen-permissions');
  const maintenance = page.locator('#hmi-maintenance-practice');
  await expect(maintenance.getByTestId('maintenance-decision')).toContainText(
    'WAIT_TEST_STOPPED',
  );
  await maintenance.getByLabel('測試停止摘要').selectOption('true');
  await expect(maintenance.getByTestId('maintenance-decision')).toContainText(
    'WAIT_RESTORE_REVIEW',
  );
  await maintenance.getByLabel('復原核對摘要').selectOption('true');
  await expect(maintenance.getByTestId('maintenance-mode')).toHaveText(
    'Manual / 4',
  );

  await open('hmi-operation-permission-execution-authorization');
  const auth = page.locator('#hmi-authorization-practice');
  await expect(auth.getByTestId('auth-device')).toHaveText('95 / 2 / 1');
  await auth.getByLabel('測試工作階段').selectOption('O');
  await expect(auth.getByTestId('auth-submit')).toHaveText('ROLE_DENIED');
  await expect(auth.getByTestId('auth-device')).toHaveText('80 / 1 / 0');
  await auth.getByLabel('測試工作階段').selectOption('S');
  await auth.getByLabel('預期設備版本').fill('2');
  await expect(auth.getByTestId('auth-submit')).toHaveText('REVISION_CONFLICT');

  await open('hmi-role-downgrade-open-screens');
  const downgrade = page.locator('#hmi-downgrade-practice');
  await expect(downgrade.getByTestId('downgrade-dispatch')).toHaveText(
    'ROLE_DENIED',
  );
  await downgrade.getByLabel('派送前恢復權限').selectOption('true');
  await expect(downgrade.getByTestId('downgrade-dispatch')).toHaveText(
    'AUTHORIZATION_CHANGED',
  );
  await expect(downgrade.getByTestId('downgrade-device')).toHaveText(
    '80 / 1 / 0',
  );
  assert.deepEqual(errors, []);
  console.log('PASS four HMI mode and authorization on-page lessons at 320px');
} finally {
  await browser.close();
}
