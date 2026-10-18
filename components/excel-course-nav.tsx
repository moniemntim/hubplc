import Link from '@/components/site-link';
import articles from '@/lib/article-index.generated.json';
import { excelFormulaLessons } from '@/lib/excel-formulas';

export default function ExcelCourseNav({
  currentSlug,
}: {
  currentSlug: string;
}) {
  const publishedSlugs = new Set(articles.map((article) => article.slug));
  const publishedLessons = excelFormulaLessons.filter((lesson) =>
    publishedSlugs.has(lesson.slug),
  );
  const index = publishedLessons.findIndex(
    (lesson) => lesson.slug === currentSlug,
  );
  if (index < 0) return null;
  const previous = index > 0 ? publishedLessons[index - 1] : undefined;
  const next = publishedLessons[index + 1];

  return (
    <nav className="breadcrumbs" aria-label="Excel 公式課程導覽">
      <Link href="/excel-formulas">返回課程首頁</Link>
      {previous && (
        <Link href={`/articles/${previous.slug}`}>
          上一課：{previous.function}
        </Link>
      )}
      {next && (
        <Link href={`/articles/${next.slug}`}>下一課：{next.function}</Link>
      )}
    </nav>
  );
}
