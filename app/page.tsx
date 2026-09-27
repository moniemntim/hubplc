import Link from '@/components/site-link';
import AdSense from '@/components/adsense';
import { tools } from '@/lib/tools/registry';

export const metadata = { alternates: { canonical: 'https://hubplc.com/' } };
const featuredTools = [
  {
    slug: 'analog',
    title: '類比訊號換算',
    text: '輸入 4–20 mA 與工程量程，核對壓力、溫度或液位。',
    example: '12 mA → 0–10 bar 量程的 5 bar',
  },
  {
    slug: 'modbus-address',
    title: 'Modbus 位址換算',
    text: '區分文件參考編號與封包 offset，先確認讀取位置。',
    example: 'Holding Register 40001 → offset 0',
  },
  {
    slug: 'register-converter',
    title: '暫存器資料解析',
    text: '用兩個 16-bit 暫存器比較 Float32 與位元組順序。',
    example: '0x4148、0x0000，ABCD → 12.5',
  },
  {
    slug: 'modbus-crc',
    title: 'Modbus RTU CRC',
    text: '貼上十六進位訊息，核對 RTU 訊框的 CRC。',
    example: '從訊框內容計算 CRC 與附加順序',
  },
];
const lessons = [
  {
    slug: 'plc-analog-scaling-pressure-temperature-level',
    title: '4–20 mA 換成壓力值',
    label: '瀏覽器計算案例',
    text: '從量程填寫到 4、12、20 mA 三點核對，再判讀超量程。',
  },
  {
    slug: 'modbus-response-wrong-value',
    title: 'Modbus 有回應，數值卻不對',
    label: '離線資料解析案例',
    text: '依序核對位址、資料型別與 byte order，重現 12.5 的解析結果。',
  },
  {
    slug: 'plc-self-hold-set-reset-q-series',
    title: '自保持與 SET／RST',
    label: '邏輯推演與模擬練習',
    text: '用虛擬風扇逐掃描檢查啟動、保持、停止與同時命令。',
  },
];
export default function Home() {
  return (
    <main className="shell home-page">
      <AdSense />
      <div className="intro">
        <div>
          <p className="eyebrow">HUBPLC / PLC 工具與操作教學</p>
          <h1>
            先算出結果，
            <br />
            再看懂 PLC 訊號<span>。</span>
          </h1>
          <p className="lead">
            從類比換算、Modbus 判讀到程式邏輯，帶著輸入資料開始。
          </p>
        </div>
      </div>
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
              <h3>{tool.title}</h3>
              <p>{tool.text}</p>
              <span className="home-example">{tool.example}</span>
              <span className="text-link">開啟工具 →</span>
            </Link>
          ))}
        </div>
      </section>
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
          {lessons.map((lesson) => (
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
    </main>
  );
}
