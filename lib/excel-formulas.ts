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
  ['AVERAGEIF', '依單一條件計算平均', '計算符合一個條件的數值平均。'],
  ['AVERAGEIFS', '依多個條件計算平均', '計算同時符合多個條件的數值平均。'],
  ['MAXIFS', '找出符合條件的最大值', '從符合條件的資料中找出最大值。'],
  ['MINIFS', '找出符合條件的最小值', '從符合條件的資料中找出最小值。'],
  ['COUNTBLANK', '計算範圍中的空白格', '統計指定範圍中的空白儲存格。'],
  ['SUMPRODUCT', '逐列相乘後加總', '將對應數值相乘並加總。'],
  ['MEDIAN', '找出一組數值的中位數', '找出資料排序後的中間值。'],
  ['LARGE', '找出第幾大的數值', '取得資料中指定名次的最大值。'],
  ['SMALL', '找出第幾小的數值', '取得資料中指定名次的最小值。'],
  ['RANK.EQ', '計算名次與同分排名', '計算數值的排名並處理同分。'],
  ['ROUNDUP', '朝遠離零的方向進位', '將數值朝遠離零的方向進位。'],
  ['ROUNDDOWN', '朝接近零的方向捨去', '將數值朝接近零的方向捨去。'],
  ['INT', '向下取最接近的整數', '將數值向下取整數。'],
  ['MOD', '求除法的餘數', '計算數值相除後的餘數。'],
  ['ABS', '求數值的絕對值', '取得數值距離零的大小。'],
  ['NOT', '反轉條件的真假', '將條件判斷結果反轉。'],
  ['IFS', '依序檢查多個條件', '依序判斷條件並回傳對應結果。'],
  ['SWITCH', '將固定代碼對應成文字', '依指定值回傳對應結果。'],
  ['EXACT', '區分大小寫比對文字', '比對兩段文字並區分大小寫。'],
  ['TRIM', '整理文字前後與重複空格', '移除多餘的文字空格。'],
  ['SUBSTITUTE', '依指定文字取代內容', '將文字中的指定內容替換。'],
  ['TEXTJOIN', '用分隔符號合併文字', '用指定分隔符號合併文字。'],
  ['DATE', '把年月日組成日期', '將年、月、日組合為日期。'],
  ['YEAR', '取得日期的西元年份', '從日期中取出年份。'],
  ['MONTH', '取得日期的月份', '從日期中取出月份。'],
  ['DAY', '取得日期的日數', '從日期中取出日數。'],
  ['INDEX', '依範圍內列欄位置取值', '依列與欄的位置取得資料。'],
  ['MATCH', '找出項目在範圍中的位置', '查找指定項目在範圍中的位置。'],
  ['FILTER', '依條件列出符合的資料', '篩選符合條件的資料。'],
  ['UNIQUE', '產生不重複的項目清單', '從資料中取得不重複的項目。'],
];

export const excelFormulaLessons: ExcelFormulaLesson[] = lessons.map(
  ([name, title, description], index) => ({
    order: index + 1,
    function: name,
    slug: `excel-${name.toLowerCase().replaceAll('.', '-')}`,
    title,
    description,
    image: `/images/excel-formulas/excel-${name.toLowerCase().replaceAll('.', '-')}.png`,
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
