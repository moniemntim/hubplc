import Directory from './tool/directory';
import { tools } from '@/lib/tools/registry';
import { SITE_ORIGIN } from '@/lib/site';
import './tool-home.css';

export const metadata = {
  title: '免費線上工具箱',
  description: `${tools.length} 個免費線上工具：抽籤分組、資料整理、PLC 與電路計算、文字編碼、單位及時間換算，免註冊直接使用。`,
  alternates: { canonical: `${SITE_ORIGIN}/` },
};

export default function Home() {
  return <Directory />;
}
