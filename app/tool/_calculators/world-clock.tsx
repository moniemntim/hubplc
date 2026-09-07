'use client';

import { useEffect, useState } from 'react';
import { worldZones } from '@/lib/tools/world-zones';
import {
  clockParts,
  taipeiDifference,
  TAIPEI_ZONE,
} from '@/lib/tools/world-clock';
import './world-clock.css';

const countries = [
  ...new Map(worldZones.map((z) => [z.country, z.countryName])).entries(),
].sort((a, b) =>
  a[0] === 'TW' ? -1 : b[0] === 'TW' ? 1 : a[1].localeCompare(b[1], 'zh-TW'),
);
const favorites = [
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Shanghai',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
  'UTC',
];

function safeParts(now: number | null, zone: string) {
  if (now === null) return null;
  try {
    return clockParts(now, zone);
  } catch {
    return null;
  }
}

export default function WorldClock() {
  const [now, setNow] = useState<number | null>(null);
  const [running, setRunning] = useState(true);
  const [selected, setSelected] = useState<string>(TAIPEI_ZONE);
  const [country, setCountry] = useState('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(36);
  const [status, setStatus] = useState('');
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [running]);
  const location = worldZones.find((z) => z.zone === selected)!;
  const parts = safeParts(now, selected);
  const term = query.trim().toLocaleLowerCase();
  const filtered = worldZones.filter(
    (z) =>
      (!country || z.country === country) &&
      (!term ||
        `${z.city} ${z.countryName} ${z.country} ${z.zone}`
          .toLocaleLowerCase()
          .includes(term)),
  );
  const rows =
    country || term
      ? filtered.slice(0, limit)
      : favorites.map((zone) => worldZones.find((z) => z.zone === zone)!);
  function reset() {
    setCountry('');
    setQuery('');
    setLimit(36);
    setSelected(TAIPEI_ZONE);
    setStatus('');
    setRunning(true);
  }
  async function copy() {
    if (!parts) return;
    try {
      await navigator.clipboard.writeText(
        `${location.countryName}・${location.city} ${parts.date} ${parts.time} ${parts.offset} (${selected})`,
      );
      setStatus('已複製目前顯示時間。');
    } catch {
      setStatus('無法複製，請選取顯示的時間手動複製。');
    }
  }
  return (
    <div className="world-clock">
      <section className="world-hero" aria-label="選取城市時間">
        <div>
          <p className="eyebrow">
            {location.countryName}・{location.city}
          </p>
          <h2>{location.city}時間</h2>
          <p className="world-time" data-testid="world-time">
            {parts?.time ?? '—'}
          </p>
          <p>
            {parts
              ? `${parts.date} ${parts.weekday}`
              : now === null
                ? '正在讀取裝置時間…'
                : '此瀏覽器尚未支援這個時區，請更新瀏覽器。'}
          </p>
          <p>
            {selected} · {parts?.offset ?? '—'}
          </p>
          <p>
            {parts ? taipeiDifference(parts.offsetMinutes) : ''}{' '}
            {running ? '・每秒更新' : '・已暫停顯示'}
          </p>
        </div>
        <svg className="world-dial" viewBox="0 0 200 200" aria-hidden="true">
          <circle
            cx="100"
            cy="100"
            r="94"
            fill="var(--surface, #fff)"
            stroke="currentColor"
            strokeWidth="2"
          />
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={i}
              x1="100"
              y1="16"
              x2="100"
              y2="24"
              stroke="currentColor"
              strokeWidth="2"
              transform={`rotate(${i * 30} 100 100)`}
            />
          ))}
          <text
            x="100"
            y="44"
            textAnchor="middle"
            fill="currentColor"
            fontSize="12"
          >
            12
          </text>
          <text
            x="100"
            y="166"
            textAnchor="middle"
            fill="currentColor"
            fontSize="12"
          >
            6
          </text>
          {parts && (
            <>
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="55"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                transform={`rotate(${(parts.hour % 12) * 30 + parts.minute / 2} 100 100)`}
              />
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="35"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                transform={`rotate(${parts.minute * 6 + parts.second / 10} 100 100)`}
              />
              <line
                x1="100"
                y1="113"
                x2="100"
                y2="29"
                stroke="#d85b2b"
                strokeWidth="2"
                transform={`rotate(${parts.second * 6} 100 100)`}
              />
            </>
          )}
          <circle cx="100" cy="100" r="5" fill="#d85b2b" />
        </svg>
      </section>
      <div className="action-row">
        <button
          className="action"
          onClick={() => {
            setRunning((v) => !v);
            setStatus('');
          }}
        >
          {running ? '暫停更新' : '繼續更新'}
        </button>
        <button className="action secondary" onClick={copy} disabled={!parts}>
          複製時間
        </button>
        <button className="action secondary" onClick={reset}>
          回到台灣・台北
        </button>
      </div>
      <output aria-live="polite">{status}</output>
      <div className="world-filters">
        <div className="tool-field">
          <label htmlFor="world-search">搜尋城市、國家或時區</label>
          <input
            id="world-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(36);
            }}
            placeholder="例如：台灣、東京、New York"
          />
        </div>
        <div className="tool-field">
          <label htmlFor="world-country">國家／地區</label>
          <select
            id="world-country"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setLimit(36);
            }}
          >
            <option value="">全部國家／地區</option>
            {countries.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <button
          className="action secondary"
          onClick={() => {
            setCountry('');
            setQuery('');
            setLimit(36);
          }}
        >
          清空篩選
        </button>
      </div>
      <h2>
        {country || term ? `搜尋結果（${filtered.length} 個時區）` : '常用城市'}
      </h2>
      <div className="world-grid">
        {rows.map((z) => {
          const value = safeParts(now, z.zone);
          return (
            <button
              key={z.zone}
              className="world-card"
              aria-pressed={selected === z.zone}
              onClick={() => {
                setSelected(z.zone);
                setStatus('');
              }}
            >
              <strong>
                {z.countryName}・{z.city}
              </strong>
              <span className="world-card-time">{value?.time ?? '—'}</span>
              <span>
                {value
                  ? `${value.date} ${value.weekday}`
                  : now === null
                    ? '讀取中'
                    : '瀏覽器尚未支援此時區'}
              </span>
              <span>
                {value
                  ? `${value.offset} · ${taipeiDifference(value.offsetMinutes)}`
                  : ''}
              </span>
              <small>{z.zone}</small>
            </button>
          );
        })}
      </div>
      {(country || term) && filtered.length === 0 && (
        <p>找不到符合條件的城市，請清空篩選後重試。</p>
      )}
      {(country || term) && filtered.length > limit && (
        <button
          className="action secondary"
          onClick={() => setLimit((v) => v + 36)}
        >
          顯示更多城市
        </button>
      )}
      <div className="tool-foot">
        <span>時間與資料說明</span>
        <div>
          <p>
            預設國家為台灣，城市為台北，時區為
            Asia/Taipei。世界時鐘以裝置系統時間為準，並非網路校時服務；裝置時間有誤時，顯示也會受影響。
          </p>
          <p>
            國家／地區與時區對照採用{' '}
            <a href="https://www.iana.org/time-zones">IANA 時區資料</a>
            。同一國家可能有多個時區，請選擇實際城市。夏令時間與 UTC
            偏移由瀏覽器時區資料按顯示日期計算；規則更新後，可能需要更新瀏覽器。
          </p>
          <p>
            搜尋可使用繁體中文常用城市名、國家名稱、國家代碼或英文 IANA
            時區名稱。所有計算在此瀏覽器內完成，不上傳或儲存選擇。
          </p>
        </div>
      </div>
    </div>
  );
}
