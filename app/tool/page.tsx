import Directory from './directory';
import AdSense from '@/components/adsense';
import { tools } from '@/lib/tools/registry';
export const metadata = {
  title: '實用工具',
  description: `${tools.length} 個免費 PLC、電路、編碼與工程單位工具。`,
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
