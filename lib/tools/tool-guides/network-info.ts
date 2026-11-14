import type { ToolGuideData } from './types.ts';
const t = (zh: string, en: string) => ({ zh, en });
export const networkInfoGuides: Record<'ip-address', ToolGuideData> = {
  'ip-address': {
    task: t(
      '確認網站看到的公網出口，協助比較網路或 VPN 切換前後的連線。',
      'Inspect the public egress seen by the site and compare connections before and after changing a network or VPN.',
    ),
    scope: t(
      '只讀取這次請求的 Cloudflare 連線標頭，不掃描區網、不定位、不查詢其他人的 IP。',
      'Reads Cloudflare connection headers for this request only; it does not scan a LAN, locate you or look up another person’s IP.',
    ),
    cases: [
      {
        title: t(
          '比較切換 VPN 前後的出口',
          'Compare egress before and after changing a VPN',
        ),
        inputs: [
          {
            label: t('連線條件', 'Connection'),
            value: t(
              '目前網路；另一次可切換 VPN 再查詢',
              'Current network; optionally query again after changing a VPN',
            ),
            source: t(
              '瀏覽器發送至本站的連線；不需輸入任意 IP',
              'The browser connection to this site; no arbitrary IP input is needed',
            ),
          },
        ],
        steps: [
          t(
            '按「查詢我的 IP」，記下公開 IP 與 IPv4／IPv6 版本；可複製位址。',
            'Select Look up my IP, note the address and IPv4/IPv6 version, and optionally copy the address.',
          ),
          t(
            '若要比較，切換網路或 VPN 後再查詢；清空只移除畫面結果。',
            'To compare, change the network or VPN and query again. Clear removes the displayed result.',
          ),
        ],
        expected: [
          t(
            '成功時顯示一個有效 IP 與對應版本。例如文件示例 203.0.113.10 對應 IPv4；不是預定的實際查詢值。',
            'A successful query shows a valid address and matching version. The documentation example 203.0.113.10 is IPv4; it is not a predetermined query result.',
          ),
          t(
            '無法讀取 Cloudflare 標頭或連線失敗時顯示錯誤，不保留上次結果充當本次結果。',
            'If headers are unavailable or the request fails, an error appears and the previous result is cleared.',
          ),
        ],
        interpretation: t(
          '位址相同不表示 VPN 無效：分流、共用出口與 IPv4／IPv6 路由都會影響結果。這只能證明網站看到的本次出口，不能代表所有程式的路由。',
          'Matching addresses do not prove a VPN is ineffective: split tunneling, shared egress and IPv4/IPv6 routing affect results. This identifies the egress seen by this site for this request, not every application’s route.',
        ),
      },
    ],
    pitfalls: [
      t(
        '192.168.x.x 等區網位址通常與此處的公網出口不同。',
        'A LAN address such as 192.168.x.x usually differs from the public egress shown here.',
      ),
      t(
        'IP 可能屬於共用 NAT、代理或 VPN，不能由此推定個人身分或精確位置。',
        'The IP may belong to a shared NAT, proxy or VPN and does not establish a person’s identity or exact location.',
      ),
    ],
    related: ['email-check', 'data-mask'],
    sources: [
      {
        label: t(
          'Cloudflare 連線 IP 標頭說明',
          'Cloudflare connecting-IP headers',
        ),
        url: 'https://developers.cloudflare.com/fundamentals/reference/http-headers/',
      },
    ],
  },
};
