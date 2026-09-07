export const metadata = { title: '隱私說明' };
export default function Privacy() {
  return (
    <main className="prose">
      <p className="eyebrow">PRIVACY</p>
      <h1>隱私說明</h1>
      <p>更新日期：2026 年 9 月 7 日</p>
      <h2>工具輸入</h2>
      <p>
        本站換算工具在瀏覽器內運算，沒有把你輸入的數值傳送到本站伺服器的功能，也不儲存這些輸入。
      </p>
      <h2>匯率資料</h2>
      <p>
        匯率換算器只有在你按下取得匯率按鈕後，才會向 Frankfurter
        下載固定的一組每日參考匯率，不會傳送金額或你選擇的幣別組合。第三方服務可取得一般連線資訊，例如
        IP 位址；請參閱{' '}
        <a href="https://frankfurter.dev/">Frankfurter 的服務與隱私說明</a>
        。手動匯率模式不需要連線查價。
      </p>
      <h2>網站服務</h2>
      <p>
        本站由 Cloudflare 提供網站傳輸服務。提供服務時，Cloudflare
        可能依其政策處理 IP 位址與連線紀錄。請參閱{' '}
        <a href="https://www.cloudflare.com/privacypolicy/">
          Cloudflare 隱私政策
        </a>
        。
      </p>
      <h2>廣告與分析</h2>
      <p>
        本站在首頁、工具總覽、已發布文章及一般計算工具頁使用 Google AdSense
        廣告。密碼、加解密、QR Code 與其他編碼分類工具頁不載入 AdSense
        程式碼。本站未加入第三方流量分析或會員系統。
      </p>
      <p>
        Google 與其他第三方廣告供應商可能使用 Cookie
        或類似技術，依你造訪本站或其他網站的紀錄提供廣告、衡量廣告成效及防範無效流量。載入廣告時，瀏覽器會向第三方傳送
        IP
        位址、頁面網址與一般裝置／連線資訊。這些服務的資料處理由其各自政策規範。
      </p>
      <p>
        你可透過{' '}
        <a href="https://myadcenter.google.com/">Google 我的廣告中心</a>{' '}
        管理個人化廣告，並在瀏覽器設定中管理或封鎖 Cookie。詳情請參閱{' '}
        <a href="https://policies.google.com/technologies/partner-sites?hl=zh-TW">
          Google 如何使用合作夥伴網站的資訊
        </a>
        、
        <a href="https://policies.google.com/technologies/ads?hl=zh-TW">
          Google 廣告與 Cookie 說明
        </a>
        及 <a href="https://www.aboutads.info/choices/">第三方廣告選擇</a>。
      </p>
      <h2>外部連結</h2>
      <p>點選外部網站連結後，資料處理方式由該網站的隱私政策決定。</p>
    </main>
  );
}
