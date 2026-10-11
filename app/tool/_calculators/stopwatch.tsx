'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToolLanguage } from '@/components/tool-language';
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
  const { tr } = useToolLanguage();
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
            ? tr(
                '已載入分享時的狀態；之後的操作各自獨立。',
                'Shared state loaded; subsequent actions are independent.',
              )
            : tr(
                '分享連結無效，已開啟新的碼錶。',
                'The share link is invalid; a new stopwatch has been opened.',
              ),
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
          setStatus(
            tr(
              '瀏覽器不允許儲存，關閉頁面後將無法自動恢復。',
              'Browser storage is unavailable, so state cannot be restored after closing the page.',
            ),
          );
        }
      }
      if (restored) setState(restored);
      setNow(time);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [tr]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      queueMicrotask(() =>
        setStatus(
          tr(
            '無法儲存碼錶，請使用分享連結保留目前狀態。',
            'The stopwatch could not be saved; use a share link to retain the current state.',
          ),
        ),
      );
    }
  }, [state, ready, tr]);

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
    setStatus(tr('已重設碼錶與單圈紀錄。', 'Stopwatch and lap records reset.'));
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
      setStatus(tr('已複製分享連結。', 'Share link copied.'));
    } catch {
      setStatus(
        tr(
          '請選取下方連結並手動複製。',
          'Select the link below and copy it manually.',
        ),
      );
    }
  }

  return (
    <div
      ref={panel}
      className={`stopwatch${fullscreen ? ' stopwatch-fullscreen' : ''}`}
    >
      <section className="stopwatch-face" aria-label={tr('碼錶', 'Stopwatch')}>
        <p className="eyebrow">
          {running
            ? tr('計時中', 'Running')
            : total
              ? tr('已暫停', 'Paused')
              : tr('準備開始', 'Ready')}
        </p>
        <div
          className="stopwatch-time"
          role="timer"
          aria-label={tr('累計時間', 'Elapsed time')}
          aria-live="off"
        >
          {formatStopwatch(total, lowPower)}
        </div>
        <p className="stopwatch-split">
          {tr('目前單圈', 'Current lap')}{' '}
          <strong>
            {formatStopwatch(total - (state.laps.at(-1) ?? 0), lowPower)}
          </strong>
        </p>
        <div className="stopwatch-actions">
          <Button disabled={!ready} onClick={toggle}>
            {running
              ? tr('暫停', 'Pause')
              : total
                ? tr('繼續', 'Resume')
                : tr('開始', 'Start')}
          </Button>
          <Button
            variant="outline"
            disabled={!ready || !running || state.laps.length >= 1000}
            onClick={lap}
          >
            {tr('單圈計時', 'Lap')}
          </Button>
          <Button
            variant="outline"
            disabled={!ready || running || total === 0}
            onClick={reset}
          >
            {tr('重設', 'Reset')}
          </Button>
        </div>
        <div className="stopwatch-actions stopwatch-options">
          <Button variant="outline" onClick={toggleFullscreen}>
            {fullscreen
              ? tr('離開全螢幕', 'Exit fullscreen')
              : tr('全螢幕', 'Fullscreen')}
          </Button>
          <Button
            variant="outline"
            aria-pressed={lowPower}
            onClick={() => setEco(!lowPower)}
          >
            ECO {lowPower ? tr('開啟', 'On') : tr('關閉', 'Off')}
          </Button>
          <Button variant="outline" disabled={!ready} onClick={share}>
            {tr('複製分享連結', 'Copy share link')}
          </Button>
        </div>
      </section>
      <output className="block my-3">{status}</output>
      {shareUrl && (
        <label className="stopwatch-share">
          {tr('分享連結', 'Share link')}
          <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
        </label>
      )}
      <div className="stopwatch-records">
        <h2>
          {tr('單圈紀錄', 'Lap records')}{' '}
          <span>({state.laps.length} / 1000)</span>
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('圈次', 'Lap')}</TableHead>
              <TableHead>{tr('單圈時間', 'Lap time')}</TableHead>
              <TableHead>{tr('累計時間', 'Elapsed time')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.laps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  {tr(
                    '開始計時後，按「單圈計時」記錄每一圈。',
                    'After starting, press “Lap” to record each lap.',
                  )}
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
          {tr(
            '快捷鍵：S 開始／暫停、L 單圈、F 全螢幕。← → 切換按鈕，空白鍵操作目前按鈕；未選取按鈕時可開始／暫停。暫停後可重設。',
            'Keyboard shortcuts: S start/pause, L lap, F fullscreen. Use ← → to switch buttons; Space operates the current button, and starts/pauses when no button is selected. Reset after pausing.',
          )}
        </p>
        <p>
          {tr(
            'ECO 隱藏百分之一秒並降低更新頻率，累計 5 分鐘後自動開啟，也可手動切換。單圈紀錄仍保留百分之一秒。',
            'ECO hides hundredths and lowers the update rate. It activates automatically after 5 minutes and can also be toggled manually. Lap records retain hundredths.',
          )}
        </p>
        <p>
          {tr(
            '碼錶自動保留在此瀏覽器，重新整理或關閉後仍可接續。分享連結包含分享當下的計時與單圈紀錄；收件者可接續計時，後續操作不會同步。時間依裝置時鐘計算，調整系統時間可能影響結果。',
            'The stopwatch is retained in this browser and can continue after refresh or closing. Share links include the time and laps at sharing; recipients can continue, but later actions are not synchronized. Time uses the device clock, so changing system time can affect results.',
          )}
        </p>
      </div>
    </div>
  );
}
