import { formatNumber, numberInput } from './core.ts';

export type AnalogInput = {
  signal: string;
  signalLow: string;
  signalHigh: string;
  engineeringLow: string;
  engineeringHigh: string;
};
export function analogConvert(input: AnalogInput) {
  const signal = numberInput(input.signal, '訊號值');
  const signalLow = numberInput(input.signalLow, '訊號下限');
  const signalHigh = numberInput(input.signalHigh, '訊號上限');
  const engineeringLow = numberInput(input.engineeringLow, '工程下限');
  const engineeringHigh = numberInput(input.engineeringHigh, '工程上限');
  if (signalHigh <= signalLow || engineeringHigh <= engineeringLow)
    throw new Error('上限必須大於下限。');
  const signalSpan = signalHigh - signalLow;
  const engineeringSpan = engineeringHigh - engineeringLow;
  if (!Number.isFinite(signalSpan) || !Number.isFinite(engineeringSpan))
    throw new Error('量程範圍超出可計算範圍。');
  const ratio = (signal - signalLow) / signalSpan;
  const engineering = engineeringLow + ratio * engineeringSpan;
  const percentage = ratio * 100;
  if (
    !Number.isFinite(ratio) ||
    !Number.isFinite(percentage) ||
    !Number.isFinite(engineering)
  )
    throw new Error('計算結果無效。');
  return {
    signal,
    percentage,
    engineering,
    outside: ratio < 0 || ratio > 1,
  };
}
export function analogConvertRanges(
  signalRaw: string,
  sourceLowRaw: string,
  sourceHighRaw: string,
  targetLowRaw: string,
  targetHighRaw: string,
) {
  const signal = numberInput(signalRaw, '訊號值');
  const sourceLow = numberInput(sourceLowRaw, '來源下限');
  const sourceHigh = numberInput(sourceHighRaw, '來源上限');
  const targetLow = numberInput(targetLowRaw, '目標下限');
  const targetHigh = numberInput(targetHighRaw, '目標上限');
  if (sourceHigh <= sourceLow || targetHigh <= targetLow)
    throw new Error('上限必須大於下限。');
  const sourceSpan = sourceHigh - sourceLow;
  const targetSpan = targetHigh - targetLow;
  if (!Number.isFinite(sourceSpan) || !Number.isFinite(targetSpan))
    throw new Error('量程範圍超出可計算範圍。');
  const ratio = (signal - sourceLow) / sourceSpan;
  const target = targetLow + ratio * targetSpan;
  const percentage = ratio * 100;
  if (
    !Number.isFinite(ratio) ||
    !Number.isFinite(percentage) ||
    !Number.isFinite(target)
  )
    throw new Error('計算結果無效。');
  return { target, percentage, outside: ratio < 0 || ratio > 1 };
}
export function analogSignalFromEngineering(
  engineeringRaw: string,
  signalLowRaw: string,
  signalHighRaw: string,
  engineeringLowRaw: string,
  engineeringHighRaw: string,
) {
  const engineering = numberInput(engineeringRaw, '工程值');
  const signalLow = numberInput(signalLowRaw, '訊號下限');
  const signalHigh = numberInput(signalHighRaw, '訊號上限');
  const engineeringLow = numberInput(engineeringLowRaw, '工程下限');
  const engineeringHigh = numberInput(engineeringHighRaw, '工程上限');
  if (signalHigh <= signalLow || engineeringHigh <= engineeringLow)
    throw new Error('上限必須大於下限。');
  const engineeringSpan = engineeringHigh - engineeringLow;
  const signalSpan = signalHigh - signalLow;
  if (!Number.isFinite(engineeringSpan) || !Number.isFinite(signalSpan))
    throw new Error('量程範圍超出可計算範圍。');
  const ratio = (engineering - engineeringLow) / engineeringSpan;
  const signal = signalLow + ratio * signalSpan;
  const percentage = ratio * 100;
  if (
    !Number.isFinite(ratio) ||
    !Number.isFinite(percentage) ||
    !Number.isFinite(signal)
  )
    throw new Error('計算結果無效。');
  return { signal, percentage, outside: ratio < 0 || ratio > 1 };
}
export function analogSignalFromPercentage(
  percentageRaw: string,
  signalLowRaw: string,
  signalHighRaw: string,
) {
  const percentage = numberInput(percentageRaw, '百分比');
  const signalLow = numberInput(signalLowRaw, '訊號下限');
  const signalHigh = numberInput(signalHighRaw, '訊號上限');
  if (signalHigh <= signalLow) throw new Error('訊號上限必須大於下限。');
  const signalSpan = signalHigh - signalLow;
  if (!Number.isFinite(signalSpan)) throw new Error('量程範圍超出可計算範圍。');
  const signal = signalLow + (percentage / 100) * signalSpan;
  if (!Number.isFinite(signal)) throw new Error('計算結果無效。');
  return { signal, percentage, outside: percentage < 0 || percentage > 100 };
}
/** Backward-compatible 4–20 mA scaling used by the original calculator. */
export function analogLegacy(current: string, low: string, high: string) {
  const result = analogConvert({
    signal: current,
    signalLow: '4',
    signalHigh: '20',
    engineeringLow: low,
    engineeringHigh: high,
  });
  return {
    value: result.engineering,
    percent: result.percentage,
    outside: result.outside,
  };
}

const basePatterns: Record<number, RegExp> = {
  2: /^[01]+$/,
  8: /^[0-7]+$/,
  10: /^\d+$/,
  16: /^[0-9a-f]+$/i,
};
export function baseConvert(input: {
  raw: string;
  base: number;
  bits: 8 | 16 | 32;
  signed: boolean;
}) {
  const text = input.raw.trim();
  if (![8, 16, 32].includes(input.bits))
    throw new Error('位元數必須是 8、16 或 32。');
  const decimalSigned = input.base === 10 && input.signed;
  const valid = decimalSigned
    ? /^-?\d+$/.test(text)
    : Boolean(basePatterns[input.base]?.test(text));
  if (!valid) throw new Error('請輸入選定進位的整數，不含前綴。');
  if (text.replace(/^-/, '').length > 64)
    throw new Error('最多輸入 64 位數字。');
  const prefix =
    input.base === 16
      ? '0x'
      : input.base === 8
        ? '0o'
        : input.base === 2
          ? '0b'
          : '';
  const parsed = BigInt(prefix + text);
  const bits = BigInt(input.bits);
  const modulus = BigInt(1) << bits;
  const maxUnsigned = modulus - BigInt(1);
  const signBoundary = BigInt(1) << (bits - BigInt(1));
  let encoded: bigint;
  let decimal: bigint;
  if (decimalSigned) {
    const min = -signBoundary;
    const max = signBoundary - BigInt(1);
    if (parsed < min || parsed > max)
      throw new Error(`超出 ${input.bits} 位元有號整數範圍。`);
    decimal = parsed;
    encoded = parsed < BigInt(0) ? modulus + parsed : parsed;
  } else {
    if (parsed > maxUnsigned) throw new Error(`超出 ${input.bits} 位元範圍。`);
    encoded = parsed;
    decimal =
      input.signed && encoded >= signBoundary ? encoded - modulus : encoded;
  }
  const width = Math.ceil(input.bits / 4);
  return {
    decimal: decimal.toString(),
    binary: encoded.toString(2).padStart(input.bits, '0'),
    octal: encoded.toString(8),
    hex: encoded.toString(16).toUpperCase().padStart(width, '0'),
    unsigned: encoded.toString(),
  };
}

export const modbusAreas = {
  coil: { label: 'Coil (0x)', prefix: 0, functionCode: '01' },
  discrete: { label: 'Discrete Input (1x)', prefix: 1, functionCode: '02' },
  input: { label: 'Input Register (3x)', prefix: 3, functionCode: '04' },
  holding: { label: 'Holding Register (4x)', prefix: 4, functionCode: '03' },
} as const;
export type ModbusArea = keyof typeof modbusAreas;
export function modbusConvert(input: {
  area: ModbusArea;
  digits: 5 | 6;
  reference?: string;
  offset?: string;
  sequence?: string;
}) {
  const area = modbusAreas[input.area];
  if (!area) throw new Error('請選擇資料區。');
  if (input.digits !== 5 && input.digits !== 6)
    throw new Error('參考編號必須選擇五位或六位。');
  const base =
    input.digits === 5 ? area.prefix * 10000 + 1 : area.prefix * 100000 + 1;
  const supplied = [input.reference, input.offset, input.sequence].filter(
    (value) => value !== undefined && value.trim() !== '',
  );
  if (supplied.length !== 1)
    throw new Error('請只填寫參考編號、零起算位址或從 1 起算序號其中一項。');
  let offset: number;
  if (input.reference?.trim()) {
    if (!new RegExp(`^\\d{${input.digits}}$`).test(input.reference.trim()))
      throw new Error(`參考編號必須是 ${input.digits} 位數字。`);
    offset = Number(input.reference) - base;
  } else if (input.offset?.trim()) {
    if (!/^\d+$/.test(input.offset.trim()))
      throw new Error('零起算位址必須是非負整數。');
    offset = Number(input.offset);
  } else {
    if (!/^\d+$/.test((input.sequence ?? '').trim()))
      throw new Error('從 1 起算序號必須是正整數。');
    offset = Number(input.sequence) - 1;
  }
  const maxOffset = input.digits === 5 ? 9998 : 65535;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > maxOffset)
    throw new Error(`位址必須是 0～${maxOffset} 的整數。`);
  const reference = base + offset;
  if (String(reference).length > input.digits)
    throw new Error('此參考編號超出所選位數。');
  return {
    reference: String(reference).padStart(input.digits, '0'),
    offset,
    sequence: offset + 1,
    hex: offset.toString(16).toUpperCase().padStart(4, '0'),
    functionCode: area.functionCode,
    area: area.label,
  };
}

export function plcScale(input: {
  raw: string;
  rawLow: string;
  rawHigh: string;
  engineeringLow: string;
  engineeringHigh: string;
  direction: 'raw-to-engineering' | 'engineering-to-raw';
}) {
  const rawLow = numberInput(input.rawLow, '原始下限');
  const rawHigh = numberInput(input.rawHigh, '原始上限');
  const engineeringLow = numberInput(input.engineeringLow, '工程下限');
  const engineeringHigh = numberInput(input.engineeringHigh, '工程上限');
  const value = numberInput(
    input.raw,
    input.direction === 'raw-to-engineering' ? '原始值' : '工程值',
  );
  if (rawHigh <= rawLow || engineeringHigh <= engineeringLow)
    throw new Error('上限必須大於下限。');
  const rawSpan = rawHigh - rawLow;
  const engineeringSpan = engineeringHigh - engineeringLow;
  if (!Number.isFinite(rawSpan) || !Number.isFinite(engineeringSpan))
    throw new Error('量程範圍超出可計算範圍。');
  const ratio =
    input.direction === 'raw-to-engineering'
      ? (value - rawLow) / rawSpan
      : (value - engineeringLow) / engineeringSpan;
  const result =
    input.direction === 'raw-to-engineering'
      ? engineeringLow + ratio * engineeringSpan
      : rawLow + ratio * rawSpan;
  const percentage = ratio * 100;
  if (
    !Number.isFinite(ratio) ||
    !Number.isFinite(percentage) ||
    !Number.isFinite(result)
  )
    throw new Error('計算結果無效。');
  return { result, percentage, outside: ratio < 0 || ratio > 1 };
}

export function modbusCrc(raw: string) {
  const clean = raw.trim();
  if (!clean) throw new Error('請輸入 HEX 位元組。');
  const tokens = clean.split(/[\s,]+/).filter(Boolean);
  if (tokens.some((token) => !/^[0-9a-f]{2}$/i.test(token)))
    throw new Error('請以空白或逗號分隔兩位 HEX 位元組。');
  let crc = 0xffff;
  for (const token of tokens) {
    crc ^= Number.parseInt(token, 16);
    for (let index = 0; index < 8; index += 1)
      crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
  }
  const low = crc & 0xff;
  const high = (crc >>> 8) & 0xff;
  const wire =
    `${low.toString(16).padStart(2, '0')} ${high.toString(16).padStart(2, '0')}`.toUpperCase();
  return {
    crc: crc.toString(16).padStart(4, '0').toUpperCase(),
    wire,
    complete: `${tokens.map((token) => token.toUpperCase()).join(' ')} ${wire}`,
  };
}

export type RegisterKind = 'uint16' | 'int16' | 'uint32' | 'int32' | 'float32';
export type ByteOrder = 'ABCD' | 'BADC' | 'CDAB' | 'DCBA';
function validateKind(kind: RegisterKind) {
  if (!['uint16', 'int16', 'uint32', 'int32', 'float32'].includes(kind))
    throw new Error('不支援的資料型別。');
}
function validateOrder(order: ByteOrder) {
  if (!['ABCD', 'BADC', 'CDAB', 'DCBA'].includes(order))
    throw new Error('不支援的位元組排列。');
}
function bytesForOrder(bytes: number[], order: ByteOrder) {
  validateOrder(order);
  if (bytes.length === 2) return bytes;
  if (order === 'ABCD') return bytes;
  if (order === 'BADC') return [bytes[1], bytes[0], bytes[3], bytes[2]];
  if (order === 'CDAB') return [bytes[2], bytes[3], bytes[0], bytes[1]];
  return [bytes[3], bytes[2], bytes[1], bytes[0]];
}
function canonicalFromOrder(bytes: number[], order: ByteOrder) {
  return bytesForOrder(bytes, order);
}
function hexRegister(high: number, low: number) {
  return ((high << 8) | low).toString(16).toUpperCase().padStart(4, '0');
}
export function registerFromValue(
  raw: string,
  kind: RegisterKind,
  order: ByteOrder = 'ABCD',
) {
  validateKind(kind);
  validateOrder(order);
  const value = numberInput(raw, '數值');
  const is32 = kind.endsWith('32');
  const buffer = new ArrayBuffer(is32 ? 4 : 2);
  const view = new DataView(buffer);
  if (kind === 'uint16') {
    if (!Number.isInteger(value) || value < 0 || value > 65535)
      throw new Error('UInt16 範圍為 0～65535。');
    view.setUint16(0, value);
  }
  if (kind === 'int16') {
    if (!Number.isInteger(value) || value < -32768 || value > 32767)
      throw new Error('Int16 範圍為 -32768～32767。');
    view.setInt16(0, value);
  }
  if (kind === 'uint32') {
    if (!Number.isInteger(value) || value < 0 || value > 4294967295)
      throw new Error('UInt32 範圍為 0～4294967295。');
    view.setUint32(0, value);
  }
  if (kind === 'int32') {
    if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647)
      throw new Error('Int32 範圍為 -2147483648～2147483647。');
    view.setInt32(0, value);
  }
  if (kind === 'float32') {
    view.setFloat32(0, value);
    const stored = view.getFloat32(0);
    if (!Number.isFinite(stored))
      throw new Error('Float32 結果必須是有限數值。');
    if (value !== 0 && stored === 0)
      throw new Error('Float32 值太小，轉換後會下溢為 0。');
  }
  const ordered = bytesForOrder(Array.from(new Uint8Array(buffer)), order);
  return {
    registers: is32
      ? [
          hexRegister(ordered[0], ordered[1]),
          hexRegister(ordered[2], ordered[3]),
        ]
      : [hexRegister(ordered[0], ordered[1])],
    bytes: ordered
      .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
      .join(' '),
  };
}
export function registerToValue(
  raw: string,
  kind: RegisterKind,
  order: ByteOrder = 'ABCD',
) {
  validateKind(kind);
  validateOrder(order);
  const expected = kind.endsWith('32') ? 2 : 1;
  const tokens = raw
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (
    tokens.length !== expected ||
    tokens.some((token) => !/^[0-9a-f]{4}$/i.test(token))
  )
    throw new Error(`請輸入 ${expected} 個四位 HEX 暫存器。`);
  const ordered = tokens.flatMap((token) => [
    Number.parseInt(token.slice(0, 2), 16),
    Number.parseInt(token.slice(2), 16),
  ]);
  const canonical = canonicalFromOrder(ordered, order);
  const view = new DataView(Uint8Array.from(canonical).buffer);
  let value: number;
  if (kind === 'uint16') value = view.getUint16(0);
  else if (kind === 'int16') value = view.getInt16(0);
  else if (kind === 'uint32') value = view.getUint32(0);
  else if (kind === 'int32') value = view.getInt32(0);
  else value = view.getFloat32(0);
  if (!Number.isFinite(value))
    throw new Error('結果為 NaN 或 Infinity，無法轉換。');
  return { value, formatted: formatNumber(value) };
}
