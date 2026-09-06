import Link from '@/components/site-link';
import articles from '@/lib/articles.generated.json';
export const metadata = {
  title: 'PLC 技術文章',
  description: 'PLC 程式設計、通訊與現場除錯的實務筆記。',
};
export default function Articles() {
  const posts = articles as {
    slug: string;
    title: string;
    description: string;
    date: string;
  }[];
  return (
    <main className="prose">
      <p className="eyebrow">FIELD NOTES / PLC 文章</p>
      <h1>
        把現場經驗，
        <br />
        寫成下次的解法。
      </h1>
      <p className="muted">PLC 程式設計、工業通訊與現場除錯的實務筆記。</p>
      {posts.length ? (
        posts.map((post) => (
          <Link
            className="article-card"
            key={post.slug}
            href={'/articles/' + post.slug + '/'}
          >
            <time>{post.date}</time>
            <h2>{post.title}</h2>
            <p>{post.description}</p>
            <span>閱讀文章 ↗</span>
          </Link>
        ))
      ) : (
        <div className="empty-state">
          <h2>第一篇筆記，準備中。</h2>
          <p>實務文章將陸續整理上線。現在可以先使用免費的工程換算工具。</p>
          <Link href="/tool">打開工具箱 →</Link>
        </div>
      )}
    </main>
  );
}
