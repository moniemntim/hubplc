'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Choice,
  CopyButton,
  Notice,
  ToolPanel,
} from '@/app/tool/_components/controls';
import {
  MAX_REPAIR_TEXT,
  MAX_TEXT_FILE_BYTES,
  textEncodings,
  type TextEncoding,
} from '@/lib/tools/text-encoding-options';
import type {
  TextCandidate,
  TextJob,
  TextReply,
} from '@/lib/tools/text-repair-protocol';
// Vite's ?worker transform supplies this default constructor; the raw worker module does not.
// oxlint-disable-next-line import/default
import TextRepairWorker from '../_workers/text-repair.worker?worker';

const sample = 'ä¸­æ–‡';
const label = (encoding: TextEncoding) =>
  textEncodings.find((item) => item.value === encoding)?.label ?? encoding;

export default function TextRepair() {
  const [mode, setMode] = useState('repair');
  const [method, setMethod] = useState('auto');
  const [text, setText] = useState(sample);
  const [mistaken, setMistaken] = useState<TextEncoding>('windows-1252');
  const [original, setOriginal] = useState<TextEncoding>('utf-8');
  const [fileEncoding, setFileEncoding] = useState('auto');
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(
    null,
  );
  const [candidates, setCandidates] = useState<TextCandidate[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [outputEncoding, setOutputEncoding] = useState<TextEncoding>('utf-8');
  const [bom, setBom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const worker = useRef<Worker | null>(null);
  const version = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const output = selected === null ? '' : (candidates[selected]?.text ?? '');

  useEffect(
    () => () => {
      version.current++;
      worker.current?.terminate();
    },
    [],
  );
  function cancel() {
    version.current++;
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
  }
  function invalidate() {
    cancel();
    setCandidates([]);
    setSelected(null);
    setStatus('');
  }
  function run(job: TextJob) {
    cancel();
    const current = version.current;
    if (job.kind !== 'export') {
      setCandidates([]);
      setSelected(null);
    }
    setStatus('');
    setBusy(true);
    try {
      const next = new TextRepairWorker();
      worker.current = next;
      next.onmessage = (event: MessageEvent<TextReply>) => {
        if (version.current !== current) return;
        next.terminate();
        worker.current = null;
        setBusy(false);
        const reply = event.data;
        if ('error' in reply) setStatus(reply.error);
        else if ('candidates' in reply) {
          setCandidates(reply.candidates);
          const manual =
            job.kind === 'repair-manual' || job.kind === 'file-manual';
          setSelected(manual && reply.candidates.length ? 0 : null);
          setStatus(
            reply.candidates.length
              ? `找到 ${reply.candidates.length} 個結果。${manual ? '' : '請比較內容後選擇要採用的結果。'}`
              : '沒有找到可無損轉換的候選。可改用手動編碼，或重新取得原始檔案。',
          );
        } else {
          const url = URL.createObjectURL(
            new Blob([new Uint8Array(reply.bytes).buffer], {
              type: 'text/plain',
            }),
          );
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `hubplc-${job.kind === 'export' ? job.encoding : 'text'}.txt`;
          anchor.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setStatus('已產生下載檔案。');
        }
      };
      next.onerror = () => {
        if (version.current !== current) return;
        next.terminate();
        worker.current = null;
        setBusy(false);
        setStatus('無法載入轉換工具，請重新整理後再試。');
      };
      next.postMessage(job);
    } catch (error) {
      console.error('Text repair worker initialization failed:', error);
      cancel();
      setStatus('此瀏覽器無法啟動背景轉換工具。');
    }
  }
  function convert() {
    if (mode === 'file') {
      if (!file) return;
      run(
        fileEncoding === 'auto'
          ? { kind: 'file-auto', bytes: file.bytes }
          : {
              kind: 'file-manual',
              bytes: file.bytes,
              encoding: fileEncoding as TextEncoding,
            },
      );
    } else {
      run(
        method === 'auto'
          ? { kind: 'repair-auto', text }
          : { kind: 'repair-manual', text, mistaken, original },
      );
    }
  }
  async function loadFile(picked?: File) {
    invalidate();
    setFile(null);
    if (!picked) return;
    if (!picked.size || picked.size > MAX_TEXT_FILE_BYTES) {
      setStatus('請選擇非空白且不超過 1 MiB 的純文字檔案。');
      return;
    }
    const current = version.current;
    setBusy(true);
    try {
      const bytes = new Uint8Array(await picked.arrayBuffer());
      if (version.current !== current) return;
      setFile({ name: picked.name, bytes });
      setBusy(false);
      setStatus('檔案已在本機讀取，請選擇編碼並開始解讀。');
    } catch {
      if (version.current !== current) return;
      setBusy(false);
      setStatus('無法讀取檔案，請重新選擇。');
    }
  }
  const tooLong = text.length > MAX_REPAIR_TEXT;
  return (
    <ToolPanel
      notes={
        <>
          <p>
            亂碼修復流程：用「誤讀編碼」把亂碼轉回位元組，再用「原始編碼」解讀。候選排序僅供比較，無法保證判斷正確；這不是繁簡翻譯。
          </p>
          <p>
            「�」通常表示資料已遺失，不能完整還原；已被替換成問號的內容也可能無法恢復。編碼不支援的文字會顯示錯誤，不會默默改成問號。
          </p>
          <p>
            支援中日韓常見編碼；ISO-2022-CN／KR 不在本工具支援範圍。Big5
            依套件對照表；Latin-1 採真正單位元組映射，與 Windows-1252
            分開。參考功能：
            <a href="https://www.ifreesite.com/textconvert.htm">
              ifreesite 文字亂碼轉換
            </a>
            。
          </p>
        </>
      }
      result={
        <div className="text-repair-results" aria-busy={busy}>
          <output>
            {busy
              ? '正在瀏覽器背景處理…'
              : status || '開始轉換後，結果會顯示在這裡。'}
          </output>
          {candidates.length > 0 && (
            <div className="repair-candidates" aria-label="候選結果">
              {candidates.map((candidate, index) => (
                <button
                  type="button"
                  className="repair-candidate"
                  key={index}
                  aria-pressed={selected === index}
                  disabled={busy}
                  onClick={() => {
                    setSelected(index);
                    setStatus('已選取結果，請確認內容後複製或下載。');
                  }}
                >
                  <span>
                    {candidate.mistaken
                      ? `誤讀：${label(candidate.mistaken)} → 原始：`
                      : '解讀編碼：'}
                    {label(candidate.original)}
                  </span>
                  <pre>
                    {candidate.text.slice(0, 180)}
                    {candidate.text.length > 180 ? '…' : ''}
                  </pre>
                  <small>
                    {selected === index ? '✓ 已選取' : '採用此結果'}
                  </small>
                </button>
              ))}
            </div>
          )}
          {selected !== null && (
            <div className="repair-output">
              <label htmlFor="repair-output">完整轉換結果</label>
              <textarea
                id="repair-output"
                readOnly
                value={output}
                spellCheck={false}
              />
              <p>
                {Array.from(output).length.toLocaleString()} 個 Unicode 碼點 ·
                換行保持原樣
              </p>
              <CopyButton text={output} />
              <Choice
                label="下載檔案編碼"
                value={outputEncoding}
                onChange={(value) => {
                  cancel();
                  setOutputEncoding(value as TextEncoding);
                  setStatus('');
                }}
                options={textEncodings}
              />
              {outputEncoding === 'utf-8' && (
                <label className="repair-check">
                  <input
                    type="checkbox"
                    checked={bom}
                    onChange={(event) => {
                      cancel();
                      setBom(event.target.checked);
                      setStatus('');
                    }}
                  />
                  加上 UTF-8 BOM（供部分舊軟體辨識）
                </label>
              )}
              <button
                type="button"
                className="action secondary"
                disabled={busy || !output}
                onClick={() =>
                  run({
                    kind: 'export',
                    text: output,
                    encoding: outputEncoding,
                    bom,
                  })
                }
              >
                下載文字檔
              </button>
            </div>
          )}
        </div>
      }
    >
      <div className="repair-privacy">
        文字與檔案只在本機處理，不上傳、不儲存。
      </div>
      <Choice
        label="操作模式"
        value={mode}
        onChange={(value) => {
          invalidate();
          setMode(value);
        }}
        options={[
          { value: 'repair', label: '貼上亂碼修復' },
          { value: 'file', label: '文字檔編碼轉換' },
        ]}
      />
      {mode === 'repair' ? (
        <>
          <Choice
            label="修復方式"
            value={method}
            onChange={(value) => {
              invalidate();
              setMethod(value);
            }}
            options={[
              { value: 'auto', label: '比較常見編碼候選' },
              { value: 'manual', label: '手動指定編碼' },
            ]}
          />
          {method === 'manual' && (
            <>
              <Choice
                label="誤讀編碼（當時用錯的編碼）"
                value={mistaken}
                onChange={(value) => {
                  invalidate();
                  setMistaken(value as TextEncoding);
                }}
                options={textEncodings}
              />
              <Choice
                label="原始編碼（文字原本的編碼）"
                value={original}
                onChange={(value) => {
                  invalidate();
                  setOriginal(value as TextEncoding);
                }}
                options={textEncodings}
              />
            </>
          )}
          <div className="tool-field">
            <label htmlFor="repair-input">亂碼原文</label>
            <textarea
              id="repair-input"
              value={text}
              onChange={(event) => {
                invalidate();
                setText(event.target.value);
              }}
              onKeyDown={(event) => {
                if (
                  (event.ctrlKey || event.metaKey) &&
                  event.key === 'Enter' &&
                  !busy &&
                  text &&
                  !tooLong
                ) {
                  event.preventDefault();
                  convert();
                }
              }}
              spellCheck={false}
              aria-describedby="repair-input-help"
            />
          </div>
          <p id="repair-input-help">
            上限 20,000 個 UTF-16 字元單位；Ctrl／⌘ + Enter 開始轉換。
          </p>
          {tooLong && <Notice>文字超過上限，請縮短後再試。</Notice>}
          {text.includes('\uFFFD') && (
            <Notice>
              原文含有「�」，部分原始位元組可能已遺失，無法保證還原。
            </Notice>
          )}
        </>
      ) : (
        <>
          <div className="tool-field">
            <label htmlFor="repair-file">選擇純文字檔（最大 1 MiB）</label>
            <input
              ref={fileInput}
              id="repair-file"
              type="file"
              accept="text/*,.txt,.csv,.log,.srt,.ini,.json,.xml"
              onChange={(event) => {
                void loadFile(event.target.files?.[0]);
              }}
            />
          </div>
          {file && (
            <p className="repair-file-name">
              {file.name} · {file.bytes.length.toLocaleString()} bytes
            </p>
          )}
          <Choice
            label="檔案原始編碼"
            value={fileEncoding}
            onChange={(value) => {
              invalidate();
              setFileEncoding(value);
            }}
            options={[
              { value: 'auto', label: '比較候選（BOM 優先）' },
              ...textEncodings,
            ]}
          />
          <p>
            使用原始位元組重新解讀，比複製已含「�」的亂碼更有機會恢復。請勿選擇
            Word、PDF 或二進位檔案。
          </p>
        </>
      )}
      <div className="action-row">
        <button
          type="button"
          className="action"
          disabled={busy || (mode === 'file' ? !file : !text || tooLong)}
          onClick={convert}
        >
          {mode === 'file' ? '解讀文字檔' : '開始修復'}
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() => {
            invalidate();
            setText(sample);
            setMode('repair');
            setMethod('auto');
          }}
        >
          載入範例
        </button>
        <button
          type="button"
          className="action secondary"
          onClick={() => {
            invalidate();
            setText('');
            setFile(null);
            if (fileInput.current) fileInput.current.value = '';
          }}
        >
          清空
        </button>
        {busy && (
          <button
            type="button"
            className="action secondary"
            onClick={() => {
              cancel();
              setStatus('已取消。');
            }}
          >
            取消處理
          </button>
        )}
      </div>
    </ToolPanel>
  );
}
