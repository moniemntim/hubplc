import articles from '@/lib/article-index.generated.json';
import ArticleDirectory from './directory';

export const metadata = {
  title: 'PLC 技術文章',
  alternates: { canonical: 'https://hubplc.com/articles' },
  description:
    '搜尋 PLC 程式、工業通訊、感測器、HMI 與現場除錯文章，依主題分類找到需要的實務筆記。',
};

export default function Articles() {
  return <ArticleDirectory articles={articles} />;
}
