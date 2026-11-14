import {
  LanguageSwitcher,
  LocalizedDocumentMetadata,
  LocalizedText,
} from '@/components/tool-language';

export const metadata = {
  title: '關於 HubPLC',
  description: 'HubPLC 的瀏覽器工程工具、使用方式與問題回報。',
  alternates: { canonical: 'https://hubplc.com/about' },
};
export default function About() {
  return (
    <main className="prose">
      <LocalizedDocumentMetadata
        titleZh="關於 HubPLC"
        titleEn="About HubPLC"
        descriptionZh="HubPLC 的瀏覽器工程工具、使用方式與問題回報。"
        descriptionEn="Browser-based engineering tools, usage notes, and issue reports for HubPLC."
      />
      <LanguageSwitcher />
      <p className="eyebrow">HUBPLC / ENGINEERING TOOLS</p>
      <h1>
        <LocalizedText
          zh="把工程計算留在瀏覽器裡"
          en="Keep engineering calculations in your browser"
        />
      </h1>
      <p>
        <LocalizedText
          zh="HubPLC 集中提供 PLC、電路、資料編碼與工程單位工具。輸入數值後先核對單位、訊號基準與設備資料，再把結果帶回現場或文件。"
          en="HubPLC brings together PLC, electrical, data-encoding, and engineering-unit tools. Check units, signal references, and equipment data before using a result in the field or in documentation."
        />
      </p>
      <h2>
        <LocalizedText zh="怎麼使用工具" en="How to use the tools" />
      </h2>
      <ul>
        <li>
          <LocalizedText
            zh="先從工具總覽搜尋工作名稱、單位或關鍵字，確認用途與輸入欄位。"
            en="Search the tool directory by task, unit, or keyword, then confirm the purpose and input fields."
          />
        </li>
        <li>
          <LocalizedText
            zh="輸入現場量測值、設備銘牌或已確認的文件值；不要以不明來源的預設值取代設備資料。"
            en="Use measured values, nameplate data, or confirmed documentation. Do not replace equipment data with an unknown preset."
          />
        </li>
        <li>
          <LocalizedText
            zh="對照頁面的試算範例與結果單位，確認結果符合你的工作條件。"
            en="Compare the worked example and result units on the page with your job conditions."
          />
        </li>
      </ul>
      <h2>
        <LocalizedText zh="結果的適用範圍" en="Where results apply" />
      </h2>
      <p>
        <LocalizedText
          zh="工具依頁面列出的公式與輸入條件運算。量程、接線、通訊位址、位元組順序、功率因數與保護設定仍要以設備手冊、現場量測與專案規範為準。"
          en="Tools calculate from the formulas and conditions shown on each page. Ranges, wiring, communication addresses, byte order, power factor, and protection settings still need confirmation against the equipment manual, field measurements, and project requirements."
        />
      </p>
      <h2 id="report">
        <LocalizedText zh="維護與回報" en="Maintenance and reports" />
      </h2>
      <p>
        <LocalizedText
          zh="本站由茂伯維護。工具問題、勘誤與功能建議請寄至"
          en="HubPLC is maintained by 茂伯. Send tool issues, corrections, and feature suggestions to "
        />{' '}
        <a className="text-link" href="mailto:ceo@hubplc.com">
          ceo@hubplc.com
        </a>
        <LocalizedText
          zh="；點擊後會開啟你的郵件程式，寄出後才會送出回報。"
          en=". Selecting the link opens your mail app; no report is sent until you send the email."
        />
      </p>
      <p>
        <LocalizedText
          zh="請附上工具網址、重現步驟、輸入值、預期結果與實際結果。涉及設備時再附型號與版本；請移除密碼、內網位址及客戶資料。"
          en="Include the tool URL, steps to reproduce, input values, expected result, and actual result. Add model and version when equipment is involved, and remove passwords, private network addresses, and customer data."
        />
      </p>
      <a className="text-link" href="/content-report-template.txt" download>
        <LocalizedText
          zh="下載問題回報範本（文字檔） →"
          en="Download the issue report template (text file) →"
        />
      </a>
    </main>
  );
}
