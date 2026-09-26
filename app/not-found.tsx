import Link from '@/components/site-link';
export default function NotFound() {
  return (
    <main className="prose">
      <p className="eyebrow">404</p>
      <h1>找不到這個頁面</h1>
      <p>網址可能有誤，或頁面已移動。你可以回到首頁，重新尋找工具或文章。</p>
      <Link href="/">回到首頁 →</Link>
    </main>
  );
}
