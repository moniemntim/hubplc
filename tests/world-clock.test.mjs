import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockParts, taipeiDifference } from '../lib/tools/world-clock.ts';
import { worldZones } from '../lib/tools/world-zones.ts';
await test('Taipei midnight, fractional offsets and international date boundary', () => {
  const time = Date.parse('2026-01-01T16:00:00Z');
  const taipei = clockParts(time, 'Asia/Taipei');
  assert.equal(taipei.time, '00:00:00');
  assert.equal(taipei.date, '2026-01-02');
  assert.equal(taipei.offsetMinutes, 480);
  assert.equal(clockParts(time, 'Asia/Kathmandu').offsetMinutes, 345);
  assert.equal(clockParts(time, 'UTC').offsetMinutes, 0);
  assert.equal(clockParts(time, 'America/Los_Angeles').date, '2026-01-01');
  assert.equal(taipeiDifference(345), '比台北慢 2 小時 15 分鐘');
  assert.equal(taipeiDifference(480), '與台北相同');
  assert.throws(() => clockParts(NaN, 'UTC'));
  assert.throws(() => clockParts(time, 'Invalid/Zone'));
});
await test('World clock follows daylight saving transition', () => {
  assert.equal(
    clockParts(Date.parse('2026-03-08T06:59:59Z'), 'America/New_York').time,
    '01:59:59',
  );
  assert.equal(
    clockParts(Date.parse('2026-03-08T07:00:00Z'), 'America/New_York').time,
    '03:00:00',
  );
  assert.equal(
    clockParts(Date.parse('2026-07-01T00:00:00Z'), 'America/New_York')
      .offsetMinutes,
    -240,
  );
  assert.equal(
    clockParts(Date.parse('2026-01-01T00:00:00Z'), 'America/New_York')
      .offsetMinutes,
    -300,
  );
});
await test('Country list has independent Taiwan Taipei entry and unique zones', () => {
  assert.ok(
    worldZones.some(
      (z) =>
        z.country === 'TW' &&
        z.countryName === '台灣' &&
        z.zone === 'Asia/Taipei',
    ),
  );
  assert.equal(new Set(worldZones.map((z) => z.zone)).size, worldZones.length);
  assert.ok(worldZones.filter((z) => z.country === 'US').length > 1);
});
