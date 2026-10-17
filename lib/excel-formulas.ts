export type ExcelFormulaLesson = {
  order: number;
  function: string;
  slug: string;
  title: string;
  description: string;
  image: string;
};

const lessons: [string, string, string][] = [
  ['AVERAGE', '計算數值的平均數', '計算一組數值的平均。'],
  ['MAX', '找出最大數值', '從資料中找出最大的數值。'],
  ['MIN', '找出最小數值', '從資料中找出最小的數值。'],
  ['COUNT', '計算數字儲存格的個數', '統計含有數字的儲存格。'],
  ['COUNTA', '計算有內容的儲存格個數', '統計非空白的儲存格。'],
  ['COUNTIF', '依一個條件計算筆數', '統計符合單一條件的資料。'],
  ['COUNTIFS', '依多個條件同時計算筆數', '統計同時符合多個條件的資料。'],
  ['SUMIF', '依單一條件加總', '加總符合一個條件的數值。'],
  ['SUMIFS', '依多個條件加總', '加總同時符合多個條件的數值。'],
  ['IF', '依條件顯示不同結果', '依判斷結果顯示不同內容。'],
  ['IFERROR', '出現計算錯誤時顯示提示', '為公式錯誤設定替代結果。'],
  ['AND', '檢查是否全部條件都成立', '檢查多個條件是否全部成立。'],
  ['OR', '檢查是否至少一個條件成立', '檢查是否有任一條件成立。'],
  ['XLOOKUP', '依代碼查找資料', '依查找值取得對應資料。'],
  ['VLOOKUP', '由左向右查表', '從資料表左欄查找對應欄位。'],
  ['LEFT', '取出左邊的文字', '從文字開頭取出指定字元。'],
  ['RIGHT', '取出右邊的文字', '從文字結尾取出指定字元。'],
  ['MID', '取出指定位置的文字', '從指定位置擷取文字。'],
  ['LEN', '計算文字字元數', '計算文字包含的字元數。'],
  ['ROUND', '四捨五入到指定小數位', '依指定的位數進行四捨五入。'],
];

export const excelFormulaLessons: ExcelFormulaLesson[] = lessons.map(
  ([name, title, description], index) => ({
    order: index + 1,
    function: name,
    slug: `excel-${name.toLowerCase()}`,
    title,
    description,
    image: `/images/excel-formulas/excel-${name.toLowerCase()}.png`,
  }),
);

export function getExcelFormulaLessonNavigation(slug: string) {
  const index = excelFormulaLessons.findIndex((lesson) => lesson.slug === slug);
  if (index < 0) return null;
  return {
    current: excelFormulaLessons[index],
    previous: excelFormulaLessons[index - 1] ?? null,
    next: excelFormulaLessons[index + 1] ?? null,
  };
}
