import articles from '@/lib/article-index.generated.json';
import ArticleDirectory from './directory';

export const metadata = {
  title: 'PLC、工程與 Excel 教學文章',
  alternates: { canonical: 'https://hubplc.com/articles' },
  description:
    '搜尋 PLC 程式、工業通訊、工程實務與 Excel 公式教學，依主題分類找到需要的操作筆記。',
};

export default function Articles() {
  return <ArticleDirectory articles={articles} />;
}
