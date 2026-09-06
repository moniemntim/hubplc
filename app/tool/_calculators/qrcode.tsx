'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import {
  buildQrPayload,
  pngBytesFromDataUrl,
  type QrFields,
  type QrMode,
} from '@/lib/tools/encoding';
import { attempt } from '@/lib/tools/core';
import {
  Choice,
  Notice,
  TextField,
  ToolPanel,
} from '@/app/tool/_components/controls';

const initialFields: QrFields = {
  text: 'https://hubplc.com/',
  url: 'https://hubplc.com/',
  ssid: '',
  password: '',
  security: 'WPA',
  hidden: false,
  name: '',
  organization: '',
  phone: '',
  email: '',
  website: '',
};
const modes = [
  { value: 'text', label: '文字' },
  { value: 'url', label: '網址' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'vcard', label: '聯絡人名片' },
] as const;
const levels = [
  { value: 'L', label: 'L（約 7%）' },
  { value: 'M', label: 'M（約 15%）' },
  { value: 'Q', label: 'Q（約 25%）' },
  { value: 'H', label: 'H（約 30%）' },
] as const;

function download(content: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function QrcodeCalculator() {
  const [mode, setMode] = useState<QrMode>('url');
  const [fields, setFields] = useState<QrFields>(initialFields);
  const [level, setLevel] = useState('M');
  const [generation, setGeneration] = useState({
    key: '',
    image: '',
    svg: '',
    error: '',
  });
  const version = useRef(0);
  const payload = attempt(() => buildQrPayload(mode, fields));
  const payloadText = payload.data ?? '';
  const generationKey = `${level}\u0000${payloadText}`;

  function setField<K extends keyof QrFields>(key: K, value: QrFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    const currentVersion = ++version.current;
    if (!payloadText) return;
    void Promise.all([
      QRCode.toDataURL(payloadText, {
        errorCorrectionLevel: level as 'L' | 'M' | 'Q' | 'H',
        width: 512,
        margin: 4,
      }),
      QRCode.toString(payloadText, {
        errorCorrectionLevel: level as 'L' | 'M' | 'Q' | 'H',
        type: 'svg',
        margin: 4,
      }),
    ])
      .then(([dataUrl, svgMarkup]) => {
        if (currentVersion === version.current) {
          setGeneration({
            key: generationKey,
            image: dataUrl,
            svg: svgMarkup,
            error: '',
          });
        }
      })
      .catch(() => {
        if (currentVersion === version.current)
          setGeneration({
            key: generationKey,
            image: '',
            svg: '',
            error: '無法產生 QR Code，請縮短內容後再試。',
          });
      });
  }, [generationKey, level, payloadText]);

  const activeGeneration =
    generation.key === generationKey ? generation : undefined;
  const result = payload.error ? (
    <Notice>{payload.error}</Notice>
  ) : activeGeneration?.error ? (
    <Notice>{activeGeneration.error}</Notice>
  ) : activeGeneration?.image ? (
    <>
      <div className="qr-preview">
        {/* QR data is generated locally and only exists as an in-memory data URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={activeGeneration.image} alt="可掃描的 QR Code" />
      </div>
      <p>內容會保留在此瀏覽器中處理。</p>
      <div className="action-row">
        <button
          type="button"
          className="action"
          onClick={() =>
            download(
              pngBytesFromDataUrl(activeGeneration.image).buffer as ArrayBuffer,
              'image/png',
              'hubplc-qrcode.png',
            )
          }
        >
          下載 PNG
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() =>
            download(
              activeGeneration.svg,
              'image/svg+xml;charset=utf-8',
              'hubplc-qrcode.svg',
            )
          }
          disabled={!activeGeneration.svg}
        >
          下載 SVG
        </button>
      </div>
    </>
  ) : (
    <Notice>正在產生 QR Code…</Notice>
  );

  let fieldsUi: ReactNode;
  if (mode === 'text')
    fieldsUi = (
      <TextField
        label="文字內容"
        value={fields.text}
        onChange={(value) => setField('text', value)}
        multiline
      />
    );
  else if (mode === 'url')
    fieldsUi = (
      <TextField
        label="網址"
        value={fields.url}
        onChange={(value) => setField('url', value)}
        type="url"
      />
    );
  else if (mode === 'wifi')
    fieldsUi = (
      <>
        <TextField
          label="Wi-Fi 名稱（SSID）"
          value={fields.ssid}
          onChange={(value) => setField('ssid', value)}
        />
        <TextField
          label="密碼"
          value={fields.password}
          onChange={(value) => setField('password', value)}
          type="password"
        />
        <Choice
          label="安全性"
          value={fields.security}
          onChange={(value) =>
            setField('security', value as QrFields['security'])
          }
          options={[
            { value: 'WPA', label: 'WPA/WPA2' },
            { value: 'WEP', label: 'WEP' },
            { value: 'nopass', label: '開放網路' },
          ]}
        />
        <Choice
          label="隱藏 SSID"
          value={String(fields.hidden)}
          onChange={(value) => setField('hidden', value === 'true')}
          options={[
            { value: 'false', label: '否' },
            { value: 'true', label: '是' },
          ]}
        />
      </>
    );
  else
    fieldsUi = (
      <>
        <TextField
          label="姓名"
          value={fields.name}
          onChange={(value) => setField('name', value)}
        />
        <TextField
          label="公司"
          value={fields.organization}
          onChange={(value) => setField('organization', value)}
        />
        <TextField
          label="電話"
          value={fields.phone}
          onChange={(value) => setField('phone', value)}
          type="tel"
        />
        <TextField
          label="Email"
          value={fields.email}
          onChange={(value) => setField('email', value)}
          type="email"
        />
        <TextField
          label="網址"
          value={fields.website}
          onChange={(value) => setField('website', value)}
          type="url"
        />
      </>
    );

  return (
    <ToolPanel
      result={result}
      notes={
        <Notice>
          更正等級越高越耐損，但可容納的內容會較少。Wi-Fi
          與名片格式依常見掃碼器慣例產生。
        </Notice>
      }
    >
      <div className="fields-grid">
        <Choice
          label="內容類型"
          value={mode}
          onChange={(value) => setMode(value as QrMode)}
          options={modes}
        />
        <Choice
          label="更正等級"
          value={level}
          onChange={setLevel}
          options={levels}
        />
        {fieldsUi}
      </div>
    </ToolPanel>
  );
}
