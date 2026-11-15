'use client';

import { useEffect, useRef, useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
import { ipVersion, type NetworkInfo } from '@/lib/tools/network-info';
import {
  CopyButton,
  Notice,
  ResultRows,
  ToolPanel,
} from '../_components/controls';

export default function IpAddress() {
  const { tr } = useToolLanguage();
  const [info, setInfo] = useState<NetworkInfo | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const clear = () => {
    active.current?.abort();
    active.current = null;
    setInfo(null);
    setStatus('idle');
  };
  const lookup = async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setInfo(null);
    setStatus('loading');
    const timer = setTimeout(() => controller.abort('timeout'), 10000);
    try {
      const response = await fetch('/api/network-info', {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('unavailable');
      const data = (await response.json()) as NetworkInfo;
      if (typeof data.ip !== 'string' || ipVersion(data.ip) !== data.version)
        throw new Error('invalid response');
      if (active.current === controller) {
        setInfo(data);
        setStatus('idle');
      }
    } catch {
      if (active.current === controller) setStatus('error');
    } finally {
      clearTimeout(timer);
    }
  };
  return (
    <ToolPanel
      inputLabel={tr('查詢操作', 'Lookup controls')}
      resultLabel={tr('查詢結果', 'Lookup results')}
      notesLabel={tr('查詢方式與隱私', 'Lookup & privacy')}
      result={
        info ? (
          <ResultRows
            rows={[
              {
                label: tr('公開 IP 位址', 'Public IP address'),
                value: info.ip,
              },
              {
                label: tr('位址版本', 'Address version'),
                value: `IPv${info.version}`,
              },
            ]}
          />
        ) : (
          <Notice>
            {status === 'loading'
              ? tr('正在查詢…', 'Looking up…')
              : status === 'error'
                ? tr(
                    '暫時無法取得連線位址，請稍後重試。此功能需要網站的 Cloudflare 連線資訊。',
                    'Connection information is unavailable. Try again later. This tool requires the site’s Cloudflare connection headers.',
                  )
                : tr(
                    '按「查詢我的 IP」取得目前對網站呈現的連線位址。',
                    'Select Look up my IP to inspect the address seen by this website.',
                  )}
          </Notice>
        )
      }
      notes={
        <>
          <p>
            {tr(
              '按下查詢後，瀏覽器會向本站發出請求，由 Cloudflare 提供的連線資訊取得本次公開 IP。',
              'After you select Look up my IP, the browser sends a request to this site. Connection information supplied by Cloudflare provides the public IP for that request.',
            )}
          </p>
          <p>
            {tr(
              '結果是網站看到的公網出口，可能屬於 VPN、代理或共用 NAT；不是裝置的區網 IP，也無法推定精確位置。',
              'The result is the public egress seen by this site, possibly a VPN, proxy or shared NAT. It is not your device’s LAN address and does not establish an exact location.',
            )}
          </p>
          <p>
            {tr(
              '查詢程式不保存結果；清空只移除畫面顯示。網站傳輸仍由 Cloudflare 提供，連線資料處理方式請參閱隱私說明。',
              'The lookup application does not store results; Clear only removes the displayed result. Cloudflare still handles site delivery; see the privacy notice for connection-data handling.',
            )}
          </p>
        </>
      }
    >
      <p>
        {tr(
          '查詢只在你按下按鈕後執行。切換網路或 VPN 後，可再次查詢比較。',
          'Lookup runs only after you select the button. Query again after changing your network or VPN to compare.',
        )}
      </p>
      <div className="action-row">
        <button
          type="button"
          className="action"
          onClick={lookup}
          disabled={status === 'loading'}
        >
          {tr('查詢我的 IP', 'Look up my IP')}
        </button>
        <button type="button" className="action secondary" onClick={clear}>
          {tr('清空', 'Clear')}
        </button>
        <CopyButton text={info?.ip ?? ''} />
      </div>
    </ToolPanel>
  );
}
