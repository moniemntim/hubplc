export const TAIPEI_ZONE = 'Asia/Taipei';
const formatters = new Map<string, Intl.DateTimeFormat>();

export function clockParts(epoch: number, zone: string) {
  if (!Number.isFinite(epoch) || Math.abs(epoch) > 8.64e15)
    throw new RangeError('無效的時間。');
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'longOffset',
      weekday: 'short',
    });
    formatters.set(zone, formatter);
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(epoch).map((p) => [p.type, p.value]),
  );
  const offset =
    parts.timeZoneName === 'GMT'
      ? 'UTC+00:00'
      : parts.timeZoneName.replace('GMT', 'UTC');
  const match = /^UTC([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(offset);
  if (!match) throw new Error('瀏覽器無法辨識時區偏移。');
  const offsetMinutes =
    (Number(match[2]) * 60 + Number(match[3]) + Number(match[4] ?? 0) / 60) *
    (match[1] === '+' ? 1 : -1);
  const weekdays: Record<string, string> = {
    Sun: '日',
    Mon: '一',
    Tue: '二',
    Wed: '三',
    Thu: '四',
    Fri: '五',
    Sat: '六',
  };
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
    weekday: `星期${weekdays[parts.weekday]}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    offset,
    offsetMinutes,
  };
}

export function taipeiDifference(minutes: number) {
  const difference = minutes - 480;
  if (difference === 0) return '與台北相同';
  const absolute = Math.abs(difference);
  return `比台北${difference > 0 ? '快' : '慢'} ${Math.floor(absolute / 60)} 小時${absolute % 60 ? ` ${absolute % 60} 分鐘` : ''}`;
}
