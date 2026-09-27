import Link from '@/components/site-link';

export const metadata = {
  title: '作者、編輯方式與問題回報',
  alternates: { canonical: 'https://hubplc.com/about' },
};
export default function About() {
  return (
    <main className="prose">
      <p className="eyebrow">ABOUT / HUBPLC</p>
      <h1>
        作者、編輯方式
        <br />
        與問題回報
      </h1>
      <p>
        HubPLC 提供 PLC
        與工業自動化的瀏覽器工具、操作範例與技術筆記，讓讀者核對輸入、計算結果與判讀條件。
      </p>
      <h2>作者與維護資訊</h2>
      <p>本站作者與維護者為茂伯，整理 PLC 工具、操作教學與技術筆記。</p>
      <p>
        本次內容整理使用 AI
        協助盤點重複段落、編修文字與製作計算檢查。文章沒有附設備型號、版本與量測紀錄時，請將範例視為教學資料，不視為作者親歷的現場實測。
      </p>
      <h2>內容如何整理與核對</h2>
      <ul>
        <li>
          相近主題先區分使用情境；共用步驟集中說明，延伸文章保留自己的問題、條件與判讀方式。
        </li>
        <li>
          核心案例列出工具、輸入欄位、操作順序、預期結果及失敗時的檢查位置。工具算例可核對數值，不代表已測試
          PLC 硬體。
        </li>
        <li>
          型號相關行為附上適用範圍或手冊來源。設備手冊與韌體版本不同時，需重新核對，不能只套用範例值。
        </li>
        <li>
          文章日期是內容標示日期，不是設備實測日期，也不表示每篇文章都已重新驗證。
        </li>
      </ul>
      <h2>如何分辨驗證方式</h2>
      <ul>
        <li>
          <strong>計算／離線解析：</strong>
          使用固定輸入檢查公式、位址或資料格式，沒有連接設備。
        </li>
        <li>
          <strong>模擬練習：</strong>
          提供虛擬訊號與預期狀態；有實際執行紀錄才稱為已通過模擬，單純表格推演會另外說明。
        </li>
        <li>
          <strong>實體設備實測：</strong>
          需有設備型號、軟體／韌體版本、接線或測試條件、觀察結果與日期。沒有這些紀錄，不標示為實測。
        </li>
      </ul>
      <h2 id="report">問題回報</h2>
      <p>
        文章勘誤、工具問題與內容建議，請寄至{' '}
        <a className="text-link" href="mailto:ceo@hubplc.com">
          ceo@hubplc.com
        </a>
        ，由茂伯收件。點擊連結會開啟你的郵件程式，寄出後才會送出回報。
      </p>
      <p>
        回報時請附文章或工具網址、錯誤段落、重現步驟、輸入值、預期與實際結果；涉及設備時再附型號與版本。請移除密碼、內網位址及客戶資料。
      </p>
      <a className="text-link" href="/content-report-template.txt" download>
        下載問題回報範本（文字檔） →
      </a>
      <h2>從可重現的案例開始</h2>
      <p>
        <Link href="/articles/plc-analog-scaling-pressure-temperature-level">
          類比訊號換算案例
        </Link>
        與
        <Link href="/articles/modbus-response-wrong-value">
          {' '}
          Modbus 數值判讀案例
        </Link>
        可搭配本站工具逐步核對。
      </p>
    </main>
  );
}
