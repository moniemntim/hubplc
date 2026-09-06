import type { Metadata } from 'next';
import Link from '@/components/site-link';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL('https://hubplc.com'),
  icons: { icon: '/favicon.svg' },
  title: { default: 'HubPLC｜PLC 實用工具與技術筆記', template: '%s｜HubPLC' },
  description:
    '免費 PLC、電路、QR Code、Big5 與工程單位換算工具，以及 PLC 技術筆記。',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>
        <a className="skip" href="#content">
          跳至內容
        </a>
        <header className="site-header">
          <Link href="/" className="brand" aria-label="HubPLC 首頁">
            <b>H</b>hub<span>plc</span>
            <small>工程師的工具箱</small>
          </Link>
          <nav aria-label="主選單">
            <Link href="/tool">實用工具</Link>
            <Link href="/articles">PLC 文章</Link>
          </nav>
        </header>
        <div id="content">{children}</div>
        <footer className="site-footer">
          <Link href="/" className="footer-brand">
            HubPLC
          </Link>
          <p>工具，讓工作更簡單。筆記，讓經驗留下來。</p>
          <Link href="/about">關於本站</Link>
          <Link href="/privacy">隱私說明</Link>
        </footer>
      </body>
    </html>
  );
}
