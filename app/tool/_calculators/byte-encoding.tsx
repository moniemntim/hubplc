'use client';

import { useEffect, useState } from 'react';
import { useToolLanguage } from '@/components/tool-language';
import {
  byteEncodings,
  convertBytes,
  type ByteEncoding,
} from '@/lib/tools/byte-encoding';
import { Choice } from '../_components/controls';
import { CryptoOutput } from '../_components/crypto-output';

const example = '台灣 PLC\r\nBOM 與空白：\ufeff 😀';

export default function ByteEncodingCalculator() {
  const { tr } = useToolLanguage();
  const [input, setInput] = useState(example);
  const [from, setFrom] = useState<ByteEncoding>('utf8');
  const [to, setTo] = useState<ByteEncoding>('base64');
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const encodingOptions = byteEncodings.map((item) => ({
    ...item,
    label: tr(
      item.label,
      (
        {
          'UTF-8 文字': 'UTF-8 text',
          'Latin-1 文字': 'Latin-1 text',
          'UTF-16BE 文字（HEX）': 'UTF-16BE text (HEX)',
          'UTF-16LE 文字（HEX）': 'UTF-16LE text (HEX)',
        } as Record<string, string>
      )[item.label] ?? item.label,
    ),
  }));

  useEffect(() => {
    const wipe = () => {
      setInput('');
      setResult(null);
      setStatus('');
    };
    window.addEventListener('pagehide', wipe);
    return () => window.removeEventListener('pagehide', wipe);
  }, []);

  function invalidate() {
    setResult(null);
    setStatus('');
  }

  function convert() {
    try {
      setResult(convertBytes(input, from, to));
      setStatus(tr('轉換完成。', 'Conversion complete.'));
    } catch (error) {
      setResult(null);
      setStatus(
        error instanceof Error
          ? error.message
          : tr('轉換失敗。', 'Conversion failed.'),
      );
    }
  }

  function setEncoding(next: string, setter: (encoding: ByteEncoding) => void) {
    invalidate();
    setter(next as ByteEncoding);
  }

  function swap() {
    const previousResult = result;
    invalidate();
    if (previousResult !== null) setInput(previousResult);
    setFrom(to);
    setTo(from);
  }

  function clear() {
    invalidate();
    setInput('');
  }

  return (
    <div className="crypto-tool">
      <p className="crypto-private">
        {tr(
          '這是位元組表示法轉換，不是加密：相同資料會以不同文字格式顯示，不能提供保密性。',
          'This converts byte representations; it is not encryption. The same data is displayed in different text formats and receives no confidentiality protection.',
        )}
      </p>
      <div className="crypto-grid">
        <section
          className="crypto-inputs"
          aria-label={tr('位元組轉換輸入', 'Byte conversion input')}
        >
          <div className="fields-grid">
            <Choice
              label={tr('輸入格式', 'Input format')}
              value={from}
              onChange={(next) => setEncoding(next, setFrom)}
              options={encodingOptions}
            />
            <Choice
              label={tr('輸出格式', 'Output format')}
              value={to}
              onChange={(next) => setEncoding(next, setTo)}
              options={encodingOptions}
            />
          </div>
          <div className="action-row">
            <button type="button" className="action secondary" onClick={swap}>
              {tr('交換格式', 'Swap formats')}
            </button>
          </div>
          <div className="tool-field">
            <label htmlFor="byte-encoding-input">
              {tr('輸入內容', 'Input')}
            </label>
            <textarea
              id="byte-encoding-input"
              value={input}
              onChange={(event) => {
                invalidate();
                setInput(event.target.value);
              }}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="action-row">
            <button type="button" className="action" onClick={convert}>
              {tr('轉換', 'Convert')}
            </button>
            <button
              type="button"
              className="action secondary"
              onClick={() => {
                invalidate();
                setInput(example);
                setFrom('utf8');
                setTo('base64');
              }}
            >
              {tr('載入範例', 'Load example')}
            </button>
            <button type="button" className="action secondary" onClick={clear}>
              {tr('清空', 'Clear')}
            </button>
          </div>
          <output className="crypto-status" aria-live="polite">
            {status}
          </output>
        </section>
        <section
          className="crypto-result"
          aria-label={tr('位元組轉換結果', 'Byte conversion result')}
        >
          <p className="eyebrow">BYTES / {tr('轉換結果', 'RESULT')}</p>
          <CryptoOutput value={result} name="byte-encoding" />
        </section>
      </div>
      <div className="tool-foot">
        <span>{tr('格式與限制', 'Formats and limits')}</span>
        <div>
          <p>
            {tr(
              'UTF-8 會嚴格檢查無效位元組；HEX 必須是偶數個十六進位字元；Base64 必須使用標準補齊，Base64URL 則使用未補齊的 URL 安全字元。Latin-1 僅接受 U+0000 至 U+00FF，絕不截斷字元。',
              'UTF-8 strictly rejects invalid bytes; HEX requires an even number of hexadecimal characters; Base64 requires standard padding, while Base64URL uses unpadded URL-safe characters. Latin-1 accepts only U+0000 through U+00FF and never truncates characters.',
            )}
          </p>
          <p>
            {tr(
              'UTF-16BE 文字（HEX）使用大端序，也可選 UTF-16LE。這兩種格式會先轉成 Unicode 文字再轉碼：例如「中文」的 UTF-16BE HEX 是 4e2d6587，轉成 HEX 會得到它的 UTF-8 位元組 e4b8ade69687，不是原始 UTF-16 位元組檢視。BOM、空白、換行與空字串都會保留。每次輸入或改變格式都會清除舊結果。',
              'UTF-16BE text (HEX) uses big-endian order; UTF-16LE is also available. Both are decoded to Unicode text before re-encoding: for example, the UTF-16BE HEX for “中文” is 4e2d6587, and converting to HEX yields its UTF-8 bytes e4b8ade69687, not a view of the original UTF-16 bytes. BOMs, spaces, line breaks, and empty strings are preserved. Each input or format change clears the previous result.',
            )}
          </p>
          <p>
            {tr(
              '每次轉換最多處理 1 MiB 的解碼位元組，並在解析前限制文字長度。所有資料只在此瀏覽器頁面記憶體中處理，不上傳、不寫入儲存空間，也不放進網址；離開頁面時會清空。',
              'Each conversion handles at most 1 MiB of decoded bytes and limits text length before parsing. All data is processed only in this browser page’s memory: it is not uploaded, stored, or put in the URL, and is cleared when you leave the page.',
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
