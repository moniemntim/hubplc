export const makeRow = (occurrenceId, overrides = {}) => ({
  sourceId: 'S1',
  conditionId: 'PRESSURE',
  occurrenceId,
  severity: 900,
  active: true,
  acked: false,
  eventTime: '2026-09-28T10:00:05.000Z',
  timeTrusted: true,
  uncertaintyMs: 1000,
  receiveTime: '2026-09-28T10:00:10.000Z',
  ...overrides,
});
export const rows = [
  makeRow('A'),
  makeRow('B', {
    severity: 700,
    eventTime: '2026-09-28T10:00:01.000Z',
    active: false,
  }),
  makeRow('C', { eventTime: '2026-09-28T10:00:03.000Z', acked: true }),
  makeRow('D', { eventTime: null, timeTrusted: false, uncertaintyMs: null }),
  makeRow('E', { eventTime: '2026-09-28T10:00:03.000Z' }),
  makeRow('C', { sourceId: 'S2', eventTime: '2026-09-28T10:00:03.000Z' }),
];
