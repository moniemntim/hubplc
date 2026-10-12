export type ScanOrder = 'forward' | 'swapped';

export type ScanRow = {
  scan: number;
  input: boolean;
  previousM10: boolean;
  m10: boolean;
  m11: boolean;
  out: boolean;
  applied: boolean;
};

export function parseScanInputs(input: string) {
  const bits = input.split(',').map((part) => part.trim());
  if (
    bits.length < 1 ||
    bits.length > 12 ||
    bits.some((bit) => bit !== '0' && bit !== '1')
  )
    throw new Error('請輸入 1 至 12 筆 0／1，以逗號分隔。');
  return bits.map((bit) => bit === '1');
}

export function runScanLesson(inputs: boolean[], order: ScanOrder): ScanRow[] {
  if (
    inputs.length < 1 ||
    inputs.length > 12 ||
    inputs.some((value) => typeof value !== 'boolean')
  )
    throw new Error('掃描輸入必須是 1 至 12 筆 0／1。');
  if (order !== 'forward' && order !== 'swapped')
    throw new Error('未知的程式執行順序。');
  let m10 = false;
  let m11 = false;
  let out = false;
  return inputs.map((input, index) => {
    const applied = out;
    const previousM10 = m10;
    if (order === 'forward') {
      m10 = input;
      m11 = m10;
    } else {
      m11 = m10;
      m10 = input;
    }
    out = m11;
    return { scan: index + 1, input, previousM10, m10, m11, out, applied };
  });
}

function parsePulseEndpoint(input: string, label: string) {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) throw new Error(`${label} 必須是整數毫秒。`);
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 0 || value > 40)
    throw new Error(`${label} 必須在 0 至 40 ms。`);
  return value;
}

export function samplePulseLesson(startInput: string, endInput: string) {
  const start = parsePulseEndpoint(startInput, '起點');
  const end = parsePulseEndpoint(endInput, '終點');
  if (start >= end) throw new Error('ON 時段必須滿足起點 < 終點。');
  return [0, 10, 20, 30].map((timeMs) => ({
    timeMs,
    input: timeMs >= start && timeMs < end,
  }));
}

export type EdgeRow = {
  scan: number;
  button: boolean;
  previous: boolean;
  rising: boolean;
  falling: boolean;
  commandCount: number;
};

export function appendEdgeScan(history: EdgeRow[], button: boolean): EdgeRow[] {
  if (history.length >= 32) throw new Error('最多顯示 32 次掃描；請先重設。');
  if (typeof button !== 'boolean') throw new Error('Button 必須是 0 或 1。');
  const before = history.at(-1);
  const previous = before?.button ?? false;
  const rising = button && !previous;
  const falling = !button && previous;
  return [
    ...history,
    {
      scan: history.length + 1,
      button,
      previous,
      rising,
      falling,
      commandCount: (before?.commandCount ?? 0) + Number(rising),
    },
  ];
}

export function longHoldCase() {
  const inputs = [false, ...Array<boolean>(10).fill(true), false];
  return inputs.reduce<EdgeRow[]>(
    (history, button) => appendEdgeScan(history, button),
    [],
  );
}
