import Link from '@/components/site-link';
import { excelFormulaLessons } from '@/lib/excel-formulas';
import './page.css';

export const metadata = {
  title: 'Excel 公式教學：20 個常用函數',
  description:
    '從平均、條件統計到查找與文字處理，跟著 20 課 Excel 公式範例、操作步驟和練習學習。',
  alternates: { canonical: 'https://hubplc.com/excel-formulas' },
};

const stages = [
  { title: '基礎統計', range: '01–05', detail: '平均、最大最小值與儲存格計數' },
  { title: '條件與判斷', range: '06–13', detail: '條件計數、加總與邏輯判斷' },
  { title: '查找資料', range: '14–15', detail: '使用代碼查找對應內容' },
  { title: '文字處理', range: '16–19', detail: '擷取文字與計算字元' },
  { title: '數值捨入', range: '20', detail: '調整數值的小數位' },
];

export default function ExcelFormulas() {
  return (
    <main className="shell excel-course">
      <div className="excel-course-intro">
        <p className="eyebrow">HUBPLC / EXCEL FORMULAS</p>
        <h1>
          Excel 公式教學<span>。</span>
        </h1>
        <p className="lead">
          透過 20
          個常用函數，從實際資料表開始，學會輸入公式、判讀結果並完成練習。
        </p>
        <p className="excel-course-evidence">
          教材由茂伯編寫，並由作者本人在 Windows 版 Microsoft 365 與 Excel 2021
          實際操作驗證。
        </p>
        <Link className="action" href="/articles/excel-average">
          從第 1 課開始 →
        </Link>
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
        <h2 id="course-lessons">20 課公式教學</h2>
        <p>每課都有資料表、公式、操作步驟、結果說明與練習。</p>
        <ol className="excel-course-grid">
          {excelFormulaLessons.map((lesson) => (
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
