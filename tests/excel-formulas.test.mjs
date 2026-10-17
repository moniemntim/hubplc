import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { excelFormulaLessons } from '../lib/excel-formulas.ts';

/** @type {Array<[string, string, string, Array<[string, string]>]>} */
const expected = [
  ['AVERAGE', '=AVERAGE(B2:B7)', '30', [['=AVERAGE(B2:B7)', '36']]],
  ['MAX', '=MAX(B2:B7)', '18', [['=MAX(B2:B7)', '16']]],
  ['MIN', '=MIN(B2:B7)', '0', [['=MIN(B2:B7)', '5']]],
  ['COUNT', '=COUNT(B2:B7)', '3', [['=COUNT(B2:B7)', '4']]],
  ['COUNTA', '=COUNTA(B2:B7)', '5', [['=COUNTA(B2:B7)', '6']]],
  [
    'COUNTIF',
    '=COUNTIF(B2:B7,"已出貨")',
    '3',
    [['=COUNTIF(B2:B7,"已出貨")', '3']],
  ],
  [
    'COUNTIFS',
    '=COUNTIFS(B2:B7,"北區",C2:C7,">=1000")',
    '3',
    [['=COUNTIFS(B2:B7,"北區",C2:C7,">=1000")', '2']],
  ],
  [
    'SUMIF',
    '=SUMIF(A2:A6,"文具",C2:C6)',
    '390',
    [['=SUMIF(A2:A6,"文具",C2:C6)', '180']],
  ],
  [
    'SUMIFS',
    '=SUMIFS(C2:C7,A2:A7,"東店",B2:B7,"刷卡")',
    '1050',
    [['=SUMIFS(C2:C7,A2:A7,"東店",B2:B7,"刷卡")', '450']],
  ],
  [
    'IF',
    '=IF(B2<10,"需補貨","庫存足夠")',
    '需補貨',
    [['=IF(B2<10,"需補貨","庫存足夠")', '庫存足夠']],
  ],
  [
    'IFERROR',
    '=IFERROR(B2/C2,"請檢查人數")',
    '請檢查人數',
    [['=IFERROR(B2/C2,"請檢查人數")', '100']],
  ],
  [
    'AND',
    '=AND(B2="是",C2="是")',
    'TRUE',
    [['=AND(B2="是",C2="是")', 'FALSE']],
  ],
  ['OR', '=OR(B2="是",C2="是")', 'TRUE', [['=OR(B2="是",C2="是")', 'FALSE']]],
  [
    'XLOOKUP',
    '=XLOOKUP(D2,A2:A5,C2:C5)',
    '45',
    [['=XLOOKUP(D2,A2:A5,C2:C5)', '60']],
  ],
  [
    'VLOOKUP',
    '=VLOOKUP(D2,A2:C5,3,FALSE)',
    '採購',
    [['=VLOOKUP(D2,A2:C5,3,FALSE)', '業務']],
  ],
  ['LEFT', '=LEFT(A2,2)', '台北', [['=LEFT(A2,2)', '台中']]],
  ['RIGHT', '=RIGHT(A2,4)', '0827', [['=RIGHT(A2,4)', '0934']]],
  ['MID', '=MID(A2,4,4)', '2026', [['=MID(A2,4,4)', '2025']]],
  ['LEN', '=LEN(A2)', '4', [['=LEN(A2)', '5']]],
  ['ROUND', '=ROUND(B2,2)', '123.46', [['=ROUND(B2,2)', '78.99']]],
  [
    'AVERAGEIF',
    '=AVERAGEIF(A2:A8,"北組",B2:B8)',
    '90',
    [
      ['=AVERAGEIF(A2:A8,"西組",B2:B8)', '80'],
      ['=AVERAGEIF(A2:A8,"北組",B2:B8)', '80'],
      ['=AVERAGEIF(B2:B8,">80")', '約 93.333333'],
    ],
  ],
  [
    'AVERAGEIFS',
    '=AVERAGEIFS(C2:C8,A2:A8,"北店",B2:B8,"完成")',
    '160',
    [
      ['=AVERAGEIFS(C2:C8,A2:A8,"南店",B2:B8,"完成")', '200'],
      ['=AVERAGEIFS(C2:C8,B2:B8,"完成",C2:C8,">=160")', '約 193.333333'],
      ['=AVERAGEIFS(C2:C8,A2:A8,"北店",B2:B8,"完成")', '140'],
    ],
  ],
  [
    'MAXIFS',
    '=MAXIFS(C2:C8,A2:A8,"北區",B2:B8,"門市")',
    '180',
    [
      ['=MAXIFS(C2:C8,A2:A8,"南區",B2:B8,"門市")', '300'],
      ['=MAXIFS(C2:C8,A2:A8,"北區",B2:B8,"門市")', '240'],
      ['=MAXIFS(C2:C8,A2:A8,"東區",B2:B8,"門市")', '0'],
    ],
  ],
  [
    'MINIFS',
    '=MINIFS(C2:C8,A2:A8,"北區",B2:B8,"一般")',
    '9',
    [
      ['=MINIFS(C2:C8,A2:A8,"南區",B2:B8,"一般")', '10'],
      ['=MINIFS(C2:C8,A2:A8,"北區",B2:B8,"一般")', '7'],
      ['=MINIFS(C2:C8,A2:A8,"東區",B2:B8,"一般")', '0'],
    ],
  ],
  [
    'COUNTBLANK',
    '=COUNTBLANK(B2:B8)',
    '3',
    [
      ['=COUNTBLANK(B2:B8)', '2'],
      ['=COUNTBLANK(B2:B8)', '4'],
      ['=COUNTBLANK(B2:B5)', '1'],
    ],
  ],
  [
    'SUMPRODUCT',
    '=SUMPRODUCT(B2:B8,C2:C8)',
    '370',
    [
      ['=SUMPRODUCT(B2:B8,C2:C8)', '390'],
      ['=SUMPRODUCT(B2:B8,C2:C8)', '310'],
      ['=SUMPRODUCT(B5:B8,C5:C8)', '200'],
    ],
  ],
  [
    'MEDIAN',
    '=MEDIAN(B2:B8)',
    '11',
    [
      ['=MEDIAN(B2:B4)', '12'],
      ['=MEDIAN(B2:B8)', '10'],
      ['=MEDIAN(B2:B8)', '10.5'],
    ],
  ],
  [
    'LARGE',
    '=LARGE(B2:B8,3)',
    '90',
    [
      ['=LARGE(B2:B8,1)', '95'],
      ['=LARGE(B2:B8,4)', '88'],
      ['=LARGE(B2:B8,D2)', '83'],
    ],
  ],
  [
    'SMALL',
    '=SMALL(B2:B8,3)',
    '15',
    [
      ['=SMALL(B2:B8,1)', '12'],
      ['=SMALL(B2:B8,4)', '18'],
      ['=SMALL(B2:B8,D2)', '20'],
    ],
  ],
  [
    'RANK.EQ',
    '=RANK.EQ(B2,$B$2:$B$8,0)',
    '4',
    [
      ['=RANK.EQ(B7,$B$2:$B$8,0)', '3'],
      ['=RANK.EQ(B5,$B$2:$B$8,0)', '1'],
      ['=RANK.EQ(B3,$B$2:$B$8,1)', '6'],
    ],
  ],
  [
    'ROUNDUP',
    '=ROUNDUP(B2,2)',
    '12.35',
    [
      ['=ROUNDUP(B2,0)', '13'],
      ['=ROUNDUP(B5,2)', '12.3'],
      ['=ROUNDUP(B7,2)', '0.01'],
    ],
  ],
  [
    'ROUNDDOWN',
    '=ROUNDDOWN(B2,2)',
    '12.34',
    [
      ['=ROUNDDOWN(B2,0)', '12'],
      ['=ROUNDDOWN(B5,2)', '12.3'],
      ['=ROUNDDOWN(B7,2)', '0'],
    ],
  ],
  [
    'INT',
    '=INT(B2)',
    '-4',
    [
      ['=INT(B6)', '-1'],
      ['=INT(B7)', '0'],
      ['=INT(B2)', '-9'],
    ],
  ],
  [
    'MOD',
    '=MOD(B2,C2)',
    '3',
    [
      ['=MOD(B2,C2)', '3'],
      ['=MOD(B6,C6)', '-1'],
      ['=MOD(B2,C2)', '#DIV/0!'],
    ],
  ],
  [
    'ABS',
    '=ABS(B2)',
    '18',
    [
      ['=ABS(B4)', '0'],
      ['=ABS(B6)', '2.5'],
      ['=ABS(B2)', '7.25'],
    ],
  ],
  [
    'NOT',
    '=NOT(B2="已完成")',
    'TRUE',
    [
      ['=NOT(B4="已完成")', 'TRUE'],
      ['=NOT(B7="已完成")', 'TRUE'],
      ['=NOT(B2="已完成")', 'FALSE'],
    ],
  ],
  [
    'IFS',
    '=IFS(B2>=90,"優良",B2>=80,"良好",B2>=60,"通過",TRUE,"待加強")',
    '良好',
    [
      ['=IFS(B2>=90,"優良",B2>=80,"良好",B2>=60,"通過",TRUE,"待加強")', '優良'],
      ['=IFS(B2>=90,"優良",B2>=80,"良好",B2>=60,"通過",TRUE,"待加強")', '良好'],
      ['=IFS(B2>=90,"優良",B2>=80,"良好",B2>=60,"通過",TRUE,"待加強")', '通過'],
    ],
  ],
  [
    'SWITCH',
    '=SWITCH(B2,"A","宅配","B","超商取貨","C","自取","待確認")',
    '超商取貨',
    [
      ['=SWITCH(B2,"A","宅配","B","超商取貨","C","自取","待確認")', '宅配'],
      ['=SWITCH(B2,"A","宅配","B","超商取貨","C","自取","待確認")', '自取'],
      ['=SWITCH(B2,"A","宅配","B","超商取貨","C","自取")', '#N/A'],
    ],
  ],
  [
    'EXACT',
    '=EXACT(B2,C2)',
    'FALSE',
    [
      ['=EXACT(B4,C4)', 'FALSE'],
      ['=EXACT(B5,C5)', 'FALSE'],
      ['=EXACT(B2,"Abc01")', 'TRUE'],
    ],
  ],
  [
    'TRIM',
    '=TRIM(B2)',
    'Blue Pen',
    [
      ['=TRIM(B6)', 'A B'],
      ['=TRIM(B2)', '（空白）'],
      ['=TRIM(B2)', '[ Blue Pen ]'],
    ],
  ],
  [
    'SUBSTITUTE',
    '=SUBSTITUTE(A2,"台北","臺北")',
    '臺北-臺北-門市',
    [
      ['=SUBSTITUTE(A2,"台北","臺北",2)', '台北-臺北-門市'],
      ['=SUBSTITUTE(A3,"倉庫","門市")', '台中-門市'],
      ['=SUBSTITUTE(A5,"台北","臺北")', '高雄-門市'],
    ],
  ],
  [
    'TEXTJOIN',
    '=TEXTJOIN("、",TRUE,A2:A8)',
    '小安、小柏、小晴、小岳、小寧',
    [
      ['=TEXTJOIN("",TRUE,A2:A8)', '小安小柏小晴小岳小寧'],
      ['=TEXTJOIN("、",TRUE,A2:A5)', '小安、小柏、小晴'],
      ['=TEXTJOIN("、",TRUE,A2:A8)', '小安、小柏、小禾、小晴、小岳、小寧'],
    ],
  ],
  [
    'DATE',
    '=DATE(A2,B2,C2)',
    '2026/10/17',
    [
      ['=DATE(A3,B3,C3)', '2025/12/31'],
      ['=DATE(A2,B2,C2)', '2026/09/30'],
      ['=DATE(A5,B5,C5)', '2025/03/01'],
    ],
  ],
  [
    'YEAR',
    '=YEAR(B2)',
    '2026',
    [
      ['=YEAR(B5)', '2024'],
      ['=YEAR(B2)', '2026'],
      ['=YEAR(B2)', '2027'],
    ],
  ],
  [
    'MONTH',
    '=MONTH(B2)',
    '10',
    [
      ['=MONTH(B5)', '2'],
      ['=MONTH(B2)', '11'],
      ['=MONTH(B2)', '10'],
    ],
  ],
  [
    'DAY',
    '=DAY(B2)',
    '17',
    [
      ['=DAY(B4)', '1'],
      ['=DAY(B6)', '5'],
      ['=DAY(B2)', '30'],
    ],
  ],
  [
    'INDEX',
    '=INDEX(A2:C8,3,2)',
    '45',
    [
      ['=INDEX(A2:C8,1,2)', '32'],
      ['=INDEX(A2:C8,5,3)', '25'],
      ['=INDEX(A2:C8,3,2)', '50'],
    ],
  ],
  [
    'MATCH',
    '=MATCH("尺",A2:A8,0)',
    '3',
    [
      ['=MATCH("膠帶",A2:A8,0)', '5'],
      ['=MATCH("訂書機",A2:A8,0)', '#N/A'],
      ['=MATCH("筆",A2:A8,0)', '6'],
    ],
  ],
  [
    'FILTER',
    '=FILTER(A2:B8,B2:B8>=20,"沒有符合資料")',
    'E2:F5：筆／32；尺／45；膠帶／20；剪刀／26',
    [
      ['=FILTER(A2:B8,B2:B8>=30,"沒有符合資料")', '筆、32；尺、45'],
      ['=FILTER(A2:B8,B2:B8>=100,"沒有符合資料")', '沒有符合資料'],
      [
        '=FILTER(A2:B8,B2:B8>=20,"沒有符合資料")',
        '筆、32；橡皮擦、22；尺、45；膠帶、20；剪刀、26',
      ],
    ],
  ],
  [
    'UNIQUE',
    '=UNIQUE(A2:A8)',
    'E2:E6：北區、南區、東區、西區、中區',
    [
      ['=UNIQUE(A2:A8,FALSE,FALSE)', '北區；南區；東區；西區；中區'],
      ['=UNIQUE(A2:A8)', '北區；南區；東區；西區'],
      ['=UNIQUE(A6:A8)', '西區；南區；中區'],
    ],
  ],
];

void test('Excel formula registry preserves the approved 50-lesson order', () => {
  assert.deepEqual(
    excelFormulaLessons.map((lesson) => lesson.function),
    expected.map(([name]) => name),
  );
  assert.equal(new Set(excelFormulaLessons.map(({ slug }) => slug)).size, 50);
  assert.deepEqual(
    excelFormulaLessons.map(({ order }) => order),
    Array.from({ length: 50 }, (_, index) => index + 1),
  );
});

void test('each Excel lesson keeps its formula, results, source, image and evidence text', async () => {
  for (const [name, formula, mainResult, practices] of expected) {
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
    for (const [practiceFormula, practiceResult] of practices) {
      assert.ok(
        source.includes(practiceFormula),
        `${name}: practice formula ${practiceFormula}`,
      );
      assert.ok(
        source.includes(`結果：${practiceResult}`),
        `${name}: practice result ${practiceResult}`,
      );
    }
    for (const heading of [
      '## 先準備範例資料',
      '## 輸入這個公式',
      '## 照著做並核對畫面',
      '## 常見錯誤',
      '## 官方參考',
    ])
      assert.ok(source.includes(heading), `${name}: ${heading}`);
    assert.match(
      source,
      /## (?:自己試一次|自己練習與完整解答)/,
      `${name}: practice section`,
    );
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
