import Link from '@/components/site-link';
import AdSense from '@/components/adsense';
import PlcPractice from '@/components/plc-practice';
import { practiceModes } from '@/lib/plc-practice';
import ArticleReadingNav, {
  ArticleDirectoryLink,
} from '@/components/article-reading-nav';
import './article-reader.css';

type ArticleTocItem = {
  id: string;
  title: string;
  level: 2 | 3;
};

type ArticleData = {
  title: string;
  date: string;
  author: string;
  description: string;
  html: string;
  slug?: string;
  category?: string;
  tags?: string[];
  readingMinutes?: number;
  toc?: ArticleTocItem[];
};

type RelatedArticle = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  readingMinutes: number;
  tags?: string[];
};

export default function Article({
  article,
  related = [],
}: {
  article: ArticleData;
  related?: RelatedArticle[];
}) {
  const relatedArticles = related.slice(0, 3);
  const category = article.category || 'PLC 實務筆記';

  return (
    <main className="article-reader">
      <AdSense />
      <div className="article-reader__frame">
        <header className="article-reader__header">
          <ArticleDirectoryLink />
          <p className="article-reader__eyebrow">FIELD NOTES / {category}</p>
          <h1>{article.title}</h1>
          <div className="article-reader__meta" aria-label="文章資訊">
            <span className="article-reader__category">{category}</span>
            <time dateTime={article.date}>{article.date}</time>
            <span>作者：{article.author}</span>
            {article.readingMinutes ? (
              <span>預估 {article.readingMinutes} 分鐘閱讀</span>
            ) : null}
          </div>
          <p className="article-reader__description">{article.description}</p>
        </header>

        {article.slug && practiceModes[article.slug] ? (
          <PlcPractice mode={practiceModes[article.slug]} />
        ) : null}

        <div className="article-reader__layout">
          <ArticleReadingNav toc={article.toc} />
          <article
            className="prose article-reader__content"
            dangerouslySetInnerHTML={{ __html: article.html }}
          />
        </div>

        <footer className="article-reader__footer">
          <p>
            <Link className="text-link" href="/about">
              作者署名、編輯與驗證方式 →
            </Link>
            {' · '}
            <Link className="text-link" href="/about#report">
              回報資訊與範本 →
            </Link>
          </p>
          {relatedArticles.length ? (
            <section
              className="article-reader__related"
              aria-labelledby="related-heading"
            >
              <div className="article-reader__section-heading">
                <p className="article-reader__eyebrow">NEXT NOTES</p>
                <h2 id="related-heading">接著可以讀</h2>
              </div>
              <div className="article-reader__related-grid">
                {relatedArticles.map((post) => (
                  <Link
                    className="article-reader__related-card"
                    href={'/articles/' + post.slug}
                    key={post.slug}
                  >
                    <span className="article-reader__related-meta">
                      {post.category} · {post.readingMinutes} 分鐘
                    </span>
                    <h3>{post.title}</h3>
                    <p>{post.description}</p>
                    <span className="article-reader__related-link">
                      閱讀文章 →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          <Link className="article-reader__tool-link" href="/tool">
            使用 PLC 工具箱 →
          </Link>
        </footer>
      </div>
    </main>
  );
}
