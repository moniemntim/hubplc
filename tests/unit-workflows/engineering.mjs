const application = (page) =>
  page.getByRole('region', { name: '應用計算結果', exact: true });

const fill = async (page, label, value) => {
  await page.getByLabel(label, { exact: true }).fill(value);
};

export const cases = [
  {
    slug: 'length-converter',
    async run({ page, expect }) {
      await fill(page, '圖面標稱尺寸（mm）', '100');
      await fill(page, '對稱公差（± mm）', '0.1');
      const result = application(page);
      await expect(result).toContainText('3.93700787402');
      await expect(result).toContainText('3.93307086614');
      await fill(page, '對稱公差（± mm）', '0');
      await expect(result).toContainText('0 ± in');
      await fill(page, '對稱公差（± mm）', '100');
      await expect(result).toContainText('公差必須小於標稱尺寸');
    },
  },
  {
    slug: 'temperature-converter',
    async run({ page, expect }) {
      await fill(page, '起始溫度（°C）', '25');
      await fill(page, '結束溫度（°C）', '85');
      const result = application(page);
      await expect(result).toContainText('298.15 K');
      await expect(result).toContainText('108 °F');
      await fill(page, '起始溫度（°C）', '-274');
      await fill(page, '結束溫度（°C）', '20');
      await expect(result).toContainText('絕對零度');
    },
  },
  {
    slug: 'pressure-converter',
    async run({ page, expect, choose }) {
      const result = application(page);
      await choose('輸入壓力基準', '表壓（相對當地大氣）');
      await fill(page, '輸入壓力（kPa）', '-20');
      await fill(page, '當地大氣壓範例值（kPa）', '101.325');
      await expect(result).toContainText('81.325 kPa');
      await choose('輸入壓力基準', '絕對壓（相對真空）');
      await fill(page, '輸入壓力（kPa）', '90');
      await fill(page, '當地大氣壓範例值（kPa）', '101.325');
      await expect(result).toContainText('-11.325 kPa');
      await fill(page, '輸入壓力（kPa）', '-1');
      await expect(result).toContainText('絕對壓不可小於');
    },
  },
  {
    slug: 'angle-converter',
    async run({ page, expect, choose }) {
      await fill(page, '編碼器每轉脈波數（PPR）', '1024');
      await choose('計數倍率', '×4 計數');
      await fill(page, '目標角度（°）', '1');
      const result = application(page);
      await expect(result).toContainText('11.3777777778');
      await expect(result).toContainText('11 counts');
      await expect(result).toContainText('-0.033203125');
      await fill(page, '編碼器每轉脈波數（PPR）', '1.5');
      await expect(result).toContainText('安全整數');
    },
  },
  {
    slug: 'speed-converter',
    async run({ page, expect }) {
      await fill(page, '皮帶行程距離（mm）', '1000');
      await fill(page, '皮帶速度（m/min）', '30');
      await fill(page, '產品節距（mm）', '50');
      const result = application(page);
      await expect(result).toContainText('2 s');
      await expect(result).toContainText('600 parts/min');
      await fill(page, '皮帶行程距離（mm）', '500');
      await expect(result).toContainText('1 s');
      await fill(page, '皮帶速度（m/min）', '0');
      await expect(result).toContainText('皮帶速度');
    },
  },
  {
    slug: 'time-converter',
    async run({ page, expect }) {
      await fill(page, '加工時間（秒）', '50');
      await fill(page, '移載時間（秒）', '20');
      await fill(page, '班別時數（小時）', '1');
      await fill(page, '休息時間（分鐘）', '15');
      const result = application(page);
      await expect(result).toContainText('38 cycles');
      await expect(result).toContainText('40 s');
      await fill(page, '休息時間（分鐘）', '61');
      await expect(result).toContainText('休息時間不可超過');
      await fill(page, '加工時間（秒）', '0.1');
      await fill(page, '移載時間（秒）', '0.2');
      await fill(page, '班別時數（小時）', '0.001');
      await fill(page, '休息時間（分鐘）', '0');
      await expect(result).toContainText('12 cycles');
    },
  },
];
