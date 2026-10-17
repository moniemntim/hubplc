import articles from '@/lib/article-index.generated.json';
import { belongsInPlcArticleDirectory } from '@/lib/article-catalog';
import ArticleDirectory from './directory';

export const metadata = {
  title: 'PLC 與工程技術文章',
  alternates: { canonical: 'https://hubplc.com/articles' },
  description:
    '搜尋 PLC 程式、工業通訊與工程實務教學，依主題分類找到需要的操作筆記。',
};

export default function Articles() {
  return (
    <ArticleDirectory
      articles={articles.filter(belongsInPlcArticleDirectory)}
    />
  );
}
