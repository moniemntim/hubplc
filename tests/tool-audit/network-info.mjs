export const cases = [
  {
    slug: 'ip-address',
    async run({ page, expect, result }) {
      let calls = 0;
      await page.route('**/api/network-info', async (route) => {
        calls++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ip: '203.0.113.10', version: 4 }),
        });
      });
      await expect(result).toContainText('按「查詢我的 IP」');
      expect(calls).toBe(0);
      await page
        .getByRole('button', { name: '查詢我的 IP', exact: true })
        .click();
      await expect(result).toContainText('203.0.113.10');
      await expect(result).toContainText('IPv4');
      await page.getByRole('button', { name: '複製結果', exact: true }).click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        '203.0.113.10',
      );
      await page.getByRole('button', { name: '清空', exact: true }).click();
      await expect(result).not.toContainText('203.0.113.10');
      await page.unroute('**/api/network-info');
      await page.route('**/api/network-info', (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: '{"error":"address_unavailable"}',
        }),
      );
      await page
        .getByRole('button', { name: '查詢我的 IP', exact: true })
        .click();
      await expect(result).toContainText('暫時無法取得');
      await expect(
        page.getByRole('button', { name: '複製結果', exact: true }),
      ).toBeDisabled();
      await page.unroute('**/api/network-info');
      await page.route('**/api/network-info', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ip: '2001:db8::1', version: 6 }),
        }),
      );
      await page
        .getByRole('button', { name: '查詢我的 IP', exact: true })
        .click();
      await expect(result).toContainText('2001:db8::1');
      await expect(result).toContainText('IPv6');
    },
  },
];
