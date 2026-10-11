'use client';
import { CopyButton } from './controls';
import { useToolLanguage } from '@/components/tool-language';

export function CryptoOutput({
  value,
  name,
  onReuse,
}: {
  value: string | null;
  name: string;
  onReuse?: () => void;
}) {
  const { tr } = useToolLanguage();
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
          <label htmlFor="crypto-output">{tr('結果', 'Result')}</label>
          <textarea
            id="crypto-output"
            value={value}
            readOnly
            spellCheck={false}
            autoComplete="off"
            aria-live="off"
          />
          <p className="crypto-result-size">
            {value.length.toLocaleString()} {tr('字元', 'characters')} ·{' '}
            {new TextEncoder().encode(value).length.toLocaleString()} bytes
            (UTF-8)
          </p>
          <div className="action-row">
            <CopyButton text={value} />
            <button
              type="button"
              className="action secondary"
              onClick={download}
            >
              {tr('下載結果', 'Download result')}
            </button>
            {onReuse && (
              <button
                type="button"
                className="action secondary"
                onClick={onReuse}
              >
                {tr('將結果帶入反向操作', 'Use result for reverse operation')}
              </button>
            )}
          </div>
          <p className="crypto-result-note">
            {tr(
              '複製或下載只會在你按下按鈕後執行。清空頁面不會刪除已複製或下載的內容。',
              'Copying or downloading happens only after you press a button. Clearing the page does not delete copied or downloaded content.',
            )}
          </p>
        </>
      ) : (
        <p>{tr('結果會顯示在這裡。', 'The result will appear here.')}</p>
      )}
    </>
  );
}
