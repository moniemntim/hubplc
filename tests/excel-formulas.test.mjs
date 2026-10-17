import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { excelFormulaLessons } from '../lib/excel-formulas.ts';

const expected = [
  ['AVERAGE', '=AVERAGE(B2:B7)', '30', '36'],
  ['MAX', '=MAX(B2:B7)', '18', '16'],
  ['MIN', '=MIN(B2:B7)', '0', '5'],
  ['COUNT', '=COUNT(B2:B7)', '3', '4'],
  ['COUNTA', '=COUNTA(B2:B7)', '5', '6'],
  ['COUNTIF', '=COUNTIF(B2:B7,"已出貨")', '3', '3'],
  ['COUNTIFS', '=COUNTIFS(B2:B7,"北區",C2:C7,">=1000")', '3', '2'],
  ['SUMIF', '=SUMIF(A2:A6,"文具",C2:C6)', '390', '180'],
  ['SUMIFS', '=SUMIFS(C2:C7,A2:A7,"東店",B2:B7,"刷卡")', '1050', '450'],
  ['IF', '=IF(B2<10,"需補貨","庫存足夠")', '需補貨', '庫存足夠'],
  ['IFERROR', '=IFERROR(B2/C2,"請檢查人數")', '請檢查人數', '100'],
  ['AND', '=AND(B2="是",C2="是")', 'TRUE', 'FALSE'],
  ['OR', '=OR(B2="是",C2="是")', 'TRUE', 'FALSE'],
  ['XLOOKUP', '=XLOOKUP(D2,A2:A5,C2:C5)', '45', '60'],
  ['VLOOKUP', '=VLOOKUP(D2,A2:C5,3,FALSE)', '採購', '業務'],
  ['LEFT', '=LEFT(A2,2)', '台北', '台中'],
  ['RIGHT', '=RIGHT(A2,4)', '0827', '0934'],
  ['MID', '=MID(A2,4,4)', '2026', '2025'],
  ['LEN', '=LEN(A2)', '4', '5'],
  ['ROUND', '=ROUND(B2,2)', '123.46', '78.99'],
];

void test('Excel formula registry preserves the approved 20-lesson order', () => {
  assert.deepEqual(
    excelFormulaLessons.map((lesson) => lesson.function),
    expected.map(([name]) => name),
  );
  assert.equal(new Set(excelFormulaLessons.map(({ slug }) => slug)).size, 20);
  assert.deepEqual(
    excelFormulaLessons.map(({ order }) => order),
    Array.from({ length: 20 }, (_, index) => index + 1),
  );
});

void test('each Excel lesson keeps its formula, results, source, image and evidence text', async () => {
  for (const [name, formula, mainResult, practiceResult] of expected) {
    const lesson = excelFormulaLessons.find((item) => item.function === name);
    assert.ok(lesson, `${name}: missing registry record`);
    const source = await readFile(
      new URL(`../content/articles/${lesson.slug}.md`, import.meta.url),
      'utf8',
    );
    assert.match(source, /^author: 茂伯$/m, `${name}: author`);
    assert.match(source, /^category: Excel 公式教學$/m, `${name}: category`);
    assert.ok(source.includes(formula), `${name}: main formula`);
    assert.ok(
      source.includes(`正確結果：${mainResult}`),
      `${name}: main result`,
    );
    assert.ok(
      source.includes(`結果：${practiceResult}`),
      `${name}: practice result`,
    );
    for (const heading of [
      '## 先準備範例資料',
      '## 輸入這個公式',
      '## 照著做並核對畫面',
      '## 常見錯誤',
      '## 自己試一次',
      '## 官方參考',
    ])
      assert.ok(source.includes(heading), `${name}: ${heading}`);
    assert.match(
      source,
      /Windows 版 Microsoft 365 與 Excel 2021 實際操作驗證/,
      `${name}: author verification statement`,
    );
    assert.match(
      source,
      /https:\/\/support\.microsoft\.com\//,
      `${name}: Microsoft source`,
    );
    assert.match(
      source,
      new RegExp(
        `<img src="${lesson.image}"[^>]+width="900"[^>]+height="465"[^>]+loading="lazy"`,
      ),
      `${name}: accessible image markup`,
    );
    assert.doesNotMatch(source, /\.(?:docx?|pdf)\b/i, `${name}: no downloads`);
    const imageUrl = new URL(`../public${lesson.image}`, import.meta.url);
    await access(imageUrl);
    const image = await readFile(imageUrl);
    assert.deepEqual(
      [...image.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
      `${name}: PNG signature`,
    );
    assert.equal(image.readUInt32BE(16), 900, `${name}: image width`);
    assert.equal(image.readUInt32BE(20), 465, `${name}: image height`);
  }
});
