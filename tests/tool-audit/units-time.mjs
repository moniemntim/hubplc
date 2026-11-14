const resultText = async (expect, result, text) => {
  await expect(result).toContainText(text);
};

async function unitCase(
  { page, expect, choose, result },
  source,
  target,
  raw,
  expected,
  unit,
  invalid,
) {
  await choose('來源單位', source);
  await choose('目標單位', target);
  await page.getByRole('textbox', { name: '輸入數值', exact: true }).fill(raw);
  const value = result.locator('dd').first();
  await expect(value).toHaveText(`${expected} ${unit}`);
  await expect(value.locator('small')).toHaveText(unit);
  await page
    .getByRole('textbox', { name: '輸入數值', exact: true })
    .fill(invalid);
  await expect(result.locator('dd')).toHaveCount(0);
}

export const cases = [
  {
    slug: 'stopwatch',
    async beforeOpen(page) {
      await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
      await page.clock.pauseAt(new Date('2026-01-01T00:00:00Z'));
    },
    async run({ page, expect }) {
      // Advance the frozen clock once so the initial storage-read timer can run.
      await page.clock.runFor(1);
      const reset = page.getByRole('button', { name: '重設', exact: true });
      const pause = page.getByRole('button', { name: '暫停', exact: true });
      if (await pause.count()) await pause.click();
      if (await reset.isEnabled()) await reset.click();
      await page.getByRole('button', { name: '開始', exact: true }).click();
      await page.clock.runFor(10_000);
      await page.getByRole('button', { name: '單圈計時', exact: true }).click();
      await page.clock.runFor(15_000);
      await page.getByRole('button', { name: '單圈計時', exact: true }).click();
      await page.getByRole('button', { name: '暫停', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: /單圈紀錄/ }),
      ).toContainText('2 / 1000');
      await expect(page.locator('.stopwatch-records')).toContainText(
        '00:00:10.00',
      );
      await expect(page.locator('.stopwatch-records')).toContainText(
        '00:00:15.00',
      );
      await expect(page.locator('.stopwatch-records')).toContainText(
        '00:00:25.00',
      );
      await expect(
        page.getByRole('button', { name: '重設', exact: true }),
      ).toBeEnabled();
      await page.getByRole('button', { name: '重設', exact: true }).click();
      await expect(
        page.getByRole('timer', { name: '累計時間', exact: true }),
      ).toContainText('00:00:00');
    },
  },
  {
    slug: 'world-clock',
    async beforeOpen(page) {
      await page.clock.install({ time: new Date('2026-01-01T16:00:00Z') });
      await page.clock.pauseAt(new Date('2026-01-01T16:00:01Z'));
    },
    async run({ page, expect }) {
      await expect(page.locator('.world-hero')).toContainText('台灣・台北');
      await expect(page.locator('.world-time')).toHaveText('00:00:01');
      await page.getByRole('button', { name: '暫停更新', exact: true }).click();
      await expect(page.locator('.world-hero')).toContainText('已暫停顯示');
      await page
        .getByLabel('搜尋城市、國家或時區', { exact: true })
        .fill('New_York');
      await expect(page.locator('.world-card')).toHaveCount(1);
      await page.locator('.world-card').click();
      await expect(page.locator('.world-hero')).toContainText('美國・紐約');
      await expect(page.locator('.world-time')).toHaveText('11:00:01');
      await expect(page.locator('.world-hero')).toContainText(
        '比台北慢 13 小時',
      );
      await page
        .getByRole('button', { name: '回到台灣・台北', exact: true })
        .click();
      await expect(page.locator('.world-hero')).toContainText('台灣・台北');
    },
  },
  {
    slug: 'timestamp-converter',
    async run({ page, expect, choose, result }) {
      await expect(result.locator('dd').first()).toHaveText(
        '2024-03-01 08:00:00',
      );
      await page
        .getByRole('textbox', { name: 'Unix 時間戳', exact: true })
        .fill('-1');
      await expect(result.locator('dd').first()).toHaveText(
        '1970-01-01 07:59:59',
      );
      await choose('換算方向', '台北時間 → Unix 時間戳');
      await page
        .getByRole('textbox', { name: '台北日期時間', exact: true })
        .fill('2024-02-30 08:00:00');
      await resultText(expect, result, '日期不存在');
    },
  },
  {
    slug: 'date-calculator',
    async run({ page, expect, choose, result }) {
      await page
        .getByRole('textbox', { name: '開始日期', exact: true })
        .fill('2024-02-28');
      await page
        .getByRole('textbox', { name: '結束日期', exact: true })
        .fill('2024-03-01');
      await page
        .getByRole('checkbox', { name: '含開始日與結束日', exact: true })
        .check();
      await resultText(expect, result, '含首尾計數');
      await expect(result.locator('dd').last()).toHaveText('3 天');
      await choose('計算方式', '日期加減天數');
      await page
        .getByRole('textbox', { name: '增減天數（正／負整數）', exact: true })
        .fill('-1');
      await expect(result.locator('dd').last()).toHaveText('2024-02-27');
      await page
        .getByRole('textbox', { name: '增減天數（正／負整數）', exact: true })
        .fill('1.5');
      await resultText(expect, result, '整數');
    },
  },
  {
    slug: 'length-converter',
    async run(ctx) {
      await unitCase(ctx, 'm', 'ft', '1', '3.28083989501', 'ft', '');
    },
  },
  {
    slug: 'temperature-converter',
    async run(ctx) {
      await unitCase(ctx, '°C', '°F', '25', '77', '°F', '-274');
    },
  },
  {
    slug: 'mass-converter',
    async run(ctx) {
      await unitCase(ctx, 'kg', 'lb', '10', '22.0462262185', 'lb', '');
    },
  },
  {
    slug: 'area-converter',
    async run(ctx) {
      await unitCase(ctx, 'm²', 'ft²', '1', '10.7639104167', 'ft²', '');
    },
  },
  {
    slug: 'volume-converter',
    async run(ctx) {
      await unitCase(
        ctx,
        'L',
        '美制 gallon',
        '10',
        '2.64172052358',
        '美制 gallon',
        '',
      );
    },
  },
  {
    slug: 'pressure-converter',
    async run(ctx) {
      await unitCase(ctx, 'bar', 'kPa', '1', '100', 'kPa', '');
    },
  },
  {
    slug: 'power-converter',
    async run({ page, expect, choose, result }) {
      await choose('來源單位', '機械 hp');
      await choose('目標單位', 'W');
      const field = page.getByRole('textbox', {
        name: '輸入數值',
        exact: true,
      });
      await field.fill('1');
      await expect(result.locator('dd').first()).toHaveText('745.699871582 W');
      await expect(result.locator('dd small')).toHaveText('W');
      await choose('來源單位', '公制 PS');
      await field.fill('1');
      await expect(result.locator('dd').first()).toHaveText('735.49875 W');
      await expect(result.locator('dd small')).toHaveText('W');
      await field.fill('');
      await expect(result.locator('dd')).toHaveCount(0);
    },
  },
  {
    slug: 'time-converter',
    async run(ctx) {
      await unitCase(ctx, 'min', 'h', '90', '1.5', 'h', '');
    },
  },
  {
    slug: 'angle-converter',
    async run(ctx) {
      await unitCase(
        ctx,
        '度 °',
        '弧度 rad',
        '180',
        '3.14159265359',
        '弧度 rad',
        '',
      );
    },
  },
  {
    slug: 'capacitance-converter',
    async run(ctx) {
      await unitCase(ctx, 'μF', 'nF', '1', '1,000', 'nF', '');
    },
  },
  {
    slug: 'speed-converter',
    async run(ctx) {
      await unitCase(ctx, 'km/h', 'm/s', '36', '10', 'm/s', '');
    },
  },
  {
    slug: 'storage-converter',
    async run(ctx) {
      await unitCase(
        ctx,
        'GB（十進位）',
        'GiB（二進位）',
        '1',
        '0.931322574615',
        'GiB（二進位）',
        '',
      );
    },
  },
  {
    slug: 'currency-converter',
    async run({ page, expect, choose, result }) {
      await choose('匯率來源', '手動輸入匯率');
      await page
        .getByRole('textbox', { name: '金額', exact: true })
        .fill('100');
      await page
        .getByRole('textbox', { name: '每 1 USD 可換多少 TWD', exact: true })
        .fill('32');
      await expect(result.locator('dd').first()).toHaveText('3,200.00 TWD');
      await expect(result.locator('dd').first().locator('small')).toHaveText(
        'TWD',
      );
      await page.getByRole('textbox', { name: '金額', exact: true }).fill('-1');
      await expect(result.locator('dd')).toHaveCount(0);
    },
  },
  {
    slug: 'dbm-watts',
    async run({ page, expect, choose, result }) {
      await page.getByRole('textbox', { name: 'dBm', exact: true }).fill('30');
      await expect(result.locator('dd').nth(1)).toHaveText('1 W');
      await expect(result.locator('dd').nth(2)).toHaveText('1,000 mW');
      await expect(result.locator('dd').nth(3)).toHaveText('0 dBW');
      await choose('轉換方向', '瓦特轉 dBm');
      await page.getByRole('textbox', { name: '瓦特', exact: true }).fill('0');
      await expect(result.locator('dd')).toHaveCount(0);
    },
  },
];
