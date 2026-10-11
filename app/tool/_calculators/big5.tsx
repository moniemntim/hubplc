'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useToolLanguage } from '@/components/tool-language';
import { encodeBig5 } from '@/lib/tools/big5';
import {
  Choice,
  CopyButton,
  Notice,
  ToolPanel,
} from '@/app/tool/_components/controls';

export default function Big5Calculator() {
  const { tr } = useToolLanguage();
  const [input, setInput] = useState('你好，HubPLC！');
  const [showBytes, setShowBytes] = useState('true');
  const [shortcutStatus, setShortcutStatus] = useState('');
  const inputId = useId();
  const result = useMemo(() => encodeBig5(input), [input]);
  const hasInput = input.length > 0;

  function handleShortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (!result.supported) {
        setShortcutStatus(
          tr(
            '含有無法編碼的字元，無法複製整段結果。',
            'Contains unencodable characters; cannot copy the complete result.',
          ),
        );
        return;
      }
      void navigator.clipboard
        .writeText(result.groupedHex)
        .then(() =>
          setShortcutStatus(
            tr('已複製逐字 HEX。', 'Character-by-character HEX copied.'),
          ),
        )
        .catch(() =>
          setShortcutStatus(
            tr(
              '無法存取剪貼簿，請使用「複製逐字 HEX」按鈕。',
              'Clipboard access is unavailable; use the “Copy character-by-character HEX” button.',
            ),
          ),
        );
    }
  }

  const characterMap = result.characters
    .map((item) => item.label + ' ' + item.hex)
    .join('\n');
  const output = !hasInput ? (
    <Notice>
      {tr(
        '輸入文字後會顯示每個字元的 Big5 位元組。',
        'Enter text to display the Big5 bytes for each character.',
      )}
    </Notice>
  ) : (
    <div className="big5-output">
      <p>
        <strong>{tr('逐字 HEX', 'Character-by-character HEX')}</strong>
      </p>
      <pre>{result.groupedHex}</pre>
      <CopyButton
        text={result.groupedHex}
        label={tr('複製逐字 HEX', 'Copy character-by-character HEX')}
      />
      {showBytes === 'true' && (
        <>
          <p>
            <strong>{tr('整段位元組', 'Complete byte sequence')}</strong>
          </p>
          <pre>
            {result.bytesHex ??
              tr(
                '??（含有無法編碼的字元）',
                '?? (contains unencodable characters)',
              )}
          </pre>
          <CopyButton
            text={result.bytesHex ?? ''}
            label={tr('複製整段位元組', 'Copy complete byte sequence')}
            disabled={!result.supported}
          />
        </>
      )}
      {!result.supported && (
        <output className="tool-notice">
          {result.characters
            .filter((item) => !item.supported)
            .map((item, index) => (
              <p key={index}>{item.error}</p>
            ))}
        </output>
      )}
      <div className="big5-map">
        <p>
          <strong>{tr('逐字對照', 'Character map')}</strong>
        </p>
        <ul>
          {result.characters.map((item, index) => (
            <li key={item.character + '-' + index}>
              <span>{item.label}</span>
              <code>{item.hex}</code>
              {!item.supported && <em>{tr('無法編碼', 'Unencodable')}</em>}
            </li>
          ))}
        </ul>
        <CopyButton
          text={characterMap}
          label={tr('複製逐字對照', 'Copy character map')}
        />
      </div>
    </div>
  );

  return (
    <ToolPanel
      result={output}
      notes={
        <Notice>
          {tr(
            '本工具的編碼套件將 big5-hkscs 視為 Big5 別名；不同裝置或軟體的編碼表可能不同。按 Ctrl／⌘ + Enter 可複製逐字 HEX。',
            'This tool’s encoding package treats big5-hkscs as a Big5 alias; encoding tables can vary by device or software. Press Ctrl/⌘ + Enter to copy character-by-character HEX.',
          )}
        </Notice>
      }
    >
      <div className="tool-field">
        <label htmlFor={inputId}>{tr('輸入文字', 'Input text')}</label>
        <textarea
          id={inputId}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleShortcut}
          spellCheck={false}
        />
      </div>
      <div className="fields-grid">
        <Choice
          label={tr('顯示整段位元組', 'Show complete byte sequence')}
          value={showBytes}
          onChange={setShowBytes}
          options={[
            { value: 'true', label: tr('顯示', 'Show') },
            { value: 'false', label: tr('隱藏', 'Hide') },
          ]}
        />
      </div>
      <div className="action-row">
        <button
          type="button"
          className="action secondary"
          onClick={() => setInput('')}
        >
          {tr('清空', 'Clear')}
        </button>
        {shortcutStatus && (
          <output className="tool-notice">{shortcutStatus}</output>
        )}
      </div>
    </ToolPanel>
  );
}
