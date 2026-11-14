export const cases = [
  {
    slug: 'random-codes',
    async run({ page, expect, result }) {
      await page.getByLabel('產生數量（1–1000）', { exact: true }).fill('10');
      await page
        .getByLabel('代碼長度（不含前綴，2–32）', { exact: true })
        .fill('6');
      await page.getByLabel('前綴（可留空）', { exact: true }).fill('LAB-');
      await page.getByRole('button', { name: '產生資料', exact: true }).click();
      const rows = result.getByRole('row');
      await expect(rows).toHaveCount(11);
      const codes = await result.locator('tbody td').allTextContents();
      if (codes.length !== 10 || new Set(codes).size !== 10)
        throw new Error('expected ten unique generated codes');
      if (
        !codes.every((code) =>
          /^LAB-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code),
        )
      )
        throw new Error(
          'generated code format does not match configured prefix and alphabet',
        );
      await page.getByRole('button', { name: '複製 CSV', exact: true }).click();
      const csvDownload = page.waitForEvent('download');
      await page.getByRole('button', { name: '下載 CSV', exact: true }).click();
      await csvDownload;
      await page.getByLabel('前綴（可留空）', { exact: true }).fill('QA-');
      await expect(result.getByRole('row')).toHaveCount(0);
      await page
        .getByLabel('代碼長度（不含前綴，2–32）', { exact: true })
        .fill('1');
      await page.getByRole('button', { name: '產生資料', exact: true }).click();
      await expect(result).toContainText('2 到 32');
    },
  },
  {
    slug: 'sample-data',
    async run({ page, expect, result }) {
      await page.getByLabel('產生數量（1–1000）', { exact: true }).fill('3');
      await page.getByRole('button', { name: '產生資料', exact: true }).click();
      await expect(result.getByRole('row')).toHaveCount(4);
      const rows = await result.locator('tbody tr').allTextContents();
      if (
        !rows.every(
          (row) => row.includes('TEST-') && row.includes('@example.invalid'),
        )
      )
        throw new Error(
          'profiles must use TEST IDs and example.invalid emails',
        );
      await page
        .getByRole('button', { name: '複製 JSON', exact: true })
        .click();
      const jsonDownload = page.waitForEvent('download');
      await page
        .getByRole('button', { name: '下載 JSON', exact: true })
        .click();
      await jsonDownload;
      await page.getByLabel('產生數量（1–1000）', { exact: true }).fill('4');
      await expect(result.getByRole('row')).toHaveCount(0);
      await page.getByLabel('產生數量（1–1000）', { exact: true }).fill('0');
      await page.getByRole('button', { name: '產生資料', exact: true }).click();
      await expect(result).toContainText('1 到 1000');
    },
  },
];
