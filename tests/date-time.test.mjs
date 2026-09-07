import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCalendarDays,
  dateDifference,
  daysInMonth,
  formatTaipeiDateTime,
  parseCalendarDate,
  taipeiToTimestamp,
  timestampToTaipei,
} from '../lib/tools/date-time.ts';

await test('date difference uses Gregorian calendar days, including leap days', () => {
  assert.deepEqual(dateDifference('2024-02-28', '2024-03-01'), {
    start: '2024-02-28',
    end: '2024-03-01',
    signedDays: 2,
    calendarDays: 2,
    wholeWeeks: 2 / 7,
    inclusiveDays: 2,
  });
  assert.equal(
    dateDifference('2024-03-01', '2024-02-28', true).inclusiveDays,
    3,
  );
  assert.equal(
    dateDifference('2024-02-28', '2024-02-28', true).inclusiveDays,
    1,
  );
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2023, 2), 28);
});

await test('date addition is timezone independent and stays within supported Gregorian years', () => {
  assert.equal(addCalendarDays('2024-02-28', '2').day, 1);
  assert.deepEqual(addCalendarDays('2024-03-01', '-1'), {
    year: 2024,
    month: 2,
    day: 29,
  });
  assert.throws(() => addCalendarDays('9999-12-31', '1'));
  assert.throws(() => addCalendarDays('1900-01-01', '-1'));
  assert.throws(() => addCalendarDays('2024-01-01', '100000000'));
  assert.throws(() => addCalendarDays('2024-02-30', '1'));
  assert.throws(() => addCalendarDays('2024-01-01', '1.5'));
  assert.throws(() => parseCalendarDate('2024/01/01'));
});

await test('Unix timestamps round trip with actual Asia/Taipei offsets', () => {
  const converted = timestampToTaipei('1709251200', 'seconds');
  assert.equal(converted.taipei, '2024-03-01 08:00:00');
  assert.equal(converted.milliseconds, 1709251200000);
  assert.deepEqual(taipeiToTimestamp('2024-03-01 08:00:00'), converted);
  assert.equal(formatTaipeiDateTime(0), '1970-01-01 08:00:00');
  assert.equal(timestampToTaipei('0', 'seconds').taipei, '1970-01-01 08:00:00');
  assert.equal(
    timestampToTaipei('-1', 'seconds').taipei,
    '1970-01-01 07:59:59',
  );
  assert.deepEqual(taipeiToTimestamp('1979-07-01 01:00:00'), {
    milliseconds: 299606400000,
    seconds: 299606400,
    taipei: '1979-07-01 01:00:00',
  });
  assert.throws(() => taipeiToTimestamp('1979-07-01 00:30:00'));
  assert.throws(() => taipeiToTimestamp('1979-09-30 23:30:00'));
  assert.throws(() => timestampToTaipei('1.2', 'seconds'));
  assert.throws(() => timestampToTaipei('1709251200', 'minutes'));
  assert.throws(() => taipeiToTimestamp('2024-02-30 08:00:00'));
  assert.throws(() => taipeiToTimestamp('2024-03-01 24:00:00'));
  assert.throws(() =>
    timestampToTaipei(String(Date.UTC(23_456, 0, 1)), 'milliseconds'),
  );
  assert.throws(() => timestampToTaipei('-9000000000000000', 'milliseconds'));
});
