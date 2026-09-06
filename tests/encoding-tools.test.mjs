import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { buildQrPayload, pngBytesFromDataUrl } from '../lib/tools/encoding.ts';
import { encodeBig5 } from '../lib/tools/big5.ts';

const emptyFields = {
  text: '',
  url: '',
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

async function decodePng(payload, errorCorrectionLevel = 'M') {
  const buffer = await QRCode.toBuffer(payload, {
    errorCorrectionLevel,
    width: 360,
    margin: 4,
  });
  const png = PNG.sync.read(buffer);
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return decoded?.data;
}

async function decodeDownloadedPng(payload) {
  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    width: 360,
    margin: 4,
  });
  const bytes = pngBytesFromDataUrl(dataUrl);
  assert.deepEqual(
    Array.from(bytes.slice(0, 8)),
    [137, 80, 78, 71, 13, 10, 26, 10],
  );
  const png = PNG.sync.read(Buffer.from(bytes));
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
}

void test('QR Code payloads retain Unicode and Wi-Fi escaping when independently decoded', async () => {
  const text = buildQrPayload('text', {
    ...emptyFields,
    text: '台灣 PLC 測試',
  });
  assert.equal(await decodePng(text), text);
  assert.equal(await decodeDownloadedPng(text), text);
  for (const level of ['L', 'M', 'Q', 'H']) {
    assert.equal(
      await decodePng('QR 等級 ' + level, level),
      'QR 等級 ' + level,
    );
  }
  const wifi = buildQrPayload('wifi', {
    ...emptyFields,
    ssid: '工廠;A',
    password: 'p: a,\\b',
    hidden: true,
  });
  assert.equal(wifi, 'WIFI:T:WPA;S:工廠\\;A;P:p\\: a\\,\\\\b;H:true;;');
  assert.equal(await decodePng(wifi), wifi);
  const wep = buildQrPayload('wifi', {
    ...emptyFields,
    ssid: 'HubPLC',
    password: '12345',
    security: 'WEP',
  });
  assert.equal(wep, 'WIFI:T:WEP;S:HubPLC;P:12345;;');
  assert.equal(await decodePng(wep), wep);
  const open = buildQrPayload('wifi', {
    ...emptyFields,
    ssid: 'HubPLC',
    security: 'nopass',
  });
  assert.equal(open, 'WIFI:T:nopass;S:HubPLC;P:;;');
  assert.equal(await decodePng(open), open);
});

void test('vCard QR escapes fields and is independently decodable', async () => {
  const vcard = buildQrPayload('vcard', {
    ...emptyFields,
    name: '王小明',
    organization: 'Hub; PLC',
    phone: '+886-2-1234\rInjected: no',
    email: 'hello@example.com',
    website: 'https://hubplc.com',
  });
  assert.match(vcard, /ORG:Hub\\; PLC/);
  assert.match(vcard, /N:王小明;;;;\r\nFN:王小明/);
  assert.match(vcard, /TEL:\+886-2-1234\\nInjected: no/);
  assert.equal(await decodePng(vcard), vcard);
});

void test('QR payloads reject required fields before a stale image could remain', () => {
  assert.throws(() => buildQrPayload('text', emptyFields), /文字內容/);
  assert.throws(() => buildQrPayload('url', emptyFields), /網址/);
  assert.throws(
    () => buildQrPayload('url', { ...emptyFields, url: 'hubplc.com' }),
    /完整/,
  );
  assert.throws(() => buildQrPayload('wifi', emptyFields), /Wi-Fi 名稱/);
  assert.throws(
    () => buildQrPayload('wifi', { ...emptyFields, ssid: 'HubPLC' }),
    /Wi-Fi 密碼/,
  );
  assert.throws(
    () =>
      buildQrPayload('wifi', {
        ...emptyFields,
        ssid: 'HubPLC',
        security: 'BAD',
      }),
    /安全性/,
  );
  assert.throws(
    () => buildQrPayload('invalid', { ...emptyFields, name: 'HubPLC' }),
    /內容類型/,
  );
});

void test('QR rejects content exceeding the QR capacity and produces SVG output', async () => {
  await assert.rejects(() => QRCode.toDataURL('x'.repeat(10000)));
  const svg = await QRCode.toString('HubPLC SVG', {
    errorCorrectionLevel: 'H',
    type: 'svg',
  });
  assert.match(svg, /^<svg /);
  assert.match(svg, /<path /);
});

void test('Big5 provides per-character output and reports unsupported code points', () => {
  const converted = encodeBig5('你 A好\n');
  assert.equal(converted.groupedHex, 'A741 20 41 A66E 0A');
  assert.equal(converted.bytesHex, 'A7 41 20 41 A6 6E 0A');
  const unsupported = encodeBig5('A😀');
  assert.equal(unsupported.characters[1].hex, '??');
  assert.equal(unsupported.supported, false);
  assert.equal(unsupported.bytesHex, undefined);
});
