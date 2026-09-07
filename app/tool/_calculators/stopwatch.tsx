'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  elapsedAt,
  emptyStopwatch,
  formatStopwatch,
  parseStopwatch,
  recordLap,
  toggleStopwatch,
  type StopwatchState,
} from '@/lib/tools/stopwatch';
import './stopwatch.css';

const storageKey = 'hubplc-stopwatch-v1';
export default function Stopwatch() {
  const [state, setState] = useState<StopwatchState>(emptyStopwatch);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const [eco, setEco] = useState<boolean | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [status, setStatus] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const total = elapsedAt(state, now);
  const lowPower = eco ?? total >= 300000;
  const running = state.startedAt !== null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const time = Date.now();
      let restored: StopwatchState | null = null;
      const hash = window.location.hash;
      if (hash.startsWith('#sw=')) {
        try {
          restored = parseStopwatch(decodeURIComponent(hash.slice(4)), time);
        } catch {
          /* Invalid link */
        }
        setStatus(
          restored
            ? '已載入分享時的狀態；之後的操作各自獨立。'
            : '分享連結無效，已開啟新的碼錶。',
        );
        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search,
        );
      } else {
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) restored = parseStopwatch(raw, time);
        } catch {
          setStatus('瀏覽器不允許儲存，關閉頁面後將無法自動恢復。');
        }
      }
      if (restored) setState(restored);
      setNow(time);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      queueMicrotask(() =>
        setStatus('無法儲存碼錶，請使用分享連結保留目前狀態。'),
      );
    }
  }, [state, ready]);

  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, lowPower ? 250 : 30);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [running, lowPower]);

  function toggle() {
    const time = Date.now();
    setNow(time);
    setState((s) => toggleStopwatch(s, time));
    setShareUrl('');
  }
  function lap() {
    const time = Date.now();
    setNow(time);
    setState((s) => recordLap(s, time));
    setShareUrl('');
  }
  function reset() {
    setState(emptyStopwatch());
    setNow(Date.now());
    setEco(null);
    setShareUrl('');
    setStatus('已重設碼錶與單圈紀錄。');
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === panel.current)
        await document.exitFullscreen();
      else if (panel.current?.requestFullscreen)
        await panel.current.requestFullscreen();
      else setFullscreen((v) => !v);
    } catch {
      setFullscreen((v) => !v);
    }
  }
  useEffect(() => {
    const change = () =>
      setFullscreen(document.fullscreenElement === panel.current);
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        target.closest('input, textarea, select, [contenteditable="true"]')
      )
        return;
      const key = event.key.toLowerCase();
      if (key === 's' || (key === ' ' && !target.closest('button, a'))) {
        event.preventDefault();
        toggle();
      }
      if (key === 'l') {
        event.preventDefault();
        lap();
      }
      if (key === 'f') {
        event.preventDefault();
        void toggleFullscreen();
      }
      if (key === 'escape' && !document.fullscreenElement) setFullscreen(false);
      if (key === 'arrowleft' || key === 'arrowright') {
        const buttons = Array.from(
          panel.current?.querySelectorAll<HTMLButtonElement>(
            'button:not(:disabled)',
          ) ?? [],
        );
        const index = buttons.indexOf(target as HTMLButtonElement);
        if (index >= 0) {
          event.preventDefault();
          buttons[
            (index + (key === 'arrowright' ? 1 : buttons.length - 1)) %
              buttons.length
          ]?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [ready]);

  async function share() {
    const url = new URL(window.location.href);
    url.hash = 'sw=' + encodeURIComponent(JSON.stringify(state));
    setShareUrl(url.href);
    try {
      await navigator.clipboard.writeText(url.href);
      setStatus('已複製分享連結。');
    } catch {
      setStatus('請選取下方連結並手動複製。');
    }
  }

  return (
    <div
      ref={panel}
      className={`stopwatch${fullscreen ? ' stopwatch-fullscreen' : ''}`}
    >
      <section className="stopwatch-face" aria-label="碼錶">
        <p className="eyebrow">
          {running ? '計時中' : total ? '已暫停' : '準備開始'}
        </p>
        <div
          className="stopwatch-time"
          role="timer"
          aria-label="累計時間"
          aria-live="off"
        >
          {formatStopwatch(total, lowPower)}
        </div>
        <p className="stopwatch-split">
          目前單圈{' '}
          <strong>
            {formatStopwatch(total - (state.laps.at(-1) ?? 0), lowPower)}
          </strong>
        </p>
        <div className="stopwatch-actions">
          <Button disabled={!ready} onClick={toggle}>
            {running ? '暫停' : total ? '繼續' : '開始'}
          </Button>
          <Button
            variant="outline"
            disabled={!ready || !running || state.laps.length >= 1000}
            onClick={lap}
          >
            單圈計時
          </Button>
          <Button
            variant="outline"
            disabled={!ready || running || total === 0}
            onClick={reset}
          >
            重設
          </Button>
        </div>
        <div className="stopwatch-actions stopwatch-options">
          <Button variant="outline" onClick={toggleFullscreen}>
            {fullscreen ? '離開全螢幕' : '全螢幕'}
          </Button>
          <Button
            variant="outline"
            aria-pressed={lowPower}
            onClick={() => setEco(!lowPower)}
          >
            ECO {lowPower ? '開啟' : '關閉'}
          </Button>
          <Button variant="outline" disabled={!ready} onClick={share}>
            複製分享連結
          </Button>
        </div>
      </section>
      <output className="block my-3">{status}</output>
      {shareUrl && (
        <label className="stopwatch-share">
          分享連結
          <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
        </label>
      )}
      <div className="stopwatch-records">
        <h2>
          單圈紀錄 <span>（{state.laps.length} / 1000）</span>
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>圈次</TableHead>
              <TableHead>單圈時間</TableHead>
              <TableHead>累計時間</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.laps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  開始計時後，按「單圈計時」記錄每一圈。
                </TableCell>
              </TableRow>
            ) : (
              state.laps
                .map((value, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      {formatStopwatch(value - (state.laps[index - 1] ?? 0))}
                    </TableCell>
                    <TableCell>{formatStopwatch(value)}</TableCell>
                  </TableRow>
                ))
                .reverse()
            )}
          </TableBody>
        </Table>
      </div>
      <div className="stopwatch-help">
        <p>
          快捷鍵：S 開始／暫停、L 單圈、F 全螢幕。← →
          切換按鈕，空白鍵操作目前按鈕；未選取按鈕時可開始／暫停。暫停後可重設。
        </p>
        <p>
          ECO 隱藏百分之一秒並降低更新頻率，累計 5
          分鐘後自動開啟，也可手動切換。單圈紀錄仍保留百分之一秒。
        </p>
        <p>
          碼錶自動保留在此瀏覽器，重新整理或關閉後仍可接續。分享連結包含分享當下的計時與單圈紀錄；收件者可接續計時，後續操作不會同步。時間依裝置時鐘計算，調整系統時間可能影響結果。
        </p>
      </div>
    </div>
  );
}
