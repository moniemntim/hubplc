import jsQR from 'jsqr';
import { PNG } from 'pngjs';

/** Browser cases consumed by the consolidated tool-audit runner. */
export const cases = [
  {
    slug: 'rmb-uppercase',
    async run({ page, expect, result }) {
      const input = page.getByLabel('新臺幣金額（元）', { exact: true });
      await input.fill('1001.05');
      await page.getByRole('button', { name: '轉為大寫', exact: true }).click();
      await expect(result).toHaveValue('新臺幣壹仟零壹圓零伍分');
      await input.fill('1.001');
      await expect(result).toHaveCount(0);
      await page.getByRole('button', { name: '轉為大寫', exact: true }).click();
      await expect(page.locator('.crypto-status')).toContainText(
        '小數最多兩位',
      );
      await page.getByRole('button', { name: '清空', exact: true }).click();
      await expect(input).toHaveValue('');
    },
  },
  {
    slug: 'text-case',
    async run({ page, expect, choose, result }) {
      await choose('轉換方式', '英文標題式');
      const input = page.getByLabel('輸入文字', { exact: true });
      await input.fill('plc alarm reset — 中文保持原樣');
      await page.getByRole('button', { name: '轉換文字', exact: true }).click();
      await expect(result).toHaveValue('Plc Alarm Reset — 中文保持原樣');
      await choose('轉換方式', '句首大寫');
      await expect(result).toHaveCount(0);
      await page.getByRole('button', { name: '清空', exact: true }).click();
      await expect(input).toHaveValue('');
    },
  },
  {
    slug: 'key-derivation',
    async run({ page, expect, choose, result }) {
      await page.getByRole('button', { name: '載入範例', exact: true }).click();
      await page.getByRole('button', { name: '派生密鑰', exact: true }).click();
      await expect(result).toHaveValue(
        '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b',
      );
      await page
        .getByRole('textbox', { name: '迭代次數', exact: true })
        .fill('1.5');
      await expect(result).toHaveCount(0);
      await page.getByRole('button', { name: '派生密鑰', exact: true }).click();
      await expect(page.locator('.crypto-status')).toContainText('正整數');
      await choose('鹽值輸入格式', 'HEX 位元組');
      await expect(
        page.getByRole('textbox', { name: '鹽值（HEX）', exact: true }),
      ).toHaveValue('');
      await page.getByRole('button', { name: '清空', exact: true }).click();
      await expect(
        page.getByLabel('密碼（UTF-8）', { exact: true }),
      ).toHaveValue('');
    },
  },
  {
    slug: 'byte-encoding',
    async run({ page, expect, choose, result }) {
      await choose('輸入格式', 'UTF-8 文字');
      await choose('輸出格式', 'UTF-16BE 文字（HEX）');
      const input = page.locator('#byte-encoding-input');
      await input.fill('中文');
      await page.getByRole('button', { name: '轉換', exact: true }).click();
      await expect(result).toHaveValue('4e2d6587');
      await choose('輸入格式', 'Base64');
      await choose('輸出格式', 'HEX');
      await input.fill('Zh==');
      await page.getByRole('button', { name: '轉換', exact: true }).click();
      await expect(page.locator('.crypto-status')).toContainText('Base64');
      await page.getByRole('button', { name: '清空', exact: true }).click();
      await expect(input).toHaveValue('');
    },
  },
  {
    slug: 'crypto',
    async run({ page, expect, result }) {
      const text = '公開測試文字';
      const password = 'public fixture password';
      await page.locator('#crypto-text').fill(text);
      await page.locator('#crypto-password').fill(password);
      await page.locator('#crypto-confirm').fill(password);
      await page.getByRole('button', { name: '加密', exact: true }).click();
      await expect(result).toHaveValue(/^HPLC1\./);
      const encrypted = await result.inputValue();
      await page
        .getByRole('button', { name: '將結果帶入反向操作', exact: true })
        .click();
      await page.getByRole('button', { name: '解密', exact: true }).click();
      await expect(result).toHaveValue(text);
      await page.locator('#crypto-password').fill('wrong password');
      await page.getByRole('button', { name: '解密', exact: true }).click();
      await expect(page.locator('.crypto-status')).toContainText('無法解密');
      await page.getByRole('button', { name: '清空', exact: true }).click();
      await expect(page.locator('#crypto-text')).toHaveValue('');
      await expect(page.locator('#crypto-password')).toHaveValue('');
      if (!encrypted.startsWith('HPLC1.'))
        throw new Error('Expected HPLC1 ciphertext');
    },
  },
  {
    slug: 'hash',
    async run({ page, expect, choose, result }) {
      await page.locator('#hash-text').fill('abc');
      await page.getByRole('button', { name: '計算摘要', exact: true }).click();
      await expect(result).toHaveValue(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      );
      await choose('計算類型', 'HMAC（帶金鑰）');
      await expect(
        page.getByRole('button', { name: '計算摘要', exact: true }),
      ).toBeDisabled();
      await page.locator('#hash-key').fill('public key');
      await page.getByRole('button', { name: '計算摘要', exact: true }).click();
      await expect(result).toHaveValue(
        '60dfececcb7aa9e0bf52ca3d6c15ee22d2c2f9b8b19950d65d80ce4f51c01f46',
      );
      await page.getByRole('button', { name: '清空', exact: true }).click();
      await expect(page.locator('#hash-text')).toHaveValue('');
      await expect(page.locator('#hash-key')).toHaveValue('');
    },
  },
  {
    slug: 'password-generator',
    async run({ page, expect, choose }) {
      await choose('密碼類型', '數字 PIN');
      const length = page.locator('#password-length');
      await length.fill('6');
      await page.getByRole('button', { name: '產生密碼', exact: true }).click();
      const output = page.getByLabel('產生的密碼', { exact: true });
      await expect(output).toHaveValue(/^\d{6}$/);
      await page.getByRole('button', { name: '隱藏密碼', exact: true }).click();
      await expect(
        page.getByLabel('密碼已隱藏', { exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: '清空', exact: true }).click();
      await expect(page.getByLabel('產生的密碼', { exact: true })).toHaveCount(
        0,
      );
    },
  },
  {
    slug: 'text-repair',
    async run({ page, expect, choose }) {
      await choose('修復方式', '手動指定編碼');
      await choose('誤讀編碼（當時用錯的編碼）', 'Windows-1252');
      await choose('原始編碼（文字原本的編碼）', 'UTF-8');
      const input = page.getByLabel('亂碼原文', { exact: true });
      await input.fill('ä¸­æ–‡');
      await page.getByRole('button', { name: '開始修復', exact: true }).click();
      await expect(
        page.getByLabel('完整轉換結果', { exact: true }),
      ).toHaveValue('中文');
      await input.fill('');
      await expect(
        page.getByLabel('完整轉換結果', { exact: true }),
      ).toHaveCount(0);
      await page.getByRole('button', { name: '清空', exact: true }).click();
      await expect(input).toHaveValue('');
    },
  },
  {
    slug: 'qrcode',
    async run({ page, expect, assert, choose }) {
      await choose('內容類型', '網址');
      const url = page.getByLabel('網址', { exact: true });
      await url.fill('https://hubplc.com/');
      const image = page.getByAltText('可掃描的 QR Code', { exact: true });
      await expect(image).toBeVisible();
      const dataUrl = await image.getAttribute('src');
      if (!dataUrl?.startsWith('data:image/png;base64,'))
        throw new Error('QR preview did not provide a PNG data URL');
      const png = PNG.sync.read(
        Buffer.from(dataUrl.split(',', 2)[1], 'base64'),
      );
      assert.equal(
        jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
        'https://hubplc.com/',
      );
      await url.fill('not a url');
      await expect(
        page.getByText('請輸入完整的 http:// 或 https:// 網址。', {
          exact: true,
        }),
      ).toBeVisible();
      await expect(image).toHaveCount(0);
    },
  },
  {
    slug: 'big5',
    async run({ page, expect }) {
      const input = page.getByLabel('輸入文字', { exact: true });
      await input.fill('你好');
      await expect(page.getByText('A741 A66E', { exact: true })).toBeVisible();
      await expect(
        page.getByText('A7 41 A6 6E', { exact: true }),
      ).toBeVisible();
      await input.fill('😀');
      await expect(page.locator('.big5-output pre').first()).toHaveText('??');
      await expect(
        page.getByText('無法以 Big5 編碼', { exact: false }),
      ).toBeVisible();
      await page.getByRole('button', { name: '清空', exact: true }).click();
      await expect(input).toHaveValue('');
    },
  },
];
