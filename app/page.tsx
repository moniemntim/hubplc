import Link from '@/components/site-link';
import AdSense from '@/components/adsense';
import { tools } from '@/lib/tools/registry';
import articles from '@/lib/article-index.generated.json';
import { excelFormulaLessons } from '@/lib/excel-formulas';
import './home.css';

export const metadata = { alternates: { canonical: 'https://hubplc.com/' } };
const featuredTools = [
  {
    slug: 'analog',
    code: 'mA',
    title: '類比訊號換算',
    text: '輸入 4–20 mA 與工程量程，核對壓力、溫度或液位。',
    example: '12 mA → 0–10 bar 量程的 5 bar',
  },
  {
    slug: 'modbus-address',
    code: '40001',
    title: 'Modbus 位址換算',
    text: '區分文件參考編號與封包 offset，先確認讀取位置。',
    example: 'Holding Register 40001 → offset 0',
  },
  {
    slug: 'register-converter',
    code: '16 bit',
    title: '暫存器資料解析',
    text: '用兩個 16-bit 暫存器比較 Float32 與位元組順序。',
    example: '0x4148、0x0000，ABCD → 12.5',
  },
  {
    slug: 'modbus-crc',
    code: 'CRC',
    title: 'Modbus RTU CRC',
    text: '貼上十六進位訊息，核對 RTU 訊框的 CRC。',
    example: '從訊框內容計算 CRC 與附加順序',
  },
];
const lessons = [
  {
    slug: 'plc-fault-reset-single-acceptance',
    title: '故障解除後，為什麼還要重新按復歸？',
    label: '頁面直接操作 · 逐掃描練習',
    text: '切換按鈕、故障與來源品質，觀察一次接受、長按拒絕與故障保持。',
  },
  {
    slug: 'plc-analog-scaling-pressure-temperature-level',
    title: '類比輸入換算與來源品質',
    label: '頁面直接試算 · 數值判讀',
    text: '切換 mA、原始值與來源品質，區分算得出的數字與可使用的工程值。',
  },
  {
    slug: 'plc-self-hold-set-reset-q-series',
    title: '自保持與 SET／RST',
    label: '邏輯推演與模擬練習',
    text: '用虛擬風扇逐掃描檢查啟動、保持、停止與同時命令。',
  },
];
export default function Home() {
  const publishedSlugs = new Set(articles.map((article) => article.slug));
  const excelCount = excelFormulaLessons.filter((lesson) =>
    publishedSlugs.has(lesson.slug),
  ).length;
  const publishedLessons = lessons.filter((lesson) =>
    publishedSlugs.has(lesson.slug),
  );
  const plcArticleCount = articles.filter(
    (article) => article.category !== 'Excel 公式教學',
  ).length;
  return (
    <main className="shell home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <p className="eyebrow">HUBPLC / PLC 工具與操作教學</p>
          <h1 id="home-title">
            先算出結果，
            <br />
            再看懂 PLC 訊號<span>。</span>
          </h1>
          <p className="lead">
            從類比換算、Modbus 判讀到程式邏輯，帶著輸入資料開始。
          </p>
          <div className="home-hero-actions">
            <Link className="home-button" href="/tool">
              開啟工具箱 <span aria-hidden="true">↗</span>
            </Link>
            <Link
              className="home-button home-button-secondary"
              href="/articles"
            >
              瀏覽 PLC 文章 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <dl className="home-metrics">
            <div>
              <dt>實用工具</dt>
              <dd>
                {tools.length}
                <span> 個</span>
              </dd>
            </div>
            <div>
              <dt>PLC／工程文章</dt>
              <dd>
                {plcArticleCount}
                <span> 篇</span>
              </dd>
            </div>
            <div>
              <dt>Excel 教學</dt>
              <dd>
                {excelCount}
                <span> 課</span>
              </dd>
            </div>
          </dl>
        </div>
        <figure className="home-signal">
          <figcaption>
            <span>ANALOG SIGNAL</span>
            <span>換算範例</span>
          </figcaption>
          <div className="home-signal-body">
            <p className="home-signal-label">4–20 mA 類比輸入</p>
            <p className="home-signal-value">
              12.00 <span>mA</span>
            </p>
            <div className="home-signal-track" aria-hidden="true">
              <span />
            </div>
            <div className="home-signal-endpoints">
              <span>4 mA</span>
              <span>20 mA</span>
            </div>
            <div className="home-signal-output">
              <div>
                <span>對應壓力</span>
                <strong>
                  5 <small>bar</small>
                </strong>
              </div>
              <p>
                工程量程
                <br />
                <strong>0–10 bar</strong>
              </p>
            </div>
          </div>
          <Link href="/tool/analog">
            更換量程試算 <span aria-hidden="true">↗</span>
          </Link>
        </figure>
      </section>
      <section
        id="tools"
        className="home-feature"
        aria-labelledby="tools-heading"
      >
        <div className="home-feature-heading">
          <h2 id="tools-heading">直接使用工具</h2>
          <Link className="text-link" href="/tool">
            全部 {tools.length} 個工具 →
          </Link>
        </div>
        <div className="home-feature-grid">
          {featuredTools.map((tool) => (
            <Link
              className="home-feature-card"
              href={'/tool/' + tool.slug}
              key={tool.slug}
            >
              <span className="home-tool-code">{tool.code}</span>
              <h3>{tool.title}</h3>
              <p>{tool.text}</p>
              <span className="home-example">{tool.example}</span>
              <span className="text-link">開啟工具 →</span>
            </Link>
          ))}
        </div>
      </section>
      {publishedLessons.length > 0 && (
        <section className="home-feature" aria-labelledby="lessons-heading">
          <div className="home-feature-heading">
            <h2 id="lessons-heading">跟著做的代表教學</h2>
            <Link className="text-link" href="/articles">
              瀏覽文章 →
            </Link>
          </div>
          <p className="home-section-note">
            以下為計算、離線解析或邏輯練習，未宣稱已在實體 PLC 上測試。
          </p>
          <div className="home-feature-grid home-lessons">
            {publishedLessons.map((lesson) => (
              <Link
                className="home-feature-card"
                href={'/articles/' + lesson.slug}
                key={lesson.slug}
              >
                <span className="eyebrow">{lesson.label}</span>
                <h3>{lesson.title}</h3>
                <p>{lesson.text}</p>
                <span className="text-link">開始練習 →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {excelCount > 0 && (
        <section className="article-strip" aria-labelledby="excel-heading">
          <div>
            <p className="eyebrow">EXCEL FORMULAS / {excelCount} LESSONS</p>
            <h2 id="excel-heading">Excel 公式教學</h2>
            <p>從基礎統計、條件判斷到日期與動態陣列，跟著資料表與練習學習。</p>
          </div>
          <Link className="text-link" href="/excel-formulas">
            查看 {excelCount} 課 →
          </Link>
        </section>
      )}
      <section className="home-editorial" aria-labelledby="editorial-heading">
        <h2 id="editorial-heading">誰在整理這些內容？</h2>
        <p>
          本站由茂伯整理與維護。本次內容整理使用 AI
          協助編修，工具計算檢查與實體設備實測分開記錄；沒有設備紀錄的範例不標為實測。
        </p>
        <Link className="text-link" href="/about">
          作者說明、編輯方式與問題回報 →
        </Link>
        <p>
          內容勘誤與工具問題：{' '}
          <a className="text-link" href="mailto:ceo@hubplc.com">
            ceo@hubplc.com
          </a>
        </p>
      </section>
      <AdSense />
    </main>
  );
}
