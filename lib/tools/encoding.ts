export type QrMode = 'text' | 'url' | 'wifi' | 'vcard';

export type QrFields = {
  text: string;
  url: string;
  ssid: string;
  password: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
  name: string;
  organization: string;
  phone: string;
  email: string;
  website: string;
};

const escapeWifi = (value: string) => value.replace(/[\\;,:"]/g, '\\$&');
const escapeVCard = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n?|\n/g, '\\n')
    .replace(/([;,])/g, '\\$1');

/** Decodes the in-memory PNG data URL into image bytes for a real file download. */
export function pngBytesFromDataUrl(dataUrl: string): Uint8Array {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl);
  if (!match) throw new Error('QR PNG 資料格式無效。');
  const binary = atob(match[1]);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** Builds the literal payload encoded by the QR symbol. */
export function buildQrPayload(mode: QrMode, fields: QrFields): string {
  if (mode === 'text') {
    if (!fields.text.trim()) throw new Error('請輸入文字內容。');
    return fields.text;
  }
  if (mode === 'url') {
    const url = fields.url.trim();
    if (!url) throw new Error('請輸入網址。');
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('請輸入完整的 http:// 或 https:// 網址。');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('網址僅支援 http:// 或 https://。');
    }
    return url;
  }
  if (mode === 'wifi') {
    const ssid = escapeWifi(fields.ssid);
    if (!ssid) throw new Error('請輸入 Wi-Fi 名稱。');
    if (!['WPA', 'WEP', 'nopass'].includes(fields.security)) {
      throw new Error('不支援的 Wi-Fi 安全性。');
    }
    const security = fields.security;
    const password = security === 'nopass' ? '' : escapeWifi(fields.password);
    if (security !== 'nopass' && !password)
      throw new Error('請輸入 Wi-Fi 密碼，或選擇開放網路。');
    return `WIFI:T:${security};S:${ssid};P:${password};${fields.hidden ? 'H:true;' : ''};`;
  }
  if (mode !== 'vcard') throw new Error('不支援的 QR Code 內容類型。');
  if (!fields.name.trim()) throw new Error('請輸入聯絡人姓名。');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCard(fields.name)};;;;`,
    `FN:${escapeVCard(fields.name)}`,
    fields.organization ? `ORG:${escapeVCard(fields.organization)}` : '',
    fields.phone ? `TEL:${escapeVCard(fields.phone)}` : '',
    fields.email ? `EMAIL:${escapeVCard(fields.email)}` : '',
    fields.website ? `URL:${escapeVCard(fields.website)}` : '',
    'END:VCARD',
  ].filter(Boolean);
  return lines.join('\r\n');
}
