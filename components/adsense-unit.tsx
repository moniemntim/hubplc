'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Record<string, never>[];
  }
}

export default function AdSenseUnit() {
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({});
  }, []);

  return (
    <div className="hubplc-ad-unit" aria-label="廣告">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-8014147345117745"
        data-ad-slot="8116472709"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
