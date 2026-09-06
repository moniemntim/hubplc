import Link from '@/components/site-link';
export const metadata = { alternates: { canonical: 'https://hubplc.com/' } };
export default function Home() {
  return (
    <main className="shell">
      <div className="intro">
        <div>
          <p className="eyebrow">PLC ENGINEERING / FIELD NOTES</p>
          <h1>
            工具，讓工作更簡單。
            <br />
            筆記，讓經驗留下來<span>。</span>
          </h1>
          <p className="lead">給自動化工程師的實用工具與 PLC 技術筆記。</p>
        </div>
      </div>
      <section id="tools" className="home-tools">
        <div>
          <p className="eyebrow">15 TOOLS / 免費使用</p>
          <h2>工程師的工具箱</h2>
          <p>類比訊號、Modbus、電路計算、QR Code 與單位換算。</p>
        </div>
        <Link href="/tool" className="action">
          前往工具總覽 ↗
        </Link>
      </section>
      <section className="article-strip">
        <div>
          <p className="eyebrow">FIELD NOTES</p>
          <h2>PLC 技術筆記</h2>
          <p>從程式邏輯到現場除錯，記錄實際遇到的問題與解法。</p>
        </div>
        <Link className="text-link" href="/articles">
          前往文章區 ↗
        </Link>
      </section>
    </main>
  );
}
