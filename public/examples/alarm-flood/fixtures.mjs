import { WINDOW_MS } from './model.mjs';

const groupFor = (number) => {
  if (number === 1) return 'Utility';
  if (number <= 15) return 'Pump';
  if (number <= 35) return 'TemperatureFlow';
  return 'Communication';
};
const cycleId = (number) => 'C' + String(number).padStart(3, '0');
const row = (id, cycle, type, occurredAtMs) => ({
  id,
  cycleId: cycleId(cycle),
  group: groupFor(cycle),
  source: 'Synthetic/' + groupFor(cycle) + '/' + cycleId(cycle),
  type,
  occurredAtMs,
  receivedAtMs: 0,
  sourceSequence: 0,
});

const raw = [];
for (let cycle = 1; cycle <= 50; cycle += 1)
  raw.push(row('A' + cycleId(cycle), cycle, 'ACTIVE', (cycle - 1) * 1000));
for (let cycle = 1; cycle <= 40; cycle += 1) {
  const earlyAck = cycle % 2 === 0 && cycle <= 35;
  if (earlyAck)
    raw.push(row('K' + cycleId(cycle), cycle, 'ACK', 80_000 + cycle * 1000));
  raw.push(row('X' + cycleId(cycle), cycle, 'CLEAR', 120_000 + cycle * 1000));
  if (!earlyAck && cycle <= 35)
    raw.push(row('K' + cycleId(cycle), cycle, 'ACK', 180_000 + cycle * 1000));
}
for (let cycle = 41; cycle <= 47; cycle += 1)
  raw.push(row('K' + cycleId(cycle), cycle, 'ACK', 200_000 + cycle * 1000));

export const FIXTURE = raw
  .sort((a, b) => a.occurredAtMs - b.occurredAtMs || a.id.localeCompare(b.id))
  .map((value, index) => ({
    ...value,
    sourceSequence: index + 1,
    receivedAtMs: 500_000 - index * 10,
  }));

export const LATE_ROW = {
  id: 'AC051-LATE',
  cycleId: 'C051',
  group: 'Communication',
  source: 'Synthetic/Communication/C051',
  type: 'ACTIVE',
  occurredAtMs: WINDOW_MS - 1,
  receivedAtMs: WINDOW_MS + 20_000,
  sourceSequence: 133,
};

export const END_ROW = {
  id: 'AC052-END',
  cycleId: 'C052',
  group: 'Communication',
  source: 'Synthetic/Communication/C052',
  type: 'ACTIVE',
  occurredAtMs: WINDOW_MS,
  receivedAtMs: WINDOW_MS,
  sourceSequence: 134,
};
