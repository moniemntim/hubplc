'use client';
import { useEffect, useRef, useState } from 'react';
import type { CryptoJob, CryptoReply } from '@/lib/tools/crypto-options';
import { useToolLanguage } from '@/components/tool-language';
// Vite's ?worker transform supplies the default Worker constructor.
// oxlint-disable-next-line import/default
import CryptoWorker from '../_workers/crypto.worker?worker';

export function useCryptoJob() {
  const { tr } = useToolLanguage();
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const worker = useRef<Worker | null>(null);
  const revision = useRef(0);
  useEffect(() => {
    const stop = () => {
      revision.current++;
      worker.current?.terminate();
    };
    const leave = () => {
      stop();
      setBusy(false);
      setResult(null);
      setStatus('');
    };
    window.addEventListener('pagehide', leave);
    return () => {
      stop();
      window.removeEventListener('pagehide', leave);
    };
  }, []);
  function invalidate() {
    revision.current++;
    worker.current?.terminate();
    worker.current = null;
    setResult(null);
    setBusy(false);
    setStatus('');
  }
  function run(job: CryptoJob) {
    invalidate();
    const current = revision.current;
    setBusy(true);
    setStatus(tr('處理中…', 'Processing…'));
    try {
      const next = new CryptoWorker();
      worker.current = next;
      next.onmessage = (event: MessageEvent<CryptoReply>) => {
        if (current !== revision.current) return;
        next.terminate();
        worker.current = null;
        setBusy(false);
        if ('error' in event.data) setStatus(event.data.error);
        else {
          setResult(event.data.result);
          setStatus(tr('處理完成。', 'Processing complete.'));
        }
      };
      next.onerror = () => {
        if (current !== revision.current) return;
        next.terminate();
        worker.current = null;
        setBusy(false);
        setStatus(
          tr(
            '背景處理無法啟動，請重新整理後再試。',
            'Background processing could not start. Refresh and try again.',
          ),
        );
      };
    } catch {
      setBusy(false);
      setStatus(
        tr(
          '此瀏覽器無法啟動背景處理。',
          'This browser cannot start background processing.',
        ),
      );
      return;
    }
    worker.current.postMessage(job);
  }
  return { result, busy, status, run, invalidate };
}
