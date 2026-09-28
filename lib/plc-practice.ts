export type PracticeMode = 'latch' | 'ton' | 'sequence';
export type PracticeInputs = {
  start: boolean;
  stop: boolean;
  input: boolean;
  done: boolean;
  ack: boolean;
  reset: boolean;
};
export type PracticeState = {
  scan: number;
  q: boolean;
  previousStart: boolean;
  phase: 'WAIT' | 'RUN' | 'DONE' | 'FAULT';
  since: number | null;
  elapsed: number;
  reason: string;
};
export const practiceModes: Record<string, PracticeMode> = {
  'plc-self-hold-set-reset-q-series': 'latch',
  'plc-ton-tof-tp-timer-selection': 'ton',
  'plc-state-machine-three-step-sequence': 'sequence',
};
export const emptyInputs: PracticeInputs = {
  start: false,
  stop: false,
  input: false,
  done: false,
  ack: false,
  reset: false,
};
export function initialPractice(): PracticeState {
  return {
    scan: 0,
    q: false,
    previousStart: false,
    phase: 'WAIT',
    since: null,
    elapsed: 0,
    reason: '尚未執行',
  };
}

// Educational model only. Each invocation samples inputs at an exact virtual
// time; it does not emulate a vendor runtime, I/O refresh, or physical outputs.
export function practiceScan(
  mode: PracticeMode,
  before: PracticeState,
  input: PracticeInputs,
): PracticeState {
  const now = before.scan * 100;
  const next = { ...before, scan: before.scan + 1, previousStart: input.start };
  if (mode === 'latch') {
    next.q = !input.stop && (input.start || before.q);
    next.reason = input.stop
      ? 'Stop 優先'
      : input.start
        ? 'Start 建立保持'
        : next.q
          ? '由前值保持'
          : '未啟動';
  } else if (mode === 'ton') {
    next.since = input.input ? (before.since ?? now) : null;
    next.elapsed = next.since === null ? 0 : Math.min(2000, now - next.since);
    next.q = input.input && next.elapsed >= 2000;
    next.reason = !input.input
      ? 'IN=0，ET 與 Q 清零'
      : next.q
        ? '已連續成立 2000 ms'
        : '持續計時';
  } else {
    const rising = input.start && !before.previousStart;
    next.reason = '維持狀態';
    if (before.phase === 'WAIT') {
      next.elapsed = 0;
      next.since = null;
      if (rising) {
        if (input.stop || input.done)
          next.reason = '拒絕：Stop 或 DoneInput 尚未清除';
        else {
          next.phase = 'RUN';
          next.since = now;
          next.reason = '新的 Start 上升緣';
        }
      }
    } else if (before.phase === 'RUN') {
      next.elapsed = Math.min(2000, now - (before.since ?? now));
      if (input.stop) {
        next.phase = 'FAULT';
        next.reason = 'STOP';
      } else if (next.elapsed >= 2000) {
        next.phase = 'FAULT';
        next.reason = 'TIMEOUT';
      } else if (input.done) {
        next.phase = 'DONE';
        next.reason = '完成，等待 Ack';
      }
    } else if (before.phase === 'DONE') {
      if (input.ack) {
        next.phase = 'WAIT';
        next.since = null;
        next.elapsed = 0;
        next.reason = 'Ack 確認結果';
      }
    } else if (before.phase === 'FAULT') {
      next.reason = before.reason;
      if (input.reset && !input.stop && !input.done) {
        next.phase = 'WAIT';
        next.since = null;
        next.elapsed = 0;
        next.reason = 'Reset 返回 WAIT';
      }
    }
    next.q = next.phase === 'RUN';
  }
  return next;
}
