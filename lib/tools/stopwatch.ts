export type StopwatchState = {
  version: 1;
  elapsed: number;
  startedAt: number | null;
  laps: number[];
};

export const emptyStopwatch = (): StopwatchState => ({
  version: 1,
  elapsed: 0,
  startedAt: null,
  laps: [],
});

export function elapsedAt(state: StopwatchState, now: number): number {
  return (
    state.elapsed +
    (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt))
  );
}

export function toggleStopwatch(
  state: StopwatchState,
  now: number,
): StopwatchState {
  return state.startedAt === null
    ? { ...state, startedAt: now }
    : { ...state, elapsed: elapsedAt(state, now), startedAt: null };
}

export function recordLap(state: StopwatchState, now: number): StopwatchState {
  if (state.startedAt === null || state.laps.length >= 1000) return state;
  return { ...state, laps: [...state.laps, elapsedAt(state, now)] };
}

export function formatStopwatch(ms: number, eco = false): string {
  const cs = Math.floor(Math.max(0, ms) / 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(Math.floor(cs / 360000))}:${pad(Math.floor(cs / 6000) % 60)}:${pad(Math.floor(cs / 100) % 60)}`;
  return eco ? time : `${time}.${pad(cs % 100)}`;
}

export function parseStopwatch(
  raw: string,
  now: number,
): StopwatchState | null {
  if (raw.length > 40000) return null;
  try {
    const s = JSON.parse(raw);
    const valid = (n: unknown): n is number =>
      typeof n === 'number' &&
      Number.isSafeInteger(n) &&
      n >= 0 &&
      n <= Number.MAX_SAFE_INTEGER / 2;
    if (
      !s ||
      s.version !== 1 ||
      !valid(s.elapsed) ||
      !(s.startedAt === null || (valid(s.startedAt) && s.startedAt <= now)) ||
      !Array.isArray(s.laps) ||
      s.laps.length > 1000
    )
      return null;
    const total = elapsedAt(s, now);
    let previous = 0;
    for (const lap of s.laps) {
      if (!valid(lap) || lap < previous || lap > total) return null;
      previous = lap;
    }
    return {
      version: 1,
      elapsed: s.elapsed,
      startedAt: s.startedAt,
      laps: s.laps,
    };
  } catch {
    return null;
  }
}
