'use client';
import { CopyButton } from './controls';

export function CryptoOutput({
  value,
  name,
  onReuse,
}: {
  value: string | null;
  name: string;
  onReuse?: () => void;
}) {
  function download() {
    if (value === null) return;
    const url = URL.createObjectURL(
      new Blob([value], { type: 'text/plain;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hubplc-${name}.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      {value !== null ? (
        <>
          <label htmlFor="crypto-output">結果</label>
          <textarea
            id="crypto-output"
            value={value}
            readOnly
            spellCheck={false}
            autoComplete="off"
            aria-live="off"
          />
          <p className="crypto-result-size">
            {value.length.toLocaleString()} 字元 ·{' '}
            {new TextEncoder().encode(value).length.toLocaleString()}{' '}
            bytes（UTF-8）
          </p>
          <div className="action-row">
            <CopyButton text={value} />
            <button
              type="button"
              className="action secondary"
              onClick={download}
            >
              下載結果
            </button>
            {onReuse && (
              <button
                type="button"
                className="action secondary"
                onClick={onReuse}
              >
                將結果帶入反向操作
              </button>
            )}
          </div>
          <p className="crypto-result-note">
            複製或下載只會在你按下按鈕後執行。清空頁面不會刪除已複製或下載的內容。
          </p>
        </>
      ) : (
        <p>結果會顯示在這裡。</p>
      )}
    </>
  );
}
