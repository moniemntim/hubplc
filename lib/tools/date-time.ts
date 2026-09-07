import { numberInput } from './core.ts';
import { clockParts, TAIPEI_ZONE } from './world-clock.ts';

const DAY_MS = 86_400_000;
const DATE_MIN_YEAR = 1900;
const TIMESTAMP_MIN_YEAR = 1900;
const MAX_YEAR = 9999;

export type CalendarDate = Readonly<{
  year: number;
  month: number;
  day: number;
}>;

export type TimestampUnit = 'seconds' | 'milliseconds';

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  )
    throw new Error('日期月份無效。');
  return [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];
}

export function parseCalendarDate(
  raw: string,
  minYear = DATE_MIN_YEAR,
): CalendarDate {
  const text = raw.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) throw new Error('日期請使用 YYYY-MM-DD 格式。');
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (year < minYear || year > MAX_YEAR)
    throw new Error(`年份必須在 ${minYear}～${MAX_YEAR}。`);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month))
    throw new Error('日期不存在，請檢查月份與日期。');
  return { year, month, day };
}

export function formatCalendarDate(date: CalendarDate): string {
  return `${pad(date.year, 4)}-${pad(date.month)}-${pad(date.day)}`;
}

function calendarMs(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}

function calendarFromMs(ms: number): CalendarDate {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) throw new Error('日期超出可計算範圍。');
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function integerInput(raw: string, label: string): number {
  const value = numberInput(raw, label);
  if (!Number.isSafeInteger(value)) throw new Error(`${label}必須是安全整數。`);
  return value;
}

export function dateDifference(
  startRaw: string,
  endRaw: string,
  inclusive = false,
) {
  const start = parseCalendarDate(startRaw);
  const end = parseCalendarDate(endRaw);
  const signedDays = Math.round((calendarMs(end) - calendarMs(start)) / DAY_MS);
  const calendarDays = Math.abs(signedDays);
  return {
    start: formatCalendarDate(start),
    end: formatCalendarDate(end),
    signedDays,
    calendarDays,
    wholeWeeks: calendarDays / 7,
    inclusiveDays: inclusive ? calendarDays + 1 : calendarDays,
  };
}

export function addCalendarDays(
  dateRaw: string,
  amountRaw: string,
): CalendarDate {
  const date = parseCalendarDate(dateRaw);
  const amount = integerInput(amountRaw, '增減天數');
  const resultMs = calendarMs(date) + amount * DAY_MS;
  if (
    !Number.isSafeInteger(resultMs) ||
    Number.isNaN(new Date(resultMs).getTime())
  )
    throw new Error('日期超出可計算範圍。');
  const result = calendarFromMs(resultMs);
  if (result.year < DATE_MIN_YEAR || result.year > MAX_YEAR)
    throw new Error(`結果年份必須在 ${DATE_MIN_YEAR}～${MAX_YEAR}。`);
  return result;
}

function parseTaipeiDateTime(raw: string): {
  date: CalendarDate;
  hour: number;
  minute: number;
  second: number;
} {
  const text = raw.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(
    text,
  );
  if (!match) throw new Error('台北日期時間請使用 YYYY-MM-DD HH:mm:ss 格式。');
  const [, year, month, day, hour, minute, second] = match;
  const date = parseCalendarDate(`${year}-${month}-${day}`, TIMESTAMP_MIN_YEAR);
  const values = [Number(hour), Number(minute), Number(second)];
  if (values[0] > 23 || values[1] > 59 || values[2] > 59)
    throw new Error('時間必須在 00:00:00～23:59:59。');
  return { date, hour: values[0], minute: values[1], second: values[2] };
}

function timestampMs(raw: string, unit: TimestampUnit): number {
  if (unit !== 'seconds' && unit !== 'milliseconds')
    throw new Error('時間戳單位必須是秒或毫秒。');
  const value = integerInput(
    raw,
    unit === 'seconds' ? 'Unix 秒數' : 'Unix 毫秒',
  );
  const ms = unit === 'seconds' ? value * 1000 : value;
  if (!Number.isSafeInteger(ms)) throw new Error('Unix 時間戳超出可計算範圍。');
  if (ms < Date.UTC(1899, 11, 31) || ms >= Date.UTC(10_000, 0, 1))
    throw new Error(`台北日期時間必須在 ${TIMESTAMP_MIN_YEAR}～${MAX_YEAR}。`);
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) throw new Error('Unix 時間戳無效。');
  const taipei = clockParts(ms, TAIPEI_ZONE).date;
  if (!/^\d{4}-/.test(taipei))
    throw new Error(`台北日期時間必須在 ${TIMESTAMP_MIN_YEAR}～${MAX_YEAR}。`);
  const taipeiYear = Number(taipei.split('-')[0]);
  if (taipeiYear < TIMESTAMP_MIN_YEAR || taipeiYear > MAX_YEAR)
    throw new Error(`台北日期時間必須在 ${TIMESTAMP_MIN_YEAR}～${MAX_YEAR}。`);
  return ms;
}

export function formatTaipeiDateTime(ms: number): string {
  const local = clockParts(ms, TAIPEI_ZONE);
  return `${local.date} ${local.time}`;
}

export function timestampToTaipei(raw: string, unit: TimestampUnit) {
  const ms = timestampMs(raw, unit);
  return {
    milliseconds: ms,
    seconds: Math.floor(ms / 1000),
    taipei: formatTaipeiDateTime(ms),
  };
}

export function taipeiToTimestamp(raw: string) {
  const { date, hour, minute, second } = parseTaipeiDateTime(raw);
  const canonical = `${formatCalendarDate(date)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
  const naive = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    hour,
    minute,
    second,
  );
  const offsets = new Set(
    [-36, 36].map(
      (hours) =>
        clockParts(naive + hours * 60 * 60 * 1000, TAIPEI_ZONE).offsetMinutes,
    ),
  );
  const candidates = [...offsets]
    .map((offset) => naive - offset * 60 * 1000)
    .filter((candidate) => formatTaipeiDateTime(candidate) === canonical);
  if (candidates.length === 0)
    throw new Error('此台北當地時間不存在，請確認夏令時間切換。');
  if (candidates.length > 1)
    throw new Error('此台北當地時間有兩個可能的時間戳，請改用 Unix 時間戳。');
  const ms = candidates[0];
  if (!Number.isSafeInteger(ms)) throw new Error('日期時間超出可計算範圍。');
  return {
    milliseconds: ms,
    seconds: Math.floor(ms / 1000),
    taipei: formatTaipeiDateTime(ms),
  };
}

export function taipeiToday(now = Date.now()): string {
  return formatTaipeiDateTime(now).slice(0, 10);
}
