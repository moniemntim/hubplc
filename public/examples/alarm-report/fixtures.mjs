import { SCHEMA } from './model.mjs';

export const SHIFT = {
  startLocal: '2026-09-16T22:00:00+08:00',
  endLocal: '2026-09-17T06:00:00+08:00',
  startUtc: '2026-09-16T14:00:00.000Z',
  endUtc: '2026-09-16T22:00:00.000Z',
};

export const FILTER = {
  startUtc: SHIFT.startUtc,
  endUtc: SHIFT.endUtc,
  sourceIds: null,
  priorities: null,
};

export const FIXTURE = {
  schema: SCHEMA,
  coverage: {
    complete: false,
    knownPrehistoryComplete: true,
    unknownOccurrenceIds: ['OCC-P05'],
  },
  occurrences: [
    {
      occurrenceId: 'OCC-P01',
      sourceId: 'P01',
      priority: 'High',
      history: 'COMPLETE',
      transitions: [
        {
          transitionId: 'TR-P01-A',
          type: 'ACTIVE',
          atUtc: '2026-09-16T14:15:00.000Z',
          order: 1,
        },
        {
          transitionId: 'TR-P01-K',
          type: 'ACK',
          atUtc: '2026-09-16T14:20:00.000Z',
          order: 2,
        },
      ],
    },
    {
      occurrenceId: 'OCC-P02',
      sourceId: 'P02',
      priority: 'Critical',
      history: 'COMPLETE',
      transitions: [
        {
          transitionId: 'TR-P02-A',
          type: 'ACTIVE',
          atUtc: '2026-09-16T21:59:00.000Z',
          order: 1,
        },
        {
          transitionId: 'TR-P02-K-END',
          type: 'ACK',
          atUtc: '2026-09-16T22:00:00.000Z',
          order: 2,
        },
      ],
    },
    {
      occurrenceId: 'OCC-P03',
      sourceId: 'P03',
      priority: 'Medium',
      history: 'COMPLETE',
      transitions: [
        {
          transitionId: 'TR-P03-A',
          type: 'ACTIVE',
          atUtc: '2026-09-16T13:50:00.000Z',
          order: 1,
        },
      ],
    },
    {
      occurrenceId: 'OCC-P04',
      sourceId: 'P04',
      priority: 'Low',
      history: 'COMPLETE',
      transitions: [
        {
          transitionId: 'TR-P04-A',
          type: 'ACTIVE',
          atUtc: '2026-09-16T13:45:00.000Z',
          order: 1,
        },
        {
          transitionId: 'TR-P04-K-LAST',
          type: 'ACK',
          atUtc: '2026-09-16T21:59:59.999Z',
          order: 2,
        },
      ],
    },
    {
      occurrenceId: 'OCC-P05',
      sourceId: 'P05',
      priority: 'High',
      history: 'UNKNOWN_HISTORY',
      transitions: [],
    },
  ],
};

export const CRITICAL_FILTER = {
  ...FILTER,
  sourceIds: ['P02'],
  priorities: ['Critical'],
};
