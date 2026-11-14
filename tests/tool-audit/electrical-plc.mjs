// Per-tool browser fixtures consumed by the combined audit runner.  The runner
// opens a fresh Traditional-Chinese page and supplies its result region.
const contains = async (expect, result, text) => {
  await expect(result).toContainText(text);
};
const invalid = async (page, expect, result, label) => {
  await page.getByLabel(label, { exact: true }).fill('');
  await expect(result.locator('.output-rows dd')).toHaveCount(0);
};
const fill = (page, label, value) =>
  page.getByLabel(label, { exact: true }).fill(value);
const number = async (assert, result, label, expected, tolerance = 1e-9) => {
  const raw = await result
    .locator('.output-rows > div')
    .evaluateAll((rows, targetLabel) => {
      const row = rows.find(
        (candidate) =>
          candidate.querySelector('dt')?.textContent?.trim() === targetLabel,
      );
      return row?.querySelector('dd')?.textContent?.trim() ?? '';
    }, label);
  const normalized = raw.replaceAll(',', '');
  const match = normalized.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
  assert.ok(match, `Missing numeric ${label}: ${raw}`);
  const actual = Number(match[0]);
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} ± ${tolerance}, got ${actual}`,
  );
};

export const cases = [
  {
    slug: 'ac-power-converter',
    async run({ page, expect, assert, result, choose }) {
      await choose('換算方向', 'W／kW／MW → 安培');
      await choose('供電方式', '平衡三相交流');
      await choose('已知量單位', 'kW');
      await fill(page, '實功率', '10');
      await fill(page, '線電壓', '380');
      await fill(page, '功率因數', '0.8');
      await number(assert, result, '線電流', 18.9917851707, 1e-9);
      await invalid(page, expect, result, '實功率');
    },
  },
  {
    slug: 'power-factor',
    async run({ page, expect, assert, result, choose }) {
      await choose('已知資料', '實功率 P＋視在功率 S');
      await choose('實功率單位', 'kW');
      await choose('視在功率單位', 'kVA');
      await fill(page, '實功率 P', '8');
      await fill(page, '視在功率 S', '10');
      await number(assert, result, '功率因數', 0.8);
      await number(assert, result, '相位角', 36.8698976458, 1e-8);
      await invalid(page, expect, result, '實功率 P');
    },
  },
  {
    slug: 'energy-cost',
    async run({ page, expect, assert, result, choose }) {
      await choose('計算方向', '功率＋時間 → 用電量與電費');
      await choose('費率計算', '加入自訂單一費率');
      await choose('功率單位', 'kW');
      await fill(page, '功率', '1');
      await fill(page, '每日使用時間', '8');
      await fill(page, '使用天數', '30');
      await fill(page, '每度電價', '3');
      await number(assert, result, '用電量', 240);
      await number(assert, result, '估算電費', 720);
      await invalid(page, expect, result, '功率');
    },
  },
  {
    slug: 'va-to-amps',
    async run({ page, expect, assert, result, choose }) {
      await choose('供電方式', '單相交流');
      await choose('功率單位', 'VA');
      await fill(page, '視在功率', '1000');
      await fill(page, '負載兩端電壓', '220');
      await number(assert, result, '負載電流', 1000 / 220, 1e-10);
      await invalid(page, expect, result, '視在功率');
    },
  },
  {
    slug: 'battery-life',
    async run({ page, expect, assert, result, choose }) {
      await choose('電池容量單位', 'mAh');
      await fill(page, '電池容量', '2000');
      await fill(page, '平均負載電流', '100');
      await fill(page, '可用容量', '100');
      await number(assert, result, '預估續航', 20);
      await number(assert, result, '預估天數', 20 / 24, 1e-10);
      await invalid(page, expect, result, '平均負載電流');
    },
  },
  {
    slug: 'capacitor-discharge',
    async run({ page, expect, assert, result, choose }) {
      await choose('計算方式', '由電阻算時間');
      await fill(page, 'C', '100');
      await fill(page, '初始電壓', '24');
      await fill(page, '目標電壓', '5');
      await fill(page, '放電電阻', '10');
      await number(assert, result, '放電時間', -Math.log(5 / 24), 1e-10);
      await number(assert, result, '初始功率', 0.0576, 1e-12);
      await invalid(page, expect, result, '放電電阻');
    },
  },
  {
    slug: 'analog',
    async run({ page, expect, assert, result, choose }) {
      await choose('常用訊號', '4–20 mA');
      await choose('輸入種類', '訊號值');
      await fill(page, '訊號值', '12');
      await fill(page, '工程下限', '0');
      await fill(page, '工程上限', '10');
      await choose('轉換到其他訊號', '0–10 V');
      await number(assert, result, '工程值', 5);
      await number(assert, result, '百分比', 50);
      await number(assert, result, '目標訊號', 5);
      await invalid(page, expect, result, '訊號值');
    },
  },
  {
    slug: 'plc-scaling',
    async run({ page, expect, assert, result, choose }) {
      await choose('方向', '原始值 → 工程值');
      await choose('原始值預設', '0–27648');
      await fill(page, '原始值', '13824');
      await fill(page, '工程下限', '0');
      await fill(page, '工程上限', '100');
      await number(assert, result, '工程值', 50);
      await number(assert, result, '百分比', 50);
      await contains(expect, result, '範圍內');
      await invalid(page, expect, result, '原始值');
    },
  },
  {
    slug: 'base-converter',
    async run({ page, expect, result, choose }) {
      await choose('輸入進位', '十六進位');
      await choose('位元數', '8 bit');
      await choose('解讀方式', '有號二補數');
      await fill(page, '數值（不含 0x／0b 前綴）', 'FF');
      await contains(expect, result, '-1');
      await contains(expect, result, '11111111');
      await page
        .getByLabel('數值（不含 0x／0b 前綴）', { exact: true })
        .fill('GG');
      await expect(result.locator('.output-rows dd')).toHaveCount(0);
    },
  },
  {
    slug: 'modbus-address',
    async run({ page, expect, assert, result, choose }) {
      await choose('資料區', 'Holding Register (4x)');
      await choose('參考編號位數', '五位數');
      await choose('輸入種類', '參考編號');
      await fill(page, '參考編號', '40010');
      await number(assert, result, '零起算位址', 9);
      await number(assert, result, '從 1 起算序號', 10);
      await contains(expect, result, '0009');
      await contains(expect, result, '03');
      await invalid(page, expect, result, '參考編號');
    },
  },
  {
    slug: 'modbus-crc',
    async run({ page, expect, result }) {
      await fill(page, 'HEX 位元組（空白或逗號分隔）', '01 03 00 00 00 0A');
      await contains(expect, result, 'CDC5');
      await contains(expect, result, 'C5 CD');
      await page
        .getByLabel('HEX 位元組（空白或逗號分隔）', { exact: true })
        .fill('GG');
      await expect(result).toContainText('HEX');
    },
  },
  {
    slug: 'register-converter',
    async run({ page, expect, result, choose }) {
      await choose('方向', '數值 → 暫存器');
      await choose('資料型別', 'Float32 (IEEE 754)');
      await choose('位元組排列', 'ABCD');
      await fill(page, '數值', '12.5');
      await contains(expect, result, '4148 0000');
      await choose('方向', '暫存器 → 數值');
      await fill(page, '暫存器 HEX（以空白分隔）', '4148 0000');
      await contains(expect, result, '12.5');
      await fill(page, '暫存器 HEX（以空白分隔）', '4148');
      await expect(result.locator('.output-rows dd')).toHaveCount(0);
    },
  },
  {
    slug: 'voltage-divider',
    async run({ page, expect, assert, result, choose }) {
      await choose('計算方式', '正算輸出');
      await fill(page, 'Vin', '24');
      await fill(page, 'R1', '10');
      await fill(page, 'R2', '10');
      await number(assert, result, '輸出電壓', 12);
      await number(assert, result, '電流', 0.0012, 1e-12);
      await invalid(page, expect, result, 'Vin');
    },
  },
  {
    slug: 'electrical',
    async run({ page, expect, assert, result, choose }) {
      await choose('電路類型', '直流');
      await choose('已知量 1', '電壓 V');
      await fill(page, '數值 1', '24');
      await choose('已知量 2', '電阻 Ω');
      await fill(page, '數值 2', '120');
      await number(assert, result, '電流', 0.2);
      await number(assert, result, '功率', 4.8);
      await invalid(page, expect, result, '數值 1');
    },
  },
  {
    slug: '555-timer',
    async run({ page, expect, assert, result, choose }) {
      await choose('模式', '無穩態振盪');
      await choose('計算', '由 R、C 計算');
      await fill(page, 'RA', '10');
      await fill(page, 'RB', '10');
      await fill(page, 'C', '1');
      await number(
        assert,
        result,
        '頻率',
        1 / (Math.log(2) * (10000 + 2 * 10000) * 1e-6),
        1e-9,
      );
      await number(assert, result, '占空比', (2 / 3) * 100, 1e-9);
      await invalid(page, expect, result, 'RA');
    },
  },
  {
    slug: 'resistor-color',
    async run({ page, expect, assert, result, choose }) {
      await choose('色環數', '四色環');
      await choose('轉換方式', '色環轉阻值');
      await choose('有效數字 1', '棕 1');
      await choose('有效數字 2', '黑 0');
      await choose('倍率', '紅 ×10^2');
      await choose('容差', '金 ±5%');
      await number(assert, result, '阻值', 1000);
      await number(assert, result, '容差', 5);
      await choose('轉換方式', '阻值轉色環');
      await page.getByLabel('阻值', { exact: true }).fill('0');
      await expect(result).toContainText('大於');
    },
  },
  {
    slug: 'resistor-network',
    async run({ page, expect, assert, result, choose }) {
      await choose('連接方式', '串聯');
      await fill(page, 'R1', '100');
      await fill(page, 'R2', '220');
      await fill(page, 'R3', '330');
      await number(assert, result, '等效電阻', 650);
      await invalid(page, expect, result, 'R1');
    },
  },
  {
    slug: 'rc-time',
    async run({ page, expect, assert, result, choose }) {
      await choose('狀態', '充電');
      await fill(page, 'R', '10');
      await fill(page, 'C', '100');
      await fill(page, '時間 t', '1');
      await fill(page, '輸入電壓', '5');
      await number(assert, result, '時間常數 τ', 1);
      await number(
        assert,
        result,
        't = 1 s 電壓',
        5 * (1 - Math.exp(-1)),
        1e-10,
      );
      await invalid(page, expect, result, 'R');
    },
  },
  {
    slug: 'capacitor-network',
    async run({ page, expect, assert, result, choose }) {
      await choose('連接方式', '並聯');
      await fill(page, 'C1', '100');
      await fill(page, 'C2', '100');
      await number(assert, result, '等效電容', 2e-7, 1e-15);
      await invalid(page, expect, result, 'C1');
    },
  },
  {
    slug: 'smd-capacitor',
    async run({ page, expect, assert, result, choose }) {
      await choose('轉換方向', '代碼轉電容量');
      await fill(page, 'SMD 電容代碼', '104K');
      await number(assert, result, '電容量', 1e-7, 1e-15);
      await contains(expect, result, '±10%');
      await page.getByLabel('SMD 電容代碼', { exact: true }).fill('10X');
      await expect(result.locator('.output-rows dd')).toHaveCount(0);
    },
  },
  {
    slug: 'led-resistor',
    async run({ page, expect, assert, result, choose }) {
      await choose('選用標準阻值', 'E24');
      await fill(page, '電源電壓', '12');
      await fill(page, 'LED 順向壓降', '3');
      await fill(page, 'LED 數量', '3');
      await fill(page, '目標電流', '20');
      await number(assert, result, '理論限流電阻', 150);
      await number(assert, result, '選用標準阻值', 150);
      await number(assert, result, '理論電阻功耗', 0.06, 1e-12);
      await page.getByLabel('LED 數量', { exact: true }).fill('4');
      await expect(result).toContainText('必須大於');
    },
  },
  {
    slug: 'smd-resistor',
    async run({ page, expect, assert, result, choose }) {
      await choose('轉換方向', '代碼轉阻值');
      await choose('標記格式', '三位數（472）');
      await fill(page, 'SMD 電阻代碼', '472');
      await number(assert, result, '阻值', 4700);
      await page.getByLabel('SMD 電阻代碼', { exact: true }).fill('47X');
      await expect(result.locator('.output-rows dd')).toHaveCount(0);
    },
  },
  {
    slug: 'current-divider',
    async run({ page, expect, assert, result, choose }) {
      await choose('已知來源', '電源電壓');
      await fill(page, '電源電壓', '12');
      await fill(page, 'R1', '100');
      await fill(page, 'R2', '220');
      await fill(page, 'R3', '330');
      await number(
        assert,
        result,
        '等效電阻',
        1 / (1 / 100 + 1 / 220 + 1 / 330),
        1e-10,
      );
      await number(
        assert,
        result,
        '總電流',
        12 / (1 / (1 / 100 + 1 / 220 + 1 / 330)),
        1e-10,
      );
      await invalid(page, expect, result, 'R1');
    },
  },
  {
    slug: 'shunt-resistor',
    async run({ page, expect, assert, result, choose }) {
      await choose('計算方式', '任選兩項求第三項');
      await choose('第一個已知量', '壓降與電流');
      await fill(page, '壓降', '0.075');
      await fill(page, '電流', '100');
      await number(assert, result, '分流電阻', 0.00075, 1e-12);
      await number(assert, result, '功耗', 7.5);
      await invalid(page, expect, result, '壓降');
    },
  },
  {
    slug: 'rc-filter',
    async run({ page, expect, assert, result, choose }) {
      await choose('濾波器', '低通');
      await choose('計算', '由 R、C 求截止頻率');
      await page.getByRole('button', { name: '載入範例' }).click();
      await number(
        assert,
        result,
        '截止頻率',
        1 / (2 * Math.PI * 10000 * 1e-8),
        1e-8,
      );
      await number(
        assert,
        result,
        '指定頻率電壓增益',
        1 / Math.sqrt(1 + (1000 / (1 / (2 * Math.PI * 10000 * 1e-8))) ** 2),
        1e-10,
      );
      await invalid(page, expect, result, 'R');
    },
  },
  {
    slug: 'reactance',
    async run({ page, expect, assert, result, choose }) {
      await choose('元件', '電容（容抗）');
      await choose('計算', '由元件值計算');
      await fill(page, '頻率', '1000');
      await fill(page, 'C', '100');
      await number(
        assert,
        result,
        '電抗大小',
        1 / (2 * Math.PI * 1000 * 1e-7),
        1e-8,
      );
      await contains(expect, result, '−j');
      await invalid(page, expect, result, '頻率');
    },
  },
  {
    slug: 'lc-resonance',
    async run({ page, expect, assert, result, choose }) {
      await choose('已知量', 'L 與 C 求頻率');
      await fill(page, 'L', '0.001');
      await fill(page, 'C', '0.000001');
      await number(
        assert,
        result,
        '諧振頻率 f0',
        1 / (2 * Math.PI * Math.sqrt(0.001 * 0.000001)),
        1e-8,
      );
      await invalid(page, expect, result, 'L');
    },
  },
  {
    slug: 'preferred-resistor',
    async run({ page, expect, assert, result, choose }) {
      await choose('標準阻值系列', 'E24');
      await fill(page, '目標阻值', '128');
      await number(assert, result, '較小標準阻值', 120);
      await number(assert, result, '較大標準阻值', 130);
      await number(assert, result, '最接近值', 130);
      await page.getByLabel('目標阻值', { exact: true }).fill('0');
      await expect(result).toContainText('大於');
    },
  },
];
