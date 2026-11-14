import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';

const article = (slug) =>
  readFile(resolve('content/articles', `${slug}.md`), 'utf8');

// These calculations independently check the published worked examples. They
// model the stated business rules; they do not execute Microsoft Excel.
void test('reworked Excel lessons retain coherent screenshots and independently computed results', async () => {
  const [maxifs, minifs, roundup, rounddown, large, small] = await Promise.all(
    [
      'excel-maxifs',
      'excel-minifs',
      'excel-roundup',
      'excel-rounddown',
      'excel-large',
      'excel-small',
    ].map(article),
  );

  const peaks = [
    ['日班', '加熱區', 68],
    ['夜班', '加熱區', 71],
    ['日班', '冷卻區', 0],
    ['日班', '加熱區', 71],
    ['日班', '加熱區', 69],
    ['日班', '加熱區', 71],
  ];
  const selectedPeaks = peaks.filter(
    ([shift, zone]) => shift === '日班' && zone === '加熱區',
  );
  assert.equal(
    Math.max(...selectedPeaks.map(([, , temperature]) => temperature)),
    71,
  );
  assert.equal(
    peaks.filter(([shift, zone]) => shift === '停機' && zone === '加熱區')
      .length,
    0,
  );
  assert.match(
    maxifs,
    /=MAXIFS\(\$C\$2:\$C\$7,\$A\$2:\$A\$7,"日班",\$B\$2:\$B\$7,"加熱區"\)/,
  );
  assert.match(
    maxifs,
    /COUNTIFS\(\$A\$2:\$A\$7,"停機",\$B\$2:\$B\$7,"加熱區"\)/,
  );
  assert.match(maxifs, /還原班別為日班/);
  assert.match(maxifs, /日班",\$B\$2:\$B\$7,"冷卻區"/);
  assert.match(maxifs, /本表沒有時間或機台欄位/);

  const cycles = [
    ['完成', 18],
    ['完成', 9],
    ['故障', 0],
    ['未完成', null],
    ['完成', 12],
    ['完成', 9],
  ];
  const validCycles = cycles.filter(
    ([status, minutes]) => status === '完成' && minutes > 0,
  );
  assert.equal(Math.min(...validCycles.map(([, minutes]) => minutes)), 9);
  assert.equal(validCycles.length, 4);
  assert.match(
    minifs,
    /=MINIFS\(\$C\$2:\$C\$7,\$B\$2:\$B\$7,"完成",\$C\$2:\$C\$7,">0"\)/,
  );
  assert.match(minifs, /將 B6 的狀態改為「故障」/);
  assert.match(minifs, /再把 C3 與 C7 的分鐘都改為 11/);
  assert.match(minifs, /先把 B6 還原為「完成」/);

  const requiredKg = 253;
  const packKg = 12.5;
  const packs = Math.ceil(requiredKg / packKg);
  assert.deepEqual(
    [packs, packs * packKg, packs * packKg - requiredKg],
    [21, 262.5, 9.5],
  );
  assert.match(roundup, /ROUNDUP\(B2\/B3,0\)/);
  assert.match(roundup, /檢查需求與包裝/);
  assert.match(roundup, /COUNT\(B2:B3\)<>2/);
  assert.match(roundup, /=IF\(ISNUMBER\(B4\),B4\*B3,""\)/);
  assert.match(roundup, /=IF\(ISNUMBER\(B5\),B5-B2,""\)/);

  const availableMm = 1800;
  const pieceMm = 350;
  const kerfMm = 3;
  const pieces = Math.floor(availableMm / (pieceMm + kerfMm));
  const leftover = availableMm - pieces * (pieceMm + kerfMm);
  assert.deepEqual([pieces, leftover], [5, 35]);
  assert.deepEqual(
    [Math.floor(2118 / (pieceMm + kerfMm)), 2118 - 6 * (pieceMm + kerfMm)],
    [6, 0],
  );
  assert.match(rounddown, /ROUNDDOWN\(B2\/\(B3\+B4\),0\)/);
  assert.match(rounddown, /每件切斷鋸縫/);
  assert.match(rounddown, /=IF\(ISNUMBER\(B5\),B2-B5\*\(B3\+B4\),""\)/);
  assert.match(rounddown, /不是機台最佳化或多料條排版/);
  assert.match(rounddown, /COUNT\(B2:B4\)<>3/);
  assert.match(rounddown, /NOT\(ISNUMBER\(B5\)\),"修正尺寸"/);
  assert.match(rounddown, /先把 B2 還原為 \*\*1,800\*\*/);

  const pressures = [94, 88, 94, 76, 90].sort((a, b) => b - a);
  assert.equal(pressures[1], 94);
  assert.equal(pressures[2], 90);
  assert.match(large, /=LARGE\(\$B\$2:\$B\$6,D2\)/);
  assert.match(large, /k 超出範圍/);
  assert.match(large, /NOT\(ISNUMBER\(D2\)\)/);
  assert.match(large, /D2<>INT\(D2\)/);

  const helperCycles = [19, '', 12, '', 12, 27]
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  assert.equal(helperCycles[1], 12);
  assert.equal(helperCycles[2], 19);
  assert.match(small, /=SMALL\(\$D\$2:\$D\$7,F2\)/);
  assert.match(small, /ISNUMBER\(C2\)/);
  assert.match(small, /NOT\(ISNUMBER\(F2\)\)/);
  assert.match(small, /F2<>INT\(F2\)/);

  for (const [name, source] of Object.entries({
    maxifs,
    minifs,
    roundup,
    rounddown,
    large,
    small,
  })) {
    assert.doesNotMatch(
      source,
      /本教學由作者茂伯編寫，並由作者在 Windows 版 Microsoft 365 與 Excel 2021 實際操作驗證。/,
    );
    assert.match(
      source,
      new RegExp(`/images/excel-formulas/excel-${name}\\.png`),
    );
    assert.match(source, /快速驗證：保留的基礎範例/);
  }
});
