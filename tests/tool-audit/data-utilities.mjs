export const cases = [
  {
    slug: 'data-mask',
    async run({ page, expect, assert }) {
      const input = page.getByLabel('原始文字', { exact: true });
      await input.fill('王小明 alice@example.com 0912-345-678 A123456789');
      await page
        .getByLabel('自訂要遮罩的文字（每行一筆）', { exact: true })
        .fill('王小明');
      await page.getByRole('button', { name: '預覽遮罩', exact: true }).click();
      const expected = '*** a****@example.com ****-**5-678 A1******89';
      await expect(page.getByLabel('預覽結果', { exact: true })).toHaveValue(
        expected,
      );
      await page
        .getByRole('button', { name: '複製遮罩結果', exact: true })
        .click();
      assert.equal(
        await page.evaluate(() => navigator.clipboard.readText()),
        expected,
      );
      const pending = page.waitForEvent('download');
      await page
        .getByRole('button', { name: '下載文字檔', exact: true })
        .click();
      const stream = await (await pending).createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      assert.equal(Buffer.concat(chunks).toString('utf8'), expected);
      await input.fill('changed');
      await expect(page.getByLabel('預覽結果', { exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: '清空', exact: true }).click();
      await expect(input).toHaveValue('');
    },
  },
  {
    slug: 'email-check',
    async run({ page, expect, assert }) {
      const input = page.getByLabel('Email 清單（每行一個）', { exact: true });
      await input.fill(
        'alice@example.com\nalice@EXAMPLE.com\nAlice@EXAMPLE.com\nalice@@example.com\n"quoted"@example.com',
      );
      await page.getByRole('button', { name: '檢查格式', exact: true }).click();
      const table = page.getByRole('table', {
        name: 'Email 檢查結果',
        exact: true,
      });
      await expect(table).toContainText('有效格式');
      await expect(table).toContainText('重複');
      await expect(table).toContainText('格式錯誤');
      await expect(table).toContainText('需人工確認');
      await page.getByRole('button', { name: '複製 CSV', exact: true }).click();
      assert.match(
        await page.evaluate(() => navigator.clipboard.readText()),
        /"duplicate"/,
      );
      const pending = page.waitForEvent('download');
      await page.getByRole('button', { name: '下載 CSV', exact: true }).click();
      const stream = await (await pending).createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      assert.match(
        Buffer.concat(chunks).toString('utf8'),
        /"alice@example\.com"/,
      );
      await input.fill('a\n'.repeat(2001));
      await page.getByRole('button', { name: '檢查格式', exact: true }).click();
      await expect(
        page.getByText('最多可檢查', { exact: false }),
      ).toBeVisible();
      await page.getByRole('button', { name: '清空', exact: true }).click();
      await expect(input).toHaveValue('');
    },
  },
  {
    slug: 'name-transliterator',
    async run({ page, expect, choose }) {
      const name = page.getByLabel('中文姓名', { exact: true });
      await name.fill('王小明');
      await choose('輸出格式', '姓氏在前、大寫姓氏');
      await page.getByRole('button', { name: '產生草稿', exact: true }).click();
      await expect(
        page.getByText('WANG, Xiao-Ming', { exact: true }),
      ).toBeVisible();
      await name.fill('曾小明');
      await page.getByRole('button', { name: '產生草稿', exact: true }).click();
      await expect(
        page.getByText('多音字請確認：', { exact: false }),
      ).toBeVisible();
      await name.fill('歐陽,娜娜');
      await page
        .getByLabel('既有英文拼寫（可編輯）', { exact: true })
        .fill('Ouyang Nana');
      await page.getByRole('button', { name: '產生草稿', exact: true }).click();
      await expect(
        page.getByText('OU YANG, Na-Na', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText('Ouyang Nana', { exact: true }),
      ).toBeVisible();
      await name.fill('王𠀀');
      await page.getByRole('button', { name: '產生草稿', exact: true }).click();
      await expect(
        page.getByText('無法作為中文姓名拼音的字元：𠀀', { exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: '清空', exact: true }).click();
      await expect(name).toHaveValue('');
    },
  },
];
