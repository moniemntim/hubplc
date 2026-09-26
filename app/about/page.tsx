export const metadata = {
  title: '關於本站',
  alternates: { canonical: 'https://hubplc.com/about' },
};
export default function About() {
  return (
    <main className="prose">
      <p className="eyebrow">ABOUT / HUBPLC</p>
      <h1>
        工具與經驗，
        <br />
        一起累積。
      </h1>
      <p>
        HubPLC 是以 PLC
        與工業自動化為主題的工具與文章網站，提供日常換算工具，並分享現場技術筆記。
      </p>
      <h2>實用工具</h2>
      <p>
        工具直接在你的瀏覽器內計算。每個工具會說明輸入範圍、公式或位址慣例，方便核對結果。
      </p>
      <h2>PLC 技術文章</h2>
      <p>
        文章整理程式設計、設備通訊與除錯方法，搭配操作範例、結果判讀及適用條件，方便查閱與核對。
      </p>
      <h2>使用範圍</h2>
      <p>
        不同設備的量程、資料格式與位址慣例可能不同，實際設定請依設備手冊核對。
      </p>
    </main>
  );
}
