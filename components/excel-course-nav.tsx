import Link from '@/components/site-link';
import { getExcelFormulaLessonNavigation } from '@/lib/excel-formulas';

export default function ExcelCourseNav({
  currentSlug,
}: {
  currentSlug: string;
}) {
  const navigation = getExcelFormulaLessonNavigation(currentSlug);
  if (!navigation) return null;

  return (
    <nav className="breadcrumbs" aria-label="Excel 公式課程導覽">
      <Link href="/excel-formulas">返回課程首頁</Link>
      {navigation.previous && (
        <Link href={`/articles/${navigation.previous.slug}`}>
          上一課：{navigation.previous.function}
        </Link>
      )}
      {navigation.next && (
        <Link href={`/articles/${navigation.next.slug}`}>
          下一課：{navigation.next.function}
        </Link>
      )}
    </nav>
  );
}
