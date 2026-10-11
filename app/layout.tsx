import type { Metadata } from 'next';
import Link from '@/components/site-link';
import './globals.css';
import {
  LocalizedText,
  LocalizedNav,
  LocalizedLink,
  ToolLanguageProvider,
} from '@/components/tool-language';
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
        <ToolLanguageProvider>
          <a className="skip" href="#content">
            <LocalizedText zh="跳至內容" en="Skip to content" />
          </a>
          <header className="site-header">
            <LocalizedLink
              href="/"
              className="brand"
              zhLabel="HubPLC 首頁"
              enLabel="HubPLC home"
            >
              <b>H</b>hub<span>plc</span>
              <small>
                <LocalizedText zh="工程師的工具箱" en="Engineer's toolbox" />
              </small>
            </LocalizedLink>
            <LocalizedNav zhLabel="主選單" enLabel="Main navigation">
              <Link href="/tool">
                <LocalizedText zh="實用工具" en="Tools" />
              </Link>
              <Link href="/articles">
                <LocalizedText zh="PLC 文章" en="PLC Articles" />
              </Link>
            </LocalizedNav>
          </header>
          <div id="content">{children}</div>
          <footer className="site-footer">
            <Link href="/" className="footer-brand">
              HubPLC
            </Link>
            <p>
              <LocalizedText
                zh="工具，讓工作更簡單。筆記，讓經驗留下來。"
                en="Tools simplify the work. Notes preserve the experience."
              />
            </p>
            <Link href="/about">
              <LocalizedText zh="關於本站" en="About" />
            </Link>
            <Link href="/privacy">
              <LocalizedText zh="隱私說明" en="Privacy" />
            </Link>
          </footer>
        </ToolLanguageProvider>
      </body>
    </html>
  );
}
