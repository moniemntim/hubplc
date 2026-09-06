import Link from '@/components/site-link';
export default function Article({
  article,
}: {
  article: {
    title: string;
    date: string;
    author: string;
    description: string;
    html: string;
  };
}) {
  return (
    <main className="prose">
      <Link href="/articles/">← 所有文章</Link>
      <h1>{article.title}</h1>
      <p className="muted">
        <time>{article.date}</time> · {article.author}
      </p>
      <p>{article.description}</p>
      <article dangerouslySetInnerHTML={{ __html: article.html }} />
      <hr />
      <Link href="/tool">使用 PLC 工具箱 →</Link>
    </main>
  );
}
