const resultValues = async (result) =>
  result.locator('.output-rows dd').allTextContents();
const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText());

export const cases = [
  {
    slug: 'random-draw',
    async run({ page, expect, assert, result, choose }) {
      await page.getByLabel('參與者（每行一位）').fill('A\nB\nC');
      await page.getByLabel('抽取數量').fill('2');
      await choose('重複抽取', '不重複');
      await page.getByRole('button', { name: '產生結果' }).click();
      const picked = await resultValues(result);
      assert.equal(picked.length, 2);
      assert.equal(new Set(picked).size, 2);
      assert.ok(picked.every((name) => ['A', 'B', 'C'].includes(name)));
      await page.getByLabel('抽取數量').fill('4');
      await page.getByRole('button', { name: '產生結果' }).click();
      await expect(result.locator('.output-rows dd')).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: '複製 CSV' }),
      ).toBeDisabled();
      await choose('啟用權重', '是；名稱 | 正整數');
      await page.getByLabel('參與者（每行一位）').fill('A | 2\nB | 1');
      await page.getByLabel('抽取數量').fill('1');
      await choose('重複抽取', '可重複');
      await page.getByRole('button', { name: '產生結果' }).click();
      const weighted = await resultValues(result);
      assert.equal(weighted.length, 1);
      assert.ok(['A', 'B'].includes(weighted[0]));
    },
  },
  {
    slug: 'random-groups',
    async run({ page, expect, assert, result, choose }) {
      await page.getByLabel('參與者（每行一位）').fill('=A\nB\nC\nD\nE');
      await choose('分組方式', '兩兩配對（奇數最後一組一人）');
      await page.getByRole('button', { name: '產生結果' }).click();
      const groups = await resultValues(result);
      assert.deepEqual(groups.flatMap((group) => group.split('、')).sort(), [
        '=A',
        'B',
        'C',
        'D',
        'E',
      ]);
      assert.deepEqual(
        groups.map((group) => group.split('、').length).sort(),
        [1, 2, 2],
      );
      await page.getByRole('button', { name: '複製 CSV' }).click();
      await expect.poll(() => clipboard(page)).toContain("'=A");
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: '下載 CSV' }).click();
      assert.match((await download).suggestedFilename(), /random-groups\.csv/);
    },
  },
  {
    slug: 'gift-exchange',
    async run({ page, expect, assert, result }) {
      const names = ['A', 'B', 'C', 'D'];
      await page.getByLabel('參與者（每行一位）').fill(names.join('\n'));
      await page.getByRole('button', { name: '產生結果' }).click();
      await expect(result).toContainText('你的收禮對象');
      await result.locator('summary').click();
      const assignments = await result
        .locator('details .output-rows > div')
        .evaluateAll((rows) =>
          rows.map((row) => [
            row.querySelector('dt')?.textContent?.trim(),
            row.querySelector('dd')?.textContent?.trim(),
          ]),
        );
      assert.equal(assignments.length, names.length);
      assert.deepEqual(assignments.map(([giver]) => giver).sort(), names);
      assert.deepEqual(
        assignments.map(([, receiver]) => receiver).sort(),
        names,
      );
      assert.ok(assignments.every(([giver, receiver]) => giver !== receiver));
      await page.getByRole('button', { name: '複製 CSV' }).click();
      await expect.poll(() => clipboard(page)).toContain('giver');
    },
  },
];
