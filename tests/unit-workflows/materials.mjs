const applicationResult = (page) =>
  page.getByRole('region', { name: '應用計算結果', exact: true });

export const cases = [
  {
    slug: 'mass-converter',
    async run({ page, expect }) {
      await page.getByLabel('毛重', { exact: true }).fill('12.6');
      await page.getByLabel('皮重', { exact: true }).fill('0.6');
      await page.getByLabel('單件標準質量', { exact: true }).fill('45');
      await expect(applicationResult(page)).toContainText('淨重');
      await expect(applicationResult(page)).toContainText('266.666');
      await page.getByLabel('毛重', { exact: true }).fill('0.6');
      await expect(applicationResult(page).locator('dd')).toHaveText([
        '0 kg',
        '0 items',
      ]);
      await page.getByLabel('毛重', { exact: true }).fill('0.5');
      await expect(applicationResult(page)).toContainText('皮重不可大於毛重');
    },
  },
  {
    slug: 'area-converter',
    async run({ page, expect }) {
      await page.getByLabel('單件長度', { exact: true }).fill('1200');
      await page.getByLabel('單件寬度', { exact: true }).fill('600');
      await page.getByLabel('件數', { exact: true }).fill('10');
      await expect(applicationResult(page)).toContainText('淨用料面積');
      await expect(applicationResult(page)).toContainText('7.2');
      await expect(applicationResult(page)).toContainText('7.92');
      await expect(applicationResult(page)).toContainText('7 sheets');
      await page.getByLabel('標準板材面積', { exact: true }).fill('2.64');
      await expect(applicationResult(page)).toContainText('3 sheets');
      await page.getByLabel('件數', { exact: true }).fill('0');
      await expect(applicationResult(page)).toContainText('必須大於 0');
    },
  },
  {
    slug: 'volume-converter',
    async run({ page, expect }) {
      await page.getByLabel('槽內長度', { exact: true }).fill('120');
      await page.getByLabel('槽內寬度', { exact: true }).fill('50');
      await page.getByLabel('槽內高度', { exact: true }).fill('80');
      await page.getByLabel('目前液位高度', { exact: true }).fill('65');
      await expect(applicationResult(page)).toContainText('390');
      await expect(applicationResult(page)).toContainText('90 L');
      await page.getByLabel('目前液位高度', { exact: true }).fill('0');
      await expect(applicationResult(page)).toContainText('0 L');
      await expect(applicationResult(page)).toContainText('480 L');
      await page.getByLabel('目前液位高度', { exact: true }).fill('81');
      await expect(applicationResult(page)).toContainText(
        '液位高度不可高於槽內高度',
      );
    },
  },
  {
    slug: 'power-converter',
    async run({ page, expect }) {
      await page.getByLabel('軸扭矩', { exact: true }).fill('10');
      await page.getByLabel('轉速', { exact: true }).fill('1450');
      await page.getByLabel('系統效率', { exact: true }).fill('90');
      await expect(applicationResult(page)).toContainText('1,518.436');
      await page.getByLabel('轉速', { exact: true }).fill('60');
      await page.getByLabel('系統效率', { exact: true }).fill('100');
      await expect(applicationResult(page)).toContainText('62.8318530718');
      await expect(applicationResult(page).locator('dd').last()).toHaveText(
        '0 W',
      );
      await page.getByLabel('系統效率', { exact: true }).fill('101');
      await expect(applicationResult(page)).toContainText('系統效率不可大於');
    },
  },
  {
    slug: 'capacitance-converter',
    async run({ page, expect }) {
      await page.getByLabel('額定電容量', { exact: true }).fill('100');
      await page.getByLabel('選定容差', { exact: true }).fill('10');
      await page.getByLabel('實測電容量', { exact: true }).fill('90');
      await expect(applicationResult(page)).toContainText('是（含邊界）');
      await page.getByLabel('實測電容量', { exact: true }).fill('110');
      await expect(applicationResult(page)).toContainText('是（含邊界）');
      await page.getByLabel('實測電容量', { exact: true }).fill('110.0001');
      await expect(applicationResult(page).locator('dd').last()).toHaveText(
        '否',
      );
      await page.getByLabel('選定容差', { exact: true }).fill('101');
      await expect(applicationResult(page)).toContainText('選定容差不可大於');
    },
  },
  {
    slug: 'storage-converter',
    async run({ page, expect, choose }) {
      await page.getByLabel('檔案大小', { exact: true }).fill('10');
      await choose('檔案大小單位', 'GB（十進位）');
      await page.getByLabel('標示傳輸速率', { exact: true }).fill('100');
      await choose('傳輸速率單位', 'Mbps（megabits/s）');
      await page.getByLabel('有效吞吐率', { exact: true }).fill('80');
      await expect(applicationResult(page)).toContainText('1,000');
      await expect(applicationResult(page)).toContainText('16 分 40 秒');
      await page.getByLabel('檔案大小', { exact: true }).fill('1');
      await choose('檔案大小單位', 'GiB（二進位）');
      await choose('傳輸速率單位', 'MiB/s（mebibytes/s）');
      await page.getByLabel('有效吞吐率', { exact: true }).fill('100');
      await expect(applicationResult(page)).toContainText('10.24 s');
      await page.getByLabel('標示傳輸速率', { exact: true }).fill('0');
      await expect(applicationResult(page)).toContainText('必須大於 0');
    },
  },
];
