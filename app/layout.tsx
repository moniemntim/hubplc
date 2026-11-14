import type { Metadata } from 'next';
import Link from '@/components/site-link';
import './globals.css';
import { SITE_ORIGIN } from '@/lib/site';
import {
  LocalizedText,
  LocalizedNav,
  LocalizedLink,
  ToolLanguageProvider,
} from '@/components/tool-language';
export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  icons: { icon: '/favicon.svg' },
  title: { default: 'HubPLC｜免費線上工具箱', template: '%s｜HubPLC' },
  description:
    '免費線上抽籤分組、資料整理、PLC 與電路計算、文字編碼、單位及時間工具。',
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
                <LocalizedText zh="線上工具箱" en="Online toolbox" />
              </small>
            </LocalizedLink>
            <LocalizedNav zhLabel="主選單" enLabel="Main navigation">
              <Link href="/">
                <LocalizedText zh="全部工具" en="All tools" />
              </Link>
              <Link href="/about">
                <LocalizedText zh="使用說明" en="About the tools" />
              </Link>
              <Link href="/about#report">
                <LocalizedText zh="問題回報" en="Report an issue" />
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
                zh="計算、轉換、檢查，讓日常工作更順手。"
                en="Calculate, convert, and check. Make everyday work easier."
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
