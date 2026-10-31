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
    slug: 'fx5u-sd-bin-read-write',
    title: 'SD 卡寫入後，怎麼確認真的存對？',
    label: 'FX5U · BIN 資料保存',
    text: '將 D101～D116 的 16 字資料寫進 SD 卡，從同一位置讀回，逐項核對。',
    steps: [
      '設定資料區與 32 位元檔案位置',
      '單次執行 SP.FWRITE 與 SP.FREAD',
      '核對狀態、實際數量與固定辨識值',
    ],
    result: '寫入 D2=16、讀取 D100=16；後九字須與設定的 108～116 相同。',
  },
  {
    slug: 'fx5u-sd-csv-read-write',
    title: '連續記錄時，怎麼保留舊列並讀回？',
    label: 'FX5U · CSV 記錄與讀回',
    text: '先確認一次追加形成 16 欄一列，再用指定列與欄數讀回資料，排除舊值與覆寫。',
    steps: [
      '設定檔尾追加並指定後九字資料',
      '連續做兩次單次寫入並檢查原始 CSV',
      '停用寫入與時鐘覆寫，再指定列讀取',
    ],
    result: '新建測試檔保留兩列、每列 16 欄；讀回數量與 108～116 辨識值一致。',
  },
  {
    slug: 'xca-ecu-https-certificate-setup',
    title: '內網設備 HTTPS，怎麼建立正確信任？',
    label: 'XCA · ECU-1051 · Windows',
    text: '由自己的 CA 簽發含固定 IP SAN 的設備憑證，部署到 ECU，再設定 Windows 信任。',
    steps: [
      '分開建立 CA 與設備專用私鑰',
      '將實際連線 IP 寫入設備憑證 SAN',
      '核對設備送出的憑證、信任鏈與資源',
    ],
    result:
      '連線 IP 與 SAN 相符；Windows 信任 CA，設備提供正確憑證且資源通過 HTTPS。',
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
            從 SD 卡資料保存、設備 HTTPS，到 PLC
            訊號與工程換算，跟著案例完成核對。
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
      {publishedLessons.length > 0 && (
        <section className="home-feature" aria-labelledby="lessons-heading">
          <div className="home-feature-heading">
            <h2 id="lessons-heading">從一個工程問題開始</h2>
            <Link className="text-link" href="/articles">
              瀏覽文章 →
            </Link>
          </div>
          <p className="home-section-note">
            先看要解決的問題與完成判準，再進入完整步驟、裝置設定與操作截圖。
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
                <ol className="home-case-steps">
                  {lesson.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <span className="home-case-result">
                  <strong>完成判準</strong>
                  {lesson.result}
                </span>
                <span className="text-link">查看完整案例 →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
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
      <AdSense />
    </main>
  );
}
