export const cases = [
  {
    slug: 'unit-converter',
    async run({ page, expect, choose, result, assert }) {
      await expect(result).toContainText('0.06 m³/h');
      await choose('換算方式', '批次換算');
      const input = page.getByRole('textbox', {
        name: '批次數值（每行一筆）',
        exact: true,
      });
      await input.fill('1\n10\n\n12');
      const rows = page.locator('.unit-batch-table tbody tr');
      await expect(rows).toHaveCount(3);
      await choose('物理量分類', '壓力');
      await input.fill('1\n2');
      await expect(rows.nth(0).locator('td').last()).toHaveText('100');
      await expect(rows.nth(1).locator('td').last()).toHaveText('200');
      await choose('換算方式', '單筆流量換算');
      await expect(result).toContainText('0.06 m³/h');
      await expect(
        page.getByRole('combobox', { name: '物理量分類', exact: true }),
      ).toContainText('流量');
      await choose('換算方式', '批次換算');
      await input.fill('1\n10\n\n12');
      await expect(rows.nth(0).locator('td').last()).toHaveText('0.06');
      await expect(rows.nth(1).locator('td').last()).toHaveText('0.6');
      await expect(rows.nth(2).locator('td').last()).toHaveText('0.72');
      await expect(rows.nth(2).locator('th')).toHaveText('4');
      await page.getByRole('button', { name: '複製結果', exact: true }).click();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      assert.ok(copied.includes('4\t12\t0.72'));
      await input.fill('1\nbad\n12');
      await expect(rows.nth(1)).toHaveAttribute('data-valid', 'false');
      await expect(rows.nth(1)).toContainText('有效的十進位數字');
      await expect(rows.nth(2)).toContainText('0.72');
      await expect(
        page.getByRole('button', { name: '複製結果', exact: true }),
      ).toBeDisabled();
      await input.fill(Array(201).fill('1').join('\n'));
      await expect(result).toContainText('200');
      await expect(rows).toHaveCount(0);
      await input.fill('1\n10\n12');
      await page
        .getByRole('button', { name: '⇄ 交換方向', exact: true })
        .click();
      await expect(rows.nth(0).locator('td').last()).toHaveText('1');
      await expect(rows.nth(1).locator('td').last()).toHaveText('10');
      await expect(rows.nth(2).locator('td').last()).toHaveText('12');
      await page.getByRole('button', { name: '清空', exact: true }).click();
      await expect(rows).toHaveCount(0);
      await page.getByRole('button', { name: '載入範例', exact: true }).click();
      await expect(rows).toHaveCount(3);
      await choose('來源單位', 'kg/s（質量）');
      await choose('目標單位', 'kg/h（質量）');
      await input.fill('1\n2');
      await expect(rows.nth(0).locator('td').last()).toHaveText('3,600');
      await expect(rows.nth(1).locator('td').last()).toHaveText('7,200');
      await input.fill('1e-400');
      await expect(result).toContainText('過小');
      await expect(
        page.getByRole('button', { name: '複製結果', exact: true }),
      ).toBeDisabled();
      await page.getByRole('button', { name: '載入範例', exact: true }).click();
      await expect(rows.nth(2).locator('td').last()).toHaveText('0.72');
    },
  },
];
