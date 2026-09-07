'use client';

import { useEffect, useState } from 'react';
import {
  byteEncodings,
  convertBytes,
  type ByteEncoding,
} from '@/lib/tools/byte-encoding';
import { Choice } from '../_components/controls';
import { CryptoOutput } from '../_components/crypto-output';

const example = '台灣 PLC\r\nBOM 與空白：\ufeff 😀';

export default function ByteEncodingCalculator() {
  const [input, setInput] = useState(example);
  const [from, setFrom] = useState<ByteEncoding>('utf8');
  const [to, setTo] = useState<ByteEncoding>('base64');
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState('');

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
      setStatus('轉換完成。');
    } catch (error) {
      setResult(null);
      setStatus(error instanceof Error ? error.message : '轉換失敗。');
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
        這是位元組表示法轉換，不是加密：相同資料會以不同文字格式顯示，不能提供保密性。
      </p>
      <div className="crypto-grid">
        <section className="crypto-inputs" aria-label="位元組轉換輸入">
          <div className="fields-grid">
            <Choice
              label="輸入格式"
              value={from}
              onChange={(next) => setEncoding(next, setFrom)}
              options={byteEncodings}
            />
            <Choice
              label="輸出格式"
              value={to}
              onChange={(next) => setEncoding(next, setTo)}
              options={byteEncodings}
            />
          </div>
          <div className="action-row">
            <button type="button" className="action secondary" onClick={swap}>
              交換格式
            </button>
          </div>
          <div className="tool-field">
            <label htmlFor="byte-encoding-input">輸入內容</label>
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
              轉換
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
              載入範例
            </button>
            <button type="button" className="action secondary" onClick={clear}>
              清空
            </button>
          </div>
          <output className="crypto-status" aria-live="polite">
            {status}
          </output>
        </section>
        <section className="crypto-result" aria-label="位元組轉換結果">
          <p className="eyebrow">BYTES / 轉換結果</p>
          <CryptoOutput value={result} name="byte-encoding" />
        </section>
      </div>
      <div className="tool-foot">
        <span>格式與限制</span>
        <div>
          <p>
            UTF-8 會嚴格檢查無效位元組；HEX 必須是偶數個十六進位字元；Base64
            必須使用標準補齊，Base64URL 則使用未補齊的 URL 安全字元。Latin-1
            僅接受 U+0000 至 U+00FF，絕不截斷字元。
          </p>
          <p>
            UTF-16BE 文字（HEX）使用大端序，也可選 UTF-16LE。這兩種格式會先轉成
            Unicode 文字再轉碼：例如「中文」的 UTF-16BE HEX 是 4e2d6587，轉成
            HEX 會得到它的 UTF-8 位元組 e4b8ade69687，不是原始 UTF-16
            位元組檢視。BOM、空白、換行與空字串都會保留。每次輸入或改變格式都會清除舊結果。
          </p>
          <p>
            每次轉換最多處理 1 MiB
            的解碼位元組，並在解析前限制文字長度。所有資料只在此瀏覽器頁面記憶體中處理，不上傳、不寫入儲存空間，也不放進網址；離開頁面時會清空。
          </p>
        </div>
      </div>
    </div>
  );
}
