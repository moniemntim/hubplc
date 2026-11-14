import {
  LanguageSwitcher,
  LocalizedDocumentMetadata,
  LocalizedText,
} from '@/components/tool-language';

export const metadata = {
  title: '隱私說明',
  description: 'HubPLC 的工具資料處理、外部服務與廣告說明。',
  alternates: { canonical: 'https://hubplc.com/privacy' },
};
export default function Privacy() {
  return (
    <main className="prose">
      <LocalizedDocumentMetadata
        titleZh="隱私說明"
        titleEn="Privacy"
        descriptionZh="HubPLC 的工具資料處理、外部服務與廣告說明。"
        descriptionEn="How HubPLC tools, external services, and advertising handle data."
      />
      <LanguageSwitcher />
      <p className="eyebrow">HUBPLC / PRIVACY</p>
      <h1>
        <LocalizedText zh="隱私說明" en="Privacy" />
      </h1>
      <p>
        <LocalizedText
          zh="更新日期：2026 年 11 月 15 日"
          en="Updated: November 15, 2026"
        />
      </p>
      <h2>
        <LocalizedText zh="工具輸入" en="Tool inputs" />
      </h2>
      <p>
        <LocalizedText
          zh="工具會在你的瀏覽器內處理輸入。一般換算工具不會主動將輸入傳送到本站伺服器，也不會儲存一般換算的輸入值。"
          en="Tools process inputs in your browser. General conversion tools do not actively send input to this site's servers or store ordinary conversion values."
        />
      </p>
      <h2>
        <LocalizedText zh="碼錶與分享連結" en="Stopwatch and share links" />
      </h2>
      <p>
        <LocalizedText
          zh="碼錶會把計時狀態與單圈紀錄儲存在這台裝置的瀏覽器，讓你重新開啟後接續使用。重設可清空紀錄。分享連結會包含分享當下的狀態；取得連結的人可以讀取該狀態，後續操作不會同步。"
          en="The stopwatch stores its running state and laps in this device's browser so you can continue after reopening it. Reset clears those records. A share link contains the state at the time it is shared; anyone with the link can read that state, and later actions do not sync."
        />
      </p>
      <h2>
        <LocalizedText
          zh="既有文章的瀏覽狀態"
          en="Existing article browsing state"
        />
      </h2>
      <p>
        <LocalizedText
          zh="既有文章總覽會把搜尋條件、分類與頁碼放入網址，並在目前瀏覽器工作階段保存清單網址及捲動位置，方便從文章返回清單。分享連結也會包含這些搜尋條件。"
          en="The existing article directory puts search terms, category, and page number in the URL and retains the directory URL and scroll position for the current browser session, so you can return from an article. Shared links include those search conditions."
        />
      </p>
      <h2>
        <LocalizedText zh="語言選擇" en="Language selection" />
      </h2>
      <p>
        <LocalizedText
          zh="第一次開啟工具時，網站會以 Cloudflare 提供的連線國家代碼選擇繁體中文或英文；本站不會保存原始 IP 位址或國家代碼。你也可以手動切換，選擇會以"
          en="When you first open a tool, the site uses the connection-country code supplied by Cloudflare to choose Traditional Chinese or English; the site does not retain the raw IP address or country code. You can also switch manually; the choice is stored in "
        />
        <code>hubplc:locale</code>
        <LocalizedText
          zh="儲存在這台裝置的瀏覽器中，直到你清除網站資料。若國家判定無法使用，會以瀏覽器偏好語言作為備援。"
          en=" in this device's browser until you clear site data. When country selection is unavailable, the browser language preference is the fallback."
        />
      </p>
      <h2>
        <LocalizedText zh="匯率資料" en="Exchange-rate data" />
      </h2>
      <p>
        <LocalizedText
          zh="匯率換算器只會在你按下取得匯率後，向 Frankfurter 下載固定的一組每日參考匯率；不會傳送金額或你選擇的幣別組合。第三方服務仍可能取得一般連線資訊，例如 IP 位址。手動匯率模式不會連線查價。請參閱"
          en="The currency converter downloads a fixed set of daily reference rates from Frankfurter only after you choose to fetch rates; it does not send the amount or your selected currency pair. That third-party service may still receive ordinary connection data such as an IP address. Manual-rate mode does not fetch rates. See "
        />
        <a href="https://frankfurter.dev/">Frankfurter</a>
        <LocalizedText
          zh=" 的服務與隱私說明。"
          en=" for its service and privacy information."
        />
      </p>
      <h2>
        <LocalizedText zh="網站傳輸服務" en="Website delivery" />
      </h2>
      <p>
        <LocalizedText
          zh="本站由 Cloudflare 提供網站傳輸服務。提供服務時，Cloudflare 可能依其政策處理 IP 位址與連線紀錄。請參閱"
          en="Cloudflare provides website delivery. In providing that service, Cloudflare may process IP addresses and connection logs under its policies. See "
        />
        <a href="https://www.cloudflare.com/privacypolicy/">
          <LocalizedText
            zh="Cloudflare 隱私政策"
            en="Cloudflare's privacy policy"
          />
        </a>
        <LocalizedText zh="。" en="." />
      </p>
      <h2>
        <LocalizedText zh="廣告與分析" en="Advertising and analytics" />
      </h2>
      <p>
        <LocalizedText
          zh="一般計算工具頁與既有文章頁，可能在主要內容後使用 Google AdSense。首頁工具總覽與舊 /tool 轉址頁不載入 AdSense；密碼、加解密、QR Code 與其他編碼分類工具也不載入 AdSense。本站沒有第三方流量分析或會員系統。"
          en="General calculator pages and existing articles may use Google AdSense after the main content. The tool directory on the home page and the legacy /tool redirect do not load AdSense; password, cryptography, QR Code, and other encoding-category tools do not load AdSense either. The site has no third-party traffic analytics or membership system."
        />
      </p>
      <p>
        <LocalizedText
          zh="載入廣告時，Google 與其他第三方廣告供應商可能使用 Cookie 或類似技術，並接收 IP 位址、頁面網址及一般裝置／連線資訊，用於提供及衡量廣告與防範無效流量。資料處理由各服務的政策規範。你可透過"
          en="When ads load, Google and other third-party ad providers may use cookies or similar technologies and receive an IP address, page URL, and general device or connection data to provide and measure ads and prevent invalid traffic. Their policies govern that processing. You can use "
        />
        <a href="https://myadcenter.google.com/">
          <LocalizedText zh="Google 我的廣告中心" en="Google My Ad Center" />
        </a>
        <LocalizedText
          zh="管理個人化廣告，並在瀏覽器設定中管理或封鎖 Cookie。另請參閱 "
          en=" to manage personalized ads and browser settings to manage or block cookies. Also see "
        />
        <a href="https://policies.google.com/technologies/partner-sites?hl=zh-TW">
          <LocalizedText
            zh="Google 如何使用合作夥伴網站的資訊"
            en="how Google uses information from partner sites"
          />
        </a>
        <LocalizedText zh="、" en=", " />
        <a href="https://policies.google.com/technologies/ads?hl=zh-TW">
          <LocalizedText
            zh="Google 廣告與 Cookie 說明"
            en="Google ads and cookies"
          />
        </a>
        <LocalizedText zh="及 " en=" and " />
        <a href="https://www.aboutads.info/choices/">
          <LocalizedText zh="第三方廣告選擇" en="ad choices" />
        </a>
        <LocalizedText zh="。" en="." />
      </p>
      <h2>
        <LocalizedText zh="外部連結" en="External links" />
      </h2>
      <p>
        <LocalizedText
          zh="開啟外部網站後，資料處理方式由該網站的隱私政策決定。"
          en="After opening an external website, that site's privacy policy governs its data handling."
        />
      </p>
    </main>
  );
}
