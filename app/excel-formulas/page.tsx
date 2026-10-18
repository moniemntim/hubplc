import Link from '@/components/site-link';
import articles from '@/lib/article-index.generated.json';
import { excelFormulaLessons } from '@/lib/excel-formulas';
import './page.css';

const publishedSlugs = new Set(articles.map((article) => article.slug));
const publishedLessons = excelFormulaLessons.filter((lesson) =>
  publishedSlugs.has(lesson.slug),
);

export const metadata = {
  title: `Excel 公式教學：${publishedLessons.length} 個常用函數`,
  description: `從基礎統計、邏輯判斷到日期與動態陣列，跟著 ${publishedLessons.length} 課 Excel 公式範例、操作步驟和練習學習。`,
  alternates: { canonical: 'https://hubplc.com/excel-formulas' },
};

const stages = [
  { title: '基礎統計', range: '01–05', detail: '平均、最大最小值與儲存格計數' },
  { title: '條件與判斷', range: '06–13', detail: '條件計數、加總與邏輯判斷' },
  { title: '查找基礎', range: '14–15', detail: '使用代碼查找對應內容' },
  {
    title: '文字與捨入基礎',
    range: '16–20',
    detail: '擷取文字、計算字元與四捨五入',
  },
  {
    title: '條件統計',
    range: '21–26',
    detail: '條件平均、最大最小值、空白計數與相乘加總',
  },
  {
    title: '數值與排名',
    range: '27–35',
    detail: '中位數、排序、取整、餘數與絕對值',
  },
  {
    title: '更多邏輯判斷',
    range: '36–38',
    detail: '反轉條件、多條件判斷與代碼對應',
  },
  {
    title: '更多文字處理',
    range: '39–42',
    detail: '文字比對、空格整理、取代與合併',
  },
  { title: '日期處理', range: '43–46', detail: '組合日期並取出年、月、日' },
  {
    title: '查找與動態陣列',
    range: '47–50',
    detail: '依位置查找、篩選與取出不重複項目',
  },
];

export default function ExcelFormulas() {
  const firstLesson = publishedLessons[0];
  return (
    <main className="shell excel-course">
      <div className="excel-course-intro">
        <p className="eyebrow">HUBPLC / EXCEL FORMULAS</p>
        <h1>
          Excel 公式教學<span>。</span>
        </h1>
        <p className="lead">
          透過目前公開的 {publishedLessons.length}
          個常用函數，從實際資料表開始，學會輸入公式、判讀結果並完成練習。
        </p>
        <p className="excel-course-evidence">
          教材由茂伯編寫，並由作者本人在 Windows 版 Microsoft 365 與 Excel 2021
          實際操作驗證。
        </p>
        {firstLesson && (
          <Link className="action" href={`/articles/${firstLesson.slug}`}>
            從目前第 1 課開始 →
          </Link>
        )}
      </div>

      <section className="excel-course-section" aria-labelledby="course-path">
        <h2 id="course-path">學習進程</h2>
        <p>依序學習，也可以直接選擇需要的函數。</p>
        <ol className="excel-course-stages">
          {stages.map((stage) => (
            <li key={stage.title}>
              <span>{stage.range}</span>
              <strong>{stage.title}</strong>
              <p>{stage.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="excel-course-section"
        aria-labelledby="course-lessons"
      >
        <h2 id="course-lessons">{publishedLessons.length} 課公式教學</h2>
        <p>
          {publishedLessons.length
            ? '每課都有資料表、公式、操作步驟、結果說明與練習。'
            : '未完成驗證的課程暫時下架，完成驗證後會重新公開。'}
        </p>
        <ol className="excel-course-grid">
          {publishedLessons.map((lesson) => (
            <li key={lesson.slug}>
              <Link
                className="excel-course-card"
                href={`/articles/${lesson.slug}`}
              >
                <span className="excel-course-number">
                  第 {String(lesson.order).padStart(2, '0')} 課
                </span>
                <h3>
                  {lesson.function} <span>{lesson.title}</span>
                </h3>
                <p>{lesson.description}</p>
                <span className="excel-course-open">開始學習 →</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
