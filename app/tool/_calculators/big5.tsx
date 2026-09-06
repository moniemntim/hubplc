'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { encodeBig5 } from '@/lib/tools/big5';
import {
  Choice,
  CopyButton,
  Notice,
  ToolPanel,
} from '@/app/tool/_components/controls';

export default function Big5Calculator() {
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
        setShortcutStatus('含有無法編碼的字元，無法複製整段結果。');
        return;
      }
      void navigator.clipboard
        .writeText(result.groupedHex)
        .then(() => setShortcutStatus('已複製逐字 HEX。'))
        .catch(() =>
          setShortcutStatus('無法存取剪貼簿，請使用「複製逐字 HEX」按鈕。'),
        );
    }
  }

  const characterMap = result.characters
    .map((item) => item.label + ' ' + item.hex)
    .join('\n');
  const output = !hasInput ? (
    <Notice>輸入文字後會顯示每個字元的 Big5 位元組。</Notice>
  ) : (
    <div className="big5-output">
      <p>
        <strong>逐字 HEX</strong>
      </p>
      <pre>{result.groupedHex}</pre>
      <CopyButton text={result.groupedHex} label="複製逐字 HEX" />
      {showBytes === 'true' && (
        <>
          <p>
            <strong>整段位元組</strong>
          </p>
          <pre>{result.bytesHex ?? '??（含有無法編碼的字元）'}</pre>
          <CopyButton
            text={result.bytesHex ?? ''}
            label="複製整段位元組"
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
          <strong>逐字對照</strong>
        </p>
        <ul>
          {result.characters.map((item, index) => (
            <li key={item.character + '-' + index}>
              <span>{item.label}</span>
              <code>{item.hex}</code>
              {!item.supported && <em>無法編碼</em>}
            </li>
          ))}
        </ul>
        <CopyButton text={characterMap} label="複製逐字對照" />
      </div>
    </div>
  );

  return (
    <ToolPanel
      result={output}
      notes={
        <Notice>
          本工具的編碼套件將 big5-hkscs 視為 Big5
          別名；不同裝置或軟體的編碼表可能不同。按 Ctrl／⌘ + Enter 可複製逐字
          HEX。
        </Notice>
      }
    >
      <div className="tool-field">
        <label htmlFor={inputId}>輸入文字</label>
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
          label="顯示整段位元組"
          value={showBytes}
          onChange={setShowBytes}
          options={[
            { value: 'true', label: '顯示' },
            { value: 'false', label: '隱藏' },
          ]}
        />
      </div>
      <div className="action-row">
        <button
          type="button"
          className="action secondary"
          onClick={() => setInput('')}
        >
          清空
        </button>
        {shortcutStatus && (
          <output className="tool-notice">{shortcutStatus}</output>
        )}
      </div>
    </ToolPanel>
  );
}
