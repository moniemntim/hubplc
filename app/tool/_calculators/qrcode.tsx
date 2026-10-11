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
import { useToolLanguage } from '@/components/tool-language';
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
  const { tr } = useToolLanguage();
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
            error: tr(
              '無法產生 QR Code，請縮短內容後再試。',
              'Unable to generate the QR code. Try shortening the content.',
            ),
          });
      });
  }, [generationKey, level, payloadText, tr]);

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
        <img
          src={activeGeneration.image}
          alt={tr('可掃描的 QR Code', 'Scannable QR code')}
        />
      </div>
      <p>
        {tr(
          '內容僅在此瀏覽器中處理。',
          'Content is processed only in this browser.',
        )}
      </p>
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
          {tr('下載 PNG', 'Download PNG')}
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
          {tr('下載 SVG', 'Download SVG')}
        </button>
      </div>
    </>
  ) : (
    <Notice>{tr('正在產生 QR Code…', 'Generating QR code…')}</Notice>
  );

  let fieldsUi: ReactNode;
  if (mode === 'text')
    fieldsUi = (
      <TextField
        label={tr('文字內容', 'Text content')}
        value={fields.text}
        onChange={(value) => setField('text', value)}
        multiline
      />
    );
  else if (mode === 'url')
    fieldsUi = (
      <TextField
        label={tr('網址', 'URL')}
        value={fields.url}
        onChange={(value) => setField('url', value)}
        type="url"
      />
    );
  else if (mode === 'wifi')
    fieldsUi = (
      <>
        <TextField
          label={tr('Wi-Fi 名稱（SSID）', 'Wi-Fi name (SSID)')}
          value={fields.ssid}
          onChange={(value) => setField('ssid', value)}
        />
        <TextField
          label={tr('密碼', 'Password')}
          value={fields.password}
          onChange={(value) => setField('password', value)}
          type="password"
        />
        <Choice
          label={tr('安全性', 'Security')}
          value={fields.security}
          onChange={(value) =>
            setField('security', value as QrFields['security'])
          }
          options={[
            { value: 'WPA', label: 'WPA/WPA2' },
            { value: 'WEP', label: 'WEP' },
            { value: 'nopass', label: tr('開放網路', 'Open network') },
          ]}
        />
        <Choice
          label={tr('隱藏 SSID', 'Hidden SSID')}
          value={String(fields.hidden)}
          onChange={(value) => setField('hidden', value === 'true')}
          options={[
            { value: 'false', label: tr('否', 'No') },
            { value: 'true', label: tr('是', 'Yes') },
          ]}
        />
      </>
    );
  else
    fieldsUi = (
      <>
        <TextField
          label={tr('姓名', 'Name')}
          value={fields.name}
          onChange={(value) => setField('name', value)}
        />
        <TextField
          label={tr('公司', 'Organization')}
          value={fields.organization}
          onChange={(value) => setField('organization', value)}
        />
        <TextField
          label={tr('電話', 'Phone')}
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
          label={tr('網址', 'URL')}
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
          {tr(
            '更正等級越高越耐損，但可容納的內容會較少。Wi-Fi 與名片格式依常見掃描器慣例產生。',
            'Higher correction levels are more resilient but hold less data. Wi-Fi and contact-card formats follow common scanner conventions.',
          )}
        </Notice>
      }
    >
      <div className="fields-grid">
        <Choice
          label={tr('內容類型', 'Content type')}
          value={mode}
          onChange={(value) => setMode(value as QrMode)}
          options={[
            { value: 'text', label: tr('文字', 'Text') },
            { value: 'url', label: tr('網址', 'URL') },
            { value: 'wifi', label: 'Wi-Fi' },
            { value: 'vcard', label: tr('聯絡人名片', 'Contact card') },
          ]}
        />
        <Choice
          label={tr('更正等級', 'Correction level')}
          value={level}
          onChange={setLevel}
          options={[
            { value: 'L', label: tr('L（約 7%）', 'L (about 7%)') },
            { value: 'M', label: tr('M（約 15%）', 'M (about 15%)') },
            { value: 'Q', label: tr('Q（約 25%）', 'Q (about 25%)') },
            { value: 'H', label: tr('H（約 30%）', 'H (about 30%)') },
          ]}
        />
        {fieldsUi}
      </div>
    </ToolPanel>
  );
}
