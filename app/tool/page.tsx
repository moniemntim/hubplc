import Directory from './directory';
import AdSense from '@/components/adsense';
export const metadata = {
  title: '實用工具',
  description: '15 個免費 PLC、電路、編碼與工程單位工具。',
  alternates: { canonical: 'https://hubplc.com/tool' },
};
export default function ToolIndex() {
  return (
    <>
      <AdSense />
      <Directory />
    </>
  );
}
